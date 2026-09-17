import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get('provider') || 'citadel';
  const id = searchParams.get('id');
  const season = searchParams.get('season');
  const episode = searchParams.get('episode');

  if (!id) {
    return NextResponse.json({ error: 'Missing media id' }, { status: 400 });
  }

  try {
    let targetUrl = `https://scrapper.rivestream.app/api/provider?provider=${provider}&id=${id}`;
    if (season && episode) {
      targetUrl += `&season=${season}&episode=${episode}`;
    }
    if (provider === 'citadel' || provider === 'primevids') {
      targetUrl += `&cb=${Math.floor(Date.now() / 3000000)}`;
    }

    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: 'https://rivestream.ru/',
      },
    } as any);

    if (!res.ok) {
      return NextResponse.json(
        { error: `Provider ${provider} returned status ${res.status}` },
        { status: res.status }
      );
    }

    const json = await res.json();

    // Route all HLS streams through our proxy with proper referer and CORS headers
    if (json?.data?.sources && Array.isArray(json.data.sources)) {
      const currentUrl = new URL(request.url);
      json.data.sources = json.data.sources.map((s: any) => ({
        ...s,
        rawUrl: s.url,
        url: `${currentUrl.origin}/api/stream/proxy?url=${encodeURIComponent(s.url)}&manifest=1`,
      }));
    }

    return NextResponse.json(json);
  } catch (err: any) {
    console.error(`[RiveProvider API] Error fetching ${provider}:`, err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch provider stream' },
      { status: 500 }
    );
  }
}
