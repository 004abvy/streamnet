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

    if (
      subPath === 'proxy' ||
      subPath === 'proxy.m3u8' ||
      subPath === 'proxy.ts' ||
      subPath === 'proxy.vtt' ||
      subPath.startsWith('proxy') ||
      subPath.endsWith('.m3u8') ||
      subPath.endsWith('.ts') ||
      subPath.endsWith('.vtt') ||
      subPath.endsWith('.mp4') ||
      subPath.endsWith('.m4s')
    ) {
      const { searchParams } = new URL(request.url);
      const rawUrl = searchParams.get('url');
      if (!rawUrl) return new NextResponse('Missing URL', { status: 400 });

      let decodedUrl = rawUrl;
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

      // Unwrap nested proxy.valhallastream.com / m3u8-proxy / ts-proxy URLs
      if (decodedUrl.includes('valhallastream.com') && (decodedUrl.includes('?url=') || decodedUrl.includes('&url='))) {
        try {
          const parsedValhalla = new URL(decodedUrl);
          const innerUrl = parsedValhalla.searchParams.get('url');
          const innerHeaders = parsedValhalla.searchParams.get('headers');
          if (innerUrl) {
            decodedUrl = innerUrl;
            if (innerHeaders) {
              try {
                const parsedInner = JSON.parse(innerHeaders);
                Object.assign(upstreamHeaders, parsedInner);
              } catch {}
            }
          }
        } catch {}
      }

      const isExplicitMp4 = decodedUrl.toLowerCase().includes('.mp4') && !decodedUrl.toLowerCase().includes('.m3u8');
      const isManifest = (searchParams.get('manifest') === '1' || subPath.endsWith('.m3u8') || decodedUrl.includes('.m3u8')) && !isExplicitMp4;

      // Determine clean Referer and optional Origin based on target CDN domain
      let effectiveReferer = upstreamHeaders['Referer'] || upstreamHeaders['referer'] || '';
      let effectiveOrigin: string | undefined = upstreamHeaders['Origin'] || upstreamHeaders['origin'] || undefined;

      const lowerUrl = decodedUrl.toLowerCase();
      if (lowerUrl.includes('cheaptruckrepairs') || lowerUrl.includes('cinejoy')) {
        effectiveReferer = 'https://cinejoy.pk/';
        effectiveOrigin = 'https://cinejoy.pk';
      } else if (
        lowerUrl.includes('stellarfrontier') ||
        lowerUrl.includes('nexabloom') ||
        lowerUrl.includes('hiddenvertex') ||
        lowerUrl.includes('megaplay') ||
        lowerUrl.includes('anikoto') ||
        lowerUrl.includes('reanime') ||
        lowerUrl.includes('2dhive') ||
        lowerUrl.includes('mkissa') ||
        lowerUrl.includes('kaa')
      ) {
        effectiveReferer = effectiveReferer || 'https://megaplay.buzz/';
        effectiveOrigin = effectiveOrigin || 'https://megaplay.buzz';
      } else if (
        lowerUrl.includes('megacloud') ||
        lowerUrl.includes('rabbitstream') ||
        lowerUrl.includes('rapid-cloud') ||
        lowerUrl.includes('aniwatch') ||
        lowerUrl.includes('hianime')
      ) {
        effectiveReferer = effectiveReferer || 'https://megacloud.tv/';
        effectiveOrigin = effectiveOrigin || 'https://megacloud.tv';
      } else if (
        lowerUrl.includes('rivestream') ||
        lowerUrl.includes('valhallastream') ||
        lowerUrl.includes('bxcnv') ||
        lowerUrl.includes('flkow') ||
        lowerUrl.includes('hoxcv') ||
        lowerUrl.includes('bxncw') ||
        lowerUrl.includes('flulp') ||
        lowerUrl.includes('kbocw') ||
        lowerUrl.includes('wnowe') ||
        lowerUrl.includes('flocw') ||
        lowerUrl.includes('hls_mps')
      ) {
        effectiveReferer = effectiveReferer || 'https://rivestream.ru/';
        effectiveOrigin = effectiveOrigin || 'https://rivestream.ru';
      } else if (lowerUrl.includes('vimeos')) {
        effectiveReferer = 'https://vimeos.net/';
      } else if (lowerUrl.includes('peakstorm')) {
        effectiveReferer = 'https://videasy.net/';
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

      const clientRange = request.headers.get('range');
      if (clientRange) {
        proxyFetchHeaders['Range'] = clientRange;
      }

      const workerBaseUrl = process.env.NEXT_PUBLIC_PROXY_URL || 'https://rapid-shadow-7122.abvy7661.workers.dev';
      const targetWorkerUrl = `${workerBaseUrl}?url=${encodeURIComponent(decodedUrl)}&headers=${encodeURIComponent(JSON.stringify(proxyFetchHeaders))}`;

      let response: Response | null = null;
      let lastErr: any = null;

      // 1. Direct Fetch from serverless Node with fast timeout
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const directCandidate = await fetch(decodedUrl, {
            cache: 'no-store',
            headers: proxyFetchHeaders,
            signal: AbortSignal.timeout(3500),
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
          const workerCandidate = await fetch(targetWorkerUrl, {
            cache: 'no-store',
            signal: AbortSignal.timeout(3500),
          });
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

      const contentType = response.headers.get('content-type') || '';
      const isActuallyManifest = !isExplicitMp4 && (isManifest || contentType.toLowerCase().includes('mpegurl') || decodedUrl.includes('playlist'));

      if (isActuallyManifest) {
        const manifestText = await response.text();
        const trimmed = manifestText.trimStart();
        if (trimmed.startsWith('#EXTM3U') || trimmed.startsWith('#EXT-X-') || trimmed.startsWith('#EXTINF')) {
          const host = request.headers.get('host') || 'localhost:3000';
          const protocol = request.headers.get('x-forwarded-proto') || (host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https');
          const proxyUrl = (targetUrl: string, manifest: boolean) => {
            let cleanTarget = targetUrl;
            let cleanHeaders = { ...upstreamHeaders };
            if (cleanTarget.includes('valhallastream.com') && (cleanTarget.includes('?url=') || cleanTarget.includes('&url='))) {
              try {
                const p = new URL(cleanTarget);
                const innerU = p.searchParams.get('url');
                const innerH = p.searchParams.get('headers');
                if (innerU) {
                  cleanTarget = innerU;
                  if (innerH) {
                    try {
                      Object.assign(cleanHeaders, JSON.parse(innerH));
                    } catch {}
                  }
                }
              } catch {}
            }
            if (cleanTarget.toLowerCase().includes('.vtt') || cleanTarget.toLowerCase().includes('.srt')) {
              return `${protocol}://${host}/api/subtitle/proxy?url=${encodeURIComponent(cleanTarget)}&referer=${encodeURIComponent(effectiveReferer || 'https://megaplay.buzz/')}`;
            }
            const isSubMp4 = cleanTarget.toLowerCase().includes('.mp4') && !cleanTarget.toLowerCase().includes('.m3u8');
            const params = new URLSearchParams({
              url: cleanTarget,
              headers: JSON.stringify(cleanHeaders),
            });
            if (manifest && !isSubMp4) params.set('manifest', '1');
            const endpoint = (manifest && !isSubMp4) ? 'proxy.m3u8' : (isSubMp4 ? 'proxy.mp4' : 'proxy.ts');
            return `${protocol}://${host}/api/stream/${endpoint}?${params.toString()}`;
          };
          const lines = manifestText.split('\n');
          const rewritten = lines.map(line => {
            const uriMatch = line.match(/URI="([^"]+)"/);
            if (uriMatch) {
              try {
                const mediaUrl = new URL(uriMatch[1], decodedUrl).href;
                if (line.includes('TYPE=SUBTITLES') || mediaUrl.toLowerCase().includes('.vtt') || mediaUrl.toLowerCase().includes('.srt')) {
                  return line.replace(uriMatch[1], `${protocol}://${host}/api/subtitle/proxy?url=${encodeURIComponent(mediaUrl)}&referer=${encodeURIComponent(effectiveReferer || 'https://megaplay.buzz/')}`);
                }
                const isSubManifest = (/\.m3u8(?:\?|$)/i.test(mediaUrl) || mediaUrl.includes('playlist')) && !mediaUrl.includes('.mp4');
                return line.replace(uriMatch[1], proxyUrl(mediaUrl, isSubManifest));
              } catch {
                return line;
              }
            }

            const trimmedLine = line.trim();
            if (trimmedLine && !trimmedLine.startsWith('#')) {
              try {
                const fullChunkUrl = new URL(trimmedLine, decodedUrl).href;
                if (fullChunkUrl.toLowerCase().includes('.vtt') || fullChunkUrl.toLowerCase().includes('.srt')) {
                  return `${protocol}://${host}/api/subtitle/proxy?url=${encodeURIComponent(fullChunkUrl)}&referer=${encodeURIComponent(effectiveReferer || 'https://megaplay.buzz/')}`;
                }
                const isSubManifest = (/\.m3u8(?:\?|$)/i.test(fullChunkUrl) || fullChunkUrl.includes('playlist')) && !fullChunkUrl.includes('.mp4');
                return proxyUrl(fullChunkUrl, isSubManifest);
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
        }
      }

      let arrayBuffer = await response.arrayBuffer();
      const isVtt = subPath.endsWith('.vtt') || decodedUrl.toLowerCase().includes('.vtt');
      let streamContentType = response.headers.get('content-type') || (isVtt ? 'text/vtt; charset=utf-8' : (isExplicitMp4 ? 'video/mp4' : (subPath.endsWith('.ts') ? 'video/mp2t' : 'video/mp4')));
      if (isVtt) streamContentType = 'text/vtt; charset=utf-8';
      if (isExplicitMp4) streamContentType = 'video/mp4';
        
        // Unwrap FlixCloud HD-2 image segments
        const flixImageSegmentXorKey = new Uint8Array([157, 42, 241, 71, 179, 142, 92, 112, 166, 25, 228, 59, 216, 98, 15, 197]);
        const body = new Uint8Array(arrayBuffer);
        const isWebp = body.length > 12 && body[0] === 0x52 && body[1] === 0x49 && body[2] === 0x46 && body[3] === 0x46 && body[8] === 0x57 && body[9] === 0x45 && body[10] === 0x42 && body[11] === 0x50;
        const isPng = body.length > 8 && body[0] === 0x89 && body[1] === 0x50 && body[2] === 0x4e && body[3] === 0x47 && body[4] === 0x0d && body[5] === 0x0a && body[6] === 0x1a && body[7] === 0x0a;
        
        let offset = 0;
        let needsXor = false;
        if (isWebp) {
          offset = 12;
          needsXor = body[offset] !== 0x47;
        } else if (isPng) {
          offset = 8;
          needsXor = body[offset] !== 0x47;
        }
        
        if (offset > 0) {
          const out = new Uint8Array(body.buffer, body.byteOffset + offset);
          if (needsXor) {
            for (let i = 0; i < out.length; i++) {
              out[i] ^= flixImageSegmentXorKey[i % flixImageSegmentXorKey.length];
            }
          }
          arrayBuffer = out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength);
          streamContentType = 'video/mp2t';
        }

        const totalBytes = arrayBuffer.byteLength;
        let status = response.status;
        const respHeaders: Record<string, string> = {
          'Content-Type': streamContentType,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length',
          'Accept-Ranges': 'bytes',
          'Content-Length': totalBytes.toString(),
        };

        const upstreamContentRange = response.headers.get('content-range');
        if (upstreamContentRange) {
          respHeaders['Content-Range'] = upstreamContentRange;
          if (status === 200) status = 206;
        } else if (clientRange && status === 200) {
          status = 206;
          respHeaders['Content-Range'] = `bytes 0-${totalBytes - 1}/${totalBytes}`;
        }

        return new NextResponse(arrayBuffer, {
          status: status,
          headers: respHeaders,
        });
      }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
