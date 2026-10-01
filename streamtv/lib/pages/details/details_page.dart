import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../models/media_item.dart';
import '../../providers/media_providers.dart';
import '../../core/theme/app_theme.dart';
import '../player/movie_player_page.dart';
import '../player/series_player_page.dart';
import '../player/anime_player_page.dart';
import '../player/vip_player_page.dart';

// Modular Sections
import 'sections/details_hero_section.dart';
import 'sections/seasons_episodes_section.dart';

class DetailsPage extends ConsumerStatefulWidget {
  final MediaItem media;

  const DetailsPage({super.key, required this.media});

  @override
  ConsumerState<DetailsPage> createState() => _DetailsPageState();
}

class _DetailsPageState extends ConsumerState<DetailsPage> {
  @override
  Widget build(BuildContext context) {
    final watchlistAsync = ref.watch(watchlistProvider);
    final isSaved = watchlistAsync.maybeWhen(
      data: (list) => list.any((item) => item.id == widget.media.id),
      orElse: () => false,
    );

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: Stack(
        children: [
          // 1. Ambient Background Blur
          Positioned.fill(
            child: ImageFiltered(
              imageFilter: ImageFilter.blur(sigmaX: 50, sigmaY: 50),
              child: CachedNetworkImage(
                imageUrl: widget.media.fullBackdropUrl,
                fit: BoxFit.cover,
                errorWidget: (_, __, ___) => Container(color: AppTheme.background),
              ),
            ),
          ),

          // 2. Dark Overlay
          Positioned.fill(
            child: Container(
              color: AppTheme.background.withValues(alpha: 0.85),
            ),
          ),

          // 3. Main Content
          SafeArea(
            child: CustomScrollView(
              slivers: [
                // Top App Bar
                SliverAppBar(
                  backgroundColor: Colors.transparent,
                  elevation: 0,
                  pinned: true,
                  leading: IconButton(
                    icon: const Icon(LucideIcons.arrowLeft, color: Colors.white),
                    onPressed: () => Navigator.pop(context),
                  ),
                  actions: [
                    IconButton(
                      icon: Icon(
                        isSaved ? Icons.bookmark_added_rounded : LucideIcons.bookmark,
                        color: isSaved ? AppTheme.watchYellow : Colors.white,
                      ),
                      onPressed: () {
                        ref.read(watchlistProvider.notifier).toggle(widget.media);
                      },
                    ),
                  ],
                ),

                // Hero & Details Section
                SliverToBoxAdapter(
                  child: DetailsHeroSection(
                    media: widget.media,
                    onVipPressed: () {
                      _launchVipPlayer(context, season: 1, episode: 1);
                    },
                    onWatchPressed: () {
                      _startDedicatedPlayer(context, season: 1, episode: 1);
                    },
                    onTrailerPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Opening trailer...')),
                      );
                    },
                  ),
                ),

                // TV Seasons & Episodes Section (if TV show)
                if (widget.media.type == MediaType.tv) ...[
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.only(bottom: 40),
                      child: SeasonsEpisodesSection(
                        media: widget.media,
                        onEpisodeSelected: (season, ep) {
                          _startDedicatedPlayer(context, season: season, episode: ep);
                        },
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _startDedicatedPlayer(BuildContext context, {int? season, int? episode}) {
    final isAnime = (widget.media.overview?.toLowerCase().contains('anime') ?? false) ||
        (widget.media.title.toLowerCase().contains('anime'));

    Widget targetPlayer;
    if (isAnime) {
      targetPlayer = AnimePlayerPage(
        media: widget.media,
        episode: episode ?? 1,
      );
    } else if (widget.media.type == MediaType.tv) {
      targetPlayer = SeriesPlayerPage(
        media: widget.media,
        season: season ?? 1,
        episode: episode ?? 1,
      );
    } else {
      targetPlayer = MoviePlayerPage(
        media: widget.media,
      );
    }

    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => targetPlayer),
    );
  }

  void _launchVipPlayer(BuildContext context, {int? season, int? episode}) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => VipPlayerPage(
          media: widget.media,
          season: season,
          episode: episode,
        ),
      ),
    );
  }
}
