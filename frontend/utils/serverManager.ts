export interface StreamingServer {
  id: string;
  name: string;
  quality?: string;
  flag?: string;
  getUrl: (tmdbId: string, type: 'movie' | 'tv', season?: number, episode?: number, imdbId?: string) => string;
}

export const SERVERS: StreamingServer[] = [
  {
    id: 'nxsha',
    name: 'Nxsha 4K',
    quality: '4K',
    flag: '⚡',
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'tv') {
        return `https://web.nxsha.app/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`;
      }
      return `https://web.nxsha.app/embed/movie/${tmdbId}`;
    }
  },
  {
    id: 'cinesrc',
    name: 'CineSrc',
    quality: '4K',
    flag: '⚡',
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'tv') {
        return `https://cinesrc.st/embed/tv/${tmdbId}?s=${season || 1}&e=${episode || 1}&color=%23f59e0b&autonext=true&autoskip=true`;
      }
      return `https://cinesrc.st/embed/movie/${tmdbId}?color=%23f59e0b`;
    }
  },
  {
    id: 'vidrock',
    name: 'VidRock',
    quality: '4K',
    flag: '⚡',
    getUrl: (tmdbId, type, season, episode, imdbId) => {
      const id = imdbId || tmdbId;
      if (type === 'tv') {
        return `https://vidrock.ru/tv/${id}/${season || 1}/${episode || 1}`;
      }
      return `https://vidrock.ru/movie/${id}`;
    }
  },
  {
    id: 'vidsrc-in',
    name: 'VidSrc.in',
    quality: 'HD',
    flag: '🇮🇳',
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'tv') {
        return `https://vidsrc.in/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`;
      }
      return `https://vidsrc.in/embed/movie/${tmdbId}`;
    }
  },
  {
    id: 'vidcore',
    name: 'VidCore',
    quality: 'HD',
    flag: '⚡',
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'tv') {
        return `https://vidcore.org/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`;
      }
      return `https://vidcore.org/embed/movie/${tmdbId}`;
    }
  },
  {
    id: 'vsembed',
    name: 'VSEmbed',
    quality: 'HD',
    flag: '🇮🇳',
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'tv') {
        return `https://vsembed.ru/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`;
      }
      return `https://vsembed.ru/embed/movie/${tmdbId}`;
    }
  },
  {
    id: 'vidsrc-me',
    name: 'VidSrc',
    quality: 'HD',
    flag: '🌐',
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'tv') {
        return `https://vidsrcme.ru/embed/tv?tmdb=${tmdbId}&season=${season || 1}&episode=${episode || 1}`;
      }
      return `https://vidsrcme.ru/embed/movie?tmdb=${tmdbId}`;
    }
  },
  {
    id: 'vidfast',
    name: 'VidFast',
    quality: 'HD',
    flag: '⚡',
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'tv') {
        return `https://vidfast.vc/tv/${tmdbId}/${season || 1}/${episode || 1}`;
      }
      return `https://vidfast.vc/movie/${tmdbId}`;
    }
  },
  {
    id: 'vidsrc-io',
    name: 'VidSrc.io',
    quality: 'HD',
    flag: '🌐',
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'tv') {
        return `https://vidsrc.io/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`;
      }
      return `https://vidsrc.io/embed/movie/${tmdbId}`;
    }
  },
  {
    id: 'superembed',
    name: 'SuperEmbed',
    quality: 'HD',
    flag: '🌐',
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'tv') {
        return `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${season || 1}&e=${episode || 1}`;
      }
      return `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`;
    }
  },
  {
    id: 'twoembed',
    name: '2Embed',
    quality: 'HD',
    flag: '🌐',
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'tv') {
        return `https://www.2embed.cc/embedtv/${tmdbId}&s=${season || 1}&e=${episode || 1}`;
      }
      return `https://www.2embed.cc/embed/${tmdbId}`;
    }
  }
];

const STORAGE_KEY = 'lastUsedServerId';

export const getLastUsedServerId = (): string => {
  if (typeof window === 'undefined') return SERVERS[0].id;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && SERVERS.find(s => s.id === stored)) {
    return stored;
  }
  return SERVERS[0].id;
};

export const setLastUsedServerId = (id: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, id);
  }
};
