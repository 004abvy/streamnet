import 'dart:async';
import 'package:dio/dio.dart';
import '../core/constants/api_constants.dart';
import '../models/media_item.dart';
import '../models/stream_source.dart';

class StreamService {
  final Dio _dio = Dio(BaseOptions(
    connectTimeout: const Duration(seconds: 30),
    receiveTimeout: const Duration(seconds: 30),
  ));

  Future<MediaStreamBundle> getStreamBundleForMedia({
    required MediaItem media,
    int? season,
    int? episode,
  }) async {
    List<StreamSource> sources = [];
    Map<String, AppSubtitleTrack> subtitleMap = {};
    List<AudioTrackOption> audioTracks = [];
    final Set<String> seenStreamUrls = {};

    final typeStr = media.type == MediaType.movie ? 'movie' : 'tv';
    final s = season ?? 1;
    final e = episode ?? 1;

    // Check if title is Anime
    final isAnime = media.type == MediaType.anime ||
        media.genres.any((g) =>
            g.toLowerCase().contains('anime') ||
            g.toLowerCase().contains('animation')) ||
        (media.overview != null &&
            media.overview!.toLowerCase().contains('anime'));

    // 1. Query the Perfected Next.js direct-aggregate backend
    try {
      // Inject VIP parameter to unlock all premium proxy sandbox servers
      final aggregateUrl =
          '${ApiConstants.defaultBackendUrl}/api/direct-aggregate'
          '?id=${media.id}&type=$typeStr&season=$s&episode=$e&vip=123';

      final response = await _dio.get(aggregateUrl);
      if (response.statusCode == 200 && response.data is Map) {
        final data = response.data as Map<String, dynamic>;

        // Parse aggregated subtitles from backend
        if (data['subtitles'] is List) {
          for (var subJson in data['subtitles']) {
            if (subJson is Map) {
              final sub =
                  AppSubtitleTrack.fromJson(Map<String, dynamic>.from(subJson));
              if (sub.file.isNotEmpty) {
                final key = _normalizeSubKey(sub.label, sub.language);
                subtitleMap[key] = sub;
              }
            }
          }
        }

        // Parse aggregated audio languages from backend
        if (data['audioLanguages'] is List) {
          for (var track in data['audioLanguages']) {
            if (track['url'] != null) {
              // Use the proxied URL like the web app does, ensuring consistent behavior
              final url =
                  track['url']?.toString() ?? track['rawUrl'].toString();
              if (seenStreamUrls.contains(url)) continue;
              seenStreamUrls.add(url);

              final provider = track['provider']?.toString() ?? 'Server';
              final rawLabel = track['label']?.toString() ?? 'English';
              final label = '$provider - $rawLabel';
              final badge = track['badge']?.toString() ??
                  track['quality']?.toString() ??
                  '1080p HD';
              final lang = track['language']?.toString() ?? 'en';
              final id = track['id']?.toString() ??
                  'audio-$lang-${audioTracks.length}';

              Map<String, String> streamHeaders = {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://screenscape.me/',
              };

              if (track['headers'] != null && track['headers'] is Map) {
                // Merge headers, keeping our User-Agent if the provider didn't supply one
                for (var key in (track['headers'] as Map).keys) {
                  streamHeaders[key.toString()] =
                      track['headers'][key].toString();
                }
              }
              if (!streamHeaders.containsKey('User-Agent') &&
                  !streamHeaders.containsKey('user-agent')) {
                streamHeaders['User-Agent'] =
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
              }

              final audioOpt = AudioTrackOption(
                id: id,
                language: lang,
                label: label,
                badge: badge,
                url: url,
                quality: badge,
                isDefault: track['isDefault'] == true,
                headers: streamHeaders,
              );
              audioTracks.add(audioOpt);

              sources.add(StreamSource(
                serverName: '$label ($badge)',
                url: url,
                type: StreamType.hls,
                quality: badge,
                language: lang,
                headers: streamHeaders,
              ));
            }
          }
        }
      }
    } catch (e) {
      print('[StreamService] Backend error: $e');
      // If backend fails, return empty gracefully instead of crashing
    }

    // Sort subtitles with English first, English CC second, Hindi, Spanish, French, etc.
    final sortedSubtitles = subtitleMap.values.toList()
      ..sort((a, b) {
        final la = a.label.toLowerCase();
        final lb = b.label.toLowerCase();
        if (la == 'english') return -1;
        if (lb == 'english') return 1;
        if (la.contains('english [cc]')) return -1;
        if (lb.contains('english [cc]')) return 1;
        if (la == 'hindi' || la.contains('hindi')) return -1;
        if (lb == 'hindi' || lb.contains('hindi')) return 1;
        return a.label.compareTo(b.label);
      });

    // Sort Audio Tracks with best CDN and accurate language grouping
    final sortedAudioTracks = audioTracks.toList()
      ..sort((a, b) {
        if (isAnime) {
          if (a.language == 'ja' && b.language != 'ja') return -1;
          if (b.language == 'ja' && a.language != 'ja') return 1;
        }
        final la = a.language.toLowerCase();
        final lb = b.language.toLowerCase();
        final isEngA = la.startsWith('en');
        final isEngB = lb.startsWith('en');
        if (isEngA && !isEngB) return -1;
        if (!isEngA && isEngB) return 1;

        // English ranking by CDN speed and stability
        if (isEngA && isEngB) {
          int scoreA = 0;
          int scoreB = 0;
          final la = a.label.toLowerCase();
          final lb = b.label.toLowerCase();

          if (la.contains('vidlink') || la.contains('vixsrc')) {
            scoreA = 10;
          } else if (la.contains('videasy'))
            scoreA = 9;
          else if (la.contains('vanguard'))
            scoreA = 8;
          else if (la.contains('borealis'))
            scoreA = 7;
          else
            scoreA = 1;

          if (lb.contains('vidlink') || lb.contains('vixsrc')) {
            scoreB = 10;
          } else if (lb.contains('videasy'))
            scoreB = 9;
          else if (lb.contains('vanguard'))
            scoreB = 8;
          else if (lb.contains('borealis'))
            scoreB = 7;
          else
            scoreB = 1;

          if (scoreA != scoreB) return scoreB.compareTo(scoreA);
        }

        // Spanish, Hindi, French order
        if (la.startsWith('es') && !lb.startsWith('es')) return -1;
        if (!la.startsWith('es') && lb.startsWith('es')) return 1;
        if (la.startsWith('hi') && !lb.startsWith('hi')) return -1;
        if (!la.startsWith('hi') && lb.startsWith('hi')) return 1;
        if (la.startsWith('fr') && !lb.startsWith('fr')) return -1;
        if (!la.startsWith('fr') && lb.startsWith('fr')) return 1;

        return a.label.compareTo(b.label);
      });

    // Group Audio Tracks by Language / Quality (Netflix-Style deduplication)
    final Map<String, AudioTrackOption> uniqueAudioMap = {};
    for (var track in sortedAudioTracks) {
      final key = '${track.language}-${track.quality}';
      if (!uniqueAudioMap.containsKey(key)) {
        uniqueAudioMap[key] = track;
      }
    }

    final deduplicatedAudioTracks = uniqueAudioMap.values.toList();

    // Attach all discovered aggregated subtitles to every source
    final enrichedSources = sources
        .map((s) => StreamSource(
              serverName: s.serverName,
              url: s.url,
              type: s.type,
              quality: s.quality,
              headers: s.headers,
              language: s.language,
              subtitles: sortedSubtitles,
            ))
        .toList();

    return MediaStreamBundle(
      sources: enrichedSources,
      subtitles: sortedSubtitles,
      audioTracks: deduplicatedAudioTracks.isNotEmpty
          ? deduplicatedAudioTracks
          : sortedAudioTracks,
    );
  }

  Future<List<StreamSource>> getSourcesForMedia({
    required MediaItem media,
    int? season,
    int? episode,
  }) async {
    final bundle = await getStreamBundleForMedia(
      media: media,
      season: season,
      episode: episode,
    );
    return bundle.sources;
  }

  String _normalizeSubKey(String rawLabel, String rawLang) {
    final clean = rawLabel.trim().toLowerCase();
    if (clean.contains('[cc]') || clean.contains('(cc)')) {
      return 'en-cc';
    }
    if (clean.contains('hindi') ||
        clean.contains('हिन्दी') ||
        rawLang == 'hi') {
      return 'hi';
    }
    if (clean.contains('french') ||
        clean.contains('français') ||
        rawLang == 'fr') {
      return 'fr';
    }
    if (clean.contains('spanish') ||
        clean.contains('español') ||
        rawLang == 'es') {
      return 'es';
    }
    if (clean.contains('arabic') ||
        clean.contains('العربية') ||
        rawLang == 'ar') {
      return 'ar';
    }
    if (clean.contains('english') || rawLang == 'en') {
      return 'en';
    }
    return '${rawLang}_$clean';
  }
}
