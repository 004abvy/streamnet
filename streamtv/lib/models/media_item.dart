import '../core/constants/api_constants.dart';

enum MediaType { movie, tv, anime }

class MediaItem {
  final String id;
  final String title;
  final String? overview;
  final String? posterPath;
  final String? backdropPath;
  final double rating;
  final String? releaseDate;
  final MediaType type;
  final List<String> genres;
  final int? numberOfSeasons;
  final int? numberOfEpisodes;

  MediaItem({
    required this.id,
    required this.title,
    this.overview,
    this.posterPath,
    this.backdropPath,
    required this.rating,
    this.releaseDate,
    required this.type,
    this.genres = const [],
    this.numberOfSeasons,
    this.numberOfEpisodes,
  });

  String get fullPosterUrl {
    if (posterPath == null || posterPath!.isEmpty) {
      return 'https://via.placeholder.com/500x750?text=No+Poster';
    }
    if (posterPath!.startsWith('http')) return posterPath!;
    return '${ApiConstants.tmdbImageBaseUrl}$posterPath';
  }

  String get fullBackdropUrl {
    if (backdropPath == null || backdropPath!.isEmpty) {
      return fullPosterUrl;
    }
    if (backdropPath!.startsWith('http')) return backdropPath!;
    return '${ApiConstants.tmdbOriginalImageBaseUrl}$backdropPath';
  }

  factory MediaItem.fromTmdbJson(Map<String, dynamic> json, {MediaType? fallbackType}) {
    final isMovie = json['media_type'] == 'movie' || (fallbackType == MediaType.movie) || json['title'] != null;
    final type = isMovie ? MediaType.movie : MediaType.tv;

    return MediaItem(
      id: json['id'].toString(),
      title: json['title'] ?? json['name'] ?? json['original_title'] ?? 'Unknown Title',
      overview: json['overview'] ?? '',
      posterPath: json['poster_path'],
      backdropPath: json['backdrop_path'],
      rating: (json['vote_average'] as num?)?.toDouble() ?? 0.0,
      releaseDate: json['release_date'] ?? json['first_air_date'],
      type: type,
      numberOfSeasons: json['number_of_seasons'],
      numberOfEpisodes: json['number_of_episodes'],
    );
  }

  factory MediaItem.fromAnimeJson(Map<String, dynamic> json) {
    return MediaItem(
      id: json['id']?.toString() ?? '',
      title: json['name'] ?? json['title'] ?? 'Anime',
      overview: json['description'] ?? json['overview'] ?? '',
      posterPath: json['poster'] ?? json['image'],
      backdropPath: json['banner'] ?? json['poster'] ?? json['image'],
      rating: (json['rating'] as num?)?.toDouble() ?? (json['score'] as num?)?.toDouble() ?? 8.0,
      releaseDate: json['releaseDate']?.toString(),
      type: MediaType.anime,
      numberOfEpisodes: json['totalEpisodes'] ?? json['episodes']?.length,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'overview': overview,
      'posterPath': posterPath,
      'backdropPath': backdropPath,
      'rating': rating,
      'releaseDate': releaseDate,
      'type': type.name,
      'numberOfSeasons': numberOfSeasons,
      'numberOfEpisodes': numberOfEpisodes,
    };
  }

  factory MediaItem.fromJson(Map<String, dynamic> json) {
    return MediaItem(
      id: json['id'],
      title: json['title'],
      overview: json['overview'],
      posterPath: json['posterPath'],
      backdropPath: json['backdropPath'],
      rating: (json['rating'] as num).toDouble(),
      releaseDate: json['releaseDate'],
      type: MediaType.values.firstWhere(
        (e) => e.name == json['type'],
        orElse: () => MediaType.movie,
      ),
      numberOfSeasons: json['numberOfSeasons'],
      numberOfEpisodes: json['numberOfEpisodes'],
    );
  }
}
