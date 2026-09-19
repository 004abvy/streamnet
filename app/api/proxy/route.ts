import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  const referer = req.nextUrl.searchParams.get('referer') || '';
  const origin = req.nextUrl.searchParams.get('origin') || '';

  if (!url) return new NextResponse('Missing URL', { status: 400 });

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    };
    if (referer) headers['Referer'] = referer;
    if (origin) headers['Origin'] = origin;

    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      return new NextResponse(`Proxy failed: ${response.statusText}`, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || '';
    
    // If it's an HLS playlist, rewrite the URLs to route through this proxy
    if (contentType.includes('mpegurl') || url.includes('.m3u8')) {
      let text = await response.text();
      
      const lines = text.split('\n');
      const rewrittenLines = lines.map(line => {
        const trimmed = line.trim();
        // Ignore directives and empty lines
        if (trimmed.startsWith('#') || !trimmed) {
          // Special case: some tags have URIs inside them like #EXT-X-KEY:METHOD=AES-128,URI="key.bin"
          if (trimmed.startsWith('#EXT-X-KEY') && trimmed.includes('URI=')) {
             return trimmed.replace(/URI="(.*?)"/, (match, p1) => {
                let absoluteKeyUrl = p1;
                if (!p1.startsWith('http')) {
                  const baseUrl = new URL(url);
                  if (p1.startsWith('/')) {
                    absoluteKeyUrl = `${baseUrl.origin}${p1}`;
                  } else {
                    const pathParts = baseUrl.pathname.split('/');
                    pathParts.pop();
                    absoluteKeyUrl = `${baseUrl.origin}${pathParts.join('/')}/${p1}`;
                  }
                }
                return `URI="/api/proxy?url=${encodeURIComponent(absoluteKeyUrl)}&referer=${encodeURIComponent(referer)}"`;
             });
          }
          return line; 
        }
        
        // It's a URI line
        let absoluteUrl = trimmed;
        if (!trimmed.startsWith('http')) {
           const baseUrl = new URL(url);
           if (trimmed.startsWith('/')) {
             absoluteUrl = `${baseUrl.origin}${trimmed}`;
           } else {
             const pathParts = baseUrl.pathname.split('/');
             pathParts.pop(); // remove filename
             absoluteUrl = `${baseUrl.origin}${pathParts.join('/')}/${trimmed}`;
             // Re-append query string of the base URL if the chunk doesn't have one
             if (baseUrl.search && !absoluteUrl.includes('?')) {
               absoluteUrl += baseUrl.search;
             }
           }
        }
        
        // Proxy this absolute URL
        return `/api/proxy?url=${encodeURIComponent(absoluteUrl)}&referer=${encodeURIComponent(referer)}`;
      });
      
      return new NextResponse(rewrittenLines.join('\n'), {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store'
        }
      });
    }

    // Ensure correct content-type for subtitles
    let finalContentType = contentType || 'video/MP2T';
    if (url.includes('.vtt')) {
      finalContentType = 'text/vtt';
    } else if (url.includes('.srt')) {
      finalContentType = 'text/plain';
    }

    // For raw .ts chunks or anything else, just stream the binary data
    return new NextResponse(response.body, {
      headers: {
        'Content-Type': finalContentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400'
      }
    });

  } catch (error: any) {
    console.error("Proxy error:", error);
    return new NextResponse(error.message, { status: 500 });
  }
}
