import { NextRequest, NextResponse } from 'next/server';
import { resolveAllStreams } from '../../../../lib/providers/index';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

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
        const proxyParams = new URLSearchParams({
          url: stream.url,
          headers: JSON.stringify(stream.headers || {}),
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

      const subtitles = resolved.flatMap(s => s.subtitles || []).map(sub => ({
        url: sub.url,
        label: sub.label || sub.language || 'English',
        format: 'vtt',
      }));

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
