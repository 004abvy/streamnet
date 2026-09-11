import type { ResolvedStream } from './types';

const BASE_URL = 'https://vixsrc.to';
const VIXSRC_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/javascript, */*; q=0.01',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': BASE_URL,
  'Origin': BASE_URL,
};

export async function resolveVixSrc(
  tmdbId: string,
  mediaType: 'movie' | 'tv',
  season: string = '1',
  episode: string = '1'
): Promise<ResolvedStream[]> {
  try {
    // Step 1: GET /api/movie/{id} or /api/tv/{id}/{s}/{e}
    const apiUrl = mediaType === 'movie'
      ? `${BASE_URL}/api/movie/${tmdbId}`
      : `${BASE_URL}/api/tv/${tmdbId}/${season}/${episode}`;

    const apiRes = await fetch(apiUrl, {
      headers: VIXSRC_HEADERS,
      signal: AbortSignal.timeout(10000),
    });
    if (!apiRes.ok) return [];
    const apiData = await apiRes.json();
    if (!apiData?.src) return [];

    // Step 2: Fetch embed page
    const embedRes = await fetch(`${BASE_URL}${apiData.src}`, {
      headers: { ...VIXSRC_HEADERS, Accept: 'text/html,application/xhtml+xml,*/*' },
      signal: AbortSignal.timeout(10000),
    });
    if (!embedRes.ok) return [];
    const html = await embedRes.text();

    // Step 3: Extract token data
    const token = html.match(/token["']\s*:\s*["']([^"']+)/)?.[1];
    const expires = html.match(/expires["']\s*:\s*["']([^"']+)/)?.[1];
    const playlist = html.match(/url\s*:\s*["']([^"']+)/)?.[1];
    if (!token || !expires || !playlist) return [];

    // Reject expired tokens
    if (parseInt(expires, 10) * 1000 - 60000 < Date.now()) return [];

    // Step 4: Build master URL
    const sep = playlist.includes('?') ? '&' : '?';
    const masterUrl = `${playlist}${sep}token=${token}&expires=${expires}&h=1`;

    // Step 5: Fetch HLS master playlist
    const playlistRes = await fetch(masterUrl, {
      headers: { ...VIXSRC_HEADERS, Referer: apiUrl },
      signal: AbortSignal.timeout(10000),
    });
    if (!playlistRes.ok) return [];
    const content = await playlistRes.text();

    // Step 6: Parse for best resolution
    const variantRegex = /#EXT-X-STREAM-INF:[^\n]*RESOLUTION=\d+x(\d+)[^\n]*\n([^\n]+)/g;
    let match;
    let bestResolution = 0;
    while ((match = variantRegex.exec(content)) !== null) {
      const res = parseInt(match[1], 10);
      if (res > bestResolution) bestResolution = res;
    }
    if (bestResolution === 0) return [];

    return [{
      id: 'vixsrc-0',
      provider: 'VixSrc',
      url: masterUrl,
      quality: `${bestResolution}p`,
      type: 'hls',
      headers: {
        'Referer': 'https://vixsrc.to/',
        'User-Agent': VIXSRC_HEADERS['User-Agent'],
      },
    }];
  } catch (e) {
    console.warn('[VixSrc] Error:', e);
    return [];
  }
}
