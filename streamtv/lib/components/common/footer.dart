import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/app_theme.dart';

class AppFooter extends StatelessWidget {
  const AppFooter({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 40),
      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 36),
      decoration: const BoxDecoration(
        color: Color(0xFF08080C),
        border: Border(
          top: BorderSide(color: AppTheme.cardBorder, width: 1),
        ),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: AppTheme.watchYellow.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(
                  LucideIcons.clapperboard,
                  color: AppTheme.watchYellow,
                  size: 20,
                ),
              ),
              const SizedBox(width: 10),
              const Text(
                'StreamNet',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Text(
            'Explore unlimited movies, anime, and series without interruptions.',
            style: TextStyle(fontSize: 13, color: AppTheme.textMuted),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          const Text(
            '© 2026 StreamNet. All Rights Reserved.',
            style: TextStyle(fontSize: 12, color: Color(0xFF555566)),
          ),
        ],
      ),
    );
  }
}
