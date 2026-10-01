import 'dart:io';
import 'package:flutter/foundation.dart';

class ApiConstants {
  // TMDB Base Endpoints & CDN
  static const String tmdbBaseUrl = 'https://api.themoviedb.org/3';
  static const String tmdbImageBaseUrl = 'https://image.tmdb.org/t/p/w500';
  static const String tmdbOriginalImageBaseUrl = 'https://image.tmdb.org/t/p/original';
  
  // Standard public TMDB key for testing
  static const String tmdbApiKey = '8265bd1679663a7ea12ac168da84d2e8';

  // New Dedicated Node.js Express Backend Base URL
  // Supports Windows/Web (localhost:4000) and Android Emulator (10.0.2.2:4000)
  static String get defaultBackendUrl {
    if (kIsWeb) return 'http://localhost:4001';
    try {
      if (Platform.isAndroid) return 'http://10.0.2.2:4001';
    } catch (_) {}
    return 'http://localhost:4001';
  }

  static const String anivexaApiUrl = 'https://anivexa-api.vercel.app';
  static const String hianimeApiUrl = 'https://api-aniwatch.onrender.com/anime';

  // Direct Embed / Stream Resolvers
  static String screenscapeUrl(String tmdbId, String type, {int? season, int? episode}) {
    String url = 'https://screenscape.me/embed?tmdb=$tmdbId&type=$type';
    if (type == 'tv') {
      if (season != null) url += '&s=$season';
      if (episode != null) url += '&e=$episode';
    }
    return url;
  }

  static String rivestreamUrl(String tmdbId, String type, {int? season, int? episode}) {
    if (type == 'movie') {
      return 'https://rivestream.ru/embed?type=movie&id=$tmdbId';
    } else {
      return 'https://rivestream.ru/embed?type=tv&id=$tmdbId&season=$season&episode=$episode';
    }
  }

  static String vidkingUrl(String tmdbId, String type, {int? season, int? episode}) {
    if (type == 'movie') {
      return 'https://www.vidking.net/embed/movie/$tmdbId?color=006fee&autoplay=true';
    } else {
      return 'https://www.vidking.net/embed/tv/$tmdbId/$season/$episode?color=f5a524&autoplay=true';
    }
  }
}
