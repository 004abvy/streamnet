import { ProviderAdapter } from './types';

export const movieboxAdapter: ProviderAdapter = {
  id: 'moviebox',
  name: 'MovieBox Direct',
  flag: '🍿',
  badge: 'Direct MP4/HLS',
  description: 'High-speed MovieBox Stream • Direct Playback',
  capabilities: {
    autoplay: true,
    sandboxCompatible: true,
    popupRisk: 'low',
    quality: '1080p',
    baseReliability: 92,
  },
  getTimeoutMs: () => 8000,
  buildUrl: (type, tmdbId, season, episode) => {
    const slug = `${type}-${tmdbId}${type === 'tv' ? `-s${season || 1}-e${episode || 1}` : ''}`;
    return `https://www.moviebox.ph/detail/${slug}`;
  },
};
