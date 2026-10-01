import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../models/media_item.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/responsive.dart';

class HeroCarouselSection extends StatefulWidget {
  final List<MediaItem> movies;
  final Function(MediaItem) onWatch;
  final Function(MediaItem) onDetails;
  final VoidCallback? onAnnouncements;
  final VoidCallback? onProfile;

  const HeroCarouselSection({
    super.key,
    required this.movies,
    required this.onWatch,
    required this.onDetails,
    this.onAnnouncements,
    this.onProfile,
  });

  @override
  State<HeroCarouselSection> createState() => _HeroCarouselSectionState();
}

class _HeroCarouselSectionState extends State<HeroCarouselSection> {
  int _currentIndex = 0;
  Timer? _timer;
  bool _isSaved = false;

  @override
  void initState() {
    super.initState();
    _startAutoSlide();
  }

  void _startAutoSlide() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 6), (_) {
      if (widget.movies.isNotEmpty && mounted) {
        setState(() {
          _currentIndex = (_currentIndex + 1) % widget.movies.take(5).length;
        });
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final displayMovies = widget.movies.take(5).toList();
    if (displayMovies.isEmpty) return const SizedBox.shrink();

    final currentMovie = displayMovies[_currentIndex.clamp(0, displayMovies.length - 1)];
    final isTV = Responsive.isTV(context);
    final isMobile = Responsive.isMobile(context);
    final height = isTV ? 480.0 : (isMobile ? 320.0 : 420.0);

    return Container(
      margin: EdgeInsets.symmetric(
        horizontal: isMobile ? 12 : 32,
        vertical: 12,
      ),
      height: height,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          // 1. Ambient Background Glow/Blur
          Positioned.fill(
            child: Transform.scale(
              scale: 1.05,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(32),
                child: ImageFiltered(
                  imageFilter: ImageFilter.blur(sigmaX: 40, sigmaY: 40),
                  child: CachedNetworkImage(
                    imageUrl: currentMovie.fullBackdropUrl,
                    fit: BoxFit.cover,
                  ),
                ),
              ),
            ),
          ),

          // 2. Rounded Backdrop Frame
          ClipRRect(
            borderRadius: BorderRadius.circular(24),
            child: Stack(
              fit: StackFit.expand,
              children: [
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 700),
                  child: CachedNetworkImage(
                    key: ValueKey(currentMovie.id),
                    imageUrl: currentMovie.fullBackdropUrl,
                    fit: BoxFit.cover,
                    width: double.infinity,
                    height: double.infinity,
                    alignment: Alignment.topCenter,
                  ),
                ),

                // Dark Vignette
                Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.black.withValues(alpha: 0.3),
                        Colors.transparent,
                        Colors.black.withValues(alpha: 0.85),
                      ],
                      stops: const [0.0, 0.45, 1.0],
                    ),
                  ),
                ),

                // Top Right Action Pills
                Positioned(
                  top: 16,
                  right: 16,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.55),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        GestureDetector(
                          onTap: widget.onAnnouncements,
                          child: const Icon(LucideIcons.bell, color: Colors.white, size: 16),
                        ),
                        Container(
                          width: 1,
                          height: 14,
                          margin: const EdgeInsets.symmetric(horizontal: 8),
                          color: Colors.white.withValues(alpha: 0.2),
                        ),
                        GestureDetector(
                          onTap: widget.onProfile,
                          child: const Icon(LucideIcons.user, color: Colors.white, size: 16),
                        ),
                      ],
                    ),
                  ),
                ),

                // Slide Dot Indicators
                Positioned(
                  bottom: 24,
                  right: 24,
                  child: Row(
                    children: List.generate(displayMovies.length, (i) {
                      final active = i == _currentIndex;
                      return GestureDetector(
                        onTap: () {
                          setState(() => _currentIndex = i);
                          _startAutoSlide();
                        },
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 250),
                          margin: const EdgeInsets.symmetric(horizontal: 4),
                          width: active ? 22 : 7,
                          height: 7,
                          decoration: BoxDecoration(
                            color: active ? AppTheme.watchYellow : Colors.white.withValues(alpha: 0.3),
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                      );
                    }),
                  ),
                ),
              ],
            ),
          ),

          // 3. Floating Bottom Center Movie Details Pill
          Positioned(
            bottom: isMobile ? 12 : 20,
            left: isMobile ? 16 : 28,
            right: isMobile ? 16 : 140,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                // Tag
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.6),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                  ),
                  child: Text(
                    currentMovie.type == MediaType.tv ? 'SHOW' : 'MOVIE',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.0,
                    ),
                  ),
                ),
                const SizedBox(height: 6),

                // Title
                ShaderMask(
                  shaderCallback: (bounds) => const LinearGradient(
                    colors: [Colors.white, Color(0xFFE0E0E0)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ).createShader(bounds),
                  child: Text(
                    currentMovie.title,
                    style: TextStyle(
                      fontSize: isMobile ? 20 : (isTV ? 32 : 26),
                      fontWeight: FontWeight.w900,
                      letterSpacing: -0.5,
                      color: Colors.white,
                      shadows: [
                        Shadow(color: Colors.black.withValues(alpha: 0.8), blurRadius: 10, offset: const Offset(0, 2)),
                      ],
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(height: 12),

                // Buttons
                Row(
                  children: [
                    _HeroButton(
                      label: 'Watch',
                      icon: LucideIcons.play,
                      backgroundColor: AppTheme.watchYellow,
                      foregroundColor: Colors.black,
                      onTap: () => widget.onWatch(currentMovie),
                    ),
                    const SizedBox(width: 10),
                    _HeroIconButton(
                      icon: _isSaved ? Icons.bookmark_added_rounded : LucideIcons.bookmark,
                      isActive: _isSaved,
                      onTap: () => setState(() => _isSaved = !_isSaved),
                    ),
                    const SizedBox(width: 8),
                    _HeroIconButton(
                      icon: LucideIcons.info,
                      isActive: false,
                      onTap: () => widget.onDetails(currentMovie),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _HeroButton extends StatefulWidget {
  final String label;
  final IconData icon;
  final Color backgroundColor;
  final Color foregroundColor;
  final VoidCallback onTap;

  const _HeroButton({
    required this.label,
    required this.icon,
    required this.backgroundColor,
    required this.foregroundColor,
    required this.onTap,
  });

  @override
  State<_HeroButton> createState() => _HeroButtonState();
}

class _HeroButtonState extends State<_HeroButton> {
  bool _isFocused = false;

  @override
  Widget build(BuildContext context) {
    return Focus(
      onFocusChange: (focused) => setState(() => _isFocused = focused),
      child: GestureDetector(
        onTap: widget.onTap,
        child: AnimatedScale(
          scale: _isFocused ? 1.08 : 1.0,
          duration: const Duration(milliseconds: 150),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 10),
            decoration: BoxDecoration(
              color: widget.backgroundColor,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: widget.backgroundColor.withValues(alpha: _isFocused ? 0.6 : 0.3),
                  blurRadius: _isFocused ? 16 : 8,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(widget.icon, color: widget.foregroundColor, size: 16),
                const SizedBox(width: 8),
                Text(
                  widget.label,
                  style: TextStyle(
                    color: widget.foregroundColor,
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                    letterSpacing: 0.2,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _HeroIconButton extends StatefulWidget {
  final IconData icon;
  final bool isActive;
  final VoidCallback onTap;

  const _HeroIconButton({
    required this.icon,
    required this.isActive,
    required this.onTap,
  });

  @override
  State<_HeroIconButton> createState() => _HeroIconButtonState();
}

class _HeroIconButtonState extends State<_HeroIconButton> {
  bool _isFocused = false;

  @override
  Widget build(BuildContext context) {
    return Focus(
      onFocusChange: (focused) => setState(() => _isFocused = focused),
      child: GestureDetector(
        onTap: widget.onTap,
        child: AnimatedScale(
          scale: _isFocused ? 1.1 : 1.0,
          duration: const Duration(milliseconds: 150),
          child: Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.55),
              shape: BoxShape.circle,
              border: Border.all(
                color: _isFocused ? AppTheme.watchYellow : Colors.white.withValues(alpha: 0.2),
                width: _isFocused ? 2 : 1,
              ),
            ),
            child: Icon(
              widget.icon,
              color: widget.isActive ? AppTheme.watchYellow : Colors.white,
              size: 16,
            ),
          ),
        ),
      ),
    );
  }
}
