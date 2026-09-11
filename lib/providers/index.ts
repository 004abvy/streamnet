import type { ResolvedStream } from './types';
import { resolveVideasy } from './videasy';
import { resolveVidLink } from './vidlink';
import { resolveVixSrc } from './vixsrc';
import { resolveAutoembed } from './autoembed';

export type { ResolvedStream } from './types';

function withTimeout<T>(promise: Promise<T>, ms: number = 3000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout of ${ms}ms exceeded`)), ms))
  ]);
}

/**
 * Resolve all available direct HLS streams for a TMDB id.
 * Calls all providers in parallel with individual timeouts.
 * Returns the combined list of streams sorted by provider priority.
 */
export async function resolveAllStreams(
  tmdbId: string,
  mediaType: 'movie' | 'tv',
  season: string = '1',
  episode: string = '1'
): Promise<ResolvedStream[]> {
  const resolvers = [
    { name: 'Videasy', fn: () => withTimeout(resolveVideasy(tmdbId, mediaType, season, episode), 8000) },
    { name: 'VidLink', fn: () => withTimeout(resolveVidLink(tmdbId, mediaType, season, episode), 8000) },
    { name: 'VixSrc', fn: () => withTimeout(resolveVixSrc(tmdbId, mediaType, season, episode), 8000) },
    { name: 'AutoEmbed', fn: () => withTimeout(resolveAutoembed(tmdbId, mediaType, season, episode), 8000) },
  ];

  const results = await Promise.allSettled(
    resolvers.map(async (r) => {
      try {
        return await r.fn();
      } catch (e) {
        console.warn(`[resolveAllStreams] ${r.name} failed or timed out:`, e);
        return [];
      }
    })
  );

  const streams: ResolvedStream[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled' && Array.isArray(result.value)) {
      streams.push(...result.value);
    }
  }

  return streams;
}
