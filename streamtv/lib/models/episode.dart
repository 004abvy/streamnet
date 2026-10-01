class Episode {
  final int episodeNumber;
  final int seasonNumber;
  final String title;
  final String? overview;
  final String? stillPath;
  final String? airDate;

  Episode({
    required this.episodeNumber,
    required this.seasonNumber,
    required this.title,
    this.overview,
    this.stillPath,
    this.airDate,
  });

  factory Episode.fromTmdbJson(Map<String, dynamic> json, int seasonNum) {
    return Episode(
      episodeNumber: json['episode_number'] ?? 1,
      seasonNumber: seasonNum,
      title: json['name'] ?? 'Episode ${json['episode_number']}',
      overview: json['overview'] ?? '',
      stillPath: json['still_path'],
      airDate: json['air_date'],
    );
  }

  factory Episode.fromAnimeJson(Map<String, dynamic> json) {
    return Episode(
      episodeNumber: json['number'] ?? json['episodeId'] ?? 1,
      seasonNumber: 1,
      title: json['title'] ?? 'Episode ${json['number'] ?? 1}',
      overview: json['description'],
      stillPath: json['image'],
    );
  }
}
