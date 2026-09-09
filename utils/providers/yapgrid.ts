import { ProviderAdapter } from './types';

export const yapgridAdapter: ProviderAdapter = {
  id: 'yapgrid',
  name: 'YapGrid 4K',
  flag: '💎',
  badge: 'Ad-Free',
  description: 'Clean Ad-Free VIP • In-Player Subtitle Translation',
  capabilities: {
    autoplay: true,
    sandboxCompatible: false, // Forbids <iframe sandbox> to prevent anti-sandbox alerts
    popupRisk: 'low',
    quality: '4K UHD',
    baseReliability: 98,
  },
  getTimeoutMs: () => 8000,
  buildUrl: (type, tmdbId, season, episode, _imdbId, preferredLang = 'hi') => {
    const lang = preferredLang || 'hi';
    const params = `autoplay=1&lang=${lang}&server=x`;
    if (type === 'tv') {
      return `https://yapgrid.com/embed/tv/${tmdbId}/${season || 1}/${episode || 1}?${params}`;
    }
    return `https://yapgrid.com/embed/movie/${tmdbId}?${params}`;
  },
  handleMessage: (event, onEpisodeChange) => {
    if (event.origin !== 'https://yapgrid.com' || !event.data) return false;
    if (event.data.type === 'yapgrid:nextepisode') {
      const { season: s, episode: e } = event.data;
      if (s && e && onEpisodeChange) {
        onEpisodeChange(s, e);
        return true;
      }
    }
    return false;
  },
};
