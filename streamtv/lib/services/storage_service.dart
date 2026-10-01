import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/media_item.dart';

class StorageService {
  static const String _watchlistKey = 'streamtv_watchlist';
  static const String _progressKey = 'streamtv_progress';

  Future<List<MediaItem>> getWatchlist() async {
    final prefs = await SharedPreferences.getInstance();
    final jsonStr = prefs.getString(_watchlistKey);
    if (jsonStr == null) return [];
    try {
      final List list = jsonDecode(jsonStr);
      return list.map((item) => MediaItem.fromJson(item)).toList();
    } catch (_) {
      return [];
    }
  }

  Future<bool> isInWatchlist(String id) async {
    final list = await getWatchlist();
    return list.any((item) => item.id == id);
  }

  Future<void> toggleWatchlist(MediaItem media) async {
    final prefs = await SharedPreferences.getInstance();
    var list = await getWatchlist();
    if (list.any((item) => item.id == media.id)) {
      list.removeWhere((item) => item.id == media.id);
    } else {
      list.insert(0, media);
    }
    await prefs.setString(_watchlistKey, jsonEncode(list.map((e) => e.toJson()).toList()));
  }

  Future<void> savePlaybackProgress(String mediaId, int positionSeconds, int totalDurationSeconds) async {
    final prefs = await SharedPreferences.getInstance();
    final progressMap = await getPlaybackProgressMap();
    progressMap[mediaId] = {
      'position': positionSeconds,
      'duration': totalDurationSeconds,
      'updatedAt': DateTime.now().millisecondsSinceEpoch,
    };
    await prefs.setString(_progressKey, jsonEncode(progressMap));
  }

  Future<Map<String, dynamic>> getPlaybackProgressMap() async {
    final prefs = await SharedPreferences.getInstance();
    final jsonStr = prefs.getString(_progressKey);
    if (jsonStr == null) return {};
    try {
      return Map<String, dynamic>.from(jsonDecode(jsonStr));
    } catch (_) {
      return {};
    }
  }
}
