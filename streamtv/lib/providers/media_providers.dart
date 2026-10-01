import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/media_item.dart';
import '../models/episode.dart';
import '../services/tmdb_service.dart';
import '../services/anime_service.dart';
import '../services/storage_service.dart';

// Service Providers
final tmdbServiceProvider = Provider((ref) => TmdbService());
final animeServiceProvider = Provider((ref) => AnimeService());
final storageServiceProvider = Provider((ref) => StorageService());

// Home Feeds Providers
final trendingMediaProvider = FutureProvider<List<MediaItem>>((ref) async {
  return ref.watch(tmdbServiceProvider).getTrending();
});

final popularMoviesProvider = FutureProvider<List<MediaItem>>((ref) async {
  return ref.watch(tmdbServiceProvider).getPopularMovies();
});

final popularTvShowsProvider = FutureProvider<List<MediaItem>>((ref) async {
  return ref.watch(tmdbServiceProvider).getPopularTvShows();
});

final topRatedMoviesProvider = FutureProvider<List<MediaItem>>((ref) async {
  return ref.watch(tmdbServiceProvider).getTopRatedMovies();
});

final topAnimeProvider = FutureProvider<List<MediaItem>>((ref) async {
  return ref.watch(animeServiceProvider).getTopAiringAnime();
});

// Episodes Provider
final tvEpisodesProvider = FutureProvider.family<List<Episode>, (String, int)>((ref, args) async {
  final (tvId, seasonNum) = args;
  return ref.watch(tmdbServiceProvider).getTvEpisodes(tvId, seasonNum);
});

// Watchlist Provider
class WatchlistNotifier extends StateNotifier<AsyncValue<List<MediaItem>>> {
  final StorageService _storage;
  WatchlistNotifier(this._storage) : super(const AsyncValue.loading()) {
    loadWatchlist();
  }

  Future<void> loadWatchlist() async {
    try {
      final list = await _storage.getWatchlist();
      state = AsyncValue.data(list);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> toggle(MediaItem item) async {
    await _storage.toggleWatchlist(item);
    await loadWatchlist();
  }
}

final watchlistProvider = StateNotifierProvider<WatchlistNotifier, AsyncValue<List<MediaItem>>>((ref) {
  return WatchlistNotifier(ref.watch(storageServiceProvider));
});
