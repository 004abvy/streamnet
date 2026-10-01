import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_spinkit/flutter_spinkit.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../models/media_item.dart';
import '../../providers/media_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/responsive.dart';
import '../../components/cards/poster_card.dart';
import '../details/details_page.dart';

class AnimePage extends ConsumerStatefulWidget {
  const AnimePage({super.key});

  @override
  ConsumerState<AnimePage> createState() => _AnimePageState();
}

class _AnimePageState extends ConsumerState<AnimePage> {
  int _selectedFilterIndex = 0;
  final List<String> _filters = ['Top Airing', 'Most Popular', 'Action', 'Fantasy', 'Shounen', 'Romance'];

  List<MediaItem> _items = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadAnime();
  }

  Future<void> _loadAnime() async {
    setState(() => _isLoading = true);
    final animeService = ref.read(animeServiceProvider);
    final tmdb = ref.read(tmdbServiceProvider);
    List<MediaItem> res = [];

    if (_selectedFilterIndex == 0) {
      res = await animeService.getTopAiringAnime();
      if (res.isEmpty) {
        res = await tmdb.discoverByGenre('Animation', type: MediaType.tv);
      }
    } else if (_selectedFilterIndex == 1) {
      res = await animeService.getMostPopularAnime();
      if (res.isEmpty) {
        res = await tmdb.discoverByGenre('Animation', type: MediaType.movie);
      }
    } else {
      res = await tmdb.discoverByGenre('Animation', type: MediaType.tv);
    }

    if (mounted) {
      setState(() {
        _items = res;
        _isLoading = false;
      });
    }
  }

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
          'Anime Universe',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
      ),
      body: Padding(
        padding: EdgeInsets.symmetric(horizontal: isMobile ? 16 : 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Filter Pills
            SizedBox(
              height: 42,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: _filters.length,
                itemBuilder: (context, index) {
                  final label = _filters[index];
                  final isSelected = _selectedFilterIndex == index;

                  return GestureDetector(
                    onTap: () {
                      setState(() => _selectedFilterIndex = index);
                      _loadAnime();
                    },
                    child: Container(
                      margin: const EdgeInsets.only(right: 10),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        color: isSelected ? AppTheme.watchYellow : AppTheme.cardBg,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: isSelected ? AppTheme.watchYellow : AppTheme.cardBorder,
                        ),
                      ),
                      child: Center(
                        child: Text(
                          label,
                          style: TextStyle(
                            color: isSelected ? Colors.black : AppTheme.textMuted,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 16),

            // Anime Grid
            Expanded(
              child: _isLoading
                  ? const Center(
                      child: SpinKitFadingCircle(color: AppTheme.watchYellow, size: 40),
                    )
                  : _items.isEmpty
                      ? const Center(
                          child: Text('No anime found.', style: TextStyle(color: AppTheme.textMuted)),
                        )
                      : GridView.builder(
                          gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(
                            maxCrossAxisExtent: isTV ? 200 : 150,
                            childAspectRatio: 0.60,
                            crossAxisSpacing: 10,
                            mainAxisSpacing: 10,
                          ),
                          itemCount: _items.length,
                          itemBuilder: (context, index) {
                            final item = _items[index];
                            return PosterCard(
                              media: item,
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => DetailsPage(media: item),
                                  ),
                                );
                              },
                            );
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }
}
