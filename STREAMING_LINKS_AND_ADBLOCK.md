# StreamNet Architecture & Implementation Guide

This document contains a comprehensive breakdown of all the streaming links, IPTV configurations, direct stream connections, and the intelligent adblock framework used in the StreamNet platform. This guide is designed to make it easy to understand and implement these features anywhere.

---

## 1. Embed iframe Links (Providers)

The platform utilizes a variety of third-party embed iframes for delivering 4K UHD content. These are primarily defined in `utils/providers/` and `utils/servers.ts`.

### Active Premium Providers

| Provider Name | Type | Characteristics | Base URL (Movie) | Base URL (TV) |
|---|---|---|---|---|
| **VidLink Ultra** | Iframe | Ad-Free VIP, Multi-Audio | `https://vidlink.pro/movie/{tmdbId}` | `https://vidlink.pro/tv/{tmdbId}/{season}/{episode}` |
| **YapGrid 4K** | Iframe | Ad-Free, Subtitle Translation | `https://yapgrid.com/embed/movie/{tmdbId}` | `https://yapgrid.com/embed/tv/{tmdbId}/{season}/{episode}` |
| **Nxsha Cinema** | Iframe | High Bitrate, Direct Stream | `https://web.nxsha.app/embed/movie/{tmdbId}` | `https://web.nxsha.app/embed/tv/{tmdbId}/{season}/{episode}` |
| **CineSrc 4K** | Iframe | Auto-Skip, Auto-Next | `https://cinesrc.st/embed/movie/{tmdbId}` | `https://cinesrc.st/embed/tv/{tmdbId}?s={season}&e={episode}` |

### Additional Backup / Iframe Servers (`servers.ts`)
*   **ScreenScape:** `https://screenscape.me/embed?tmdb={tmdbId}&type={type}`
*   **VidKing:** `https://www.vidking.net/embed/movie/{tmdbId}`
*   **Embed.su:** `https://embed.su/embed/movie/{tmdbId}`
*   **VidSrc (v2/v3):** `https://vidsrc.cc/v2/embed/movie/{tmdbId}`
*   **SuperEmbed:** `https://multiembed.mov/?video_id={tmdbId}&tmdb=1`
*   **AutoEmbed:** `https://autoembed.co/movie/tmdb/{tmdbId}`
*   **2Embed:** `https://www.2embed.cc/embed/{tmdbId}`
*   **FilmKu:** `https://filmku.stream/embed/{tmdbId}`
*   **MoviesAPI:** `https://moviesapi.club/movie/{tmdbId}`
*   **VidEasy:** `https://player.videasy.to/movie/{tmdbId}`

### How to Implement Embed Iframes
When implementing an iframe, always ensure you append necessary query parameters (like `autoplay=1`, `lang=hi`, `color=f59e0b`) depending on the provider. Most modern providers require specific URL params to enable auto-next or UI customizations.

**Example Implementation (React):**
```tsx
const url = \`https://vidlink.pro/movie/\${tmdbId}?primaryColor=f59e0b&autoplay=true\`;
return (
  <iframe 
    src={url}
    width="100%" 
    height="100%"
    allow="autoplay; fullscreen"
    frameBorder="0"
  />
);
```

---

## 2. Direct Stream Connections (OMSS)

Direct streaming involves fetching the raw video manifest (e.g., `.m3u8` or `.mp4`) and playing it using a custom native player (like HLS.js or video.js) instead of an iframe.

*   **StreamNet Player (Default Direct):** Uses internal scraping and APIs to resolve direct HLS (`.m3u8`) links.
*   **VidSrc Player (Direct):** Bypasses the iframe to extract direct links.

### How to Implement Direct Streams
1.  **Extract the manifest:** Use a backend proxy or an extraction script (like the Python extraction tools found in your `rive/` directory) to parse the target provider and return the `.m3u8` link.
2.  **Play via HLS.js:**
```javascript
import Hls from "hls.js";

const video = document.getElementById('video');
if (Hls.isSupported()) {
  const hls = new Hls();
  hls.loadSource('https://example.com/direct-stream.m3u8');
  hls.attachMedia(video);
  hls.on(Hls.Events.MANIFEST_PARSED, function() {
    video.play();
  });
}
```

---

## 3. IPTV Links (Live TV)

The platform supports Live TV using M3U playlists and direct `.m3u8` streams. This is implemented in `app/live-tv/page.tsx`.

### Core IPTV Setup
*   **Main GitHub IPTV Playlist:** `https://iptv-org.github.io/iptv/languages/hin.m3u`
*   **Implementation Strategy:** The frontend fetches the `.m3u` file, parses the `#EXTINF` metadata (logo, name, category), and feeds the resulting `.m3u8` URLs into an HLS-compatible video player.

### Selected High-Quality Direct IPTV Links
Here are some of the direct `.m3u8` links hardcoded into the platform for stability:

**Movies:**
*   **&TV:** `https://amg01117-amg01117c1-amgplt0029.playout.now3.amagi.tv/playlist/amg01117-amg01117c1-amgplt0029/playlist.m3u8`
*   **Zee Cinema:** `https://amg17931-zee-amg17931c5-samsung-au-8873.playouts.now.amagi.tv/playlist.m3u8`
*   **Star Gold:** `http://66.102.126.10:8000/play/a00f/index.m3u8`
*   **Sony Max:** `https://cloudplay-sonyliv.pages.dev/maxhd.m3u8`

**Sports & News:**
*   **Star Sports 1 Hindi:** `http://103.253.18.58:8000/play/a00t`
*   **Aaj Tak HD:** `https://feeds.intoday.in/aajtak/api/aajtakhd/master.m3u8`
*   **ABP News:** `https://d2l4ar6y3mrs4k.cloudfront.net/live-streaming/abpnews-livetv/master.m3u8`
*   **Sony Sports Ten 3:** `https://cloudplay-sonyliv.pages.dev/ten3hd.m3u8`

### How to Implement IPTV
Use the parsed `.m3u8` links in exactly the same way as direct streams, feeding them into a native player using HLS.js (for web) or ExoPlayer (for Android).

---

## 4. Intelligent Adblock Framework

The most advanced feature is the custom-built **Adblock Framework** (`utils/adblockFramework.ts` and `utils/javascriptInjector.ts`), inspired by uBlock Origin. It protects against popups, overlays, and redirects natively.

### Core Techniques Used

1.  **IFrame Sandboxing:**
    *   **Perfect Sandbox:** `allow-scripts allow-same-origin allow-forms allow-presentation`. 
    *   **Forbidden:** `allow-popups`, `allow-top-navigation` (prevents redirecting the parent tab).
    *   *Note:* Some providers (like VidLink and YapGrid) refuse to play if sandboxed. For them, the scriptlet injection steps in.
2.  **`prevent-window-open.js` (Dummy Proxy):**
    Intercepts `window.open`. If an ad script tries to open a popup, it returns a fake, functional `Window` object, meaning the script doesn't throw errors but no popup opens.
3.  **`prevent-navigation.js`:**
    Listens to the Chromium Navigation API (`window.navigation`) and prevents any non-user-initiated top-level redirects (e.g., an ad trying to change the main page URL).
4.  **`prevent-addEventListener.js`:**
    Detects and defuses malicious `click` or `touchend` event listeners attached by ad-networks that spawn popunders.
5.  **Overlay Buster & Z-Axis Defuser:**
    Runs a `MutationObserver` and periodic checks to find invisible click-jacking layers (`z-index: 99999`) or fullscreen modals and deletes them from the DOM.
6.  **Network Request Dropper (`prevent-fetch.js` & `prevent-xhr.js`):**
    Intercepts `fetch` and `XMLHttpRequest` and silently drops requests sent to known ad domains (`popads.net`, `adsterra.com`, etc.).

### How to Implement the Adblocker Anywhere

**Step 1: Inject at Document Start**
To ensure the scriptlets load before the ads do, you must inject the core bundle in the `<head>` of your HTML before anything else loads.
```html
<script>
  // Output of GET_INJECTABLE_UBLOCK_BUNDLE() from javascriptInjector.ts
  (function() {
      if (window.__STREAMNET_JS_INJECTOR_ACTIVE__) return;
      window.__STREAMNET_JS_INJECTOR_ACTIVE__ = true;
      var origOpen = window.open;
      window.open = function() { /* Dummy window logic here */ };
      // ... include the rest of the scriptlets ...
  })();
</script>
```

**Step 2: Initialize Client-Side Protection**
In your application lifecycle (e.g., React `useEffect`), call the framework initialization:
```typescript
import { installAdblockProtection } from './utils/adblockFramework';

useEffect(() => {
  const cleanup = installAdblockProtection(true, (action, target) => {
    console.log(`Adblock intercepted: ${action}`, target);
  });
  return () => cleanup();
}, []);
```

**Step 3: Secure IFrame Attributes**
When rendering an iframe, dynamically apply the strictest possible properties based on the provider:
```typescript
import { resolveServerIframeAttributes } from './utils/adblockFramework';

const attributes = resolveServerIframeAttributes('cinesrc', 'https://cinesrc.st/...');
return (
  <iframe 
    src={attributes.src}
    sandbox={attributes.sandbox} // "allow-scripts allow-same-origin allow-forms allow-presentation"
    referrerPolicy={attributes.referrerPolicy}
    allow={attributes.allow}
  />
)
```

This multi-layered approach ensures your streaming platform remains completely clean, ad-free, and safe for users without requiring browser extensions.
