import type { ResolvedStream } from './types';

const AUTOEMBED_URLS = ['https://autoembed.cc', 'https://autoembed.co'];

export async function resolveAutoembed(
  tmdbId: string,
  mediaType: 'movie' | 'tv',
  _season: string = '1',
  _episode: string = '1'
): Promise<ResolvedStream[]> {
  try {
    let data: any = null;

    for (const base of AUTOEMBED_URLS) {
      try {
        const res = await fetch(`${base}/api/v1/mediaInfo?id=${tmdbId}`, {
          signal: AbortSignal.timeout(8000),
        });
        if (res.ok) {
          data = await res.json();
          break;
        }
      } catch {
        continue;
      }
    }

    if (!data) return [];

    const masterUrl = data.playlist || data.file || data.stream;
    if (!masterUrl || typeof masterUrl !== 'string') return [];

    // Verify it looks like a real stream URL
    if (!masterUrl.startsWith('http')) return [];

    const streams: ResolvedStream[] = [{
      id: 'autoembed-master',
      provider: 'AutoEmbed',
      url: masterUrl,
      quality: '1080p',
      type: 'hls',
      headers: {},
    }];

    return streams;
  } catch (e) {
    console.warn('[AutoEmbed] Error:', e);
    return [];
  }
}
