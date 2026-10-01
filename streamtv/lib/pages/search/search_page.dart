import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_spinkit/flutter_spinkit.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../providers/media_providers.dart';
import '../../models/media_item.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/responsive.dart';
import '../../components/cards/poster_card.dart';
import '../details/details_page.dart';

class SearchPage extends ConsumerStatefulWidget {
  const SearchPage({super.key});

  @override
  ConsumerState<SearchPage> createState() => _SearchPageState();
}

class _SearchPageState extends ConsumerState<SearchPage> {
  final TextEditingController _searchController = TextEditingController();
  List<MediaItem> _results = [];
  bool _isSearching = false;

  Future<void> _performSearch(String query) async {
    if (query.trim().isEmpty) {
      setState(() {
        _results = [];
        _isSearching = false;
      });
      return;
    }

    setState(() => _isSearching = true);
    final tmdbResults = await ref.read(tmdbServiceProvider).search(query);
    final animeResults = await ref.read(animeServiceProvider).searchAnime(query);

    setState(() {
      _results = [...tmdbResults, ...animeResults];
      _isSearching = false;
    });
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
          'Search',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
      ),
      body: Padding(
        padding: EdgeInsets.symmetric(horizontal: isMobile ? 16 : 32, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Search Input Field
            TextField(
              controller: _searchController,
              style: const TextStyle(color: Colors.white, fontSize: 16),
              decoration: InputDecoration(
                hintText: 'Search movies, TV shows, anime...',
                hintStyle: const TextStyle(color: AppTheme.textMuted),
                prefixIcon: const Icon(LucideIcons.search, color: AppTheme.textMuted, size: 20),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(LucideIcons.x, color: Colors.white, size: 18),
                        onPressed: () {
                          _searchController.clear();
                          _performSearch('');
                        },
                      )
                    : null,
                filled: true,
                fillColor: AppTheme.cardBg,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(color: AppTheme.cardBorder),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(color: AppTheme.cardBorder),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(color: AppTheme.watchYellow, width: 1.5),
                ),
              ),
              onSubmitted: _performSearch,
              onChanged: (val) {
                if (val.length > 2) _performSearch(val);
              },
            ),
            const SizedBox(height: 20),

            // Search Results Grid
            Expanded(
              child: _isSearching
                  ? const Center(
                      child: SpinKitFadingCircle(color: AppTheme.watchYellow, size: 40),
                    )
                  : _results.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(LucideIcons.search, size: 48, color: Colors.white.withValues(alpha: 0.15)),
                              const SizedBox(height: 12),
                              Text(
                                _searchController.text.isEmpty
                                    ? 'Find your favorite movies, series & anime'
                                    : 'No results found for "${_searchController.text}"',
                                style: const TextStyle(color: AppTheme.textMuted, fontSize: 14),
                              ),
                            ],
                          ),
                        )
                      : GridView.builder(
                          gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(
                            maxCrossAxisExtent: isTV ? 200 : 150,
                            childAspectRatio: 0.60,
                            crossAxisSpacing: 10,
                            mainAxisSpacing: 10,
                          ),
                          itemCount: _results.length,
                          itemBuilder: (context, index) {
                            final item = _results[index];
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
