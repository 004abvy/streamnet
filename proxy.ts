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

  // 1. Check if user-agent matches automated bot/agent patterns
  if (userAgent) {
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

  // 2. Strict API protection: direct calls without browser headers
  if (pathname.startsWith('/api/')) {
    if (!userAgent) {
      return new NextResponse('Access Denied', { status: 403 });
    }
  }

  const response = NextResponse.next();

  // 3. Security & Anti-Indexing Headers
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet, notranslate, noimageindex');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

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
