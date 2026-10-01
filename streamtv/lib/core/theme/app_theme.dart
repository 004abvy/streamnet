import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Exact Web App Design Tokens from globals.css & page.module.css
  static const Color background = Color(0xFF0A0A0F);
  static const Color backgroundDark = Color(0xFF0A0A0F);
  static const Color cardBg = Color(0xFF12121A);
  static const Color surfaceCard = Color(0xFF12121A);
  static const Color surfaceDark = Color(0xFF12121A);
  static const Color cardBorder = Color(0xFF222232);
  static const Color textMuted = Color(0xFFAAAABB);
  static const Color textForeground = Color(0xFFEDEDED);
  static const Color textWhite = Color(0xFFFFFFFF);
  
  // Brand & Action Accents
  static const Color watchYellow = Color(0xFFEAB308); // Exact Web App Hero Watch Button Yellow
  static const Color primaryRed = Color(0xFFE50914);
  static const Color blueAccent = Color(0xFF3B82F6);
  static const Color focusGlow = Color(0xFFEAB308);

  // Skeleton Colors
  static const Color skeletonBase = Color(0xFF12121B);
  static const Color skeletonHighlight = Color(0xFF1F1F2E);
  static const Color skeletonShimmer = Color(0xFF2C2C42);

  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: background,
      primaryColor: watchYellow,
      colorScheme: const ColorScheme.dark(
        primary: watchYellow,
        secondary: primaryRed,
        surface: cardBg,
      ),
      textTheme: GoogleFonts.interTextTheme(
        ThemeData.dark().textTheme,
      ).apply(
        bodyColor: textForeground,
        displayColor: textForeground,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
      ),
      cardTheme: CardThemeData(
        color: cardBg,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: cardBorder, width: 1),
        ),
      ),
    );
  }
}
