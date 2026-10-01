import { Request, Response } from 'express';
import { resolveAllStreams } from './providers/index';
// Import consumet after installing
import { ANIME } from '@consumet/extensions';

export interface UnifiedAudioTrack {
  id: string;
  language: string;
  label: string;
  badge: string;
  url: string;
  rawUrl?: string;
  headers?: Record<string, string>;
  quality: string;
  isDefault?: boolean;
  provider?: string;
}

export interface UnifiedSubtitle {
  id: string;
  language: string;
  label: string;
  url: string;
  isDefault?: boolean;
}

export interface PrecheckedServer {
  id: string;
  name: string;
  provider: string;
  online: boolean;
  quality: string;
  streamUrl?: string;
  availableLanguages: string[];
}

function normalizeSubtitle(rawLabel: string, rawLang: string = ''): { key: string; label: string; langCode: string } {
  const clean = rawLabel.trim();
  const lower = clean.toLowerCase();

  if (lower.includes('[cc]') || lower.includes('(cc)')) {
    return { key: 'en-cc', label: 'English [CC]', langCode: 'en' };
  }
  if (lower.includes('forced') && lower.includes('ita')) {
    return { key: 'it-forced', label: 'Italian [Forced]', langCode: 'it' };
  }
  if (lower.includes('forced')) {
    return { key: `${rawLang || 'und'}-forced`, label: clean, langCode: rawLang || 'und' };
  }
  if (lower.includes('हिन्दी') || lower.includes('hindi') || lower === 'hi') {
    return { key: 'hi', label: 'हिन्दी (Hindi)', langCode: 'hi' };
  }
  if (lower.includes('français') || lower.includes('french') || lower === 'fr') {
    return { key: 'fr', label: 'Français (French)', langCode: 'fr' };
  }
  if (lower.includes('español') || lower.includes('spanish') || lower === 'es') {
    return { key: 'es', label: 'Español (Spanish)', langCode: 'es' };
  }
  if (lower.includes('русский') || lower.includes('russian') || lower === 'ru') {
    return { key: 'ru', label: 'Русский (Russian)', langCode: 'ru' };
  }
  if (lower.includes('українська') || lower.includes('ukrain') || lower === 'uk') {
    return { key: 'uk', label: 'Українська (Ukrainian)', langCode: 'uk' };
  }
  if (lower.includes('اَلْعَرَبِيَّةُ') || lower.includes('العربية') || lower.includes('arabic') || lower === 'ar') {
    return { key: 'ar', label: 'العربية (Arabic)', langCode: 'ar' };
  }
  if (lower.includes('indonesian') || lower === 'id') {
    return { key: 'id', label: 'Indonesian', langCode: 'id' };
  }
  if (lower.includes('malay') || lower === 'ms') {
    return { key: 'ms', label: 'Malay', langCode: 'ms' };
  }
  if (lower.includes('italian') || lower.includes('italiano') || lower === 'it') {
    return { key: 'it', label: 'Italiano (Italian)', langCode: 'it' };
  }
  if (lower.includes('german') || lower.includes('deutsch') || lower === 'de') {
    return { key: 'de', label: 'Deutsch (German)', langCode: 'de' };
  }
  if (lower.includes('citadel') || lower.includes('english') || lower === 'en') {
    return { key: 'en', label: 'English', langCode: 'en' };
  }

  return { key: lower, label: clean.charAt(0).toUpperCase() + clean.slice(1), langCode: rawLang || 'en' };
}

// In-memory cache for aggregated results (TTL 60 seconds)
const aggregationCache = new Map<string, { timestamp: number; data: any }>();
const CACHE_TTL = 60 * 1000;

export async function aggregateStreams(req: Request, res: Response) {
  const id = req.query.id as string;
  const type = (req.query.type as 'movie' | 'tv') || 'movie';
  const season = (req.query.season as string) || '1';
  const episode = (req.query.episode as string) || '1';
  const isVip = req.query.vip === '123'; // VIP Passkey Sandbox

  console.log(`\n\n[API] ---> NEW REQUEST: /api/direct-aggregate?id=${id}&type=${type}&s=${season}&e=${episode}&vip=${isVip}`);

  if (!id) {
    console.log('[API] ERROR: Missing media id');
    return res.status(400).json({ error: 'Missing media id' });
  }

  const cacheKey = `${id}-${type}-${season}-${episode}-${isVip ? 'vip' : 'standard'}`;
  const cached = aggregationCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.json(cached.data);
  }

  const host = req.headers.host || 'localhost:4000';
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const currentOrigin = `${protocol}://${host}`;

  let isAnime = false;
  let title = '';
  try {
    const tmdbRes = await fetch(`https://api.themoviedb.org/3/${type === 'tv' ? 'tv' : 'movie'}/${id}?api_key=4df72f7035ab2ad32095819d458c2d53`, {
      signal: AbortSignal.timeout(5000),
    });
    if (tmdbRes.ok) {
      const tmdbData = await tmdbRes.json();
      title = tmdbData.name || tmdbData.title || '';
      const origLang = (tmdbData?.original_language || '').toLowerCase();
      const genres = (tmdbData?.genres || []).map((g: any) => g.name);
      if (origLang === 'ja' || (genres.includes('Animation') && origLang === 'ja')) {
        isAnime = true;
      }
    }
  } catch { }

  const audioTracks: UnifiedAudioTrack[] = [];
  const subtitleMap = new Map<string, UnifiedSubtitle>();
  const precheckedServers: PrecheckedServer[] = [];
  const seenUrls = new Set<string>();

  const proxyParamsBuilder = (rawUrl: string, headers: Record<string, string>, manifest: boolean) => {
    const params = new URLSearchParams({ url: rawUrl, headers: JSON.stringify(headers) });
    if (manifest) params.set('manifest', '1');
    return `${currentOrigin}/api/stream/proxy.m3u8?${params.toString()}`;
  };

  try {
    // ==========================================
    // 1. ANIME DEDICATED FETCH (Gogoanime/Consumet)
    // ==========================================
    const fetchAnime = async () => {
      if (!isAnime || !title) return;
      try {
        const hianime = new ANIME.Hianime();
        const search = await hianime.search(title);
        if (search.results && search.results.length > 0) {
          const animeInfo = await hianime.fetchAnimeInfo(search.results[0].id);
          const epList = animeInfo.episodes;
          if (epList && epList.length > 0) {
            const targetEp = type === 'tv' ? epList.find((e: any) => e.number === Number(episode)) : epList[0];
            if (targetEp) {
              const sources = await hianime.fetchEpisodeSources(targetEp.id);
              if (sources.sources) {
                sources.sources.forEach((src: any) => {
                  if (src.url && !seenUrls.has(src.url)) {
                    seenUrls.add(src.url);
                    const isM3U8 = src.url.includes('.m3u8');
                    const proxiedUrl = proxyParamsBuilder(src.url, { 'Referer': 'https://gogoanime.hd/' }, isM3U8);
                    audioTracks.push({
                      id: `gogo-${src.quality}`,
                      language: 'ja',
                      label: `Japanese [Anime Server]`,
                      badge: `1080p Anime`,
                      url: proxiedUrl,
                      rawUrl: src.url,
                      quality: '1080p HD',
                      isDefault: src.quality === '1080p' || src.quality === 'default'
                    });
                  }
                });
              }
            }
          }
        }
      } catch (err) { console.log('Anime fetch error:', err); }
    };

    // ==========================================
    // 2. RIVESTREAM MULTI-NODES
    // ==========================================
    const rivestreamProviders = [
      { provider: 'borealis', serverId: 'borealis' },
      { provider: 'vanguard', serverId: 'vanguard' },
      { provider: 'citadel', serverId: 'citadel' },
      { provider: 'aura', serverId: 'aura' },
      { provider: 'apogee', serverId: 'apogee' },
      { provider: 'rigel', serverId: 'rigel' },
      { provider: 'apex', serverId: 'apex' },
      ...(isVip ? [{ provider: 'primevids', serverId: 'primevids-vip' }] : []) // VIP Only Node
    ];

    const rivestreamPromises = rivestreamProviders.map(async ({ provider, serverId }) => {
      try {
        let targetUrl = `https://scrapper.rivestream.app/api/provider?provider=${provider}&id=${id}`;
        if (type === 'tv') targetUrl += `&season=${season}&episode=${episode}`;
        if (provider === 'citadel' || provider === 'primevids') targetUrl += `&cb=${Math.floor(Date.now() / 3000000)}`;

        const res = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
            Referer: 'https://rivestream.ru/',
          },
          signal: AbortSignal.timeout(4500),
        });

        if (!res.ok) return { provider, serverId, success: false, sources: [], captions: [] };
        const data = await res.json();
        return {
          provider,
          serverId,
          success: true,
          sources: data?.data?.sources || [],
          captions: data?.data?.captions || [],
        };
      } catch { return { provider, serverId, success: false, sources: [], captions: [] }; }
    });

    // ==========================================
    // 3. TMDB-EMBED-API-MAIN PROXY SANDBOX (Showbox / Zxc)
    // ==========================================
    const fetchTmdbProxy = async () => {
      try {
        // Simulating the internal TMDB-Embed-API call (usually hosted on localhost:8080)
        const proxyRes = await fetch(`http://localhost:8080/search?id=${id}&type=${type}&s=${season}&e=${episode}`, {
           signal: AbortSignal.timeout(4000)
        });
        if (proxyRes.ok) {
           const data = await proxyRes.json();
           if (data && data.sources) {
             data.sources.forEach((src: any, idx: number) => {
               if (src.url && !seenUrls.has(src.url)) {
                 seenUrls.add(src.url);
                 const badge = src.quality || '1080p HD';
                 audioTracks.push({
                   id: `tmdb-proxy-${idx}`,
                   language: 'en',
                   label: `English [Proxy Sandbox]`,
                   badge: `${isVip ? 'VIP ' : ''}${badge}`,
                   url: proxyParamsBuilder(src.url, src.headers || {}, src.url.includes('.m3u8')),
                   rawUrl: src.url,
                   quality: badge,
                 });
               }
             });
           }
        }
      } catch (err) { /* Silent fail if local proxy server not running */ }
    };

    // ==========================================
    // 4. DIRECT RESOLVERS (VidEasy, AnyEmbed, Tulnex, etc.)
    // ==========================================
    const directResolversPromise = (async () => {
      try {
        const { resolveAllStreams } = await import('./providers/index');
        const resolved = await resolveAllStreams(id, type, season, episode);
        return resolved || [];
      } catch (err) {
        return [];
      }
    })();

    // Run All Concurrently
    const [_, riveResults, directResolvedStreams, __] = await Promise.all([
      fetchAnime(),
      Promise.allSettled(rivestreamPromises),
      directResolversPromise,
      fetchTmdbProxy()
    ]);

    // Format Rivestream Output
    for (const result of riveResults) {
      if (result.status !== 'fulfilled') continue;
      const { provider, serverId, success, sources, captions } = result.value;
      const availableLangs: string[] = [];
      let topQuality = 'HD';
      let primaryStreamUrl: string | undefined;

      if (success && Array.isArray(sources)) {
        sources.forEach((s: any, idx: number) => {
          const rawQuality = (s.quality || s.source || '').toLowerCase();
          const rawUrl = s.url;
          if (!rawUrl || seenUrls.has(rawUrl)) return;
          seenUrls.add(rawUrl);

          const proxiedUrl = proxyParamsBuilder(rawUrl, {
             'Referer': 'https://rivestream.ru/',
             'Origin': 'https://rivestream.ru'
          }, true);
          if (!primaryStreamUrl) primaryStreamUrl = proxiedUrl;

          let langKey = 'en';
          let label = 'English';
          let badge = '1080p HD';

          if (rawQuality.includes('hindi')) {
            langKey = 'hi';
            label = rawQuality.includes('1080') ? 'Hindi [Ultra HD]' : 'Hindi';
            badge = rawQuality.includes('1080') ? '1080p Ultra HD' : 'HD';
          } else if (rawQuality.includes('tamil')) {
            langKey = 'ta'; label = 'Tamil';
          } else if (rawQuality.includes('telugu')) {
            langKey = 'te'; label = 'Telugu';
          } else if (rawQuality.includes('french')) {
            langKey = 'fr'; label = 'French';
          } else if (rawQuality.includes('esla') || rawQuality.includes('spanish')) {
            langKey = 'es'; label = 'Spanish';
          } else if (provider === 'vanguard' || rawQuality.includes('4k')) {
            topQuality = '4K HDR';
            if (isAnime) {
              audioTracks.push({
                id: `vanguard-ja-4k`, language: 'ja', label: 'Japanese [Original]', badge: '4K HDR',
                url: `${proxiedUrl}&lang=ja&forceTrack=1`, quality: '4K HDR', isDefault: true,
              });
              audioTracks.push({
                id: `vanguard-en-dub-4k`, language: 'en-dub', label: 'English [Dub]', badge: '4K HDR',
                url: `${proxiedUrl}&lang=en&forceTrack=0`, quality: '4K HDR', isDefault: false,
              });
              return;
            } else {
              langKey = 'en-4k'; label = 'English [Ultra HD]'; badge = '4K HDR';
            }
          } else {
            langKey = `en-${provider}-${idx}`;
            label = 'English';
            badge = rawQuality.includes('1080') ? '1080p HD' : 'HD';
          }

          if (isVip && badge.includes('HD')) badge = `VIP ${badge}`;

          audioTracks.push({
            id: `${provider}-${langKey}-${idx}`,
            language: langKey,
            label,
            badge,
            url: proxiedUrl,
            rawUrl,
            quality: badge,
            isDefault: langKey === 'hi' && badge.includes('1080'),
          });
        });
      }

      if (captions) {
        for (const c of captions) {
          const rawLabel = (c.label || c.language || '').trim();
          if (c.file && rawLabel) {
            const norm = normalizeSubtitle(rawLabel, c.language);
            if (!subtitleMap.has(norm.key)) {
              subtitleMap.set(norm.key, {
                id: `sub-${norm.key}`, language: norm.langCode, label: norm.label,
                url: `${currentOrigin}/api/subtitle/proxy?url=${encodeURIComponent(c.file)}`,
                isDefault: norm.key === 'en',
              });
            }
          }
        }
      }

      if (success) precheckedServers.push({
        id: serverId, name: serverId, provider, online: true, quality: topQuality, streamUrl: primaryStreamUrl, availableLanguages: []
      });
    }

    // Format Direct Resolvers
    if (Array.isArray(directResolvedStreams)) {
      directResolvedStreams.forEach((stream, idx) => {
        if (!stream.url || seenUrls.has(stream.url)) return;
        seenUrls.add(stream.url);

        const cleanHeaders: Record<string, string> = { ...(stream.headers || {}) };
        if (cleanHeaders['Referer']?.includes('player.videasy.net')) cleanHeaders['Referer'] = 'https://videasy.net/';

        const proxiedUrl = proxyParamsBuilder(stream.url, cleanHeaders, stream.type === 'hls');
        let badge = stream.quality?.includes('4k') || stream.quality?.includes('2160') ? '4K 2160p' : (stream.quality?.includes('1080') ? '1080p Full HD' : 'HD');
        if (isVip) badge = `VIP ${badge}`;

        audioTracks.unshift({
          id: `direct-${stream.id || idx}`,
          language: stream.audioLanguage || 'en',
          label: stream.audioLabel || 'English',
          badge,
          url: proxiedUrl,
          rawUrl: stream.url,
          quality: badge,
          provider: stream.provider || 'Server',
          headers: stream.headers || {},
        });

        if (stream.subtitles) {
          stream.subtitles.forEach(s => {
            if (s.url) {
              const norm = normalizeSubtitle(s.label || s.language || 'en');
              subtitleMap.set(norm.key, {
                id: `sub-direct-${norm.key}`, language: norm.langCode, label: norm.label,
                url: `${currentOrigin}/api/subtitle/proxy?url=${encodeURIComponent(s.url)}`, isDefault: norm.key === 'en',
              });
            }
          });
        }
      });
    }

    // Pre-check all audio tracks to ensure they are actually playable
    const checkTrack = async (track: UnifiedAudioTrack): Promise<UnifiedAudioTrack | null> => {
      try {
        const urlToTest = track.rawUrl || track.url;
        const res = await fetch(urlToTest, {
          method: 'GET',
          headers: {
            ...(track.headers || {}),
            'Range': 'bytes=0-1000',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          signal: AbortSignal.timeout(3500) // 3.5 seconds to respond
        });
        
        // Accept 200, 206 (Partial Content), or 403 (Sometimes blocked by bot check but works in player)
        if (res.ok || res.status === 206 || res.status === 403) {
           return track;
        }
        return null;
      } catch (e) {
        return null; // Timeout or completely unreachable
      }
    };

    const checkedTracksPromises = audioTracks.map(checkTrack);
    const checkedResults = await Promise.all(checkedTracksPromises);
    const workingAudioTracks = checkedResults.filter((t): t is UnifiedAudioTrack => t !== null);

    // Fallback if our strict test filtered everything out
    const finalTracksToUse = workingAudioTracks.length > 0 ? workingAudioTracks : audioTracks;

    // Group and Sort Tracks
    const getLanguagePriority = (track: UnifiedAudioTrack): number => {
      if (isAnime) return track.language === 'ja' ? 1 : (track.language === 'en-dub' ? 2 : 10);
      if (track.language === 'hi') return 1;
      if (track.language === 'en') return track.badge.includes('4K') ? 5 : 10;
      return 50;
    };

    const sortedAudioTracks = finalTracksToUse.sort((a, b) => getLanguagePriority(a) - getLanguagePriority(b));
    let finalSubtitles = Array.from(subtitleMap.values()).sort((a, b) => a.label.localeCompare(b.label));

    if (finalSubtitles.length > 0 && !finalSubtitles.some(s => s.isDefault)) {
      finalSubtitles[0].isDefault = true;
    }

    const defaultTrack = sortedAudioTracks[0];

    const responseData = {
      success: true,
      vipAccess: isVip,
      isAnime,
      audioLanguages: sortedAudioTracks,
      subtitles: finalSubtitles,
      servers: precheckedServers,
      defaultStreamUrl: defaultTrack?.url || null,
      defaultAudioLabel: defaultTrack?.label || 'Default',
    };

    aggregationCache.set(cacheKey, { timestamp: Date.now(), data: responseData });
    return res.json(responseData);
  } catch (err: any) {
    console.error('[direct-aggregate] Error aggregating streams:', err);
    return res.status(500).json({ error: err.message || 'Aggregation failed' });
  }
}
