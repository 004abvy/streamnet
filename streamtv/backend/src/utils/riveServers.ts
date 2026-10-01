export interface RiveServerItem {
  id: string;
  name: string;
  code: string;
  category: 'curated' | 'single' | 'multi' | 'regional' | 'legacy';
  starred?: boolean;
  language?: string;
  region?: string;
  description: string;
  domain?: string;
}

export const RIVE_SERVERS: RiveServerItem[] = [
  // 🌟 Curated & Best
  { id: 'artplayer', name: 'ArtPlayer (Direct 4K)', code: 'ART', category: 'curated', starred: true, description: 'Native ArtPlayer with Audio Boost, Subtitles & Custom Controls', domain: 'native' },
  { id: 'vid', name: 'VidsrcMe', code: 'VID', category: 'curated', starred: true, description: 'High reliability multi-source provider', domain: 'vsrc.su' },
  { id: 'prime', name: 'Best-Server', code: 'PRIME', category: 'curated', starred: true, description: 'Ultra fast CDN cache (PrimeSrc)', domain: 'primesrc.me' },
  { id: 'adf', name: 'Fast-Server', code: 'ADF', category: 'curated', starred: true, description: 'VidLink direct stream engine', domain: 'vidlink.pro' },
  { id: 'cin', name: 'HD/Multi-Server', code: 'CIN', category: 'curated', starred: true, description: 'Cinezo HD low-latency streams', domain: 'player.cinezo.live' },
  { id: 'vidora', name: 'Vidora HD', code: 'VIDORA', category: 'curated', starred: true, description: 'VidCore direct high bitrate', domain: 'vidcore.net' },
  { id: 'easy', name: 'HD-Server', code: 'EASY', category: 'curated', starred: true, description: 'Videasy high-speed CDN', domain: 'player.videasy.net' },
  { id: 'torr', name: 'Torrent/HD-Server', code: 'TORR', category: 'curated', starred: true, description: 'WebRTC hybrid torrent stream', domain: 'webrtc' },

  // ⚡ Dedicated & 4K / Ad-Free
  { id: 'map', name: '4K/Single-Server', code: 'MAP', category: 'single', starred: true, description: 'Mapple 4K high resolution streams', domain: 'mapple.uk' },
  { id: 'vap', name: 'Single-Server', code: 'VAP', category: 'single', starred: true, description: 'VAPlayer ultra fast direct playback', domain: 'vaplayer.ru' },
  { id: 'vidj', name: 'Ad-Free Player', code: 'VIDJ', category: 'single', description: 'VidJoy completely ad-free stream', domain: 'vidjoy.pro' },
  { id: 'one', name: 'Single-VIP', code: 'ONE', category: 'single', description: 'VidSrc VIP dedicated buffer', domain: 'vidsrc.vip' },
  { id: 'any', name: 'Any-Server', code: 'ANY', category: 'single', description: 'AnyEmbed auto-fallback network', domain: 'anyembed.xyz' },
  { id: 'vsu', name: 'VSU Ad-Free', code: 'VSU', category: 'single', description: 'VidSrc.su clean direct stream', domain: 'vidsrc.su' },
  { id: 'turbo', name: 'Turbo-Server', code: 'TURBO', category: 'single', description: 'TurboVid fast response stream', domain: 'turbovid.eu' },
  { id: 'rip', name: 'RIP-Server', code: 'RIP', category: 'single', description: 'VidSrc.rip high quality rips', domain: 'vidsrc.rip' },
  { id: 'web', name: 'Movie Web', code: 'WEB', category: 'single', description: 'PStream open web source', domain: 'iframe.pstream.mov' },

  // 🚀 Fast & Multi-Stream
  { id: 'sup', name: 'Multi/Most-Server', code: 'SUP', category: 'multi', starred: true, description: 'VidSrc.su high redundancy cluster', domain: 'vidsrc.su' },
  { id: 'vup', name: 'Multi-Server', code: 'VUP', category: 'multi', starred: true, description: 'VidUp high speed streaming', domain: 'vidup.to' },
  { id: 'vidf', name: 'VidFast Multi', code: 'VIDF', category: 'multi', starred: true, description: 'VidFast pro multi-source', domain: 'vidfast.pro' },
  { id: 'vidz', name: 'VidZee Multi', code: 'VIDZ', category: 'multi', starred: true, description: 'VidZee global low ping cluster', domain: 'player.vidzee.wtf' },
  { id: 'smash', name: 'SmashyStream', code: 'SMASH', category: 'multi', starred: true, description: 'SmashyStream multi-embed engine', domain: 'embed.smashystream.com' },
  { id: 'peach', name: 'Peachify Multi', code: 'PEACH', category: 'multi', description: 'Peachify cloud streaming', domain: 'peachify.top' },
  { id: 'auto', name: 'Auto-Server', code: 'AUTO', category: 'multi', description: 'AutoEmbed dynamic balancer', domain: 'player.autoembed.cc' },
  { id: 'god', name: 'GoDrive Multi', code: 'GOD', category: 'multi', description: 'GoDrivePlayer high-speed cluster', domain: 'godriveplayer.com' },
  { id: 'multi', name: 'MultiEmbed Direct', code: 'MULTI', category: 'multi', description: 'MultiEmbed direct stream link', domain: 'multiembed.mov' },
  { id: 'agg', name: 'Aggregator Multi', code: 'AGGREGATOR', category: 'multi', starred: true, description: 'Multi-provider aggregator core', domain: 'multiembed.mov' },
  { id: '111m', name: '111Movies', code: '111M', category: 'multi', description: '111Movies reliable mirrors', domain: '111movies.net' },
  { id: 'embed', name: '2Embed Multi', code: 'EMBED', category: 'multi', description: '2Embed multi-language server', domain: 'www.2embed.cc' },
  { id: 'play', name: 'PlayEmbed Multi', code: 'PLAY', category: 'multi', description: '123Embed multi stream host', domain: 'play2.123embed.net' },

  // 🌐 Regional, Dubbed & International
  { id: 'rgs', name: 'Indian / Hindi Dub', code: 'RGS', category: 'regional', language: 'hi', region: 'India', description: 'VidSrc WTF Indian & Hindi dubbed audio', domain: 'www.vidsrc.wtf/2' },
  { id: 'rgs2', name: 'Regional Prime', code: 'RGS2', category: 'regional', language: 'hi', region: 'India', description: 'VidSrc WTF Regional multi-audio', domain: 'www.vidsrc.wtf/4' },
  { id: 'fre', name: 'French-Server', code: 'FRE', category: 'regional', language: 'fr', region: 'France', description: 'FrEmbed French dubbed & subbed', domain: 'frembed.mom' },
  { id: 'rus', name: 'Russian-Server', code: 'RUS', category: 'regional', language: 'ru', region: 'Russia', description: 'InsertUnit Russian voice-over audio', domain: 'api.insertunit.ws' },
  { id: 'spa', name: 'Spanish-Server', code: 'SPA', category: 'regional', language: 'es', region: 'Spain/LatAm', description: 'Streamsito Spanish audio & subs', domain: 'streamsito.com' },
  { id: 'por', name: 'Portuguese-Server', code: 'POR', category: 'regional', language: 'pt', region: 'Brazil/Portugal', description: 'SuperFlix Portuguese dubbed audio', domain: 'superflixapi.digital' },
  { id: 'fres', name: 'Portuguese FEmbed', code: 'FRES', category: 'regional', language: 'pt', region: 'Portugal', description: 'FEmbed Portuguese localized stream', domain: 'fembed.sx' },
  { id: 'nl', name: 'NL-Server', code: 'NL', category: 'regional', language: 'nl', region: 'Netherlands', description: 'VidSrc.nl Dutch server', domain: 'player.vidsrc.nl' },
  { id: 'anime', name: 'Anime-Server', code: 'ANIME', category: 'regional', language: 'ja', region: 'Japan', description: 'TechNeo anime subbed & dubbed', domain: 'vid.techneo.fun' },

  // 🏛 Legacy & Classic
  { id: 'pro', name: 'Pro-Server', code: 'PRO', category: 'legacy', description: 'VidSrc.pro original server', domain: 'vidsrc.pro' },
  { id: 'emb', name: 'VidSrcTo', code: 'EMB', category: 'legacy', description: 'VidSrc.cc v2 embed player', domain: 'vidsrc.cc' },
  { id: 'agg_leg', name: 'FilmKu Aggregator', code: 'AGG', category: 'legacy', description: 'FilmKu classic mirror', domain: 'filmku.stream' },
  { id: 'club', name: 'Club-Server', code: 'CLUB', category: 'legacy', description: 'MoviesAPI Club classic player', domain: 'moviesapi.club' },
  { id: 'ware', name: 'Warez-Server', code: 'WARE', category: 'legacy', description: 'WarezCDN European player', domain: 'embed.warezcdn.com' },
];

export function buildRiveServerUrl(params: {
  tmdbId: string;
  type: 'movie' | 'tv';
  season?: number;
  episode?: number;
  serverCode?: string;
}): string {
  const { tmdbId, type, season, episode, serverCode } = params;
  let url = `https://rivestream.ru/embed?type=${type}&id=${tmdbId}`;
  if (type === 'tv') {
    url += `&season=${season || 1}&episode=${episode || 1}`;
  }
  if (serverCode) {
    url += `&server=${serverCode}`;
  }
  return url;
}
