import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 30;

const ANIVEXA_URL = process.env.NEXT_PUBLIC_ANIVEXA_URL || 'http://localhost:4000';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ action: string[] }> }
) {
  try {
    const { action } = await context.params;
    const { searchParams } = new URL(request.url);
    const endpoint = action?.join('/') || '';

    // 1. /search?query=...
    if (endpoint === 'search') {
      const query = searchParams.get('query') || '';
      if (!query) {
        return NextResponse.json([]);
      }

      // Query AniList GraphQL for rich MAL IDs and episode info
      const anilistQuery = `
        query ($search: String) {
          Page(page: 1, perPage: 10) {
            media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
              id
              idMal
              title {
                romaji
                english
                native
              }
              episodes
              coverImage {
                large
              }
            }
          }
        }
      `;

      try {
        const aniRes = await fetch('https://graphql.anilist.co', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: anilistQuery, variables: { search: query } }),
          signal: AbortSignal.timeout(6000),
        });

        if (aniRes.ok) {
          const aniData = await aniRes.json();
          const mediaList = aniData.data?.Page?.media || [];
          const results = mediaList.map((m: any) => ({
            id: m.idMal || m.id,
            anilistId: m.id,
            title: m.title.english || m.title.romaji || m.title.native,
            episodes_sub: m.episodes || 12,
            episodes_dub: m.episodes || 12,
            image: m.coverImage?.large,
          }));

          return NextResponse.json(results, {
            headers: { 'Access-Control-Allow-Origin': '*' },
          });
        }
      } catch (e) {
        console.warn('[anime-api] AniList search failed:', e);
      }

      return NextResponse.json([]);
    }

    // 1b. /search-info?search=...
    if (endpoint === 'search-info') {
      const search = searchParams.get('search') || '';
      if (!search) {
        return NextResponse.json({ data: { Media: null } });
      }

      const query = `
        query ($search: String) {
          Media (search: $search, type: ANIME) {
            id
            title { romaji english native }
            bannerImage
            coverImage { extraLarge large medium color }
            episodes
            relations {
              edges {
                relationType
                node {
                  id
                  title { romaji english native }
                  type
                  format
                  episodes
                  seasonYear
                  coverImage { extraLarge large medium }
                }
              }
            }
          }
        }
      `;

      try {
        const aniRes = await fetch('https://graphql.anilist.co', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, variables: { search } }),
          signal: AbortSignal.timeout(8000),
        });

        if (aniRes.ok) {
          const data = await aniRes.json();
          return NextResponse.json(data, {
            headers: { 'Access-Control-Allow-Origin': '*' },
          });
        }
      } catch (e) {
        console.warn('[anime-api] search-info failed:', e);
      }

      return NextResponse.json({ data: { Media: null } });
    }

    // 1c. /episodes-info/<mediaId>
    if (endpoint.startsWith('episodes-info/')) {
      const mediaId = endpoint.replace('episodes-info/', '');
      try {
        const anivexaRes = await fetch(
          `${ANIVEXA_URL}/episodes/anikoto/reanime/animegg/${mediaId}`,
          { signal: AbortSignal.timeout(15000) }
        );
        if (anivexaRes.ok) {
          const data = await anivexaRes.json();
          return NextResponse.json(data, {
            headers: { 'Access-Control-Allow-Origin': '*' },
          });
        }
      } catch (e) {
        console.warn('[anime-api] episodes-info failed:', e);
      }
      return NextResponse.json({ error: 'Failed to fetch episodes' }, { status: 500 });
    }

    // 1d. /stream-info/<episodeId>
    if (endpoint.startsWith('stream-info/')) {
      const epId = endpoint.replace('stream-info/', '');
      try {
        const anivexaRes = await fetch(`${ANIVEXA_URL}/${epId}`, {
          signal: AbortSignal.timeout(15000),
        });
        if (anivexaRes.ok) {
          const data = await anivexaRes.json();
          return NextResponse.json(data, {
            headers: { 'Access-Control-Allow-Origin': '*' },
          });
        }
      } catch (e) {
        console.warn('[anime-api] stream-info failed:', e);
      }
      return NextResponse.json({ error: 'Failed to fetch stream' }, { status: 500 });
    }

    // 2. /episodes/<show_id>?mode=sub|dub
    if (endpoint.startsWith('episodes/')) {
      const showId = endpoint.split('/')[1];
      const mode = searchParams.get('mode') || 'sub';

      try {
        const anivexaRes = await fetch(
          `${ANIVEXA_URL}/episodes/anikoto/reanime/animegg/${showId}`,
          { signal: AbortSignal.timeout(8000) }
        );

        if (anivexaRes.ok) {
          const data = await anivexaRes.json();
          const providers = ['anikoto', 'reanime', 'mkissa', 'animegg'];
          let epList: number[] = [];

          for (const p of providers) {
            if (data[p]?.episodes?.[mode]?.length > 0) {
              epList = data[p].episodes[mode].map((ep: any) => ep.number || 1);
              break;
            }
          }

          if (epList.length > 0) {
            return NextResponse.json({
              mode,
              episodes: epList,
            }, {
              headers: { 'Access-Control-Allow-Origin': '*' },
            });
          }
        }
      } catch (e) {
        console.warn('[anime-api] Episodes fetch failed:', e);
      }

      return NextResponse.json({ mode, episodes: [] });
    }

    // 3. /episode_url?show_id=...&ep_no=...&mode=sub|dub&quality=best
    if (endpoint === 'episode_url') {
      const showId = searchParams.get('show_id') || '';
      const epNo = searchParams.get('ep_no') || '1';
      const mode = searchParams.get('mode') || 'sub';

      try {
        const anivexaRes = await fetch(
          `${ANIVEXA_URL}/episodes/anikoto/reanime/animegg/${showId}`,
          { signal: AbortSignal.timeout(8000) }
        );

        if (anivexaRes.ok) {
          const epData = await anivexaRes.json();
          const providers = ['anikoto', 'reanime', 'mkissa', 'animegg'];
          let chosenEpId: string | null = null;

          for (const p of providers) {
            const eps = epData[p]?.episodes?.[mode];
            if (eps && Array.isArray(eps)) {
              const matched = eps.find((e: any) => String(e.number) === String(epNo));
              if (matched) {
                chosenEpId = matched.id;
                break;
              }
            }
          }

          if (chosenEpId) {
            const streamRes = await fetch(`${ANIVEXA_URL}/${chosenEpId}`, {
              signal: AbortSignal.timeout(8000),
            });
            if (streamRes.ok) {
              const streamData = await streamRes.json();
              const directHls =
                streamData.stream_url ||
                streamData.streams?.find(
                  (s: any) => s.type === 'hls' || s.url?.includes('.m3u8')
                )?.url;

              const referer =
                streamData.headers?.Referer ||
                streamData.streams?.find((s: any) => s.url === directHls)?.referer ||
                '';

              const subtitles = [
                ...(streamData.subtitles || []),
                ...(streamData.captions || []),
              ];

              return NextResponse.json({
                episode_url: directHls || streamData.embeds?.[0]?.url || '',
                mode,
                referer,
                subtitles: subtitles.map((sub: any) => ({
                  url: sub.url,
                  label: sub.label || sub.name || 'English',
                  language: sub.srclang || sub.language || 'en',
                  default: sub.default ?? true,
                })),
              }, {
                headers: { 'Access-Control-Allow-Origin': '*' },
              });
            }
          }
        }
      } catch (e) {
        console.warn('[anime-api] Episode URL error:', e);
      }

      return NextResponse.json({ error: 'Failed to retrieve episode stream URL' }, { status: 500 });
    }

    // 1f. /rapidapi/top, /rapidapi/search?name=..., /rapidapi/random
    if (endpoint.startsWith('rapidapi/')) {
      const subEndpoint = endpoint.replace('rapidapi/', '');
      const rapidKey = process.env.RAPIDAPI_KEY || '0bb4717a40msh320fc1767ac3b57p15b2c2jsn8ebc3ba3f431';
      const rapidHost = process.env.RAPIDAPI_CRUNCHYROLL_HOST || 'crunchyroll-top-anime-api-by-apirobots.p.rapidapi.com';

      let targetPath = '/v1/crunchyroll-top';
      if (subEndpoint === 'random') {
        targetPath = '/v1/crunchyroll-top/random';
      } else if (subEndpoint === 'search') {
        const queryName = searchParams.get('name') || searchParams.get('query') || '';
        targetPath = `/v1/crunchyroll-top?name=${encodeURIComponent(queryName)}`;
      }

      try {
        const res = await fetch(`https://${rapidHost}${targetPath}`, {
          method: 'GET',
          headers: {
            'x-rapidapi-key': rapidKey,
            'x-rapidapi-host': rapidHost,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*',
          },
          signal: AbortSignal.timeout(10000),
        });

        if (res.ok) {
          const data = await res.json();
          return NextResponse.json(data, {
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
            },
          });
        }
        return NextResponse.json({ error: `RapidAPI returned status ${res.status}` }, { status: res.status });
      } catch (e: any) {
        console.warn('[anime-api] RapidAPI request failed:', e);
        return NextResponse.json({ error: e.message || 'RapidAPI request failed' }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Invalid endpoint' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
