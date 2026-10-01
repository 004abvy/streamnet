import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../models/media_item.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/responsive.dart';

class DetailsHeroSection extends ConsumerWidget {
  final MediaItem media;
  final VoidCallback onWatchPressed;
  final VoidCallback onVipPressed;
  final VoidCallback onTrailerPressed;

  const DetailsHeroSection({
    super.key,
    required this.media,
    required this.onWatchPressed,
    required this.onVipPressed,
    required this.onTrailerPressed,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isTV = Responsive.isTV(context);
    final isMobile = Responsive.isMobile(context);

    return Padding(
      padding: EdgeInsets.symmetric(
        horizontal: isMobile ? 16 : 40,
        vertical: 16,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Poster + Metadata Row
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Poster Card with Shadow & Border
              ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Container(
                  width: isMobile ? 120 : (isTV ? 200 : 160),
                  height: isMobile ? 180 : (isTV ? 300 : 240),
                  decoration: BoxDecoration(
                    color: AppTheme.cardBg,
                    border: Border.all(color: AppTheme.cardBorder),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.5),
                        blurRadius: 16,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: CachedNetworkImage(
                    imageUrl: media.fullPosterUrl,
                    fit: BoxFit.cover,
                    errorWidget: (_, __, ___) => Container(
                      color: AppTheme.cardBg,
                      child: const Icon(LucideIcons.film, color: AppTheme.textMuted, size: 36),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 20),

              // Title and Meta Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Title
                    Text(
                      media.title,
                      style: TextStyle(
                        fontSize: isMobile ? 22 : (isTV ? 36 : 28),
                        fontWeight: FontWeight.w900,
                        letterSpacing: -0.5,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 10),

                    // Badges (Rating, Year, Type)
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        // Rating Badge
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppTheme.watchYellow.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: AppTheme.watchYellow.withValues(alpha: 0.4)),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.star_rounded, color: AppTheme.watchYellow, size: 16),
                              const SizedBox(width: 4),
                              Text(
                                media.rating.toStringAsFixed(1),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),

                        // Release Year
                        if (media.releaseDate != null)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppTheme.cardBg,
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: AppTheme.cardBorder),
                            ),
                            child: Text(
                              media.releaseDate!.split('-').first,
                              style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                            ),
                          ),

                        // Media Type
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppTheme.cardBg,
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: AppTheme.cardBorder),
                          ),
                          child: Text(
                            media.type.name.toUpperCase(),
                            style: const TextStyle(
                              color: AppTheme.textMuted,
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // Actions Row: Play Now, VIP Server, Trailer
                    Wrap(
                      spacing: 12,
                      runSpacing: 10,
                      children: [
                        // 1. VIP Server Button (Gold Gradient)
                        Container(
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [Color(0xFFFFD700), Color(0xFFFFA500)],
                            ),
                            borderRadius: BorderRadius.circular(20),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFFFFD700).withValues(alpha: 0.35),
                                blurRadius: 10,
                                offset: const Offset(0, 3),
                              ),
                            ],
                          ),
                          child: ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.transparent,
                              shadowColor: Colors.transparent,
                              foregroundColor: Colors.black,
                              padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                            ),
                            icon: const Icon(LucideIcons.sparkles, size: 17, color: Colors.black),
                            label: const Text(
                              'VIP Player',
                              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Colors.black),
                            ),
                            onPressed: onVipPressed,
                          ),
                        ),

                        // 2. Play Now Button
                        ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.cardBg,
                            foregroundColor: Colors.white,
                            side: const BorderSide(color: AppTheme.cardBorder),
                            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                          ),
                          icon: const Icon(LucideIcons.play, size: 16),
                          label: Text(
                            media.type == MediaType.movie ? 'Play' : 'Ep 1',
                            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                          ),
                          onPressed: onWatchPressed,
                        ),

                        // 3. Trailer
                        OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.white70,
                            side: const BorderSide(color: AppTheme.cardBorder),
                            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                          ),
                          icon: const Icon(LucideIcons.clapperboard, size: 16),
                          label: const Text('Trailer', style: TextStyle(fontWeight: FontWeight.w500, fontSize: 13)),
                          onPressed: onTrailerPressed,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 28),

          // Overview Section
          if (media.overview != null && media.overview!.isNotEmpty) ...[
            Row(
              children: [
                Container(
                  width: 4,
                  height: 16,
                  decoration: BoxDecoration(
                    color: AppTheme.watchYellow,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(width: 8),
                const Text(
                  'Overview',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              media.overview!,
              style: const TextStyle(
                fontSize: 14,
                color: AppTheme.textMuted,
                height: 1.6,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
