import type { ResolvedStream } from './types';
import type { ProviderMediaObject, ProviderResult } from '@omss/framework';

import { resolveVideasy } from './videasy';
import { resolveVidLink } from './vidlink';
import { resolveVixSrc } from './vixsrc';
import { resolveAutoembed } from './autoembed';

import { MovieDownloader } from './02moviedownloader/02moviedownloader';
import { AnyEmbed } from './anyembed/anyembed';
import { CineSuProvider } from './cinesu/cinesu';
import { Fmovies4U } from './fmovies4u/fmovies4u';
import { FsharetvProvider } from './fshare/fshare';
import { IcefyProvider } from './icefy/icefy';
import { PeachifyProvider } from './peachify/peachify';
import { PoprProvider } from './popr/popr';
import { StreamMafiaProvider } from './streammafia/streammafia';
import { TulnexProvider } from './tulnex/tulnex';
import { VidApiProvider } from './vidapi/vidapi';
import { VidNestProvider } from './vidnest/vidnest';
import { VidRockProvider } from './vidrock/vidrock';
import { VidSrcProvider } from './vidsrc/vidsrc';
import { VidZeeProvider } from './vidzee/vidzee';

export type { ResolvedStream } from './types';

function withTimeout<T>(promise: Promise<T>, ms: number = 3000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout of ${ms}ms exceeded`)), ms))
  ]);
}

async function runOmssProvider(
  provider: any,
  tmdbId: string,
  mediaType: 'movie' | 'tv',
  season: string,
  episode: string
): Promise<ResolvedStream[]> {
  try {
    const media: ProviderMediaObject = {
      tmdbId,
      type: mediaType,
      s: Number(season) || 1,
      e: Number(episode) || 1,
      title: 'Unknown',
      releaseYear: '2024'
    };
    
    let result: ProviderResult;
    if (mediaType === 'tv') {
      result = await provider.getTVSources(media);
    } else {
      result = await provider.getMovieSources(media);
    }
    
    if (!result || !result.sources) return [];
    
    return result.sources.map(src => ({
      id: src.provider?.id || provider.id || 'unknown',
      provider: src.provider?.name || provider.name || 'OMSS Provider',
      url: src.url,
      type: (src.type === 'mp4' ? 'mp4' : 'hls') as 'hls' | 'mp4',
      quality: src.quality,
      subtitles: result.subtitles?.map(sub => ({
        url: sub.url,
        label: sub.label || sub.language || 'Unknown'
      }))
    }));
  } catch (err) {
    return [];
  }
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
  
  // Custom fetchers
  const customResolvers = [
    { name: 'VixSrc', fn: () => withTimeout(resolveVixSrc(tmdbId, mediaType, season, episode), 6000) },
    { name: 'AutoEmbed', fn: () => withTimeout(resolveAutoembed(tmdbId, mediaType, season, episode), 6000) },
    { name: 'Videasy', fn: () => withTimeout(resolveVideasy(tmdbId, mediaType, season, episode), 6000) },
    { name: 'VidLink', fn: () => withTimeout(resolveVidLink(tmdbId, mediaType, season, episode), 6000) },
  ];

  // Instantiate OMSS Providers
  const omssProviders = [
    new MovieDownloader(),
    new AnyEmbed(),
    new CineSuProvider(),
    new Fmovies4U(),
    new FsharetvProvider(),
    new IcefyProvider(),
    new PeachifyProvider(),
    new PoprProvider(),
    new StreamMafiaProvider(),
    new TulnexProvider(),
    new VidApiProvider(),
    new VidNestProvider(),
    new VidRockProvider(),
    new VidSrcProvider(),
    new VidZeeProvider(),
  ];

  const omssResolvers = omssProviders.map(provider => ({
    name: provider.name || 'OMSS Provider',
    fn: () => withTimeout(runOmssProvider(provider, tmdbId, mediaType, season, episode), 6000)
  }));

  const allResolvers = [...customResolvers, ...omssResolvers];

  const results = await Promise.allSettled(
    allResolvers.map(async (r) => {
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
