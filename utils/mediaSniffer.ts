/**
 * StreamNet 1DM Intelligent Media & Network Sniffer
 *
 * Sniffs network requests (Fetch, XHR, PerformanceObserver)
 * Parses HLS Master Playlists (.m3u8) to extract:
 * 1. Video Streams (1080p, 720p, 480p, 360p)
 * 2. Multi-Audio Tracks (Hindi, English, Tamil, Telugu, Spanish)
 * 3. Subtitle Tracks (.vtt, .srt)
 * 4. Direct Audio Files (.mp3, .aac, .m4a)
 */

export interface SniffedMediaItem {
  id: string;
  type: 'video' | 'audio' | 'subtitle';
  label: string;
  url: string;
  language?: string;
  resolution?: string;
  bandwidth?: number;
  mimeType?: string;
}

/**
 * Parses HLS Master Playlist content (.m3u8)
 */
export function parseM3u8Playlist(baseUrl: string, manifestText: string): SniffedMediaItem[] {
  const items: SniffedMediaItem[] = [];
  const lines = manifestText.split('\n');

  let currentBandwidth = 0;
  let currentResolution = '';

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // 1. Audio Tracks (#EXT-X-MEDIA:TYPE=AUDIO)
    if (trimmed.startsWith('#EXT-X-MEDIA:') && trimmed.includes('TYPE=AUDIO')) {
      const nameMatch = trimmed.match(/NAME="([^"]+)"/i);
      const langMatch = trimmed.match(/LANGUAGE="([^"]+)"/i);
      const uriMatch = trimmed.match(/URI="([^"]+)"/i);

      if (uriMatch && uriMatch[1]) {
        const fullUrl = new URL(uriMatch[1], baseUrl).href;
        const lang = langMatch ? langMatch[1] : 'hi';
        const label = nameMatch ? nameMatch[1] : `Audio (${lang.toUpperCase()})`;
        items.push({
          id: `audio-${lang}-${Math.random().toString(36).substring(2, 7)}`,
          type: 'audio',
          label: `🎵 ${label}`,
          url: fullUrl,
          language: lang,
          mimeType: 'audio/aac',
        });
      }
    }

    // 2. Subtitles (#EXT-X-MEDIA:TYPE=SUBTITLES)
    if (trimmed.startsWith('#EXT-X-MEDIA:') && trimmed.includes('TYPE=SUBTITLES')) {
      const nameMatch = trimmed.match(/NAME="([^"]+)"/i);
      const langMatch = trimmed.match(/LANGUAGE="([^"]+)"/i);
      const uriMatch = trimmed.match(/URI="([^"]+)"/i);

      if (uriMatch && uriMatch[1]) {
        const fullUrl = new URL(uriMatch[1], baseUrl).href;
        items.push({
          id: `sub-${Math.random().toString(36).substring(2, 7)}`,
          type: 'subtitle',
          label: `💬 ${nameMatch ? nameMatch[1] : 'Subtitles'}`,
          url: fullUrl,
          language: langMatch ? langMatch[1] : 'en',
          mimeType: 'text/vtt',
        });
      }
    }

    // 3. Video Resolution Streams (#EXT-X-STREAM-INF)
    if (trimmed.startsWith('#EXT-X-STREAM-INF:')) {
      const bwMatch = trimmed.match(/BANDWIDTH=(\d+)/i);
      const resMatch = trimmed.match(/RESOLUTION=(\d+x\d+)/i);
      if (bwMatch) currentBandwidth = parseInt(bwMatch[1], 10);
      if (resMatch) currentResolution = resMatch[1];

      // Next non-comment line is the stream URI
      const nextLine = lines[index + 1]?.trim();
      if (nextLine && !nextLine.startsWith('#')) {
        const fullUrl = new URL(nextLine, baseUrl).href;
        const resLabel = currentResolution ? `${currentResolution.split('x')[1]}p` : 'HD Stream';
        items.push({
          id: `video-${resLabel}-${Math.random().toString(36).substring(2, 7)}`,
          type: 'video',
          label: `📹 Video Stream (${resLabel})`,
          url: fullUrl,
          resolution: resLabel,
          bandwidth: currentBandwidth,
          mimeType: 'application/x-mpegURL',
        });
      }
    }
  });

  return items;
}

/**
 * Initializes the global 1DM Network Sniffer
 */
export function initMediaSniffer(onMediaFound: (items: SniffedMediaItem[]) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const cleanups: Array<() => void> = [];
  const detectedUrls = new Set<string>();

  // A. Sniff Fetch Requests
  const origFetch = window.fetch;
  window.fetch = async function (...args) {
    const response = await origFetch.apply(this, args);
    const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url || '';

    if (url && !detectedUrls.has(url)) {
      const lower = url.toLowerCase();
      if (lower.endsWith('.mp3') || lower.endsWith('.aac') || lower.endsWith('.m4a')) {
        detectedUrls.add(url);
        onMediaFound([
          {
            id: `audio-direct-${Date.now()}`,
            type: 'audio',
            label: lower.endsWith('.mp3') ? '🎵 Direct MP3 Audio Track' : '🎵 Direct AAC Audio Track',
            url,
            mimeType: 'audio/mpeg',
          },
        ]);
      } else if (lower.endsWith('.vtt') || lower.endsWith('.srt')) {
        detectedUrls.add(url);
        onMediaFound([
          {
            id: `sub-direct-${Date.now()}`,
            type: 'subtitle',
            label: '💬 Subtitle File (.vtt)',
            url,
            mimeType: 'text/vtt',
          },
        ]);
      } else if (lower.includes('.m3u8') || lower.includes('playlist')) {
        detectedUrls.add(url);
        try {
          const clone = response.clone();
          const text = await clone.text();
          const parsed = parseM3u8Playlist(url, text);
          if (parsed.length > 0) {
            onMediaFound(parsed);
          }
        } catch (e) {}
      }
    }

    return response;
  };

  cleanups.push(() => {
    window.fetch = origFetch;
  });

  // B. PerformanceObserver Resource Sniffer
  if (typeof PerformanceObserver !== 'undefined') {
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          const url = entry.name;
          if (url && !detectedUrls.has(url)) {
            const lower = url.toLowerCase();
            if (lower.includes('.m3u8')) {
              detectedUrls.add(url);
              fetch(url)
                .then((res) => res.text())
                .then((text) => {
                  const parsed = parseM3u8Playlist(url, text);
                  if (parsed.length > 0) onMediaFound(parsed);
                })
                .catch(() => {});
            } else if (lower.endsWith('.mp3') || lower.endsWith('.aac')) {
              detectedUrls.add(url);
              onMediaFound([
                {
                  id: `audio-perf-${Date.now()}`,
                  type: 'audio',
                  label: '🎵 Extracted Audio Stream',
                  url,
                  mimeType: 'audio/aac',
                },
              ]);
            }
          }
        });
      });

      observer.observe({ entryTypes: ['resource'] });
      cleanups.push(() => observer.disconnect());
    } catch (e) {}
  }

  return () => {
    cleanups.forEach((fn) => fn());
  };
}

/**
 * Instant 1DM Server-Side Stream & Master Playlist Extractor
 * Executes as soon as the user presses Play or selects a title!
 */
export async function resolve1DmMediaInfo(
  tmdbId: string,
  type: 'movie' | 'tv',
  season?: number,
  episode?: number
): Promise<SniffedMediaItem[]> {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
  const items: SniffedMediaItem[] = [];

  try {
    const res = await fetch(`${backendUrl}/api/stream/mediaInfo?id=${tmdbId}`);
    if (res.ok) {
      const data = await res.json();
      if (data) {
        if (data.playlist || data.file || data.stream) {
          const streamUrl = data.playlist || data.file || data.stream;
          try {
            const proxyRes = await fetch(`${backendUrl}/api/stream/proxy?url=${encodeURIComponent(streamUrl)}`);
            if (proxyRes.ok) {
              const manifestText = await proxyRes.text();
              const parsed = parseM3u8Playlist(streamUrl, manifestText);
              items.push(...parsed);
            }
          } catch (e) {
            items.push({
              id: `stream-auto-${tmdbId}`,
              type: 'video',
              label: '📹 Direct Master Playlist Stream (.m3u8)',
              url: streamUrl,
              mimeType: 'application/x-mpegURL',
            });
          }
        }

        if (Array.isArray(data.subtitles)) {
          data.subtitles.forEach((sub: any) => {
            if (sub.url || sub.file) {
              items.push({
                id: `sub-auto-${Math.random().toString(36).substring(2, 7)}`,
                type: 'subtitle',
                label: `💬 ${sub.label || sub.language || 'Subtitles'}`,
                url: sub.url || sub.file,
                language: sub.language || 'en',
                mimeType: 'text/vtt',
              });
            }
          });
        }
      }
    }
  } catch (e) {
    console.warn('1DM Media Sniffer Resolver error:', e);
  }

  // Extract Nxsha Multi-Audio Languages for any movie or TV show
  try {
    const nxshaRes = await fetch(`${backendUrl}/api/stream/nxsha-languages?id=${tmdbId}&type=${type}&season=${season || 1}&episode=${episode || 1}`);
    if (nxshaRes.ok) {
      const nxshaData = await nxshaRes.json();
      if (nxshaData && Array.isArray(nxshaData.languages)) {
        nxshaData.languages.forEach((lang: any) => {
          items.push({
            id: `nxsha-lang-${lang.code}-${tmdbId}`,
            type: 'audio',
            label: `🎵 Nxsha Extracted Track: ${lang.name} ${lang.flag}`,
            url: lang.url,
            language: lang.code,
            mimeType: 'audio/aac',
          });
        });
      }
    }
  } catch (e) {
    console.warn('Nxsha Language Sniffer error:', e);
  }

  // Pre-populate instant Hindi & 4K streams
  if (type === 'movie') {
    items.push({
      id: `m3u8-cinesrc-${tmdbId}`,
      type: 'video',
      label: '📹 CineSrc 4K Master Playlist (.m3u8)',
      url: `https://cinesrc.st/embed/movie/${tmdbId}?color=%23f59e0b&autoskip=true`,
      resolution: '4K',
      mimeType: 'application/x-mpegURL',
    });
  } else {
    items.push({
      id: `m3u8-cinesrc-tv-${tmdbId}`,
      type: 'video',
      label: `📹 CineSrc 4K Episode Master (S${season || 1} E${episode || 1})`,
      url: `https://cinesrc.st/embed/tv/${tmdbId}?s=${season || 1}&e=${episode || 1}&color=%23f59e0b`,
      resolution: '4K',
      mimeType: 'application/x-mpegURL',
    });
  }

  return items;
}

/**
 * Direct CORS-Bypassing File Downloader
 * Converts remote streams, AAC audio tracks, and VTT subtitles into native browser downloads
 */
export async function downloadMediaFile(url: string, suggestedFilename: string): Promise<boolean> {
  if (typeof window === 'undefined' || !url) return false;

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
  const proxyUrl = `${backendUrl}/api/stream/proxy?url=${encodeURIComponent(url)}`;

  try {
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error(`Proxy error ${res.status}`);

    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = suggestedFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
    return true;
  } catch (e) {
    console.warn('Direct download fallback triggered:', e);
    // Fallback: Open in new window/tab
    window.open(url, '_blank');
    return false;
  }
}
