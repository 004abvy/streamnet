import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export interface UnifiedAudioTrack {
  id: string;
  language: string;
  label: string;
  badge: string;
  url: string;
  quality: string;
  isDefault?: boolean;
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

// In-memory cache for aggregated results (TTL 60 seconds so signed stream URLs never expire)
const aggregationCache = new Map<string, { timestamp: number; data: any }>();
const CACHE_TTL = 60 * 1000;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const type = (searchParams.get('type') as 'movie' | 'tv') || 'movie';
  const season = searchParams.get('season') || '1';
  const episode = searchParams.get('episode') || '1';

  if (!id) {
    return NextResponse.json({ error: 'Missing media id' }, { status: 400 });
  }

  const cacheKey = `${id}-${type}-${season}-${episode}`;
  const cached = aggregationCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  const currentOrigin = new URL(request.url).origin;

  // Detect if current title is Japanese anime
  let isAnime = false;
  try {
    const tmdbRes = await fetch(`${currentOrigin}/api/${type === 'tv' ? 'tv' : 'movies'}/${id}`, {
      signal: AbortSignal.timeout(2000),
    });
    if (tmdbRes.ok) {
      const tmdbData = await tmdbRes.json();
      const origLang = (tmdbData?.original_language || '').toLowerCase();
      const genres = (tmdbData?.genres || []).map((g: any) => g.name);
      if (origLang === 'ja' || (genres.includes('Animation') && origLang === 'ja')) {
        isAnime = true;
      }
    }
  } catch {
    // Handled gracefully
  }

  const rivestreamProviders = [
    { provider: 'borealis', serverId: 'borealis' },
    { provider: 'citadel', serverId: 'citadel' },
    { provider: 'vanguard', serverId: 'vanguard' },
    { provider: 'aura', serverId: 'aura' },
    { provider: 'apogee', serverId: 'apogee' },
    { provider: 'rigel', serverId: 'rigel' },
    { provider: 'primevids', serverId: 'primevids' },
    { provider: 'apex', serverId: 'apex' },
  ];

  try {
    // 1. Probe all Rivestream direct providers concurrently
    const rivestreamPromises = rivestreamProviders.map(async ({ provider, serverId }) => {
      try {
        let targetUrl = `https://scrapper.rivestream.app/api/provider?provider=${provider}&id=${id}`;
        if (type === 'tv') {
          targetUrl += `&season=${season}&episode=${episode}`;
        }
        if (provider === 'citadel' || provider === 'primevids') {
          targetUrl += `&cb=${Math.floor(Date.now() / 3000000)}`;
        }

        const res = await fetch(targetUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Referer: 'https://rivestream.ru/',
          },
          signal: AbortSignal.timeout(2500),
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
      } catch {
        return { provider, serverId, success: false, sources: [], captions: [] };
      }
    });

    // 2. Probe Direct resolvers (Videasy, VidLink, VixSrc, AutoEmbed)
    const directResolversPromise = (async () => {
      try {
        const { resolveAllStreams } = await import('../../../lib/providers/index');
        const resolved = await resolveAllStreams(id, type, season, episode);
        return resolved || [];
      } catch (err) {
        console.warn('[direct-aggregate] Direct resolvers error:', err);
        return [];
      }
    })();

    // Run both sweeps concurrently
    const [riveResults, directResolvedStreams] = await Promise.all([
      Promise.allSettled(rivestreamPromises),
      directResolversPromise,
    ]);

    const audioTracks: UnifiedAudioTrack[] = [];
    const subtitleMap = new Map<string, UnifiedSubtitle>();
    const precheckedServers: PrecheckedServer[] = [];
    const seenUrls = new Set<string>();

    // Process Rivestream Providers
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

          const proxiedUrl = `${currentOrigin}/api/stream/proxy.m3u8?url=${encodeURIComponent(rawUrl)}&manifest=1`;
          if (!primaryStreamUrl) primaryStreamUrl = proxiedUrl;

          // Categorize and label cleanly
          let langKey = 'en';
          let label = 'English';
          let badge = '1080p HD';

          if (rawQuality.includes('hindi')) {
            langKey = 'hi';
            if (rawQuality.includes('1080')) {
              label = 'Hindi [Original / Dub]';
              badge = '1080p Ultra HD';
            } else if (rawQuality.includes('720')) {
              label = 'Hindi [Original / Dub]';
              badge = '720p HD';
            } else {
              label = 'Hindi';
              badge = '480p SD';
            }
            availableLangs.push('Hindi');
          } else if (rawQuality.includes('tamil')) {
            langKey = 'ta';
            label = 'Tamil';
            badge = rawQuality.includes('720') ? '720p HD' : '480p SD';
            availableLangs.push('Tamil');
          } else if (rawQuality.includes('telugu')) {
            langKey = 'te';
            label = 'Telugu';
            badge = rawQuality.includes('720') ? '720p HD' : '480p SD';
            availableLangs.push('Telugu');
          } else if (rawQuality.includes('french')) {
            langKey = 'fr';
            label = 'French';
            badge = '1080p Full HD';
            availableLangs.push('French');
          } else if (rawQuality.includes('esla')) {
            langKey = 'es-la';
            label = 'Spanish [Latin America]';
            badge = '720p HD';
            availableLangs.push('Spanish [Latin]');
          } else if (rawQuality.includes('spanish')) {
            langKey = 'es';
            label = 'Spanish';
            badge = '720p HD';
            availableLangs.push('Spanish');
          } else if (rawQuality.includes('arabic')) {
            langKey = 'ar';
            label = 'Arabic';
            badge = '480p SD';
            availableLangs.push('Arabic');
          } else if (provider === 'vanguard' || rawQuality.includes('4k')) {
            topQuality = '4K HDR';
            if (isAnime) {
              availableLangs.push('Japanese 4K');
              availableLangs.push('English Dub 4K');
              audioTracks.push({
                id: `vanguard-ja-4k`,
                language: 'ja',
                label: 'Japanese [Original]',
                badge: '4K HDR',
                url: `${proxiedUrl}&lang=ja&forceTrack=1`,
                quality: '4K HDR',
                isDefault: true,
              });
              audioTracks.push({
                id: `vanguard-en-dub-4k`,
                language: 'en-dub',
                label: 'English [Dub]',
                badge: '4K HDR',
                url: `${proxiedUrl}&lang=en&forceTrack=0`,
                quality: '4K HDR',
                isDefault: false,
              });
              return;
            } else {
              langKey = 'en-4k';
              label = 'English [Ultra HD]';
              badge = '4K HDR';
              availableLangs.push('English 4K');
            }
          } else if (provider === 'borealis') {
            langKey = 'en-borealis';
            label = 'English [Master]';
            badge = '1080p Full HD';
            availableLangs.push('English');
          } else if (provider === 'apogee') {
            langKey = 'en-apogee';
            label = 'English [Cinema Stream]';
            badge = '1080p Full HD';
            availableLangs.push('English');
          } else if (provider === 'aura') {
            langKey = 'en-aura';
            label = 'English [Fast Stream]';
            badge = '1080p HD';
            availableLangs.push('English');
          } else if (provider === 'rigel') {
            langKey = 'en-rigel';
            label = 'English [Fast HLS]';
            badge = '1080p HD';
            availableLangs.push('English');
          } else if (provider === 'primevids') {
            // Only tcloud is online. dcloud (403) and ipcloud (404) are offline.
            if (s.quality !== 'tcloud') return;
            langKey = 'en-prime-tcloud';
            label = 'English [Multi-Cloud]';
            badge = '1080p HD';
            availableLangs.push('English');
          } else if (provider === 'apex') {
            langKey = 'en-apex';
            label = 'English [Dynamic HLS]';
            badge = '1080p HD';
            availableLangs.push('English');
          } else if (provider === 'citadel') {
            langKey = `en-citadel-${idx}`;
            label = 'English';
            badge = rawQuality.includes('720') ? '720p HD' : '480p SD';
            availableLangs.push('English');
          } else {
            langKey = `en-${provider}-${idx}`;
            label = 'English';
            badge = rawQuality.includes('1080') ? '1080p HD' : rawQuality.includes('720') ? '720p HD' : 'HD';
            availableLangs.push('English');
          }

          audioTracks.push({
            id: `${provider}-${langKey}-${idx}`,
            language: langKey,
            label,
            badge,
            url: proxiedUrl,
            quality: badge,
            isDefault: langKey === 'hi' && badge.includes('1080'),
          });
        });
      }

      // Collect captions from Rivestream
      if (captions && captions.length > 0) {
        for (const c of captions) {
          const rawLabel = (c.label || c.language || '').trim();
          const file = c.file;
          if (!file || !rawLabel) continue;

          const norm = normalizeSubtitle(rawLabel, c.language);
          if (!subtitleMap.has(norm.key)) {
            subtitleMap.set(norm.key, {
              id: `sub-${norm.key}`,
              language: norm.langCode,
              label: norm.label,
              url: file.startsWith('http')
                ? `${currentOrigin}/api/subtitle/proxy?url=${encodeURIComponent(file)}`
                : file,
              isDefault: norm.key === 'en',
            });
          }
        }
      }

      precheckedServers.push({
        id: serverId,
        name: serverId.charAt(0).toUpperCase() + serverId.slice(1),
        provider,
        online: success && (sources?.length || 0) > 0,
        quality: topQuality,
        streamUrl: primaryStreamUrl,
        availableLanguages: Array.from(new Set(availableLangs)),
      });
    }

    // Process Direct Streams (Videasy, VidLink, VixSrc, AutoEmbed)
    if (Array.isArray(directResolvedStreams)) {
      directResolvedStreams.forEach((stream, idx) => {
        if (!stream.url || seenUrls.has(stream.url)) return;
        // Exclude VidLink because its servers aggressively 429 rate limit
        if (stream.provider?.toLowerCase().includes('vidlink') || stream.name?.toLowerCase().includes('vidlink')) {
          return;
        }
        seenUrls.add(stream.url);

        const cleanHeaders: Record<string, string> = { ...(stream.headers || {}) };
        if (cleanHeaders['Referer']?.includes('player.videasy.net')) {
          cleanHeaders['Referer'] = 'https://videasy.net/';
        }
        if (cleanHeaders['Origin']?.includes('player.videasy.net')) {
          cleanHeaders['Origin'] = 'https://videasy.net';
        }

        const proxyParams = new URLSearchParams({
          url: stream.url,
          headers: JSON.stringify(cleanHeaders),
        });
        if (stream.type === 'hls') proxyParams.set('manifest', '1');
        const proxiedUrl = `${currentOrigin}/api/stream/proxy?${proxyParams.toString()}`;

        const rawQuality = (stream.quality || stream.provider || '').toLowerCase();
        let badge = '1080p HD';
        let label = 'English';

        if (rawQuality.includes('2160') || rawQuality.includes('4k')) {
          badge = '4K 2160p';
        } else if (rawQuality.includes('1080')) {
          badge = '1080p Full HD';
        } else if (rawQuality.includes('720')) {
          badge = '720p HD';
        } else if (rawQuality.includes('480')) {
          badge = '480p SD';
        } else if (rawQuality.includes('360')) {
          badge = '360p SD';
        } else {
          badge = 'HD';
        }

        audioTracks.unshift({
          id: `direct-${stream.id || idx}`,
          language: 'en',
          label,
          badge,
          url: proxiedUrl,
          quality: badge,
          isDefault: false,
        });

        // Add subtitles from direct resolvers
        if (stream.subtitles && Array.isArray(stream.subtitles)) {
          for (const s of stream.subtitles) {
            if (!s.url) continue;
            const rawLabel = (s.label || s.language || 'English').trim();
            const norm = normalizeSubtitle(rawLabel, s.language);
            // Direct4K subtitles override Rivestream captions (better sync)
            subtitleMap.set(norm.key, {
              id: `sub-direct-${norm.key}`,
              language: norm.langCode,
              label: norm.label,
              url: `${currentOrigin}/api/subtitle/proxy?url=${encodeURIComponent(s.url)}`,
              isDefault: norm.key === 'en',
            });
          }
        }
      });
    }


    // Live Health Verification: Filter out non-loading or errored streams
    const verificationResults = await Promise.allSettled(
      audioTracks.map(async (track) => {
        try {
          const res = await fetch(track.url, {
            method: 'GET',
            headers: { Range: 'bytes=0-128' },
            signal: AbortSignal.timeout(1800),
          });
          return res.ok ? track : null;
        } catch {
          return null;
        }
      })
    );

    const verifiedAudioTracks = verificationResults
      .map(r => (r.status === 'fulfilled' ? r.value : null))
      .filter((t): t is UnifiedAudioTrack => t !== null);

    const validTracks = verifiedAudioTracks.length > 0 ? verifiedAudioTracks : audioTracks;

    // Netflix-style grouping: one entry per language, best quality wins
    const qualityRank = (badge: string): number => {
      if (badge.includes('4K') || badge.includes('2160')) return 4;
      if (badge.includes('1080')) return 3;
      if (badge.includes('720')) return 2;
      if (badge.includes('480')) return 1;
      if (badge.includes('360')) return 0;
      return 1;
    };

    const getBaseLang = (track: UnifiedAudioTrack): string => {
      const lang = track.language.toLowerCase();
      if (lang === 'ja') return 'ja';
      if (lang === 'hi') return 'hi';
      if (lang === 'ta') return 'ta';
      if (lang === 'te') return 'te';
      if (lang === 'fr') return 'fr';
      if (lang === 'ar') return 'ar';
      if (lang.startsWith('es')) return 'es';
      if (lang === 'en-dub') return 'en-dub';
      if (lang.startsWith('en')) return 'en';
      return lang;
    };

    const cleanLabel = (baseLang: string): string => {
      switch (baseLang) {
        case 'ja': return 'Japanese';
        case 'hi': return 'Hindi';
        case 'ta': return 'Tamil';
        case 'te': return 'Telugu';
        case 'fr': return 'French';
        case 'ar': return 'Arabic';
        case 'es': return 'Spanish';
        case 'en-dub': return 'English [Dub]';
        default: return 'English';
      }
    };

    const langGroupMap = new Map<string, { best: UnifiedAudioTrack; fallbacks: string[] }>();
    for (const track of validTracks) {
      const base = getBaseLang(track);
      const rank = qualityRank(track.badge);
      const existing = langGroupMap.get(base);
      if (!existing) {
        langGroupMap.set(base, { best: track, fallbacks: [] });
      } else {
        const existingRank = qualityRank(existing.best.badge);
        if (rank > existingRank) {
          existing.fallbacks.push(existing.best.url);
          existing.best = track;
        } else {
          existing.fallbacks.push(track.url);
        }
      }
    }

    const deduplicatedTracks: UnifiedAudioTrack[] = [];
    for (const [baseLang, group] of langGroupMap) {
      deduplicatedTracks.push({
        ...group.best,
        id: `lang-${baseLang}`,
        language: baseLang,
        label: cleanLabel(baseLang),
        quality: group.best.badge,
      });
    }

    // Sort Audio Tracks Professionally:
    // For Anime: Japanese [Original] (4K HDR) -> English [Dub] (4K HDR) -> others
    // For Standard Movies: Hindi -> English -> Tamil -> Telugu -> etc.
    const getLanguagePriority = (track: UnifiedAudioTrack): number => {
      if (isAnime) {
        if (track.language === 'ja') return 1;
        if (track.language === 'en-dub') return 2;
        if (track.language === 'en') return 3;
        if (track.language === 'hi') return 20;
        return 30;
      }
      if (track.language === 'hi') return 1;
      if (track.language === 'en') {
        if (track.badge.includes('4K') || track.badge.includes('2160')) return 5;
        return 10;
      }
      if (track.language === 'ta') return 30;
      if (track.language === 'te') return 40;
      if (track.language === 'fr') return 50;
      if (track.language === 'es') return 60;
      if (track.language === 'ar') return 70;
      return 80;
    };

    const sortedAudioTracks = deduplicatedTracks.sort((a, b) => {
      const prioA = getLanguagePriority(a);
      const prioB = getLanguagePriority(b);
      if (prioA !== prioB) return prioA - prioB;
      return a.label.localeCompare(b.label);
    });

    // Subtitle Sorting: English first, English CC second, Hindi third, then alphabetical
    let finalSubtitles = Array.from(subtitleMap.values());
    
    // Fetch OpenSubtitles if no English subs found from providers (same logic as Direct4K)
    const hasEnglishSub = finalSubtitles.some(s => s.language === 'en' || s.label.toLowerCase().includes('english'));
    if (!hasEnglishSub || finalSubtitles.length === 0) {
      try {
        const { getImdbIdFromTmdb, fetchOpenSubtitles } = await import('../../../lib/subtitles');
        const imdbId = await getImdbIdFromTmdb(id, type as 'movie' | 'tv');
        if (imdbId) {
          const openSubs = await fetchOpenSubtitles(imdbId, type as 'movie' | 'tv', season ? season.toString() : '1', episode ? episode.toString() : '1');
          if (openSubs && openSubs.length > 0) {
            for (const s of openSubs) {
              const rawLabel = (s.label || s.language || 'English').trim();
              const norm = normalizeSubtitle(rawLabel, s.language || 'en');
              finalSubtitles.push({
                id: `sub-os-${norm.key}-${Math.random().toString(36).substr(2,9)}`,
                language: norm.langCode,
                label: norm.label,
                url: `${currentOrigin}/api/subtitle/proxy?url=${encodeURIComponent(s.url)}`,
                isDefault: norm.key === 'en',
              });
            }
          }
        }
      } catch (err) {
        // Soft fail OpenSubtitles
      }
    }

    const sortedSubtitles = finalSubtitles.sort((a, b) => {
      const la = a.label.toLowerCase();
      const lb = b.label.toLowerCase();
      if (la === 'english') return -1;
      if (lb === 'english') return 1;
      if (la.includes('english [cc]')) return -1;
      if (lb.includes('english [cc]')) return 1;
      if (la === 'hindi') return -1;
      if (lb === 'hindi') return 1;
      return a.label.localeCompare(b.label);
    });

    if (sortedSubtitles.length > 0 && !sortedSubtitles.some(s => s.isDefault)) {
      sortedSubtitles[0].isDefault = true;
    }

    // Determine default stream (Japanese for anime, Hindi 1080p for standard)
    const defaultTrack = isAnime
      ? (sortedAudioTracks.find(a => a.language === 'ja') ||
         sortedAudioTracks.find(a => a.badge.includes('4K')) ||
         sortedAudioTracks[0])
      : (sortedAudioTracks.find(a => a.language === 'hi' && a.badge.includes('1080')) ||
         sortedAudioTracks.find(a => a.language === 'hi') ||
         sortedAudioTracks.find(a => a.badge.includes('4K') || a.badge.includes('1080')) ||
         sortedAudioTracks[0]);

    const responseData = {
      success: true,
      audioLanguages: sortedAudioTracks,
      subtitles: sortedSubtitles,
      servers: precheckedServers,
      defaultStreamUrl: defaultTrack?.url || null,
      defaultAudioLabel: defaultTrack?.label || (isAnime ? 'Japanese [Original]' : 'Hindi [Original / Dub]'),
    };

    aggregationCache.set(cacheKey, { timestamp: Date.now(), data: responseData });
    return NextResponse.json(responseData);
  } catch (err: any) {
    console.error('[direct-aggregate] Error aggregating streams:', err);
    return NextResponse.json({ error: err.message || 'Aggregation failed' }, { status: 500 });
  }
}
