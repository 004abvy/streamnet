import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/responsive.dart';

class Announcement {
  final String title;
  final String date;
  final String tag;
  final String content;

  const Announcement({
    required this.title,
    required this.date,
    required this.tag,
    required this.content,
  });
}

class AnnouncementsPage extends StatelessWidget {
  const AnnouncementsPage({super.key});

  static const List<Announcement> _announcements = [
    Announcement(
      title: 'StreamTV Mobile & TV Architecture Live',
      date: 'September 2026',
      tag: 'NEW RELEASE',
      content: 'Hardware-accelerated libmpv player, full D-pad TV remote control support, and 1:1 Next.js web design parity are now fully operational.',
    ),
    Announcement(
      title: 'Enhanced m3u8 Direct Stream Resolvers',
      date: 'September 2026',
      tag: 'STREAMING ENGINE',
      content: 'Added ScreenScape, RiveStream, and VidKing fallback failover mechanisms with instant stream server switching.',
    ),
    Announcement(
      title: 'Anime Universe Integration',
      date: 'September 2026',
      tag: 'ANIME',
      content: 'Connected Anivexa / HiAnime endpoints for full anime episode lists, subs, and top airing recommendations.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
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
          'Announcements & Updates',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
      ),
      body: ListView.builder(
        padding: EdgeInsets.symmetric(horizontal: isMobile ? 16 : 32, vertical: 16),
        itemCount: _announcements.length,
        itemBuilder: (context, index) {
          final item = _announcements[index];

          return Container(
            margin: const EdgeInsets.only(bottom: 16),
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppTheme.cardBg,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppTheme.cardBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppTheme.watchYellow.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: AppTheme.watchYellow.withValues(alpha: 0.4)),
                      ),
                      child: Text(
                        item.tag,
                        style: const TextStyle(
                          color: AppTheme.watchYellow,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const Spacer(),
                    Text(
                      item.date,
                      style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  item.title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  item.content,
                  style: const TextStyle(
                    color: AppTheme.textMuted,
                    fontSize: 13,
                    height: 1.5,
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
