import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_spinkit/flutter_spinkit.dart';
import '../../providers/media_providers.dart';
import '../../models/media_item.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/responsive.dart';
import '../../components/navigation/sidebar.dart';
import '../../components/common/footer.dart';

// Modular Sections
import 'sections/hero_carousel_section.dart';
import 'sections/providers_section.dart';
import 'sections/genre_explorer_section.dart';
import 'sections/continue_watching_section.dart';
import 'sections/trending_movies_section.dart';
import 'sections/trending_series_section.dart';
import 'sections/top_rated_section.dart';
import 'sections/anime_spotlight_section.dart';

// Pages
import '../details/details_page.dart';
import '../player/movie_player_page.dart';
import '../player/series_player_page.dart';
import '../player/anime_player_page.dart';
import '../search/search_page.dart';
import '../library/library_page.dart';
import '../movies/movies_page.dart';
import '../tv_shows/tv_shows_page.dart';
import '../anime/anime_page.dart';
import '../collections/collections_page.dart';
import '../live_tv/live_tv_page.dart';
import '../announcements/announcements_page.dart';

class HomePage extends ConsumerStatefulWidget {
  const HomePage({super.key});

  @override
  ConsumerState<HomePage> createState() => _HomePageState();
}

class _HomePageState extends ConsumerState<HomePage> {
  int _activeNavTab = 0;

  void _handleNavSelection(int idx) {
    setState(() => _activeNavTab = idx);

    Widget? targetScreen;
    switch (idx) {
      case 0:
        return; // Home
      case 1:
        targetScreen = const SearchPage();
        break;
      case 2:
        targetScreen = const LibraryPage();
        break;
      case 3:
        targetScreen = const MoviesPage();
        break;
      case 4:
        targetScreen = const TvShowsPage();
        break;
      case 5:
        targetScreen = const AnimePage();
        break;
      case 6:
        targetScreen = const CollectionsPage();
        break;
      case 7:
        targetScreen = const LiveTvPage();
        break;
      case 8:
        targetScreen = const AnnouncementsPage();
        break;
    }

    if (targetScreen != null) {
      Navigator.push(context, MaterialPageRoute(builder: (_) => targetScreen!))
          .then((_) => setState(() => _activeNavTab = 0));
    }
  }

  @override
  Widget build(BuildContext context) {
    final trendingAsync = ref.watch(trendingMediaProvider);
    final isMobile = Responsive.isMobile(context);

    final feedContent = SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 16),

          // 1. Hero Carousel Section
          trendingAsync.when(
            data: (trendingList) => HeroCarouselSection(
              movies: trendingList,
              onWatch: (media) => _startPlayback(context, media),
              onDetails: (media) => _navigateToDetail(context, media),
              onAnnouncements: () {
                Navigator.push(context, MaterialPageRoute(builder: (_) => const AnnouncementsPage()));
              },
              onProfile: () {
                Navigator.push(context, MaterialPageRoute(builder: (_) => const LibraryPage()));
              },
            ),
            loading: () => Container(
              height: 380,
              margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              decoration: BoxDecoration(
                color: AppTheme.skeletonBase,
                borderRadius: BorderRadius.circular(24),
              ),
              child: const Center(
                child: SpinKitFadingCircle(color: AppTheme.watchYellow, size: 36),
              ),
            ),
            error: (_, __) => const SizedBox.shrink(),
          ),

          const SizedBox(height: 8),

          // 2. Providers Section
          const ProvidersSection(),

          // 3. Continue Watching Section
          const ContinueWatchingSection(),

          // 4. Genre Explorer Section
          const GenreExplorerSection(),

          // 5. Trending Movies Section
          const TrendingMoviesSection(),

          // 6. Trending Series Section
          const TrendingSeriesSection(),

          // 7. Top Rated Movies Section
          const TopRatedSection(),

          // 8. Anime Spotlight Section
          const AnimeSpotlightSection(),

          // 9. Footer Section
          const AppFooter(),
        ],
      ),
    );

    if (isMobile) {
      return Scaffold(
        backgroundColor: AppTheme.background,
        bottomNavigationBar: SidebarNavigation(
          activeIndex: _activeNavTab,
          onItemSelected: _handleNavSelection,
        ),
        body: feedContent,
      );
    }

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: Row(
        children: [
          SidebarNavigation(
            activeIndex: _activeNavTab,
            onItemSelected: _handleNavSelection,
          ),
          Expanded(
            child: feedContent,
          ),
        ],
      ),
    );
  }

  void _navigateToDetail(BuildContext context, MediaItem media) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => DetailsPage(media: media),
      ),
    );
  }

  void _startPlayback(BuildContext context, MediaItem media) {
    final isAnime = (media.overview?.toLowerCase().contains('anime') ?? false) ||
        (media.title.toLowerCase().contains('anime'));

    Widget targetPlayer;
    if (isAnime) {
      targetPlayer = AnimePlayerPage(media: media, episode: 1);
    } else if (media.type == MediaType.tv) {
      targetPlayer = SeriesPlayerPage(media: media, season: 1, episode: 1);
    } else {
      targetPlayer = MoviePlayerPage(media: media);
    }

    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => targetPlayer),
    );
  }
}
