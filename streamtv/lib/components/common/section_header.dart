import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/responsive.dart';

class SectionHeader extends StatelessWidget {
  final String title;
  final VoidCallback? onViewAll;

  const SectionHeader({
    super.key,
    required this.title,
    this.onViewAll,
  });

  @override
  Widget build(BuildContext context) {
    final isMobile = Responsive.isMobile(context);

    return Padding(
      padding: EdgeInsets.symmetric(
        horizontal: isMobile ? 16 : 32,
        vertical: 8,
      ),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 18,
            decoration: BoxDecoration(
              color: AppTheme.watchYellow,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 10),
          Text(
            title,
            style: TextStyle(
              fontSize: isMobile ? 18 : 20,
              fontWeight: FontWeight.bold,
              color: Colors.white,
              letterSpacing: -0.3,
            ),
          ),
          const Spacer(),
          if (onViewAll != null)
            GestureDetector(
              onTap: onViewAll,
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'View All',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.watchYellow,
                    ),
                  ),
                  SizedBox(width: 4),
                  Icon(Icons.chevron_right_rounded, color: AppTheme.watchYellow, size: 18),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
