import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/responsive.dart';
import '../../explore/genre_explore_page.dart';
import '../../movies/movies_page.dart';

class GenreExplorerSection extends StatelessWidget {
  const GenreExplorerSection({super.key});

  static const List<String> _genres = [
    'All',
    'Action',
    'Anime',
    'Adventure',
    'Animation',
    'Comedy',
    'Crime',
    'Drama',
    'Fantasy',
    'Horror',
    'Mystery',
    'Sci-Fi',
    'Thriller',
  ];

  @override
  Widget build(BuildContext context) {
    final isMobile = Responsive.isMobile(context);

    return Container(
      margin: EdgeInsets.symmetric(
        horizontal: isMobile ? 16 : 32,
        vertical: 12,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 4,
                height: 18,
                decoration: BoxDecoration(
                  color: AppTheme.watchYellow,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(width: 10),
              const Text(
                'Explore Genres',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                  letterSpacing: -0.3,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          SizedBox(
            height: 42,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: _genres.length,
              itemBuilder: (context, index) {
                final genre = _genres[index];

                return GestureDetector(
                  onTap: () {
                    if (genre == 'All') {
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const MoviesPage()));
                    } else {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => GenreExplorePage(genreName: genre),
                        ),
                      );
                    }
                  },
                  child: Container(
                    margin: const EdgeInsets.only(right: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: AppTheme.cardBg,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppTheme.cardBorder),
                    ),
                    child: Center(
                      child: Text(
                        genre,
                        style: const TextStyle(
                          color: AppTheme.textMuted,
                          fontWeight: FontWeight.w500,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
