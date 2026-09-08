import { ProviderAdapter } from './types';

export const nxshaAdapter: ProviderAdapter = {
  id: 'nxsha',
  name: 'Nxsha Cinema',
  flag: '🚀',
  badge: 'High Bitrate',
  description: 'Direct 4K Cinema Stream',
  capabilities: {
    autoplay: true,
    sandboxCompatible: true,
    popupRisk: 'low',
    quality: '4K UHD',
    baseReliability: 91,
  },
  getTimeoutMs: () => 8000,
  buildUrl: (type, tmdbId, season, episode) => {
    const params = 'autoplay=1&autoPlay=true&autostart=true&muted=false&autoNext=true';
    if (type === 'tv') {
      return `https://web.nxsha.app/embed/tv/${tmdbId}/${season || 1}/${episode || 1}?${params}`;
    }
    return `https://web.nxsha.app/embed/movie/${tmdbId}?${params}`;
  },
};
