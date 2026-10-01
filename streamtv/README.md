# StreamTV 🎬📺

A high-performance, cross-platform **Mobile & Android TV / Fire TV** streaming client built with Flutter.

Connected directly to the StreamNet microservices ecosystem:
* **TMDB API**: Trending, Popular Movies, TV Shows, and Episode metadata
* **Anivexa / HiAnime Microservices**: Anime feed and episode scrapers
* **m3u8 Extraction Engine & Embed Resolvers**: ScreenScape, RiveStream, VidKing
* **MediaKit (libmpv)**: Native hardware-accelerated video player supporting m3u8 streams, SSA/ASS subtitles, and custom HTTP header bypasses.

---

## 📱 Features

- **Dual Mode (Mobile & 10-Foot TV UI)**:
  - **Android TV / Fire TV**: Smooth D-Pad remote focus navigation, glowing card highlights, expandable Leanback sidebar navigation.
  - **Mobile**: Touch navigation with bottom navigation bar and gesture controls.
- **High-Performance Player**:
  - Direct m3u8 playback with custom `Referer` / `User-Agent` headers.
  - OSD (On Screen Display) controls with auto-hide.
  - D-Pad key handling (Left/Right seek 10s, Enter play/pause, Up/Down controls).
  - Server switcher modal for instant fallback stream sources.
- **Search & Filter**: Search movies, TV series, and anime with instant suggestions.
- **Episode & Season Management**: Full season breakdown with episode cards and thumbnails.
- **My Library**: Local watchlist & playback progress tracking.

---

## 🚀 Getting Started

### 1. Prerequisites
If Flutter is not yet installed on your system:
1. Download Flutter SDK from [https://flutter.dev](https://flutter.dev).
2. Extract to `C:\flutter` and add `C:\flutter\bin` to your System `PATH`.
3. Verify by running `flutter doctor` in PowerShell.

### 2. Install Dependencies
In this `streamtv` directory:
```bash
flutter pub get
```

### 3. Run on Mobile or Android TV

#### On Mobile Emulator or Connected Phone:
```bash
flutter run
```

#### On Android TV Emulator or Fire TV:
1. Open Android Studio > Device Manager > Create Device > **TV (1080p Android TV)**.
2. Launch the TV emulator.
3. Run:
```bash
flutter run -d <emulator-id>
```

#### Build Release APK for Android TV / Fire TV Sideloading:
```bash
flutter build apk --release
```
The resulting APK in `build/app/outputs/flutter-apk/app-release.apk` can be installed on any Android TV or Amazon Firestick using the *Downloader* app or via `adb install`.

---

## ⚙️ Backend Configuration

Edit `lib/core/constants/api_constants.dart` to point to your live backend or local LAN IP:
* `defaultBackendUrl`: Your Node/Next.js backend
* `anivexaApiUrl`: Anivexa scraper API
* `m3u8CoreApiUrl`: Direct m3u8 extractor core
