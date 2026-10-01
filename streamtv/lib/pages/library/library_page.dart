import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../providers/media_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/responsive.dart';
import '../../components/cards/poster_card.dart';
import '../details/details_page.dart';

class LibraryPage extends ConsumerWidget {
  const LibraryPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final watchlistAsync = ref.watch(watchlistProvider);
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
        title: const Text('My Library', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
      ),
      body: watchlistAsync.when(
        data: (items) {
          if (items.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(LucideIcons.bookmark, size: 56, color: Colors.white.withValues(alpha: 0.15)),
                  const SizedBox(height: 14),
                  const Text(
                    'Your watchlist is empty',
                    style: TextStyle(color: AppTheme.textForeground, fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Bookmark movies and shows to watch them anytime',
                    style: TextStyle(color: AppTheme.textMuted, fontSize: 13),
                  ),
                ],
              ),
            );
          }

          return Padding(
            padding: EdgeInsets.symmetric(horizontal: isMobile ? 16 : 32, vertical: 12),
            child: GridView.builder(
              gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(
                maxCrossAxisExtent: isTV ? 200 : 150,
                childAspectRatio: 0.60,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
              ),
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
          );
        },
        loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.watchYellow)),
        error: (err, _) => Center(child: Text('Error: $err', style: const TextStyle(color: Colors.red))),
      ),
    );
  }
}
