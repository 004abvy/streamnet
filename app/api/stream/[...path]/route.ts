import { NextRequest, NextResponse } from 'next/server';

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
    const subPath = path.join('/');

    if (subPath === 'proxy') {
      const { searchParams } = new URL(request.url);
      const rawUrl = searchParams.get('url');
      if (!rawUrl) return new NextResponse('Missing URL', { status: 400 });

      const decodedUrl = decodeURIComponent(rawUrl);
      const clientRange = request.headers.get('range');
      const isMediaFile = /\.(mp4|m4s|ts|webm|mkv|aac|mp3|m4a)(?:\?|$)/i.test(decodedUrl);
      const isManifest = !isMediaFile && (searchParams.get('manifest') === '1' || /\.m3u8(?:\?|$)/i.test(decodedUrl));

      let upstreamHeaders: Record<string, string> = {};
      try {
        const serializedHeaders = searchParams.get('headers');
        const parsedHeaders = serializedHeaders ? JSON.parse(serializedHeaders) : {};
        if (parsedHeaders && typeof parsedHeaders === 'object') {
          Object.entries(parsedHeaders).forEach(([key, value]) => {
            if (typeof value === 'string' && !/^(host|range)$/i.test(key)) upstreamHeaders[key] = value;
          });
        }
      } catch {
        upstreamHeaders = {};
      }

      // Determine clean Referer and optional Origin based on target CDN domain
      let effectiveReferer = upstreamHeaders['Referer'] || upstreamHeaders['referer'] || '';
      let effectiveOrigin: string | undefined = undefined;

      const lowerUrl = decodedUrl.toLowerCase();
      if (lowerUrl.includes('vimeos')) {
        effectiveReferer = 'https://vimeos.net/';
      } else if (lowerUrl.includes('peakstorm')) {
        effectiveReferer = 'https://videasy.net/';
        // Peakstorm rejects requests with Origin header (returns 403)
      } else if (lowerUrl.includes('hakunaymatata') || lowerUrl.includes('vidlink')) {
        effectiveReferer = 'https://vidlink.pro/';
      } else if (lowerUrl.includes('vixsrc')) {
        effectiveReferer = 'https://vixsrc.to/';
      } else if (lowerUrl.includes('autoembed')) {
        effectiveReferer = 'https://autoembed.cc/';
      } else if (!effectiveReferer || effectiveReferer.includes('player.videasy.net')) {
        effectiveReferer = 'https://videasy.net/';
      }

      const proxyFetchHeaders: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
      };
      if (effectiveReferer) proxyFetchHeaders['Referer'] = effectiveReferer;
      if (effectiveOrigin) proxyFetchHeaders['Origin'] = effectiveOrigin;
      if (clientRange) proxyFetchHeaders['Range'] = clientRange;

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
          response = directCandidate;
          if (directCandidate.ok) {
            break;
          }
        } catch (err: any) {
          lastErr = err;
        }
      }

      // 2. Cloudflare Worker edge proxy fallback if direct fetch wasn't OK
      if (!response || !response.ok) {
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
        const errDetails = lastErr ? `${lastErr.name}: ${lastErr.message} | cause: ${JSON.stringify(lastErr.cause || {})} | stack: ${lastErr.stack}` : 'network error';
        return new NextResponse(`Proxy fetch failed: ${errDetails}`, { status: 502 });
      }

      if (!response.ok) {
        return new NextResponse(`Stream Fetch Error (${response.status})`, { status: response.status });
      }

      if (isManifest) {
        const manifestText = await response.text();
        const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
        let protocol = request.headers.get('x-forwarded-proto') || 'https';
        if (host.includes('localhost') || host.includes('10.0.2.2') || host.includes('192.168.')) {
          protocol = 'http';
        }
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
        const responseHeaders: Record<string, string> = {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
          'Accept-Ranges': 'bytes',
        };

        const contentRange = response.headers.get('content-range');
        if (contentRange) responseHeaders['Content-Range'] = contentRange;

        const contentLength = response.headers.get('content-length');
        if (contentLength) responseHeaders['Content-Length'] = contentLength;

        return new NextResponse(arrayBuffer, {
          status: response.status,
          headers: responseHeaders,
        });
      }
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
