import { ProviderAdapter } from './types';

export const vidlinkAdapter: ProviderAdapter = {
  id: 'vidlink',
  name: 'VidLink Ultra',
  flag: '✨',
  badge: 'Recommended',
  description: 'Ad-Free VIP • Multi-Audio & Subtitles',
  capabilities: {
    autoplay: true,
    sandboxCompatible: false, // Forbids <iframe sandbox> to prevent anti-sandbox alert
    popupRisk: 'low',
    quality: '4K UHD',
    baseReliability: 96,
  },
  getTimeoutMs: () => 8000,
  buildUrl: (type, tmdbId, season, episode, _imdbId, preferredLang = 'hi') => {
    const lang = preferredLang || 'hi';
    const langParams = `fallbackLang=${lang}&lang=${lang}&audio=${lang}`;
    const brandParams = `primaryColor=f59e0b&secondaryColor=0e0e14&iconColor=f59e0b&autoplay=true&autostart=true&nextbutton=true&${langParams}`;
    if (type === 'tv') {
      return `https://vidlink.pro/tv/${tmdbId}/${season || 1}/${episode || 1}?${brandParams}`;
    }
    return `https://vidlink.pro/movie/${tmdbId}?${brandParams}`;
  },
  handleMessage: (event, onEpisodeChange) => {
    if (event.origin !== 'https://vidlink.pro' || !event.data) return false;
    const { type, data } = event.data;
    if (type === 'PLAYER_EVENT' && data?.event === 'nextEpisode' && onEpisodeChange) {
      // Handled next episode trigger
      return true;
    }
    return false;
  },
};
