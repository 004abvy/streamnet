import 'package:dio/dio.dart';
import '../core/constants/api_constants.dart';
import '../models/media_item.dart';
import '../models/episode.dart';

class TmdbService {
  final Dio _dio = Dio(BaseOptions(
    baseUrl: ApiConstants.tmdbBaseUrl,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 10),
    queryParameters: {
      'api_key': ApiConstants.tmdbApiKey,
    },
  ));

  static const Map<String, int> genreMap = {
    'Action': 28,
    'Adventure': 12,
    'Animation': 16,
    'Anime': 16,
    'Comedy': 35,
    'Crime': 80,
    'Documentary': 99,
    'Drama': 18,
    'Family': 10751,
    'Fantasy': 14,
    'History': 36,
    'Horror': 27,
    'Music': 10402,
    'Mystery': 9648,
    'Romance': 10749,
    'Sci-Fi': 878,
    'Science Fiction': 878,
    'Thriller': 53,
    'War': 10752,
    'Western': 37,
  };

  Future<List<MediaItem>> getTrending() async {
    try {
      final response = await _dio.get('/trending/all/day');
      final results = response.data['results'] as List;
      return results
          .where((item) => item['poster_path'] != null)
          .map((item) => MediaItem.fromTmdbJson(item))
          .toList();
    } catch (e) {
      return [];
    }
  }

  Future<List<MediaItem>> getPopularMovies() async {
    try {
      final response = await _dio.get('/movie/popular');
      final results = response.data['results'] as List;
      return results
          .where((item) => item['poster_path'] != null)
          .map((item) => MediaItem.fromTmdbJson(item, fallbackType: MediaType.movie))
          .toList();
    } catch (e) {
      return [];
    }
  }

  Future<List<MediaItem>> getNowPlayingMovies() async {
    try {
      final response = await _dio.get('/movie/now_playing');
      final results = response.data['results'] as List;
      return results
          .where((item) => item['poster_path'] != null)
          .map((item) => MediaItem.fromTmdbJson(item, fallbackType: MediaType.movie))
          .toList();
    } catch (e) {
      return [];
    }
  }

  Future<List<MediaItem>> getPopularTvShows() async {
    try {
      final response = await _dio.get('/tv/popular');
      final results = response.data['results'] as List;
      return results
          .where((item) => item['poster_path'] != null)
          .map((item) => MediaItem.fromTmdbJson(item, fallbackType: MediaType.tv))
          .toList();
    } catch (e) {
      return [];
    }
  }

  Future<List<MediaItem>> getOnTheAirTvShows() async {
    try {
      final response = await _dio.get('/tv/on_the_air');
      final results = response.data['results'] as List;
      return results
          .where((item) => item['poster_path'] != null)
          .map((item) => MediaItem.fromTmdbJson(item, fallbackType: MediaType.tv))
          .toList();
    } catch (e) {
      return [];
    }
  }

  Future<List<MediaItem>> getTopRatedMovies() async {
    try {
      final response = await _dio.get('/movie/top_rated');
      final results = response.data['results'] as List;
      return results
          .where((item) => item['poster_path'] != null)
          .map((item) => MediaItem.fromTmdbJson(item, fallbackType: MediaType.movie))
          .toList();
    } catch (e) {
      return [];
    }
  }

  Future<List<MediaItem>> discoverByGenre(String genreName, {MediaType type = MediaType.movie}) async {
    final genreId = genreMap[genreName] ?? 28;
    final endpoint = type == MediaType.movie ? '/discover/movie' : '/discover/tv';
    try {
      final response = await _dio.get(endpoint, queryParameters: {
        'with_genres': genreId,
        'sort_by': 'popularity.desc',
      });
      final results = response.data['results'] as List;
      return results
          .where((item) => item['poster_path'] != null)
          .map((item) => MediaItem.fromTmdbJson(item, fallbackType: type))
          .toList();
    } catch (e) {
      return [];
    }
  }

  Future<List<MediaItem>> discoverByProvider(String providerId, {MediaType type = MediaType.movie}) async {
    final endpoint = type == MediaType.movie ? '/discover/movie' : '/discover/tv';
    try {
      final response = await _dio.get(endpoint, queryParameters: {
        'with_watch_providers': providerId,
        'watch_region': 'US',
        'sort_by': 'popularity.desc',
      });
      final results = response.data['results'] as List;
      return results
          .where((item) => item['poster_path'] != null)
          .map((item) => MediaItem.fromTmdbJson(item, fallbackType: type))
          .toList();
    } catch (e) {
      return [];
    }
  }

  Future<List<MediaItem>> search(String query) async {
    if (query.trim().isEmpty) return [];
    try {
      final response = await _dio.get('/search/multi', queryParameters: {'query': query});
      final results = response.data['results'] as List;
      return results
          .where((item) => item['poster_path'] != null && (item['media_type'] == 'movie' || item['media_type'] == 'tv'))
          .map((item) => MediaItem.fromTmdbJson(item))
          .toList();
    } catch (e) {
      return [];
    }
  }

  Future<MediaItem?> getDetails(String id, MediaType type) async {
    final endpoint = type == MediaType.movie ? '/movie/$id' : '/tv/$id';
    try {
      final response = await _dio.get(endpoint, queryParameters: {'append_to_response': 'credits,similar'});
      return MediaItem.fromTmdbJson(response.data, fallbackType: type);
    } catch (e) {
      return null;
    }
  }

  Future<List<Episode>> getTvEpisodes(String tvId, int seasonNumber) async {
    try {
      final response = await _dio.get('/tv/$tvId/season/$seasonNumber');
      final episodes = response.data['episodes'] as List;
      return episodes.map((ep) => Episode.fromTmdbJson(ep, seasonNumber)).toList();
    } catch (e) {
      return [];
    }
  }
}
