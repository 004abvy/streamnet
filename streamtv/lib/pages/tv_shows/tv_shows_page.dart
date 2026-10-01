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

class TvShowsPage extends ConsumerStatefulWidget {
  const TvShowsPage({super.key});

  @override
  ConsumerState<TvShowsPage> createState() => _TvShowsPageState();
}

class _TvShowsPageState extends ConsumerState<TvShowsPage> {
  int _selectedFilterIndex = 0;
  final List<String> _filters = ['Popular', 'On The Air', 'Drama', 'Sci-Fi & Fantasy', 'Crime', 'Comedy'];

  List<MediaItem> _items = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadShows();
  }

  Future<void> _loadShows() async {
    setState(() => _isLoading = true);
    final tmdb = ref.read(tmdbServiceProvider);
    List<MediaItem> res = [];

    switch (_selectedFilterIndex) {
      case 0:
        res = await tmdb.getPopularTvShows();
        break;
      case 1:
        res = await tmdb.getOnTheAirTvShows();
        break;
      default:
        final genre = _filters[_selectedFilterIndex];
        res = await tmdb.discoverByGenre(genre, type: MediaType.tv);
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
          'TV Shows',
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
                      _loadShows();
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

            // Shows Grid
            Expanded(
              child: _isLoading
                  ? const Center(
                      child: SpinKitFadingCircle(color: AppTheme.watchYellow, size: 40),
                    )
                  : _items.isEmpty
                      ? const Center(
                          child: Text('No TV shows found.', style: TextStyle(color: AppTheme.textMuted)),
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
