import type { ResolvedStream } from './types';

const VIDLINK_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Referer': 'https://vidlink.pro',
};

export async function resolveVidLink(
  tmdbId: string,
  mediaType: 'movie' | 'tv',
  season: string = '1',
  episode: string = '1'
): Promise<ResolvedStream[]> {
  try {
    // Step 1: Encrypt the TMDB ID via enc-dec.app
    const encRes = await fetch(
      `https://enc-dec.app/api/enc-vidlink?text=${encodeURIComponent(tmdbId)}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!encRes.ok) return [];
    const encData = await encRes.json();
    const encodedTmdb = encData?.result;
    if (!encodedTmdb) return [];

    // Step 2: Fetch streams from VidLink API
    const apiUrl = mediaType === 'tv'
      ? `https://vidlink.pro/api/b/tv/${encodedTmdb}/${season}/${episode}?multiLang=0`
      : `https://vidlink.pro/api/b/movie/${encodedTmdb}?multiLang=0`;

    const apiRes = await fetch(apiUrl, {
      headers: VIDLINK_HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (!apiRes.ok) return [];
    const data = await apiRes.json();

    const streamData = data?.stream;
    if (!streamData?.qualities) return [];

    const streams: ResolvedStream[] = [];
    const entries = Object.entries(streamData.qualities) as [string, any][];

    // Sort by quality descending
    entries
      .filter(([, entry]) => entry?.url)
      .sort((a, b) => {
        const qa = a[0] === '4k' ? 2160 : parseInt(a[0], 10) || 0;
        const qb = b[0] === '4k' ? 2160 : parseInt(b[0], 10) || 0;
        return qb - qa;
      })
      .forEach(([qualityKey, entry], index) => {
        const label = qualityKey === '4k' ? '4K' : qualityKey === 'Auto' ? 'Auto' : `${qualityKey}p`;
        streams.push({
          id: `vidlink-${index}`,
          provider: 'VidLink',
          url: entry.url,
          quality: label,
          type: 'hls',
          headers: { 'Referer': 'https://vidlink.pro' },
        });
      });

    // Extract captions if available
    if (streamData.captions && Array.isArray(streamData.captions)) {
      for (const stream of streams) {
        stream.subtitles = streamData.captions
          .filter((c: any) => c?.url)
          .map((c: any) => ({
            url: c.url,
            label: c.language || 'Unknown',
            language: c.language,
          }));
      }
    }

    return streams;
  } catch (e) {
    console.warn('[VidLink] Error:', e);
    return [];
  }
}
