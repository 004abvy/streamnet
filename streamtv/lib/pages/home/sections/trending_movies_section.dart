import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../providers/media_providers.dart';
import '../../../core/utils/responsive.dart';
import '../../../components/cards/poster_card.dart';
import '../../../components/common/section_header.dart';
import '../../details/details_page.dart';
import '../../movies/movies_page.dart';

class TrendingMoviesSection extends ConsumerWidget {
  const TrendingMoviesSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final moviesAsync = ref.watch(popularMoviesProvider);
    final isMobile = Responsive.isMobile(context);
    final cardHeight = Responsive.getCardHeight(context);

    return moviesAsync.maybeWhen(
      data: (items) {
        if (items.isEmpty) return const SizedBox.shrink();

        return Container(
          margin: const EdgeInsets.symmetric(vertical: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SectionHeader(
                title: 'Trending Movies',
                onViewAll: () {
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const MoviesPage()));
                },
              ),
              SizedBox(
                height: cardHeight + 60,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  padding: EdgeInsets.symmetric(horizontal: isMobile ? 10 : 26),
                  itemCount: items.length,
                  itemBuilder: (context, index) {
                    final media = items[index];
                    return PosterCard(
                      media: media,
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => DetailsPage(media: media),
                          ),
                        );
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
      orElse: () => const SizedBox.shrink(),
    );
  }
}
