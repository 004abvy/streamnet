import { NextRequest, NextResponse } from 'next/server';
import { resolveAllStreams } from '../../../../lib/providers/index';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
      'Access-Control-Allow-Headers': '*',
    },
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await context.params;
    const mediaType = path[0] === 'tv' ? 'tv' : 'movie';
    const tmdbId = path[1] || path[0];
    const season = path[2] || '1';
    const episode = path[3] || '1';

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || (host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https');
    const currentOrigin = `${protocol}://${host}`;

    const rivestreamProviders = [
      'citadel',
      'primevids',
      'borealis',
      'vanguard',
      'aura',
      'apogee',
      'rigel',
      'apex',
    ];

    // 1. Fetch Rivestream direct streams in parallel
    const rivePromises = rivestreamProviders.map(async (rp) => {
      try {
        let targetUrl = `https://scrapper.rivestream.app/api/provider?provider=${rp}&id=${tmdbId}`;
        if (mediaType === 'tv') {
          targetUrl += `&season=${season}&episode=${episode}`;
        }
        if (rp === 'citadel' || rp === 'primevids') {
          targetUrl += `&cb=${Math.floor(Date.now() / 3000000)}`;
        }
        const res = await fetch(targetUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Referer: 'https://rivestream.ru/',
          },
          signal: AbortSignal.timeout(2000),
        });
        if (!res.ok) return null;
        const data = await res.json();
        return {
          provider: `Direct ${rp.charAt(0).toUpperCase() + rp.slice(1)}`,
          sources: data?.data?.sources || [],
          captions: data?.data?.captions || [],
        };
      } catch {
        return null;
      }
    });

    // 2. Fetch OMSS & custom resolvers
    const omssPromise = resolveAllStreams(tmdbId, mediaType, season, episode).catch((err) => {
      console.warn('[api/direct] OMSS stream resolution warning:', err);
      return [];
    });

    const [riveResults, resolvedOmss] = await Promise.all([
      Promise.allSettled(rivePromises),
      omssPromise,
    ]);

    const sources: any[] = [];
    const rawSubs: any[] = [];
    const seenUrls = new Set<string>();

    // Add Rivestream sources
    for (const r of riveResults) {
      if (r.status === 'fulfilled' && r.value && Array.isArray(r.value.sources)) {
        r.value.sources.forEach((s: any, idx: number) => {
          const rawUrl = s.url;
          if (!rawUrl || seenUrls.has(rawUrl)) return;
          seenUrls.add(rawUrl);

          const rawQual = (s.quality || s.source || '').toLowerCase();
          let quality = '1080p HD';
          if (rawQual.includes('4k') || rawQual.includes('2160')) {
            quality = '4K 2160p';
          } else if (rawQual.includes('720')) {
            quality = '720p HD';
          }

          const proxyParams = new URLSearchParams({
            url: rawUrl,
            manifest: '1',
            headers: JSON.stringify({
              Referer: 'https://rivestream.ru/',
              Origin: 'https://rivestream.ru',
            }),
          });

          sources.push({
            id: `direct-rive-${r.value?.provider}-${idx}`,
            provider: { id: `rive-${r.value?.provider}`, name: r.value?.provider || 'Direct 4K' },
            name: `${r.value?.provider || 'Direct 4K'} (${quality})`,
            quality,
            streamType: 'hls',
            url: `${currentOrigin}/api/stream/proxy.m3u8?${proxyParams.toString()}`,
            rawUrl,
            audioTracks: [],
          });
        });

        if (Array.isArray(r.value.captions)) {
          rawSubs.push(...r.value.captions);
        }
      }
    }

    // Add OMSS & custom sources
    if (Array.isArray(resolvedOmss) && resolvedOmss.length > 0) {
      resolvedOmss.forEach((stream, index) => {
        if (!stream.url || seenUrls.has(stream.url)) return;
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
        const endpoint = stream.type === 'hls' ? 'proxy.m3u8' : 'proxy';

        sources.push({
          id: stream.id || `provider-${index}`,
          provider: { id: stream.id || `provider-${index}`, name: stream.provider },
          name: stream.provider,
          quality: stream.quality || null,
          streamType: stream.type,
          url: `${currentOrigin}/api/stream/${endpoint}?${proxyParams.toString()}`,
          rawUrl: stream.url,
          audioTracks: [],
        });

        if (Array.isArray(stream.subtitles)) {
          rawSubs.push(...stream.subtitles);
        }
      });
    }

    // Subtitle aggregation
    const hasEnglish = rawSubs.some((s) =>
      (s.label || s.language || '').toLowerCase().includes('eng')
    );

    let fallbackSubs: any[] = [];
    if (!hasEnglish || rawSubs.length === 0) {
      try {
        const { getImdbIdFromTmdb, fetchOpenSubtitles } = await import('../../../../lib/subtitles');
        const imdbId = await getImdbIdFromTmdb(tmdbId, mediaType);
        if (imdbId) {
          fallbackSubs = await fetchOpenSubtitles(imdbId, mediaType, season, episode);
        }
      } catch (subErr) {
        console.warn('[api/direct] Fallback subtitle search error:', subErr);
      }
    }

    const allSubs = [...rawSubs, ...fallbackSubs];
    const seenSubUrls = new Set<string>();
    const subtitles: { url: string; label: string; language: string; format: string }[] = [];

    for (const sub of allSubs) {
      if (!sub?.url || seenSubUrls.has(sub.url)) continue;
      seenSubUrls.add(sub.url);

      const rawLabel = sub.label || sub.language || 'English';
      const isEng = rawLabel.toLowerCase().includes('eng');
      const langCode =
        sub.language ||
        (isEng ? 'en' : rawLabel.toLowerCase().includes('hin') ? 'hi' : rawLabel.slice(0, 2).toLowerCase());

      subtitles.push({
        url: `${currentOrigin}/api/subtitle/proxy?url=${encodeURIComponent(sub.url)}`,
        label: rawLabel,
        language: langCode,
        format: 'vtt',
      });
    }

    if (sources.length > 0) {
      return NextResponse.json({
        success: true,
        tmdbId,
        mediaType,
        sources,
        subtitles,
      });
    }

    return NextResponse.json({ success: false, sources: [], subtitles: [] }, { status: 404 });
  } catch (err: any) {
    console.error('[api/direct] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
