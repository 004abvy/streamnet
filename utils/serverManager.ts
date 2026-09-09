import { ProviderAdapter } from './providers/types';
import { vidlinkAdapter } from './providers/vidlink';
import { yapgridAdapter } from './providers/yapgrid';
import { cinesrcAdapter } from './providers/cinesrc';
import { nxshaAdapter } from './providers/nxsha';
import { movieboxAdapter } from './providers/moviebox';
import { genericAdapters } from './providers/generic';

export { vidlinkAdapter, yapgridAdapter, cinesrcAdapter, nxshaAdapter, movieboxAdapter, genericAdapters };
export type { ProviderAdapter } from './providers/types';

/**
 * Unified Provider Registry
 * Order defines default base priority before dynamic health scoring is applied
 */
export const ALL_PROVIDERS: ProviderAdapter[] = [
  yapgridAdapter,
  vidlinkAdapter,
  cinesrcAdapter,
  nxshaAdapter,
  movieboxAdapter,
  ...genericAdapters,
];

export function getProviderById(id: string): ProviderAdapter {
  return ALL_PROVIDERS.find((p) => p.id === id) || ALL_PROVIDERS[0];
}

// Backwards-compatibility interface for existing component structures
export interface StreamingServer {
  id: string;
  name: string;
  quality?: string;
  flag?: string;
  badge?: string;
  description?: string;
  getUrl: (tmdbId: string, type: 'movie' | 'tv', season?: number, episode?: number, imdbId?: string) => string;
  provider: ProviderAdapter;
}

export const SERVERS: StreamingServer[] = ALL_PROVIDERS.map((provider) => ({
  id: provider.id,
  name: provider.name,
  quality: provider.capabilities.quality,
  flag: provider.flag,
  badge: provider.badge,
  description: provider.description,
  getUrl: (tmdbId, type, season, episode, imdbId) => provider.buildUrl(type, tmdbId, season, episode, imdbId),
  provider,
}));

const LAST_USED_SERVER_KEY = 'streamnet_last_used_server';

export function getLastUsedServerId(): string {
  if (typeof window === 'undefined') return ALL_PROVIDERS[0].id;
  const saved = localStorage.getItem(LAST_USED_SERVER_KEY);
  if (saved && ALL_PROVIDERS.some((p) => p.id === saved)) {
    return saved;
  }
  return ALL_PROVIDERS[0].id;
}

export function setLastUsedServerId(serverId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LAST_USED_SERVER_KEY, serverId);
  }
}
