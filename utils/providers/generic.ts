import { ProviderAdapter } from './types';

export const genericAdapters: ProviderAdapter[] = [
  {
    id: 'vidrock',
    name: 'VidRock 4K',
    flag: '💎',
    badge: 'Fast',
    description: 'Ultra HD Direct Stream',
    capabilities: {
      autoplay: true,
      sandboxCompatible: false, // Runs sbx.js anti-sandbox; requires Direct Mode
      popupRisk: 'medium',
      quality: '4K UHD',
      baseReliability: 86,
    },
    getTimeoutMs: () => 9000,
    buildUrl: (type, tmdbId, season, episode, imdbId) => {
      const id = imdbId || tmdbId;
      const params = 'autoPlay=true&autoplay=1&muted=0&autoNext=true';
      if (type === 'tv') {
        return `https://vidrock.ru/tv/${id}/${season || 1}/${episode || 1}?${params}`;
      }
      return `https://vidrock.ru/movie/${id}?${params}`;
    },
  },
  {
    id: 'vidsrc-me',
    name: 'VidSrc Global',
    flag: '🌐',
    badge: 'Stable',
    description: 'Global Cloud Network',
    capabilities: {
      autoplay: true,
      sandboxCompatible: false, // Runs sbx.js; requires Direct Mode
      popupRisk: 'medium',
      quality: '1080p',
      baseReliability: 84,
    },
    getTimeoutMs: () => 9000,
    buildUrl: (type, tmdbId, season, episode) => {
      const params = 'autoplay=1&autostart=true&skip=1';
      if (type === 'tv') {
        return `https://vidsrcme.ru/embed/tv?tmdb=${tmdbId}&season=${season || 1}&episode=${episode || 1}&${params}`;
      }
      return `https://vidsrcme.ru/embed/movie?tmdb=${tmdbId}&${params}`;
    },
  },
  {
    id: 'vidsrc-in',
    name: 'VidSrc India',
    flag: '🇮🇳',
    badge: 'Fast Route',
    description: 'Low-latency Regional CDN',
    capabilities: {
      autoplay: true,
      sandboxCompatible: false, // Prevents anti-sandbox errors
      popupRisk: 'low',
      quality: '1080p',
      baseReliability: 82,
    },
    getTimeoutMs: () => 9000,
    buildUrl: (type, tmdbId, season, episode) => {
      const params = 'autoplay=1&autostart=true';
      if (type === 'tv') {
        return `https://vidsrc.in/embed/tv/${tmdbId}/${season || 1}/${episode || 1}?${params}`;
      }
      return `https://vidsrc.in/embed/movie/${tmdbId}?${params}`;
    },
  },
  {
    id: 'vidcore',
    name: 'VidCore Direct',
    flag: '⚡',
    badge: 'Direct',
    description: 'Fast Buffer Pipeline',
    capabilities: {
      autoplay: true,
      sandboxCompatible: false, // Prevents anti-sandbox errors
      popupRisk: 'low',
      quality: 'HD',
      baseReliability: 80,
    },
    getTimeoutMs: () => 9000,
    buildUrl: (type, tmdbId, season, episode) => {
      const params = 'autoplay=1';
      if (type === 'tv') {
        return `https://vidcore.net/embed/tv/${tmdbId}/${season || 1}/${episode || 1}?${params}`;
      }
      return `https://vidcore.net/embed/movie/${tmdbId}?${params}`;
    },
  },
  {
    id: 'vidfast',
    name: 'VidFast Backup',
    flag: '⚡',
    badge: 'Backup',
    description: 'Alternative Fast Mirror',
    capabilities: {
      autoplay: true,
      sandboxCompatible: false, // Prevents anti-sandbox errors
      popupRisk: 'low',
      quality: 'HD',
      baseReliability: 78,
    },
    getTimeoutMs: () => 9000,
    buildUrl: (type, tmdbId, season, episode) => {
      const params = 'autoplay=1';
      if (type === 'tv') {
        return `https://vidfast.net/embed/tv/${tmdbId}/${season || 1}/${episode || 1}?${params}`;
      }
      return `https://vidfast.net/embed/movie/${tmdbId}?${params}`;
    },
  },
  {
    id: 'vidsrc-io',
    name: 'VidSrc.io Backup',
    flag: '🌐',
    badge: 'Mirror',
    description: 'Alternative Global Mirror',
    capabilities: {
      autoplay: true,
      sandboxCompatible: false, // Prevents anti-sandbox errors
      popupRisk: 'low',
      quality: 'HD',
      baseReliability: 75,
    },
    getTimeoutMs: () => 9000,
    buildUrl: (type, tmdbId, season, episode) => {
      const params = 'autoplay=1';
      if (type === 'tv') {
        return `https://vidsrc.io/embed/tv/${tmdbId}/${season || 1}/${episode || 1}?${params}`;
      }
      return `https://vidsrc.io/embed/movie/${tmdbId}?${params}`;
    },
  },
];
