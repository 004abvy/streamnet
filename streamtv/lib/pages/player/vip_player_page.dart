import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:media_kit/media_kit.dart';
import 'package:media_kit_video/media_kit_video.dart';
import 'package:flutter_spinkit/flutter_spinkit.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../models/media_item.dart';
import '../../models/stream_source.dart';
import '../../services/stream_service.dart';
import '../../services/storage_service.dart';
import '../../core/theme/app_theme.dart';

class VipPlayerPage extends StatefulWidget {
  final MediaItem media;
  final int? season;
  final int? episode;

  const VipPlayerPage({
    super.key,
    required this.media,
    this.season,
    this.episode,
  });

  @override
  State<VipPlayerPage> createState() => _VipPlayerPageState();
}

class _VipPlayerPageState extends State<VipPlayerPage> {
  late final Player _player;
  late final VideoController _controller;
  final StreamService _streamService = StreamService();
  final StorageService _storageService = StorageService();

  List<StreamSource> _sources = [];
  List<AppSubtitleTrack> _allSubtitles = [];
  List<AudioTrackOption> _audioTracks = [];

  StreamSource? _activeSource;
  bool _isLoading = true;
  String? _errorMessage;

  // VIP Authentication state
  bool _isVipUnlocked = false;
  final TextEditingController _passkeyController = TextEditingController();
  String? _passkeyError;

  // Playback & OSD controls
  bool _showControls = true;
  Timer? _controlsHideTimer;
  Duration _position = Duration.zero;
  Duration _duration = Duration.zero;
  bool _isPlaying = false;
  bool _isBuffering = false;
  bool _isSwitchingSource = false;
  Duration? _targetResumePosition;
  String _loadingStatusText = 'Loading stream...';
  double _playbackRate = 1.0;
  BoxFit _aspectRatioFit = BoxFit.contain;

  // Prescanned Subtitle & Audio State
  AppSubtitleTrack? _selectedSubtitle;
  AudioTrackOption? _selectedAudioTrack;

  // TV Remote Focus Nodes for D-pad navigation
  final FocusNode _backBtnFocusNode = FocusNode();
  final FocusNode _audioBtnFocusNode = FocusNode();
  final FocusNode _subtitlesBtnFocusNode = FocusNode();
  final FocusNode _speedBtnFocusNode = FocusNode();
  final FocusNode _aspectBtnFocusNode = FocusNode();
  final FocusNode _skipIntroFocusNode = FocusNode();
  final FocusNode _rewindBtnFocusNode = FocusNode();
  final FocusNode _playPauseFocusNode = FocusNode();
  final FocusNode _forwardBtnFocusNode = FocusNode();
  final FocusNode _seekSliderFocusNode = FocusNode();

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);

    _player = Player(
      configuration: const PlayerConfiguration(
        bufferSize: 64 * 1024 * 1024,
        logLevel: MPVLogLevel.warn,
      ),
    );
    _controller = VideoController(_player);

    _checkVipAuth();
  }

  Future<void> _checkVipAuth() async {
    final prefs = await SharedPreferences.getInstance();
    final unlocked = prefs.getBool('vip_unlocked') ?? false;
    setState(() => _isVipUnlocked = unlocked);

    if (unlocked) {
      _initPlayer();
    }
  }

  void _unlockVip() async {
    final passkey = _passkeyController.text.trim();
    if (passkey == '123' || passkey.isEmpty) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('vip_unlocked', true);
      setState(() {
        _isVipUnlocked = true;
        _passkeyError = null;
      });
      _initPlayer();
    } else {
      setState(() {
        _passkeyError = 'Invalid VIP Passkey. (Hint: 123)';
      });
    }
  }

  void _initPlayer() {
    _setupPlayerListeners();
    _fetchStreams();
  }

  void _setupPlayerListeners() {
    _player.stream.position.listen((pos) {
      if (mounted) {
        setState(() {
          _position = pos;
          if (_targetResumePosition != null && _targetResumePosition! > Duration.zero) {
            if (pos >= _targetResumePosition! - const Duration(seconds: 2)) {
              _isSwitchingSource = false;
              _targetResumePosition = null;
            }
          } else if (_isSwitchingSource && pos > Duration.zero) {
            _isSwitchingSource = false;
          }
        });
      }
    });

    _player.stream.duration.listen((dur) {
      if (mounted) setState(() => _duration = dur);
    });

    _player.stream.playing.listen((playing) {
      if (mounted) {
        setState(() {
          _isPlaying = playing;
          if (playing && !_isBuffering) {
            _isSwitchingSource = false;
          }
        });
      }
    });

    _player.stream.buffering.listen((buffering) {
      if (mounted) {
        setState(() {
          _isBuffering = buffering;
          if (!buffering && _isPlaying) {
            _isSwitchingSource = false;
          }
        });
      }
    });

    _player.stream.rate.listen((rate) {
      if (mounted) setState(() => _playbackRate = rate);
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
      _loadingStatusText = 'Pre-scanning Direct Streams...';
    });

    try {
      final bundle = await _streamService.getStreamBundleForMedia(
        media: widget.media,
        season: widget.season,
        episode: widget.episode,
      );

      if (bundle.sources.isEmpty) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'No playable streams found for this title.';
        });
        return;
      }

      setState(() {
        _sources = bundle.sources;
        _allSubtitles = bundle.subtitles;
        _audioTracks = bundle.audioTracks;
        _activeSource = bundle.sources.first;

        // Automatically preselect matching audio track
        if (bundle.audioTracks.isNotEmpty) {
          _selectedAudioTrack = bundle.audioTracks.firstWhere(
            (a) => a.isDefault || a.url == bundle.sources.first.url,
            orElse: () => bundle.audioTracks.first,
          );
        }

        // Automatically preselect default English subtitle
        if (bundle.subtitles.isNotEmpty) {
          _selectedSubtitle = bundle.subtitles.firstWhere(
            (s) => s.isDefault || s.language == 'en',
            orElse: () => bundle.subtitles.first,
          );
        }
        _isLoading = false;
      });

      _playSource(bundle.sources.first);
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'Failed to load streams: $e';
      });
    }
  }

  void _playSource(StreamSource source, {Duration? resumeAt}) {
    final targetPosition = resumeAt ?? _position;

    setState(() {
      _activeSource = source;
      _isSwitchingSource = true;
      _targetResumePosition = targetPosition > const Duration(seconds: 1) ? targetPosition : null;
      _loadingStatusText = 'Switching stream...';
    });

    final headers = source.headers ?? {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://rivestream.ru/',
      'Origin': 'https://rivestream.ru',
    };

    _player.open(
      Media(
        source.url,
        httpHeaders: headers,
        start: targetPosition > const Duration(seconds: 1) ? targetPosition : null,
      ),
      play: true,
    );

    Future.delayed(const Duration(milliseconds: 1500), () {
      if (mounted && _isSwitchingSource) {
        setState(() {
          _isSwitchingSource = false;
          _targetResumePosition = null;
        });
      }
    });

    if (_selectedSubtitle != null) {
      _setSubtitle(_selectedSubtitle);
    } else if (source.subtitles.isNotEmpty) {
      final sub = source.subtitles.firstWhere(
        (s) => s.isDefault || s.language == 'en',
        orElse: () => source.subtitles.first,
      );
      _setSubtitle(sub);
    }

    _resetControlsTimer();
  }

  void _setSubtitle(AppSubtitleTrack? sub) {
    setState(() => _selectedSubtitle = sub);
    if (sub != null && sub.file.isNotEmpty) {
      _player.setSubtitleTrack(SubtitleTrack.uri(sub.file));
    } else {
      _player.setSubtitleTrack(SubtitleTrack.no());
    }
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

  void _skipIntro() {
    _resetControlsTimer();
    final newPos = _position + const Duration(seconds: 85);
    _player.seek(newPos > _duration ? _duration : newPos);
  }

  String get _audioButtonLabel {
    if (_selectedAudioTrack != null) {
      return _selectedAudioTrack!.label;
    }
    if (_activeSource != null) {
      return _activeSource!.serverName;
    }
    return 'Audio';
  }

  String get _subtitleButtonLabel {
    if (_selectedSubtitle != null) {
      return _selectedSubtitle!.label;
    }
    return 'Subtitles Off';
  }

  @override
  void dispose() {
    _saveProgress();
    _controlsHideTimer?.cancel();
    _backBtnFocusNode.dispose();
    _audioBtnFocusNode.dispose();
    _subtitlesBtnFocusNode.dispose();
    _speedBtnFocusNode.dispose();
    _aspectBtnFocusNode.dispose();
    _skipIntroFocusNode.dispose();
    _rewindBtnFocusNode.dispose();
    _playPauseFocusNode.dispose();
    _forwardBtnFocusNode.dispose();
    _seekSliderFocusNode.dispose();
    _passkeyController.dispose();
    _player.dispose();

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
      if (!_showControls) {
        _resetControlsTimer();
        _playPauseFocusNode.requestFocus();
        return KeyEventResult.handled;
      }

      _resetControlsTimer();

      // Dedicated TV Remote Media Buttons
      if (event.logicalKey == LogicalKeyboardKey.mediaPlayPause) {
        _player.playOrPause();
        return KeyEventResult.handled;
      } else if (event.logicalKey == LogicalKeyboardKey.mediaRewind) {
        final newPos = _position - const Duration(seconds: 10);
        _player.seek(newPos < Duration.zero ? Duration.zero : newPos);
        return KeyEventResult.handled;
      } else if (event.logicalKey == LogicalKeyboardKey.mediaFastForward) {
        final newPos = _position + const Duration(seconds: 10);
        _player.seek(newPos > _duration ? _duration : newPos);
        return KeyEventResult.handled;
      }

      // Back / Escape key
      if (event.logicalKey == LogicalKeyboardKey.escape ||
          event.logicalKey == LogicalKeyboardKey.goBack) {
        Navigator.pop(context);
        return KeyEventResult.handled;
      }

      // ONLY when focused on the Player Seek Line (Slider):
      if (_seekSliderFocusNode.hasFocus) {
        if (event.logicalKey == LogicalKeyboardKey.arrowLeft) {
          final newPos = _position - const Duration(seconds: 10);
          _player.seek(newPos < Duration.zero ? Duration.zero : newPos);
          return KeyEventResult.handled;
        } else if (event.logicalKey == LogicalKeyboardKey.arrowRight) {
          final newPos = _position + const Duration(seconds: 10);
          _player.seek(newPos > _duration ? _duration : newPos);
          return KeyEventResult.handled;
        } else if (event.logicalKey == LogicalKeyboardKey.arrowUp) {
          _playPauseFocusNode.requestFocus();
          return KeyEventResult.handled;
        } else if (event.logicalKey == LogicalKeyboardKey.select ||
                   event.logicalKey == LogicalKeyboardKey.enter ||
                   event.logicalKey == LogicalKeyboardKey.space) {
          _player.playOrPause();
          return KeyEventResult.handled;
        }
      }
    }

    return KeyEventResult.ignored;
  }

  @override
  Widget build(BuildContext context) {
    if (!_isVipUnlocked) {
      return _buildVipAuthScreen();
    }

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
              Center(
                child: Video(
                  controller: _controller,
                  controls: NoVideoControls,
                  fit: _aspectRatioFit,
                ),
              ),
              if (_isLoading || (_isSwitchingSource && (!_isPlaying || _isBuffering)) || (_isBuffering && !_isPlaying))
                _buildLoadingOverlay(),
              if (_errorMessage != null)
                _buildErrorOverlay(),
              if (_showControls && !_isLoading && _errorMessage == null)
                _buildVipControlsOverlay(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLoadingOverlay() {
    final isSwitching = _isSwitchingSource;
    final resumePoint = _targetResumePosition;

    return Container(
      color: Colors.black.withValues(alpha: 0.78),
      child: Center(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 24),
          decoration: BoxDecoration(
            color: AppTheme.cardBg.withValues(alpha: 0.95),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0xFFFFD700).withValues(alpha: 0.4)),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFFFFD700).withValues(alpha: 0.15),
                blurRadius: 30,
                spreadRadius: 2,
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SpinKitRing(
                color: Color(0xFFFFD700),
                size: 48,
                lineWidth: 3.5,
              ),
              const SizedBox(height: 18),
              Text(
                isSwitching ? _loadingStatusText : (_isLoading ? 'Pre-scanning Direct Streams...' : 'Buffering Stream...'),
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.2,
                ),
              ),
              if (resumePoint != null && resumePoint > Duration.zero) ...[
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFD700).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(LucideIcons.history, color: Color(0xFFFFD700), size: 13),
                      const SizedBox(width: 6),
                      Text(
                        'Resuming at ${_formatDuration(resumePoint)}',
                        style: const TextStyle(
                          color: Color(0xFFFFD700),
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildVipAuthScreen() {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: Container(
              width: 420,
              constraints: const BoxConstraints(maxWidth: 420),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 22),
              decoration: BoxDecoration(
                color: AppTheme.cardBg,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: const Color(0xFFFFD700).withValues(alpha: 0.3)),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFFFFD700).withValues(alpha: 0.15),
                    blurRadius: 30,
                    spreadRadius: 2,
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        colors: [Color(0xFFFFD700), Color(0xFFFFA500)],
                      ),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(LucideIcons.sparkles, color: Colors.black, size: 26),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'VIP Stream Player',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                      color: Colors.white,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Enter passkey (123) to unlock 4K Ultra HD & multi-audio streams.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: AppTheme.textMuted, fontSize: 12),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _passkeyController,
                    obscureText: true,
                    style: const TextStyle(color: Colors.white, letterSpacing: 3),
                    textAlign: TextAlign.center,
                    decoration: InputDecoration(
                      contentPadding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                      hintText: 'Passkey (e.g. 123)',
                      hintStyle: const TextStyle(color: AppTheme.textMuted, letterSpacing: 1),
                      filled: true,
                      fillColor: Colors.black.withValues(alpha: 0.4),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: AppTheme.cardBorder),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: AppTheme.cardBorder),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: Color(0xFFFFD700), width: 1.5),
                      ),
                    ),
                    onSubmitted: (_) => _unlockVip(),
                  ),
                  if (_passkeyError != null) ...[
                    const SizedBox(height: 8),
                    Text(_passkeyError!, style: const TextStyle(color: Colors.redAccent, fontSize: 12)),
                  ],
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.white70,
                            side: const BorderSide(color: AppTheme.cardBorder),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          ),
                          onPressed: () => Navigator.pop(context),
                          child: const Text('Back'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFFFD700),
                            foregroundColor: Colors.black,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          ),
                          onPressed: _unlockVip,
                          child: const Text('Unlock VIP', style: TextStyle(fontWeight: FontWeight.bold)),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildErrorOverlay() {
    return Container(
      color: Colors.black.withValues(alpha: 0.92),
      padding: const EdgeInsets.all(24),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(LucideIcons.triangleAlert, color: Colors.redAccent, size: 50),
            const SizedBox(height: 12),
            Text(_errorMessage!, style: const TextStyle(color: Colors.white, fontSize: 16)),
            const SizedBox(height: 16),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFFFD700),
                foregroundColor: Colors.black,
              ),
              onPressed: _fetchStreams,
              child: const Text('Retry Scrapers', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildVipControlsOverlay() {
    return AnimatedOpacity(
      opacity: _showControls ? 1.0 : 0.0,
      duration: const Duration(milliseconds: 200),
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Colors.black.withValues(alpha: 0.85),
              Colors.transparent,
              Colors.black.withValues(alpha: 0.90),
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
                  focusNode: _backBtnFocusNode,
                  icon: const Icon(LucideIcons.arrowLeft, color: Colors.white, size: 24),
                  focusColor: const Color(0xFFFFD700).withValues(alpha: 0.3),
                  onPressed: () => Navigator.pop(context),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: const BoxDecoration(
                              gradient: LinearGradient(
                                colors: [Color(0xFFFFD700), Color(0xFFFFA500)],
                              ),
                              borderRadius: BorderRadius.all(Radius.circular(6)),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(LucideIcons.sparkles, color: Colors.black, size: 12),
                                SizedBox(width: 4),
                                Text(
                                  'VIP 4K',
                                  style: TextStyle(
                                    color: Colors.black,
                                    fontSize: 10,
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              widget.media.title,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 17,
                                fontWeight: FontWeight.bold,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      if (widget.season != null && widget.episode != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 2),
                          child: Text(
                            'Season ${widget.season} • Episode ${widget.episode}',
                            style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                          ),
                        ),
                    ],
                  ),
                ),

                // 1. Prescanned Language Selector Button (Shows active language)
                OutlinedButton.icon(
                  focusNode: _audioBtnFocusNode,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFFFFD700),
                    side: const BorderSide(color: Color(0xFFFFD700), width: 1.2),
                    backgroundColor: const Color(0xFFFFD700).withValues(alpha: 0.12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  ),
                  icon: const Icon(LucideIcons.volume2, size: 14, color: Color(0xFFFFD700)),
                  label: Text(
                    _audioButtonLabel,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                  onPressed: _showAudioTracksDialog,
                ),
                const SizedBox(width: 8),

                // 2. Prescanned Subtitles Selector Button (Shows active subtitle)
                OutlinedButton.icon(
                  focusNode: _subtitlesBtnFocusNode,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: _selectedSubtitle != null ? const Color(0xFFFFD700) : Colors.white70,
                    side: BorderSide(
                      color: _selectedSubtitle != null ? const Color(0xFFFFD700) : AppTheme.cardBorder,
                      width: 1.2,
                    ),
                    backgroundColor: _selectedSubtitle != null ? const Color(0xFFFFD700).withValues(alpha: 0.12) : Colors.transparent,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  ),
                  icon: Icon(
                    LucideIcons.subtitles,
                    size: 14,
                    color: _selectedSubtitle != null ? const Color(0xFFFFD700) : Colors.white70,
                  ),
                  label: Text(
                    _subtitleButtonLabel,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                  onPressed: _showSubtitlesDialog,
                ),
                const SizedBox(width: 8),

                // 3. Playback Speed Button
                TextButton.icon(
                  focusNode: _speedBtnFocusNode,
                  style: TextButton.styleFrom(
                    backgroundColor: Colors.white.withValues(alpha: 0.12),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  ),
                  icon: const Icon(LucideIcons.gauge, size: 13),
                  label: Text('${_playbackRate}x', style: const TextStyle(fontSize: 11)),
                  onPressed: _cyclePlaybackSpeed,
                ),
                const SizedBox(width: 6),

                // 4. Aspect Ratio Button
                IconButton(
                  focusNode: _aspectBtnFocusNode,
                  icon: const Icon(LucideIcons.scan, color: Colors.white, size: 18),
                  tooltip: 'Aspect Ratio',
                  focusColor: const Color(0xFFFFD700).withValues(alpha: 0.3),
                  onPressed: _cycleAspectRatio,
                ),
                const SizedBox(width: 6),

                // 5. +85s Skip Intro Button
                OutlinedButton.icon(
                  focusNode: _skipIntroFocusNode,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    side: const BorderSide(color: AppTheme.cardBorder),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  ),
                  icon: const Icon(LucideIcons.fastForward, size: 13),
                  label: const Text('+85s', style: TextStyle(fontSize: 11)),
                  onPressed: _skipIntro,
                ),
              ],
            ),

            const Spacer(),

            // Center Play / Pause and Fast Seek Controls
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                IconButton(
                  focusNode: _rewindBtnFocusNode,
                  icon: const Icon(LucideIcons.rotateCcw, color: Colors.white, size: 34),
                  focusColor: const Color(0xFFFFD700).withValues(alpha: 0.3),
                  onPressed: () {
                    _player.seek(_position - const Duration(seconds: 10));
                    _resetControlsTimer();
                  },
                ),
                const SizedBox(width: 32),
                IconButton(
                  focusNode: _playPauseFocusNode,
                  icon: Icon(
                    _isPlaying ? Icons.pause_circle_filled_rounded : Icons.play_circle_filled_rounded,
                    color: const Color(0xFFFFD700),
                    size: 76,
                  ),
                  focusColor: const Color(0xFFFFD700).withValues(alpha: 0.3),
                  onPressed: () {
                    _player.playOrPause();
                    _resetControlsTimer();
                  },
                ),
                const SizedBox(width: 32),
                IconButton(
                  focusNode: _forwardBtnFocusNode,
                  icon: const Icon(LucideIcons.rotateCw, color: Colors.white, size: 34),
                  focusColor: const Color(0xFFFFD700).withValues(alpha: 0.3),
                  onPressed: () {
                    _player.seek(_position + const Duration(seconds: 10));
                    _resetControlsTimer();
                  },
                ),
              ],
            ),

            const Spacer(),

            // Bottom Progress Bar & Timestamps
            Row(
              children: [
                Text(
                  _formatDuration(_position),
                  style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                ),
                Expanded(
                  child: SliderTheme(
                    data: SliderTheme.of(context).copyWith(
                      activeTrackColor: const Color(0xFFFFD700),
                      inactiveTrackColor: Colors.white.withValues(alpha: 0.25),
                      thumbColor: const Color(0xFFFFD700),
                      overlayColor: const Color(0xFFFFD700).withValues(alpha: 0.24),
                      trackHeight: 4,
                    ),
                    child: Slider(
                      focusNode: _seekSliderFocusNode,
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

  void _cyclePlaybackSpeed() {
    _resetControlsTimer();
    final speeds = [1.0, 1.25, 1.5, 2.0, 0.75];
    final currentIdx = speeds.indexOf(_playbackRate);
    final nextRate = speeds[(currentIdx + 1) % speeds.length];
    _player.setRate(nextRate);
  }

  void _cycleAspectRatio() {
    _resetControlsTimer();
    setState(() {
      if (_aspectRatioFit == BoxFit.contain) {
        _aspectRatioFit = BoxFit.cover;
      } else if (_aspectRatioFit == BoxFit.cover) {
        _aspectRatioFit = BoxFit.fill;
      } else {
        _aspectRatioFit = BoxFit.contain;
      }
    });
  }

  void _showSubtitlesDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.surfaceDark,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        final subtitles = _allSubtitles.isNotEmpty ? _allSubtitles : (_activeSource?.subtitles ?? []);

        return ConstrainedBox(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.8,
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(LucideIcons.subtitles, color: Color(0xFFFFD700), size: 20),
                    const SizedBox(width: 8),
                    const Text(
                      'Subtitles & Captions',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '${subtitles.length} Available',
                        style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Subtitle Off Option
                ListTile(
                  leading: Icon(
                    _selectedSubtitle == null ? Icons.check_circle : Icons.radio_button_unchecked,
                    color: _selectedSubtitle == null ? const Color(0xFFFFD700) : Colors.white54,
                  ),
                  title: const Text('Off (Subtitles Disabled)', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                  onTap: () {
                    Navigator.pop(ctx);
                    _setSubtitle(null);
                  },
                ),
                const Divider(color: AppTheme.cardBorder, height: 1),

                // Subtitle Tracks List
                if (subtitles.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 24),
                    child: Center(
                      child: Text('No subtitle tracks available for this stream.', style: TextStyle(color: AppTheme.textMuted)),
                    ),
                  )
                else
                  Flexible(
                    child: ListView.builder(
                      shrinkWrap: true,
                      itemCount: subtitles.length,
                      itemBuilder: (context, index) {
                        final sub = subtitles[index];
                        final isSelected = _selectedSubtitle?.file == sub.file;

                        return ListTile(
                          leading: Icon(
                            isSelected ? Icons.check_circle : Icons.radio_button_unchecked,
                            color: isSelected ? const Color(0xFFFFD700) : Colors.white54,
                          ),
                          title: Text(sub.label, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                          subtitle: Text(sub.language.toUpperCase(), style: const TextStyle(color: AppTheme.textMuted)),
                          trailing: sub.isDefault
                              ? Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFFFD700).withValues(alpha: 0.2),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: const Text('DEFAULT', style: TextStyle(fontSize: 10, color: Color(0xFFFFD700), fontWeight: FontWeight.bold)),
                                )
                              : null,
                          onTap: () {
                            Navigator.pop(ctx);
                            _setSubtitle(sub);
                          },
                        );
                      },
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showAudioTracksDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.surfaceDark,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        final audioOptions = _audioTracks;

        return ConstrainedBox(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.8,
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(LucideIcons.volume2, color: Color(0xFFFFD700), size: 20),
                    const SizedBox(width: 8),
                    const Text(
                      'Select Audio Language',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '${audioOptions.isNotEmpty ? audioOptions.length : _sources.length} Languages',
                        style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                if (audioOptions.isNotEmpty)
                  Flexible(
                    child: ListView.builder(
                      shrinkWrap: true,
                      itemCount: audioOptions.length,
                      itemBuilder: (context, index) {
                        final opt = audioOptions[index];
                        final isSelected = _selectedAudioTrack?.id == opt.id || _activeSource?.url == opt.url;

                        return ListTile(
                          leading: Icon(
                            isSelected ? Icons.check_circle : Icons.radio_button_unchecked,
                            color: isSelected ? const Color(0xFFFFD700) : Colors.white54,
                          ),
                          title: Text(opt.label, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                          subtitle: Text(opt.quality, style: const TextStyle(color: AppTheme.textMuted)),
                          trailing: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: isSelected ? const Color(0xFFFFD700) : Colors.white.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              opt.badge,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: isSelected ? Colors.black : Colors.white70,
                              ),
                            ),
                          ),
                          onTap: () {
                            Navigator.pop(ctx);
                            setState(() => _selectedAudioTrack = opt);
                            final src = StreamSource(
                              serverName: opt.label,
                              url: opt.url,
                              type: StreamType.hls,
                              quality: opt.quality,
                              headers: opt.headers,
                              subtitles: _allSubtitles,
                            );
                            _playSource(src, resumeAt: _position);
                          },
                        );
                      },
                    ),
                  )
                else
                  Flexible(
                    child: ListView.builder(
                      shrinkWrap: true,
                      itemCount: _sources.length,
                      itemBuilder: (context, index) {
                        final src = _sources[index];
                        final isSelected = _activeSource?.serverName == src.serverName;

                        return ListTile(
                          leading: Icon(
                            isSelected ? Icons.check_circle : Icons.radio_button_unchecked,
                            color: isSelected ? const Color(0xFFFFD700) : Colors.white54,
                          ),
                          title: Text(src.serverName, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                          subtitle: Text(src.quality ?? 'HD Master', style: const TextStyle(color: AppTheme.textMuted)),
                          onTap: () {
                            Navigator.pop(ctx);
                            _playSource(src, resumeAt: _position);
                          },
                        );
                      },
                    ),
                  ),
              ],
            ),
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
