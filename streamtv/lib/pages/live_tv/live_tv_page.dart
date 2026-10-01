import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../models/media_item.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/responsive.dart';
import '../player/vip_player_page.dart';

class ChannelItem {
  final String id;
  final String name;
  final String category;
  final String logoUrl;
  final String streamUrl;

  const ChannelItem({
    required this.id,
    required this.name,
    required this.category,
    required this.logoUrl,
    required this.streamUrl,
  });
}

class LiveTvPage extends StatefulWidget {
  const LiveTvPage({super.key});

  @override
  State<LiveTvPage> createState() => _LiveTvPageState();
}

class _LiveTvPageState extends State<LiveTvPage> {
  int _selectedCategoryIndex = 0;
  final List<String> _categories = ['All Channels', 'News', 'Sports', 'Movies & Cinema', 'Entertainment', 'Music'];

  static const List<ChannelItem> _allChannels = [
    ChannelItem(
      id: 'bloomberg',
      name: 'Bloomberg TV HD',
      category: 'News',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Bloomberg_Television_logo.svg',
      streamUrl: 'https://liveproduseast.global.ssl.fastly.net/us/Channel-USTV-AWS-virginia-1/Source-bbg-useast1-live-hls-4/live.m3u8',
    ),
    ChannelItem(
      id: 'skynews',
      name: 'Sky News 24/7',
      category: 'News',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/en/3/30/Sky_News_logo_2015.svg',
      streamUrl: 'https://linear417-gb-dash1-prd-cf.cdn.skycdp.com/1004/Content/HLS/Live/channel(skynews)/index.m3u8',
    ),
    ChannelItem(
      id: 'redbull',
      name: 'Red Bull TV Extreme Sports',
      category: 'Sports',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/en/f/f5/Red_Bull_TV_logo.svg',
      streamUrl: 'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8',
    ),
    ChannelItem(
      id: 'classic_movies',
      name: 'Retro Cinema Classics',
      category: 'Movies & Cinema',
      logoUrl: 'https://via.placeholder.com/150?text=Cinema',
      streamUrl: 'https://screenscape.me/embed?tmdb=550&type=movie',
    ),
    ChannelItem(
      id: 'nasa',
      name: 'NASA TV Live 4K',
      category: 'Entertainment',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e5/NASA_logo.svg',
      streamUrl: 'https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final isTV = Responsive.isTV(context);
    final isMobile = Responsive.isMobile(context);

    final filteredChannels = _selectedCategoryIndex == 0
        ? _allChannels
        : _allChannels.where((c) => c.category == _categories[_selectedCategoryIndex]).toList();

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
          'Live IPTV & Broadcast',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
      ),
      body: Padding(
        padding: EdgeInsets.symmetric(horizontal: isMobile ? 16 : 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Category Filter Pills
            SizedBox(
              height: 42,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: _categories.length,
                itemBuilder: (context, index) {
                  final cat = _categories[index];
                  final isSelected = _selectedCategoryIndex == index;

                  return GestureDetector(
                    onTap: () => setState(() => _selectedCategoryIndex = index),
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
                          cat,
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
            const SizedBox(height: 18),

            // Channels List / Grid
            Expanded(
              child: GridView.builder(
                gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(
                  maxCrossAxisExtent: isTV ? 380 : 320,
                  childAspectRatio: 2.2,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                ),
                itemCount: filteredChannels.length,
                itemBuilder: (context, index) {
                  final channel = filteredChannels[index];

                  return GestureDetector(
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => VipPlayerPage(
                            media: MediaItem(
                              id: channel.id,
                              title: channel.name,
                              rating: 9.0,
                              type: MediaType.movie,
                            ),
                          ),
                        ),
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppTheme.cardBg,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppTheme.cardBorder),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 48,
                            height: 48,
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.08),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Center(
                              child: Icon(LucideIcons.tv, color: AppTheme.watchYellow, size: 24),
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  channel.name,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    Container(
                                      width: 8,
                                      height: 8,
                                      decoration: const BoxDecoration(
                                        color: Colors.greenAccent,
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      'LIVE • ${channel.category}',
                                      style: const TextStyle(
                                        color: AppTheme.textMuted,
                                        fontSize: 11,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          const Icon(LucideIcons.play, color: Colors.white70, size: 18),
                        ],
                      ),
                    ),
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
