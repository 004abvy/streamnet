import 'package:dio/dio.dart';
import '../core/constants/api_constants.dart';
import '../models/media_item.dart';
import '../models/episode.dart';

class AnimeService {
  final Dio _dio = Dio(BaseOptions(
    baseUrl: ApiConstants.anivexaApiUrl,
    connectTimeout: const Duration(seconds: 8),
    receiveTimeout: const Duration(seconds: 8),
  ));

  Future<List<MediaItem>> getTopAiringAnime() async {
    try {
      final response = await _dio.get('/anime/top-airing');
      final results = (response.data['results'] ?? response.data['animes'] ?? []) as List;
      return results.map((item) => MediaItem.fromAnimeJson(item)).toList();
    } catch (e) {
      return [];
    }
  }

  Future<List<MediaItem>> getMostPopularAnime() async {
    try {
      final response = await _dio.get('/anime/most-popular');
      final results = (response.data['results'] ?? response.data['animes'] ?? []) as List;
      return results.map((item) => MediaItem.fromAnimeJson(item)).toList();
    } catch (e) {
      return [];
    }
  }

  Future<List<MediaItem>> searchAnime(String query) async {
    try {
      final response = await _dio.get('/anime/search', queryParameters: {'q': query});
      final results = (response.data['results'] ?? response.data['animes'] ?? []) as List;
      return results.map((item) => MediaItem.fromAnimeJson(item)).toList();
    } catch (e) {
      return [];
    }
  }

  Future<List<Episode>> getAnimeEpisodes(String animeId) async {
    try {
      final response = await _dio.get('/anime/episodes/$animeId');
      final episodes = (response.data['episodes'] ?? response.data['results'] ?? []) as List;
      return episodes.map((ep) => Episode.fromAnimeJson(ep)).toList();
    } catch (e) {
      return [];
    }
  }
}
