import 'package:flutter/material.dart';

class Responsive {
  static bool isTV(BuildContext context) {
    // Check if the device is a TV or large landscape screen (> 900px wide and landscape)
    final size = MediaQuery.of(context).size;
    final isWide = size.width >= 960;
    final isLandscape = size.width > size.height;
    return isWide && isLandscape;
  }

  static bool isTablet(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    return width >= 600 && width < 960;
  }

  static bool isMobile(BuildContext context) {
    return MediaQuery.of(context).size.width < 600;
  }

  static double getCardWidth(BuildContext context) {
    if (isTV(context)) return 170.0;
    if (isTablet(context)) return 150.0;
    return 125.0;
  }

  static double getCardHeight(BuildContext context) {
    if (isTV(context)) return 255.0;
    if (isTablet(context)) return 225.0;
    return 185.0;
  }
}
