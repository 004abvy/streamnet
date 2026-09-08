/**
 * StreamNet Provider Adapter Contracts
 */

export interface ServerCapabilities {
  autoplay: boolean;
  sandboxCompatible: boolean;
  popupRisk: 'low' | 'medium' | 'high';
  quality: '4K UHD' | '1080p' | 'HD';
  baseReliability: number; // 0 to 100
}

export interface ProviderAdapter {
  id: string;
  name: string;
  flag?: string;
  badge?: string;
  description?: string;
  capabilities: ServerCapabilities;
  buildUrl(type: 'movie' | 'tv', tmdbId: string, season?: number, episode?: number, imdbId?: string): string;
  getTimeoutMs(): number;
  handleMessage?(event: MessageEvent, onEpisodeChange?: (season: number, episode: number) => void): boolean;
}

export interface ServerSessionStats {
  successCount: number;
  failureCount: number;
  consecutiveFailures: number;
  disabledUntil: number; // Timestamp ms
  avgLoadTimeMs: number;
  lastUpdated: number;
}
