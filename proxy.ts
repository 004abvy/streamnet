import { NextResponse, type NextRequest } from 'next/server';

// Known bot, automated scraper, crawler, and headless agent signatures
const BLOCKED_AGENT_PATTERNS = [
  /bot/i,
  /spider/i,
  /crawl/i,
  /scraper/i,
  /headless/i,
  /puppeteer/i,
  /playwright/i,
  /selenium/i,
  /phantomjs/i,
  /python-requests/i,
  /aiohttp/i,
  /scrapy/i,
  /curl/i,
  /wget/i,
  /postmanruntime/i,
  /insomnia/i,
  /go-http-client/i,
  /java\//i,
  /libwww-perl/i,
  /httpclient/i,
  /gptbot/i,
  /chatgpt/i,
  /claudebot/i,
  /bytespider/i,
  /ccbot/i,
  /perplexity/i,
];

export function proxy(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || '';
  const pathname = request.nextUrl.pathname;

  // Handle CORS preflight OPTIONS requests for all APIs
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
        'Access-Control-Allow-Headers': '*',
      },
    });
  }

  // Exempt stream, direct, and subtitle proxy endpoints from strict agent blocking
  const isMediaEndpoint =
    pathname.startsWith('/api/stream') ||
    pathname.startsWith('/api/direct') ||
    pathname.startsWith('/api/subtitle') ||
    pathname.startsWith('/api/rive-provider') ||
    pathname.startsWith('/api/proxy');

  // 1. Check if user-agent matches automated bot/agent patterns (skip for media playback endpoints)
  if (userAgent && !isMediaEndpoint) {
    const isAutomatedAgent = BLOCKED_AGENT_PATTERNS.some((pattern) =>
      pattern.test(userAgent)
    );

    if (isAutomatedAgent) {
      // Return 403 Forbidden for automated scraping agents
      return new NextResponse('Access Denied: Automated agent access is restricted.', {
        status: 403,
        headers: {
          'Content-Type': 'text/plain',
          'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
        },
      });
    }
  }

  // 2. Strict API protection: direct calls without browser headers (skip for media endpoints)
  if (pathname.startsWith('/api/') && !isMediaEndpoint) {
    if (!userAgent) {
      return new NextResponse('Access Denied', { status: 403 });
    }
  }

  const response = NextResponse.next();

  // 3. Security & Anti-Indexing Headers
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet, notranslate, noimageindex');
  if (!isMediaEndpoint) {
    response.headers.set('X-Content-Type-Options', 'nosniff');
  }
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Access-Control-Allow-Origin', '*');

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files, favicon, etc.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
