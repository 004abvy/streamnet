import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/responsive.dart';
import '../explore/genre_explore_page.dart';

class CollectionItem {
  final String title;
  final String description;
  final String backdrop;
  final String genreQuery;

  const CollectionItem({
    required this.title,
    required this.description,
    required this.backdrop,
    required this.genreQuery,
  });
}

class CollectionsPage extends StatelessWidget {
  const CollectionsPage({super.key});

  static const List<CollectionItem> _collections = [
    CollectionItem(
      title: 'Marvel Cinematic Universe',
      description: 'Phase 1 through Multiverse Saga saga of heroes and epic battles.',
      backdrop: 'https://image.tmdb.org/t/p/w780/14QbnygCuTO0vl7CAFmPf1fgZfV.jpg',
      genreQuery: 'Action',
    ),
    CollectionItem(
      title: 'Star Wars Complete Saga',
      description: 'The Skywalker Saga, Spin-offs, and Mandalorian adventures across galaxies.',
      backdrop: 'https://image.tmdb.org/t/p/w780/6t8ES1d12OzWyCGxBeDYLHoaDrT.jpg',
      genreQuery: 'Sci-Fi',
    ),
    CollectionItem(
      title: 'Wizarding World',
      description: 'Harry Potter magical adventures and Fantastic Beasts universe.',
      backdrop: 'https://image.tmdb.org/t/p/w780/5nytsvGjSSTehkKM0ykTXTi3gII.jpg',
      genreQuery: 'Fantasy',
    ),
    CollectionItem(
      title: 'Anime Masterpieces',
      description: 'Studio Ghibli, Makoto Shinkai, and legendary timeless anime films.',
      backdrop: 'https://image.tmdb.org/t/p/w780/Ab8mkHmkYADjU7wQiOkia99GQI.jpg',
      genreQuery: 'Animation',
    ),
    CollectionItem(
      title: 'Christopher Nolan Universe',
      description: 'Mind-bending epics: Inception, Interstellar, Oppenheimer, The Dark Knight.',
      backdrop: 'https://image.tmdb.org/t/p/w780/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg',
      genreQuery: 'Thriller',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final isTV = Responsive.isTV(context);
    final isMobile = Responsive.isMobile(context);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Featured Collections',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
      ),
      body: Padding(
        padding: EdgeInsets.symmetric(horizontal: isMobile ? 16 : 32, vertical: 12),
        child: GridView.builder(
          gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(
            maxCrossAxisExtent: isTV ? 450 : 380,
            childAspectRatio: 1.6,
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
          ),
          itemCount: _collections.length,
          itemBuilder: (context, index) {
            final col = _collections[index];

            return GestureDetector(
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => GenreExplorePage(genreName: col.genreQuery),
                  ),
                );
              },
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppTheme.cardBorder),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.5),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      CachedNetworkImage(
                        imageUrl: col.backdrop,
                        fit: BoxFit.cover,
                        errorWidget: (context, url, error) => Container(color: AppTheme.cardBg),
                      ),
                      Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.transparent,
                              Colors.black.withValues(alpha: 0.7),
                              Colors.black.withValues(alpha: 0.95),
                            ],
                            stops: const [0.2, 0.6, 1.0],
                          ),
                        ),
                      ),
                      Positioned(
                        left: 16,
                        right: 16,
                        bottom: 16,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              col.title,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              col.description,
                              style: const TextStyle(
                                color: AppTheme.textMuted,
                                fontSize: 12,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
