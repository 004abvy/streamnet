export type ServerCategory = 'iframe' | 'direct' | 'omss';
export type MediaType = 'movie' | 'tv';

export interface StreamingServer {
  id: string;
  name: string;
  category: ServerCategory;
  enabled?: boolean;
  buildUrl: (params: { tmdbId: string; type: MediaType; season?: number; episode?: number; imdbId?: string; language?: string }) => string;
}

export const SERVERS: StreamingServer[] = [
  // Primary Active Embed Servers (ScreenScape at Top, VidKing second)
  {
    id: 'screenscape',
    name: 'ScreenScape',
    category: 'iframe',
    enabled: true,
    buildUrl: ({ tmdbId, type, season, episode, language }) => {
      let url = `https://screenscape.me/embed?tmdb=${tmdbId}&type=${type}`;
      if (type === 'tv') {
        if (season != null) url += `&s=${season}`;
        if (episode != null) url += `&e=${episode}`;
      }
      if (language) url += `&lan=${language}`;
      return url;
    }
  },
  {
    id: 'vidking',
    name: 'VidKing',
    category: 'iframe',
    enabled: true,
    buildUrl: ({ tmdbId, type, season, episode }) => 
      type === 'movie' 
        ? `https://www.vidking.net/embed/movie/${tmdbId}?color=006fee&autoplay=false`
        : `https://www.vidking.net/embed/tv/${tmdbId}/${season}/${episode}?color=f5a524&autoplay=false`
  },

  // Deactivated / Backup Iframe Servers (Kept for future activation)
  {
    id: 'vidlink',
    name: 'VidLink',
    category: 'iframe',
    enabled: false,
    buildUrl: ({ tmdbId, type, season, episode }) => 
      type === 'movie' 
        ? `https://vidlink.pro/movie/${tmdbId}?autoplay=false`
        : `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}?autoplay=false`
  },
  {
    id: 'embedsu',
    name: 'Embed.su',
    category: 'iframe',
    enabled: false,
    buildUrl: ({ tmdbId, type, season, episode }) => 
      type === 'movie' 
        ? `https://embed.su/embed/movie/${tmdbId}`
        : `https://embed.su/embed/tv/${tmdbId}/${season}/${episode}`
  },
  {
    id: 'vidsrc2',
    name: 'VidSrc (v2)',
    category: 'iframe',
    enabled: false,
    buildUrl: ({ tmdbId, type, season, episode }) => 
      type === 'movie' 
        ? `https://vidsrc.cc/v2/embed/movie/${tmdbId}?autoPlay=false`
        : `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${season}/${episode}?autoPlay=false`
  },
  {
    id: 'vidsrc3',
    name: 'VidSrc (v3)',
    category: 'iframe',
    enabled: false,
    buildUrl: ({ tmdbId, type, season, episode }) => 
      type === 'movie' 
        ? `https://vidsrc.cc/v3/embed/movie/${tmdbId}?autoPlay=false`
        : `https://vidsrc.cc/v3/embed/tv/${tmdbId}/${season}/${episode}?autoPlay=false`
  },
  {
    id: 'vidsrcxyz',
    name: 'VidSrc.xyz',
    category: 'iframe',
    enabled: false,
    buildUrl: ({ tmdbId, type, season, episode }) => 
      type === 'movie' 
        ? `https://vidsrc.xyz/embed/movie/${tmdbId}`
        : `https://vidsrc.xyz/embed/tv/${tmdbId}/${season}/${episode}`
  },
  {
    id: 'vidsrcto',
    name: 'VidSrc.to',
    category: 'iframe',
    enabled: false,
    buildUrl: ({ tmdbId, type, season, episode }) => 
      type === 'movie' 
        ? `https://vidsrc.to/embed/movie/${tmdbId}`
        : `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`
  },
  {
    id: 'vidsrcicu',
    name: 'VidSrc.icu',
    category: 'iframe',
    enabled: false,
    buildUrl: ({ tmdbId, type, season, episode }) => 
      type === 'movie' 
        ? `https://vidsrc.icu/embed/movie/${tmdbId}`
        : `https://vidsrc.icu/embed/tv/${tmdbId}/${season}/${episode}`
  },
  {
    id: 'vidsrcru',
    name: 'VidSrc.ru',
    category: 'iframe',
    enabled: false,
    buildUrl: ({ tmdbId, type, season, episode }) => 
      type === 'movie' 
        ? `https://vsembed.ru/embed/movie?tmdb=${tmdbId}`
        : `https://vidsrc.vip/embed/tv/${tmdbId}/${season}/${episode}` 
  },
  {
    id: 'vidsrcsu',
    name: 'VidSrc (Su)',
    category: 'iframe',
    enabled: false,
    buildUrl: ({ tmdbId, type, season, episode }) => 
      type === 'movie' 
        ? `https://vsembed.su/embed/movie/${tmdbId}`
        : `https://vidsrc.cc/embed/tv?tmdb=${tmdbId}&s=${season}&e=${episode}` 
  },
  {
    id: 'superembed',
    name: 'SuperEmbed',
    category: 'iframe',
    enabled: false,
    buildUrl: ({ tmdbId, type, season, episode }) => 
      type === 'movie' 
        ? `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`
        : `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`
  },
  {
    id: 'superembed2',
    name: 'SuperEmbed 2',
    category: 'iframe',
    enabled: false,
    buildUrl: ({ tmdbId, type, season, episode }) => 
      type === 'movie' 
        ? `https://multiembed.mov/directstream.php?video_id=${tmdbId}&tmdb=1`
        : `https://multiembed.mov/directstream.php?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`
  },
  {
    id: 'autoembed1',
    name: 'AutoEmbed 1',
    category: 'iframe',
    enabled: false,
    buildUrl: ({ tmdbId, type, season, episode }) => 
      type === 'movie' 
        ? `https://autoembed.co/movie/tmdb/${tmdbId}`
        : `https://autoembed.co/tv/tmdb/${tmdbId}-${season}-${episode}`
  },
  {
    id: 'autoembed2',
    name: 'AutoEmbed 2',
    category: 'iframe',
    enabled: false,
    buildUrl: ({ tmdbId, type, season, episode }) => 
      type === 'movie' 
        ? `https://player.autoembed.cc/embed/movie/${tmdbId}`
        : `https://player.autoembed.cc/embed/tv/${tmdbId}/${season}/${episode}`
  },
  {
    id: '2embed',
    name: '2Embed',
    category: 'iframe',
    enabled: false,
    buildUrl: ({ tmdbId, type, season, episode }) => 
      type === 'movie' 
        ? `https://www.2embed.cc/embed/${tmdbId}`
        : `https://www.2embed.cc/embedtv/${tmdbId}&s=${season}&e=${episode}`
  },
  {
    id: 'filmku',
    name: 'FilmKu',
    category: 'iframe',
    enabled: false,
    buildUrl: ({ tmdbId, type, season, episode }) => 
      type === 'movie' 
        ? `https://filmku.stream/embed/${tmdbId}`
        : `https://filmku.stream/embed/series?tmdb=${tmdbId}&sea=${season}&epi=${episode}`
  },
  {
    id: 'nontongo',
    name: 'NontonGo',
    category: 'iframe',
    enabled: false,
    buildUrl: ({ tmdbId, type, season, episode }) => 
      type === 'movie' 
        ? `https://www.nontongo.win/embed/movie/${tmdbId}`
        : `https://www.NontonGo.win/embed/tv/${tmdbId}/${season}/${episode}`
  },
  {
    id: 'moviesapi',
    name: 'MoviesAPI',
    category: 'iframe',
    enabled: false,
    buildUrl: ({ tmdbId, type, season, episode }) => 
      type === 'movie' 
        ? `https://moviesapi.club/movie/${tmdbId}`
        : `https://moviesapi.club/tv/${tmdbId}-${season}-${episode}`
  },
  {
    id: 'videasy',
    name: 'VidEasy',
    category: 'iframe',
    enabled: false,
    buildUrl: ({ tmdbId, type, season, episode }) => 
      type === 'movie' 
        ? `https://player.videasy.to/movie/${tmdbId}`
        : `https://player.videasy.to/tv/${tmdbId}/${season}/${episode}`
  },

  // OMSS Direct Providers
  { id: 'auto-fast', name: 'StreamNet Player (Default Direct)', category: 'omss', enabled: true, buildUrl: () => '' },
  { id: 'vidsrc-direct', name: 'VidSrc Player (Direct)', category: 'direct', enabled: true, buildUrl: () => '' }
];
