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

class ProviderExplorePage extends ConsumerStatefulWidget {
  final String providerId;
  final String providerName;

  const ProviderExplorePage({
    super.key,
    required this.providerId,
    required this.providerName,
  });

  @override
  ConsumerState<ProviderExplorePage> createState() => _ProviderExplorePageState();
}

class _ProviderExplorePageState extends ConsumerState<ProviderExplorePage> {
  List<MediaItem> _items = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadProviderTitles();
  }

  Future<void> _loadProviderTitles() async {
    setState(() => _isLoading = true);
    final tmdb = ref.read(tmdbServiceProvider);
    final movies = await tmdb.discoverByProvider(widget.providerId, type: MediaType.movie);
    final shows = await tmdb.discoverByProvider(widget.providerId, type: MediaType.tv);

    if (mounted) {
      setState(() {
        _items = [...movies, ...shows];
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
        title: Text(
          'Streaming on ${widget.providerName}',
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
      ),
      body: Padding(
        padding: EdgeInsets.symmetric(horizontal: isMobile ? 16 : 32, vertical: 8),
        child: _isLoading
            ? const Center(
                child: SpinKitFadingCircle(color: AppTheme.watchYellow, size: 40),
              )
            : _items.isEmpty
                ? Center(
                    child: Text(
                      'No titles found for ${widget.providerName}.',
                      style: const TextStyle(color: AppTheme.textMuted),
                    ),
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
    );
  }
}
