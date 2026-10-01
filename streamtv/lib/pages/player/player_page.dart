import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:media_kit/media_kit.dart';
import 'package:media_kit_video/media_kit_video.dart';
import 'package:flutter_spinkit/flutter_spinkit.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../models/media_item.dart';
import '../../models/stream_source.dart';
import '../../services/stream_service.dart';
import '../../services/storage_service.dart';
import '../../core/theme/app_theme.dart';

class PlayerPage extends StatefulWidget {
  final MediaItem media;
  final int? season;
  final int? episode;

  const PlayerPage({
    super.key,
    required this.media,
    this.season,
    this.episode,
  });

  @override
  State<PlayerPage> createState() => _PlayerPageState();
}

class _PlayerPageState extends State<PlayerPage> {
  late final Player _player;
  late final VideoController _controller;
  final StreamService _streamService = StreamService();
  final StorageService _storageService = StorageService();

  List<StreamSource> _sources = [];
  StreamSource? _activeSource;
  bool _isLoading = true;
  String? _errorMessage;

  bool _showControls = true;
  Timer? _controlsHideTimer;

  Duration _position = Duration.zero;
  Duration _duration = Duration.zero;
  bool _isPlaying = false;

  final FocusNode _playPauseFocusNode = FocusNode();

  @override
  void initState() {
    super.initState();
    // Enable immersive fullscreen
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);

    _player = Player();
    _controller = VideoController(_player);

    _setupPlayerListeners();
    _fetchStreams();
  }

  void _setupPlayerListeners() {
    _player.stream.position.listen((pos) {
      if (mounted) setState(() => _position = pos);
    });

    _player.stream.duration.listen((dur) {
      if (mounted) setState(() => _duration = dur);
    });

    _player.stream.playing.listen((playing) {
      if (mounted) setState(() => _isPlaying = playing);
    });

    _player.stream.completed.listen((completed) {
      if (completed && mounted) {
        _saveProgress();
      }
    });
  }

  Future<void> _fetchStreams() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final list = await _streamService.getSourcesForMedia(
        media: widget.media,
        season: widget.season,
        episode: widget.episode,
      );

      if (list.isEmpty) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'No playable streams found for this title.';
        });
        return;
      }

      setState(() {
        _sources = list;
        _activeSource = list.first;
        _isLoading = false;
      });

      _playSource(list.first);
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'Failed to load streams: $e';
      });
    }
  }

  void _playSource(StreamSource source) {
    _activeSource = source;
    _player.open(
      Media(
        source.url,
        httpHeaders: source.headers ?? {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://screenscape.me/',
        },
      ),
      play: true,
    );
    _resetControlsTimer();
  }

  void _resetControlsTimer() {
    _controlsHideTimer?.cancel();
    setState(() => _showControls = true);
    _controlsHideTimer = Timer(const Duration(seconds: 5), () {
      if (mounted && _isPlaying) {
        setState(() => _showControls = false);
      }
    });
  }

  void _saveProgress() {
    if (_duration.inSeconds > 0) {
      _storageService.savePlaybackProgress(
        widget.media.id,
        _position.inSeconds,
        _duration.inSeconds,
      );
    }
  }

  @override
  void dispose() {
    _saveProgress();
    _controlsHideTimer?.cancel();
    _playPauseFocusNode.dispose();
    _player.dispose();

    // Restore orientations
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);
    super.dispose();
  }

  KeyEventResult _handleKeyEvent(FocusNode node, KeyEvent event) {
    if (event is KeyDownEvent) {
      _resetControlsTimer();

      if (event.logicalKey == LogicalKeyboardKey.select ||
          event.logicalKey == LogicalKeyboardKey.enter ||
          event.logicalKey == LogicalKeyboardKey.space) {
        _player.playOrPause();
        return KeyEventResult.handled;
      } else if (event.logicalKey == LogicalKeyboardKey.arrowLeft) {
        final newPos = _position - const Duration(seconds: 10);
        _player.seek(newPos < Duration.zero ? Duration.zero : newPos);
        return KeyEventResult.handled;
      } else if (event.logicalKey == LogicalKeyboardKey.arrowRight) {
        final newPos = _position + const Duration(seconds: 10);
        _player.seek(newPos > _duration ? _duration : newPos);
        return KeyEventResult.handled;
      } else if (event.logicalKey == LogicalKeyboardKey.arrowUp ||
          event.logicalKey == LogicalKeyboardKey.arrowDown) {
        setState(() => _showControls = true);
        return KeyEventResult.handled;
      }
    }
    return KeyEventResult.ignored;
  }

  @override
  Widget build(BuildContext context) {
    return Focus(
      autofocus: true,
      onKeyEvent: _handleKeyEvent,
      child: Scaffold(
        backgroundColor: Colors.black,
        body: GestureDetector(
          onTap: () {
            setState(() => _showControls = !_showControls);
            if (_showControls) _resetControlsTimer();
          },
          child: Stack(
            fit: StackFit.expand,
            children: [
              // Video View
              Center(
                child: Video(
                  controller: _controller,
                  controls: NoVideoControls,
                ),
              ),

              // Loading Spinner
              if (_isLoading)
                Container(
                  color: Colors.black87,
                  child: const Center(
                    child: SpinKitRing(color: AppTheme.watchYellow, size: 50),
                  ),
                ),

              // Error message
              if (_errorMessage != null)
                Container(
                  color: Colors.black.withValues(alpha: 0.9),
                  padding: const EdgeInsets.all(24),
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(LucideIcons.triangleAlert, color: Colors.red, size: 48),
                        const SizedBox(height: 12),
                        Text(_errorMessage!, style: const TextStyle(color: Colors.white, fontSize: 16)),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: _fetchStreams,
                          child: const Text('Try Another Server / Retry'),
                        ),
                      ],
                    ),
                  ),
                ),

              // Custom OSD Controls Overlay
              if (_showControls && !_isLoading && _errorMessage == null)
                _buildControlsOverlay(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildControlsOverlay() {
    return AnimatedOpacity(
      opacity: _showControls ? 1.0 : 0.0,
      duration: const Duration(milliseconds: 200),
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Colors.black.withValues(alpha: 0.7),
              Colors.transparent,
              Colors.black.withValues(alpha: 0.85),
            ],
            stops: const [0.0, 0.5, 1.0],
          ),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
        child: Column(
          children: [
            // Top Bar
            Row(
              children: [
                IconButton(
                  icon: const Icon(LucideIcons.arrowLeft, color: Colors.white, size: 24),
                  onPressed: () => Navigator.pop(context),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        widget.media.title,
                        style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (widget.season != null && widget.episode != null)
                        Text(
                          'S${widget.season} E${widget.episode}',
                          style: const TextStyle(color: AppTheme.textMuted, fontSize: 13),
                        ),
                    ],
                  ),
                ),
                // Server Switcher Button
                TextButton.icon(
                  style: TextButton.styleFrom(
                    backgroundColor: Colors.white.withValues(alpha: 0.15),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                  ),
                  icon: const Icon(LucideIcons.server, size: 16),
                  label: Text(_activeSource?.serverName ?? 'Servers'),
                  onPressed: _showServerSelectorDialog,
                ),
              ],
            ),

            const Spacer(),

            // Center Play / Pause and Seek Buttons
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                IconButton(
                  icon: const Icon(LucideIcons.rotateCcw, color: Colors.white, size: 30),
                  onPressed: () {
                    _player.seek(_position - const Duration(seconds: 10));
                    _resetControlsTimer();
                  },
                ),
                const SizedBox(width: 24),
                IconButton(
                  focusNode: _playPauseFocusNode,
                  icon: Icon(
                    _isPlaying ? Icons.pause_circle_filled_rounded : Icons.play_circle_filled_rounded,
                    color: AppTheme.watchYellow,
                    size: 64,
                  ),
                  onPressed: () {
                    _player.playOrPause();
                    _resetControlsTimer();
                  },
                ),
                const SizedBox(width: 24),
                IconButton(
                  icon: const Icon(LucideIcons.rotateCw, color: Colors.white, size: 30),
                  onPressed: () {
                    _player.seek(_position + const Duration(seconds: 10));
                    _resetControlsTimer();
                  },
                ),
              ],
            ),

            const Spacer(),

            // Bottom Progress Bar and Timestamps
            Row(
              children: [
                Text(
                  _formatDuration(_position),
                  style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                ),
                Expanded(
                  child: SliderTheme(
                    data: SliderTheme.of(context).copyWith(
                      activeTrackColor: AppTheme.watchYellow,
                      inactiveTrackColor: Colors.white.withValues(alpha: 0.3),
                      thumbColor: AppTheme.watchYellow,
                      trackHeight: 4,
                    ),
                    child: Slider(
                      value: _duration.inSeconds > 0
                          ? (_position.inSeconds / _duration.inSeconds).clamp(0.0, 1.0)
                          : 0.0,
                      onChanged: (val) {
                        _resetControlsTimer();
                        final seekSec = (val * _duration.inSeconds).toInt();
                        _player.seek(Duration(seconds: seekSec));
                      },
                    ),
                  ),
                ),
                Text(
                  _formatDuration(_duration),
                  style: const TextStyle(color: AppTheme.textMuted, fontSize: 13),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showServerSelectorDialog() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.surfaceDark,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (ctx) {
        return Container(
          padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Select Streaming Server',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              const SizedBox(height: 12),
              ..._sources.map((src) {
                final isSelected = _activeSource?.serverName == src.serverName;
                return ListTile(
                  leading: Icon(
                    isSelected ? Icons.check_circle : Icons.radio_button_unchecked,
                    color: isSelected ? AppTheme.watchYellow : Colors.white54,
                  ),
                  title: Text(src.serverName, style: const TextStyle(color: Colors.white)),
                  subtitle: Text(src.quality ?? src.type.name.toUpperCase(), style: const TextStyle(color: AppTheme.textMuted)),
                  onTap: () {
                    Navigator.pop(ctx);
                    _playSource(src);
                  },
                );
              }),
            ],
          ),
        );
      },
    );
  }

  String _formatDuration(Duration d) {
    final minutes = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final seconds = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    if (d.inHours > 0) {
      return '${d.inHours}:$minutes:$seconds';
    }
    return '$minutes:$seconds';
  }
}
