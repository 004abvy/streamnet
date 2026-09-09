import type { ResolvedStream } from './types';
import { resolveVideasy } from './videasy';
import { resolveVidLink } from './vidlink';
import { resolveVixSrc } from './vixsrc';
import { resolveAutoembed } from './autoembed';

export type { ResolvedStream } from './types';

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
    { name: 'Videasy', fn: () => resolveVideasy(tmdbId, mediaType, season, episode) },
    { name: 'VidLink', fn: () => resolveVidLink(tmdbId, mediaType, season, episode) },
    { name: 'VixSrc', fn: () => resolveVixSrc(tmdbId, mediaType, season, episode) },
    { name: 'AutoEmbed', fn: () => resolveAutoembed(tmdbId, mediaType, season, episode) },
  ];

  const results = await Promise.allSettled(
    resolvers.map(async (r) => {
      try {
        return await r.fn();
      } catch (e) {
        console.warn(`[resolveAllStreams] ${r.name} failed:`, e);
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
