enum StreamType { hls, mp4, embed, iframe }

class AppSubtitleTrack {
  final String id;
  final String label;
  final String file;
  final String language;
  final bool isDefault;

  AppSubtitleTrack({
    this.id = '',
    required this.label,
    required this.file,
    required this.language,
    this.isDefault = false,
  });

  factory AppSubtitleTrack.fromJson(Map<String, dynamic> json) {
    return AppSubtitleTrack(
      id: json['id']?.toString() ?? '',
      label: json['label']?.toString() ?? json['lang']?.toString() ?? 'English',
      file: json['file']?.toString() ?? json['url']?.toString() ?? '',
      language: json['lang']?.toString() ?? json['language']?.toString() ?? 'en',
      isDefault: json['default'] == true || json['isDefault'] == true,
    );
  }
}

class AudioTrackOption {
  final String id;
  final String language;
  final String label;
  final String badge;
  final String url;
  final String quality;
  final bool isDefault;
  final Map<String, String>? headers;

  AudioTrackOption({
    required this.id,
    required this.language,
    required this.label,
    required this.badge,
    required this.url,
    required this.quality,
    this.isDefault = false,
    this.headers,
  });
}

class StreamSource {
  final String serverName;
  final String url;
  final StreamType type;
  final String? quality;
  final Map<String, String>? headers;
  final List<AppSubtitleTrack> subtitles;
  final String? language;

  StreamSource({
    required this.serverName,
    required this.url,
    required this.type,
    this.quality,
    this.headers,
    this.subtitles = const [],
    this.language,
  });
}

class MediaStreamBundle {
  final List<StreamSource> sources;
  final List<AppSubtitleTrack> subtitles;
  final List<AudioTrackOption> audioTracks;

  MediaStreamBundle({
    required this.sources,
    required this.subtitles,
    required this.audioTracks,
  });
}
