import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await context.params;
    const subPath = path.join('/');

    if (subPath === 'proxy') {
      const { searchParams } = new URL(request.url);
      const rawUrl = searchParams.get('url');
      if (!rawUrl) return new NextResponse('Missing URL', { status: 400 });

      const decodedUrl = decodeURIComponent(rawUrl);
      const isManifest = searchParams.get('manifest') === '1' || decodedUrl.includes('.m3u8');
      let upstreamHeaders: Record<string, string> = {};
      try {
        const serializedHeaders = searchParams.get('headers');
        const parsedHeaders = serializedHeaders ? JSON.parse(serializedHeaders) : {};
        if (parsedHeaders && typeof parsedHeaders === 'object') {
          Object.entries(parsedHeaders).forEach(([key, value]) => {
            if (typeof value === 'string' && !/^host$/i.test(key)) upstreamHeaders[key] = value;
          });
        }
      } catch {
        upstreamHeaders = {};
      }

      let defaultReferer = 'https://vixsrc.to/';
      const lowerUrl = decodedUrl.toLowerCase();
      if (lowerUrl.includes('vixsrc') || lowerUrl.includes('vimeos')) {
        defaultReferer = 'https://vixsrc.to/';
      } else if (lowerUrl.includes('vidlink') || lowerUrl.includes('hakunaymatata')) {
        defaultReferer = 'https://vidlink.pro/';
      } else if (lowerUrl.includes('autoembed')) {
        defaultReferer = 'https://autoembed.cc/';
      } else if (lowerUrl.includes('videasy') || lowerUrl.includes('peakstorm')) {
        defaultReferer = 'https://player.videasy.net/';
      }

      const effectiveReferer = upstreamHeaders['Referer'] || upstreamHeaders['referer'] || defaultReferer;
      let effectiveOrigin = 'https://vixsrc.to';
      try {
        effectiveOrigin = new URL(effectiveReferer).origin;
      } catch {}

      const proxyFetchHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Referer': effectiveReferer,
        'Origin': effectiveOrigin,
        ...upstreamHeaders,
      };

      const workerBaseUrl = process.env.NEXT_PUBLIC_PROXY_URL || 'https://rapid-shadow-7122.abvy7661.workers.dev';
      const targetWorkerUrl = `${workerBaseUrl}?url=${encodeURIComponent(decodedUrl)}&headers=${encodeURIComponent(JSON.stringify(proxyFetchHeaders))}`;

      let response: Response | null = null;
      let lastErr: any = null;

      // 1. Direct Fetch from serverless Node
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const directCandidate = await fetch(decodedUrl, {
            cache: 'no-store',
            headers: proxyFetchHeaders,
          });
          if (directCandidate.ok) {
            response = directCandidate;
            break;
          }
        } catch (err: any) {
          lastErr = err;
        }
      }

      // 2. Cloudflare Worker edge proxy fallback
      if (!response) {
        try {
          const workerCandidate = await fetch(targetWorkerUrl, { cache: 'no-store' });
          if (workerCandidate.ok) {
            response = workerCandidate;
          }
        } catch (e: any) {
          console.warn('[stream/proxy] Cloudflare Worker fetch error:', e);
        }
      }

      if (!response) {
        return new NextResponse(`Proxy fetch failed: ${lastErr?.message || 'network error'}`, { status: 502 });
      }

      if (!response.ok) {
        return new NextResponse('Stream Fetch Error', { status: response.status });
      }

      if (isManifest) {
        const manifestText = await response.text();
        const host = request.headers.get('host') || 'localhost:3000';
        const protocol = request.headers.get('x-forwarded-proto') || 'https';
        const proxyUrl = (targetUrl: string, manifest: boolean) => {
          const params = new URLSearchParams({
            url: targetUrl,
            headers: JSON.stringify(upstreamHeaders),
          });
          if (manifest) params.set('manifest', '1');
          return `${protocol}://${host}/api/stream/proxy?${params.toString()}`;
        };
        const lines = manifestText.split('\n');
        const rewritten = lines.map(line => {
          const uriMatch = line.match(/URI="([^"]+)"/);
          if (uriMatch) {
            try {
              const mediaUrl = new URL(uriMatch[1], decodedUrl).href;
              return line.replace(uriMatch[1], proxyUrl(mediaUrl, /\.m3u8(?:\?|$)/i.test(mediaUrl)));
            } catch {
              return line;
            }
          }

          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            try {
              const fullChunkUrl = new URL(trimmed, decodedUrl).href;
              return proxyUrl(fullChunkUrl, /\.m3u8(?:\?|$)/i.test(fullChunkUrl));
            } catch {
              return line;
            }
          }
          return line;
        }).join('\n');

        return new NextResponse(rewritten, {
          headers: {
            'Content-Type': 'application/vnd.apple.mpegurl',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          }
        });
      } else {
        const arrayBuffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'video/MP2T';
        return new NextResponse(arrayBuffer, {
          headers: {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*',
          }
        });
      }
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
