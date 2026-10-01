import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_spinkit/flutter_spinkit.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../models/media_item.dart';
import '../../../providers/media_providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/responsive.dart';

class SeasonsEpisodesSection extends ConsumerStatefulWidget {
  final MediaItem media;
  final Function(int season, int episode) onEpisodeSelected;

  const SeasonsEpisodesSection({
    super.key,
    required this.media,
    required this.onEpisodeSelected,
  });

  @override
  ConsumerState<SeasonsEpisodesSection> createState() => _SeasonsEpisodesSectionState();
}

class _SeasonsEpisodesSectionState extends ConsumerState<SeasonsEpisodesSection> {
  int _selectedSeason = 1;

  @override
  Widget build(BuildContext context) {
    final isMobile = Responsive.isMobile(context);
    final seasonCount = widget.media.numberOfSeasons ?? 1;
    final episodesAsync = ref.watch(tvEpisodesProvider((widget.media.id, _selectedSeason)));

    return Padding(
      padding: EdgeInsets.symmetric(horizontal: isMobile ? 16 : 40),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header + Season Selector Dropdown
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
                'Episodes',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              const Spacer(),
              if (seasonCount > 1)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(
                    color: AppTheme.cardBg,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppTheme.cardBorder),
                  ),
                  child: DropdownButton<int>(
                    value: _selectedSeason,
                    underline: const SizedBox.shrink(),
                    dropdownColor: AppTheme.cardBg,
                    items: List.generate(seasonCount, (index) => index + 1).map((s) {
                      return DropdownMenuItem<int>(
                        value: s,
                        child: Text('Season $s', style: const TextStyle(color: Colors.white, fontSize: 13)),
                      );
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) {
                        setState(() => _selectedSeason = val);
                      }
                    },
                  ),
                ),
            ],
          ),
          const SizedBox(height: 14),

          // Episode Cards Horizontal Carousel
          episodesAsync.when(
            data: (episodes) {
              if (episodes.isEmpty) {
                return const Text('No episodes available.', style: TextStyle(color: AppTheme.textMuted));
              }

              return SizedBox(
                height: 150,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: episodes.length,
                  itemBuilder: (context, index) {
                    final ep = episodes[index];

                    return GestureDetector(
                      onTap: () => widget.onEpisodeSelected(ep.seasonNumber, ep.episodeNumber),
                      child: Container(
                        width: 220,
                        margin: const EdgeInsets.only(right: 12, top: 4, bottom: 4),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppTheme.cardBg,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppTheme.cardBorder),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: AppTheme.watchYellow,
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    'EP ${ep.episodeNumber}',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 10,
                                      color: Colors.black,
                                    ),
                                  ),
                                ),
                                const Spacer(),
                                const Icon(LucideIcons.playCircle, color: Colors.white70, size: 20),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              ep.title,
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                                color: Colors.white,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 4),
                            if (ep.overview != null && ep.overview!.isNotEmpty)
                              Text(
                                ep.overview!,
                                style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              );
            },
            loading: () => const Center(
              child: SpinKitFadingCircle(color: AppTheme.watchYellow, size: 28),
            ),
            error: (_, __) => const SizedBox.shrink(),
          ),
        ],
      ),
    );
  }
}
