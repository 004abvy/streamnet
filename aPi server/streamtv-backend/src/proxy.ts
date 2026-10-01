import { Request, Response } from 'express';
import axios from 'axios';

export async function proxyStream(req: Request, res: Response) {
  try {
    const rawUrl = req.query.url as string;
    if (!rawUrl) return res.status(400).send('Missing URL');

    // Determine if this is a playlist/manifest vs a raw media segment.
    // .key files are binary AES-128 encryption keys — never treat them as manifests!
    const isKeyFile = /\.key(\?|$)/i.test(rawUrl);
    // Subtitle: only for DIRECT subtitle fetches. If manifest=1 is set, it's an HLS
    // subtitle rendition playlist that hls.js must parse — treat it as a manifest.
    const isSubtitle = req.query.manifest !== '1' && (
      /\.(vtt|srt|ass)(\?|$)/i.test(rawUrl) || /type=subtitle/i.test(rawUrl)
    );
    const isManifest = !isKeyFile && !isSubtitle && (
      req.query.manifest === '1'
      || /\.m3u8(\?|$)/i.test(rawUrl)
      || /\/playlist\//i.test(rawUrl)
    );

    console.log(`[proxy.ts] ${isManifest ? 'MANIFEST' : isKeyFile ? 'KEY' : isSubtitle ? 'SUBTITLE' : 'SEGMENT'}: ${rawUrl}`);

    // Build upstream request headers
    // Auto-inject a Referer based on the upstream URL's origin so CDNs don't reject us
    const upstreamOrigin = (() => { try { const u = new URL(rawUrl); return `${u.protocol}//${u.host}`; } catch { return ''; } })();
    let upstreamHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': upstreamOrigin + '/',
      'Origin': upstreamOrigin,
    };
    try {
      const serializedHeaders = req.query.headers as string;
      if (serializedHeaders) {
        const parsed = JSON.parse(serializedHeaders);
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof v === 'string' && !/^(host|origin|connection)$/i.test(k)) {
            upstreamHeaders[k] = v;
          }
        }
      }
    } catch {}

    if (isManifest) {
      // --- MANIFEST: fetch as text so we can rewrite URLs ---
      const response = await axios({
        method: 'GET',
        url: rawUrl,
        headers: upstreamHeaders,
        responseType: 'text',
        decompress: true,
        validateStatus: () => true,
        timeout: 15000,
      });

      const host = req.headers.host || 'localhost:5000';
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const currentOrigin = `${protocol}://${host}`;

      const makeProxyUrl = (targetUrl: string, forceManifest: boolean) => {
        const p = new URLSearchParams();
        p.set('url', targetUrl);
        if (req.query.headers) p.set('headers', req.query.headers as string);
        if (forceManifest) p.set('manifest', '1');
        return `${currentOrigin}/api/stream/proxy.m3u8?${p.toString()}`;
      };

      const resolveUrl = (relative: string) => {
        try {
          const resolved = new URL(relative, rawUrl);
          return resolved.href;
        } catch { return relative; }
      };

      let content = response.data as string;

      const rewritten = content.split('\n').map(line => {
        const trimmed = line.trim();

        // Rewrite URI="..." inside tag lines (#EXT-X-MEDIA, #EXT-X-STREAM-INF etc.)
        if (trimmed.startsWith('#') && trimmed.includes('URI="')) {
          return line.replace(/URI="([^"]+)"/g, (_match, uri) => {
            const fullUrl = resolveUrl(uri);
            // Any URI inside a tag is always a sub-manifest
            return `URI="${makeProxyUrl(fullUrl, true)}"`;
          });
        }

        // Rewrite segment/playlist lines (non-comment, non-empty)
        if (trimmed && !trimmed.startsWith('#')) {
          const fullUrl = resolveUrl(trimmed);
          // It's a sub-manifest if it looks like an m3u8 or a rendition playlist
          const looksLikeManifest = /\.m3u8(\?|$)/i.test(fullUrl)
            || /\/playlist\//i.test(fullUrl)
            || (/type=(video|audio|subtitle)/i.test(fullUrl));
          return makeProxyUrl(fullUrl, looksLikeManifest);
        }

        return line;
      }).join('\n');

      res.status(response.status);
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.send(rewritten);

    } else if (isSubtitle) {
      // --- SUBTITLE: fetch and serve as VTT ---
      // VixSrc subtitle URLs return an M3U8 playlist pointing to a single .vtt segment.
      // We must detect this and follow through to the actual VTT content.
      const response = await axios({
        method: 'GET',
        url: rawUrl,
        headers: upstreamHeaders,
        responseType: 'text',
        decompress: true,
        validateStatus: () => true,
        timeout: 15000,
      });

      let content = response.data as string;

      // Detect if we got an M3U8 playlist instead of raw VTT
      if (content.includes('#EXTM3U') || content.includes('#EXT-X-')) {
        // Extract the .vtt segment URL from the playlist
        const vttLine = content.split('\n').map(l => l.trim()).find(l => l && !l.startsWith('#'));
        if (vttLine) {
          try {
            const vttUrl = new URL(vttLine, rawUrl).href;
            console.log(`[proxy.ts] SUBTITLE M3U8 → following VTT: ${vttUrl.split('?')[0]}`);
            const vttResp = await axios({
              method: 'GET',
              url: vttUrl,
              headers: upstreamHeaders,
              responseType: 'text',
              decompress: true,
              validateStatus: () => true,
              timeout: 15000,
            });
            content = vttResp.data as string;
          } catch { /* fall through with original content */ }
        }
      }

      // Ensure it starts with WEBVTT header
      if (!content.trimStart().startsWith('WEBVTT')) {
        content = 'WEBVTT\n\n' + content;
      }

      res.status(200);
      res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.send(content);

    } else {
      // --- MEDIA SEGMENT / KEY: fetch with decompression enabled.
      // The CDN gzip-compresses segments — we must decompress before sending
      // to hls.js, otherwise decryption fails and fragParsingError is thrown.
      const response = await axios({
        method: 'GET',
        url: rawUrl,
        headers: upstreamHeaders,
        responseType: 'stream',
        decompress: true,   // CDN sends gzip — let axios decompress it
        validateStatus: () => true,
        timeout: 30000,
      });

      console.log(`[proxy.ts] STATUS ${response.status} for: ${rawUrl.split('?')[0]}`);
      res.status(response.status);
      // For encryption keys, pass the correct binary type; for segments force MPEG-TS
      res.setHeader('Content-Type', isKeyFile ? 'application/octet-stream' : 'video/mp2t');
      res.setHeader('Access-Control-Allow-Origin', '*');
      // DO NOT forward content-length or content-encoding — decompressed size differs
      return response.data.pipe(res);
    }

  } catch (err: any) {
    const rawUrl = req.query.url as string;
    console.error(`[proxy.ts] ERROR: ${rawUrl} — ${err.message}`);
    if (!res.headersSent) res.status(500).send('Proxy Error');
  }
}
