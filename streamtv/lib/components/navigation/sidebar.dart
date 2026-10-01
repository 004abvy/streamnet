import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/responsive.dart';

class SidebarItemData {
  final String label;
  final IconData icon;
  final String group;

  const SidebarItemData({
    required this.label,
    required this.icon,
    required this.group,
  });
}

class SidebarNavigation extends StatelessWidget {
  final int activeIndex;
  final Function(int) onItemSelected;

  const SidebarNavigation({
    super.key,
    required this.activeIndex,
    required this.onItemSelected,
  });

  static const List<SidebarItemData> items = [
    // MENU
    SidebarItemData(label: 'Home', icon: LucideIcons.home, group: 'MENU'),
    SidebarItemData(label: 'Search', icon: LucideIcons.search, group: 'MENU'),
    SidebarItemData(label: 'Library', icon: LucideIcons.library, group: 'MENU'),
    
    // MEDIA
    SidebarItemData(label: 'Movies', icon: LucideIcons.film, group: 'MEDIA'),
    SidebarItemData(label: 'TV Shows', icon: LucideIcons.monitor, group: 'MEDIA'),
    SidebarItemData(label: 'Anime', icon: LucideIcons.swords, group: 'MEDIA'),
    SidebarItemData(label: 'Collections', icon: LucideIcons.folderOpen, group: 'MEDIA'),
    
    // SERVICES & SYSTEM
    SidebarItemData(label: 'Live TV', icon: LucideIcons.tv, group: 'SERVICES'),
    SidebarItemData(label: 'Announcements', icon: LucideIcons.bell, group: 'SYSTEM'),
  ];

  @override
  Widget build(BuildContext context) {
    final isMobile = Responsive.isMobile(context);

    if (isMobile) {
      return _buildMobileBottomBar();
    }

    return _buildDesktopAlwaysOpenSidebar();
  }

  // Full-Height, Vertical Glassmorphic Sidebar (Width: 230px)
  Widget _buildDesktopAlwaysOpenSidebar() {
    return Container(
      width: 230,
      height: double.infinity,
      decoration: BoxDecoration(
        color: const Color(0xFF0C0C14).withValues(alpha: 0.95),
        border: const Border(
          right: BorderSide(color: AppTheme.cardBorder, width: 1.2),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.5),
            blurRadius: 20,
            offset: const Offset(4, 0),
          ),
        ],
      ),
      child: ClipRect(
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 28, sigmaY: 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Top Brand Logo & App Name
              Padding(
                padding: const EdgeInsets.only(left: 20, right: 20, top: 24, bottom: 20),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppTheme.watchYellow.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: AppTheme.watchYellow.withValues(alpha: 0.4),
                          width: 1.2,
                        ),
                      ),
                      child: const Icon(
                        LucideIcons.clapperboard,
                        color: AppTheme.watchYellow,
                        size: 22,
                      ),
                    ),
                    const SizedBox(width: 12),
                    const Text(
                      'StreamNet',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -0.5,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),

              const Divider(color: AppTheme.cardBorder, height: 1, indent: 16, endIndent: 16),
              const SizedBox(height: 12),

              // 2. Navigation Items Grouped Vertically
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: _buildGroupedList(),
                  ),
                ),
              ),

              // 3. Bottom User Profile Pill
              Container(
                margin: const EdgeInsets.all(14),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: AppTheme.cardBg,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppTheme.cardBorder),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 34,
                      height: 34,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: AppTheme.watchYellow.withValues(alpha: 0.15),
                        border: Border.all(color: AppTheme.watchYellow.withValues(alpha: 0.3)),
                      ),
                      child: const Center(
                        child: Icon(LucideIcons.user, color: AppTheme.watchYellow, size: 18),
                      ),
                    ),
                    const SizedBox(width: 10),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'Abdul',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          Text(
                            'Premium Plan',
                            style: TextStyle(
                              color: AppTheme.textMuted,
                              fontSize: 10,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _buildGroupedList() {
    List<Widget> widgets = [];
    String? currentGroup;

    for (int i = 0; i < items.length; i++) {
      final item = items[i];

      // Add group heading
      if (item.group != currentGroup) {
        currentGroup = item.group;
        widgets.add(
          Padding(
            padding: const EdgeInsets.only(left: 10, top: 16, bottom: 6),
            child: Text(
              currentGroup,
              style: const TextStyle(
                color: Color(0xFF66667E),
                fontSize: 10,
                fontWeight: FontWeight.w800,
                letterSpacing: 1.2,
              ),
            ),
          ),
        );
      }

      final isActive = activeIndex == i;
      widgets.add(
        _SidebarRowBtn(
          item: item,
          isActive: isActive,
          onTap: () => onItemSelected(i),
        ),
      );
    }

    return widgets;
  }

  // Mobile Bottom Bar
  Widget _buildMobileBottomBar() {
    return Container(
      height: 64,
      decoration: BoxDecoration(
        color: const Color(0xFF0C0C12).withValues(alpha: 0.95),
        border: const Border(
          top: BorderSide(color: AppTheme.cardBorder, width: 1),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _MobileNavIcon(
            icon: LucideIcons.home,
            isActive: activeIndex == 0,
            onTap: () => onItemSelected(0),
          ),
          _MobileNavIcon(
            icon: LucideIcons.search,
            isActive: activeIndex == 1,
            onTap: () => onItemSelected(1),
          ),
          _MobileNavIcon(
            icon: LucideIcons.film,
            isActive: activeIndex == 3,
            onTap: () => onItemSelected(3),
          ),
          _MobileNavIcon(
            icon: LucideIcons.monitor,
            isActive: activeIndex == 4,
            onTap: () => onItemSelected(4),
          ),
          _MobileNavIcon(
            icon: LucideIcons.swords,
            isActive: activeIndex == 5,
            onTap: () => onItemSelected(5),
          ),
          _MobileNavIcon(
            icon: LucideIcons.library,
            isActive: activeIndex == 2,
            onTap: () => onItemSelected(2),
          ),
        ],
      ),
    );
  }
}

class _SidebarRowBtn extends StatefulWidget {
  final SidebarItemData item;
  final bool isActive;
  final VoidCallback onTap;

  const _SidebarRowBtn({
    required this.item,
    required this.isActive,
    required this.onTap,
  });

  @override
  State<_SidebarRowBtn> createState() => _SidebarRowBtnState();
}

class _SidebarRowBtnState extends State<_SidebarRowBtn> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    final active = widget.isActive;
    final color = active
        ? AppTheme.watchYellow
        : (_isHovered ? Colors.white : const Color(0xFFA5A5BC));

    return Focus(
      onFocusChange: (focused) => setState(() => _isHovered = focused),
      child: MouseRegion(
        onEnter: (_) => setState(() => _isHovered = true),
        onExit: (_) => setState(() => _isHovered = false),
        child: GestureDetector(
          onTap: widget.onTap,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            margin: const EdgeInsets.symmetric(vertical: 3),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: active
                  ? AppTheme.watchYellow.withValues(alpha: 0.14)
                  : (_isHovered ? Colors.white.withValues(alpha: 0.06) : Colors.transparent),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: active
                    ? AppTheme.watchYellow.withValues(alpha: 0.4)
                    : (_isHovered ? Colors.white.withValues(alpha: 0.1) : Colors.transparent),
                width: 1,
              ),
            ),
            child: Row(
              children: [
                Icon(
                  widget.item.icon,
                  size: 19,
                  color: color,
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Text(
                    widget.item.label,
                    style: TextStyle(
                      color: color,
                      fontSize: 14,
                      fontWeight: active ? FontWeight.bold : FontWeight.w500,
                      letterSpacing: 0.1,
                    ),
                  ),
                ),
                if (active)
                  Container(
                    width: 5,
                    height: 5,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppTheme.watchYellow,
                      boxShadow: [
                        BoxShadow(
                          color: AppTheme.watchYellow,
                          blurRadius: 6,
                          spreadRadius: 1,
                        )
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _MobileNavIcon extends StatelessWidget {
  final IconData icon;
  final bool isActive;
  final VoidCallback onTap;

  const _MobileNavIcon({
    required this.icon,
    required this.isActive,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: isActive ? AppTheme.watchYellow.withValues(alpha: 0.15) : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(
          icon,
          size: 22,
          color: isActive ? AppTheme.watchYellow : Colors.white70,
        ),
      ),
    );
  }
}
