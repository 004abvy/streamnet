import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:media_kit/media_kit.dart';
import 'core/theme/app_theme.dart';
import 'pages/home/home_page.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize MediaKit native libmpv player engine
  MediaKit.ensureInitialized();

  runApp(
    const ProviderScope(
      child: StreamTvApp(),
    ),
  );
}

class StreamTvApp extends StatelessWidget {
  const StreamTvApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'StreamTV',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      home: const HomePage(),
    );
  }
}
