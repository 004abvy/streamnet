import { Request, Response } from 'express';
import axios from 'axios';

export async function proxyStream(req: Request, res: Response) {
  try {
    const rawUrl = req.query.url as string;
    console.log(`[proxy.ts] PROXYING: ${rawUrl}`);
    if (!rawUrl) return res.status(400).send('Missing URL');

    const isManifest = req.query.manifest === '1' || req.path.endsWith('.m3u8') || rawUrl.includes('.m3u8');
    
    let upstreamHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
    };
    try {
      const serializedHeaders = req.query.headers as string;
      if (serializedHeaders) {
        const parsed = JSON.parse(serializedHeaders);
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof v === 'string' && !/^host$/i.test(k)) upstreamHeaders[k] = v;
        }
      }
    } catch {}

    const response = await axios({
      method: 'GET',
      url: rawUrl,
      headers: upstreamHeaders,
      responseType: isManifest ? 'text' : 'stream',
      validateStatus: () => true,
    });

    res.status(response.status);
    
    // Copy safe headers
    ['content-type', 'content-length', 'content-range', 'accept-ranges'].forEach(h => {
      if (response.headers[h]) res.setHeader(h, response.headers[h]);
    });
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (isManifest) {
      let content = response.data as string;
      const host = req.headers.host || 'localhost:4000';
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const currentOrigin = `${protocol}://${host}`;

      const proxyUrl = (targetUrl: string, isSubManifest: boolean) => {
        const p = new URLSearchParams();
        p.set('url', targetUrl);
        if (req.query.headers) p.set('headers', req.query.headers as string);
        if (isSubManifest) p.set('manifest', '1');
        return `${currentOrigin}/api/stream/proxy.m3u8?${p.toString()}`;
      };

      const resolveUrl = (relative: string) => {
        try {
          const base = new URL(rawUrl);
          const resolved = new URL(relative, rawUrl);
          // Only append base query params if the relative URL doesn't have its own
          if (!relative.includes('?') && base.search) {
            resolved.search = base.search;
          }
          return resolved.href;
        } catch { return relative; }
      };

      const rewritten = content.split('\n').map(line => {
        if (line.startsWith('#EXT-X-STREAM-INF') || line.startsWith('#EXT-X-MEDIA')) {
          const uriMatch = line.match(/URI="([^"]+)"/);
          if (uriMatch) {
            try {
              const fullUrl = resolveUrl(uriMatch[1]);
              const isSubManifest = /\.m3u8(?:\?|$)/i.test(fullUrl) || fullUrl.includes('playlist');
              return line.replace(uriMatch[1], proxyUrl(fullUrl, isSubManifest));
            } catch { return line; }
          }
        }
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          try {
            const fullUrl = resolveUrl(trimmed);
            const isSubManifest = /\.m3u8(?:\?|$)/i.test(fullUrl) || fullUrl.includes('playlist');
            return proxyUrl(fullUrl, isSubManifest);
          } catch { return line; }
        }
        return line;
      }).join('\n');

      return res.send(rewritten);
    } else {
      return response.data.pipe(res);
    }
  } catch (err: any) {
    const rawUrl = req.query.url as string;
    console.error(`[proxy.ts] ERROR PROXYING: ${rawUrl}`);
    console.error(`[proxy.ts] DETAILS:`, err.message);
    if (err.response) {
      console.error(`[proxy.ts] RESPONSE STATUS:`, err.response.status);
    }
    res.status(500).send('Proxy Error');
  }
}
