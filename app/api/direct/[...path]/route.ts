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

    const currentUrl = new URL(request.url);
    const resolved = await resolveAllStreams(tmdbId, mediaType, season, episode);

    if (resolved.length > 0) {
      const sources = resolved.map((stream, index) => {
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
        return {
          id: stream.id || `provider-${index}`,
          provider: { id: stream.id || `provider-${index}`, name: stream.provider },
          name: stream.provider,
          quality: stream.quality || null,
          streamType: stream.type,
          url: `${currentUrl.origin}/api/stream/proxy?${proxyParams.toString()}`,
          rawUrl: stream.url,
          audioTracks: [],
        };
      });

      // Aggregate subtitles from all resolved streams
      const resolvedSubs = resolved.flatMap(s => s.subtitles || []);
      const hasEnglish = resolvedSubs.some(s =>
        (s.label || s.language || '').toLowerCase().includes('eng')
      );

      let fallbackSubs: any[] = [];
      if (!hasEnglish || resolvedSubs.length === 0) {
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

      const allSubs = [...resolvedSubs, ...fallbackSubs];
      const seenUrls = new Set<string>();
      const subtitles: { url: string; label: string; language: string; format: string }[] = [];

      for (const sub of allSubs) {
        if (!sub?.url || seenUrls.has(sub.url)) continue;
        seenUrls.add(sub.url);

        const rawLabel = sub.label || sub.language || 'English';
        const isEng = rawLabel.toLowerCase().includes('eng');
        const langCode = sub.language || (isEng ? 'en' : rawLabel.toLowerCase().includes('hin') ? 'hi' : rawLabel.slice(0, 2).toLowerCase());

        subtitles.push({
          url: `${currentUrl.origin}/api/subtitle/proxy?url=${encodeURIComponent(sub.url)}`,
          label: rawLabel,
          language: langCode,
          format: 'vtt',
        });
      }

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
