import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter_spinkit/flutter_spinkit.dart';
import '../../models/media_item.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/responsive.dart';

class PosterCard extends StatefulWidget {
  final MediaItem media;
  final VoidCallback onTap;

  const PosterCard({
    super.key,
    required this.media,
    required this.onTap,
  });

  @override
  State<PosterCard> createState() => _PosterCardState();
}

class _PosterCardState extends State<PosterCard> {
  bool _isHoveredOrFocused = false;

  @override
  Widget build(BuildContext context) {
    final width = Responsive.getCardWidth(context);
    final height = Responsive.getCardHeight(context);
    final year = widget.media.releaseDate?.split('-').first;

    return Focus(
      onFocusChange: (focused) => setState(() => _isHoveredOrFocused = focused),
      child: MouseRegion(
        onEnter: (_) => setState(() => _isHoveredOrFocused = true),
        onExit: (_) => setState(() => _isHoveredOrFocused = false),
        child: GestureDetector(
          onTap: widget.onTap,
          child: Container(
            width: width,
            margin: const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                // Poster Image with Glow & Hover Scale
                AnimatedScale(
                  scale: _isHoveredOrFocused ? 1.05 : 1.0,
                  duration: const Duration(milliseconds: 180),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    height: height,
                    width: width,
                    decoration: BoxDecoration(
                      color: AppTheme.cardBg,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: _isHoveredOrFocused ? AppTheme.watchYellow : AppTheme.cardBorder,
                        width: _isHoveredOrFocused ? 2.0 : 1.0,
                      ),
                      boxShadow: _isHoveredOrFocused
                          ? [
                              BoxShadow(
                                color: AppTheme.watchYellow.withValues(alpha: 0.3),
                                blurRadius: 16,
                                spreadRadius: 1,
                              )
                            ]
                          : [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.4),
                                blurRadius: 6,
                                offset: const Offset(0, 3),
                              )
                            ],
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          CachedNetworkImage(
                            imageUrl: widget.media.fullPosterUrl,
                            fit: BoxFit.cover,
                            placeholder: (context, url) => Container(
                              color: AppTheme.skeletonBase,
                              child: const Center(
                                child: SpinKitFadingCircle(color: AppTheme.watchYellow, size: 24),
                              ),
                            ),
                            errorWidget: (context, url, error) => Container(
                              color: AppTheme.cardBg,
                              child: const Icon(Icons.movie_outlined, color: AppTheme.textMuted),
                            ),
                          ),

                          // Top-right Rating Badge
                          if (widget.media.rating > 0)
                            Positioned(
                              top: 8,
                              right: 8,
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: Colors.black.withValues(alpha: 0.75),
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(Icons.star_rounded, color: AppTheme.watchYellow, size: 14),
                                    const SizedBox(width: 3),
                                    Text(
                                      widget.media.rating.toStringAsFixed(1),
                                      style: const TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),

                          // Bottom-left Type Tag
                          Positioned(
                            bottom: 8,
                            left: 8,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppTheme.cardBg.withValues(alpha: 0.85),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                widget.media.type.name.toUpperCase(),
                                style: const TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.bold,
                                  color: AppTheme.textMuted,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 8),

                // Title Below Poster
                Text(
                  widget.media.title,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: _isHoveredOrFocused ? AppTheme.watchYellow : Colors.white,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),

                // Year
                if (year != null && year.isNotEmpty)
                  Text(
                    year,
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppTheme.textMuted,
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
