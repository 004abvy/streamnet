export interface StreamingServer {
  id: string;
  name: string;
  quality?: string;
  flag?: string;
  badge?: string;
  description?: string;
  getUrl: (tmdbId: string, type: 'movie' | 'tv', season?: number, episode?: number, imdbId?: string) => string;
}

export const SERVERS: StreamingServer[] = [
  {
    id: 'vidlink',
    name: 'VidLink Ultra',
    quality: '4K UHD',
    flag: '✨',
    badge: 'Recommended',
    description: 'Ad-Free VIP • Multi-Audio & Subtitles',
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'tv') {
        return `https://vidlink.pro/tv/${tmdbId}/${season || 1}/${episode || 1}?primaryColor=f59e0b&secondaryColor=0e0e14&iconColor=f59e0b&autoplay=false&nextbutton=true`;
      }
      return `https://vidlink.pro/movie/${tmdbId}?primaryColor=f59e0b&secondaryColor=0e0e14&iconColor=f59e0b&autoplay=false`;
    }
  },
  {
    id: 'cinesrc',
    name: 'CineSrc 4K',
    quality: '4K UHD',
    flag: '⚡',
    badge: 'Auto-Skip',
    description: 'Fast CDN • Auto-Next Episodes',
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'tv') {
        return `https://cinesrc.st/embed/tv/${tmdbId}?s=${season || 1}&e=${episode || 1}&color=%23f59e0b&autonext=true&autoskip=true`;
      }
      return `https://cinesrc.st/embed/movie/${tmdbId}?color=%23f59e0b`;
    }
  },
  {
    id: 'nxsha',
    name: 'Nxsha Cinema',
    quality: '4K',
    flag: '🚀',
    badge: 'High Bitrate',
    description: 'Direct 4K Cinema Stream',
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'tv') {
        return `https://web.nxsha.app/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`;
      }
      return `https://web.nxsha.app/embed/movie/${tmdbId}`;
    }
  },
  {
    id: 'vidrock',
    name: 'VidRock 4K',
    quality: '4K',
    flag: '💎',
    badge: 'Fast',
    description: 'Ultra HD Direct Stream',
    getUrl: (tmdbId, type, season, episode, imdbId) => {
      const id = imdbId || tmdbId;
      if (type === 'tv') {
        return `https://vidrock.ru/tv/${id}/${season || 1}/${episode || 1}`;
      }
      return `https://vidrock.ru/movie/${id}`;
    }
  },
  {
    id: 'vidsrc-me',
    name: 'VidSrc Global',
    quality: '1080p',
    flag: '🌐',
    badge: 'Stable',
    description: 'Global Cloud Network',
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'tv') {
        return `https://vidsrcme.ru/embed/tv?tmdb=${tmdbId}&season=${season || 1}&episode=${episode || 1}`;
      }
      return `https://vidsrcme.ru/embed/movie?tmdb=${tmdbId}`;
    }
  },
  {
    id: 'vidsrc-in',
    name: 'VidSrc India',
    quality: '1080p',
    flag: '🇮🇳',
    badge: 'Fast Route',
    description: 'Low-latency Regional CDN',
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'tv') {
        return `https://vidsrc.in/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`;
      }
      return `https://vidsrc.in/embed/movie/${tmdbId}`;
    }
  },
  {
    id: 'vidcore',
    name: 'VidCore Direct',
    quality: 'HD',
    flag: '⚡',
    badge: 'Fast',
    description: 'High-speed buffer pipeline',
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'tv') {
        return `https://vidcore.org/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`;
      }
      return `https://vidcore.org/embed/movie/${tmdbId}`;
    }
  },
  {
    id: 'vidfast',
    name: 'VidFast Backup',
    quality: 'HD',
    flag: '⚡',
    badge: 'Mirror',
    description: 'Quick loading alternative',
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'tv') {
        return `https://vidfast.vc/tv/${tmdbId}/${season || 1}/${episode || 1}`;
      }
      return `https://vidfast.vc/movie/${tmdbId}`;
    }
  },
  {
    id: 'vidsrc-io',
    name: 'VidSrc.io Backup',
    quality: 'HD',
    flag: '🌐',
    badge: 'Backup',
    description: 'Alternative global mirror',
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'tv') {
        return `https://vidsrc.io/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`;
      }
      return `https://vidsrc.io/embed/movie/${tmdbId}`;
    }
  }
];

const STORAGE_KEY = 'lastUsedServerId';

export const getLastUsedServerId = (): string => {
  if (typeof window === 'undefined') return SERVERS[0].id;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    // If the stored server was an older ad-heavy or deprecated server, automatically upgrade to default
    if (stored === 'twoembed' || stored === 'superembed' || stored === 'vsembed') {
      localStorage.setItem(STORAGE_KEY, SERVERS[0].id);
      return SERVERS[0].id;
    }
    const match = SERVERS.find((s) => s.id === stored);
    if (match) return match.id;
  }
  return SERVERS[0].id;
};

export const setLastUsedServerId = (id: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, id);
  }
};
