import { ProviderAdapter } from './types';

export const cinesrcAdapter: ProviderAdapter = {
  id: 'cinesrc',
  name: 'CineSrc 4K',
  flag: '⚡',
  badge: 'Auto-Skip',
  description: 'Fast CDN • Auto-Next Episodes',
  capabilities: {
    autoplay: true,
    sandboxCompatible: false, // Forbids <iframe sandbox> to prevent anti-sandbox errors
    popupRisk: 'low',
    quality: '4K UHD',
    baseReliability: 94,
  },
  getTimeoutMs: () => 8000,
  buildUrl: (type, tmdbId, season, episode, _imdbId, preferredLang = 'hi') => {
    const lang = preferredLang || 'hi';
    const langParams = `lang=${lang}&audio=${lang}&ds_lang=${lang}`;
    const commonParams = `color=%23f59e0b&autonext=true&autoskip=true&autoplay=1&autoPlay=true&${langParams}`;
    if (type === 'tv') {
      return `https://cinesrc.st/embed/tv/${tmdbId}?s=${season || 1}&e=${episode || 1}&${commonParams}`;
    }
    return `https://cinesrc.st/embed/movie/${tmdbId}?${commonParams}`;
  },
  handleMessage: (event, onEpisodeChange) => {
    if (event.origin !== 'https://cinesrc.st' || !event.data) return false;
    if (event.data.type === 'cinesrc:nextepisode') {
      const { season: s, episode: e } = event.data;
      if (s && e && onEpisodeChange) {
        onEpisodeChange(s, e);
        return true;
      }
    }
    return false;
  },
};
