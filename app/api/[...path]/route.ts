import { NextRequest, NextResponse } from 'next/server';

const TMDB_API_KEY = process.env.TMDB_API_KEY || 'a4e8c9bd39aadd7d67d8f0736c7a882a';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// In-memory cache for API route handlers
const cache = new Map<string, { timestamp: number; data: any }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchFromTMDB(endpoint: string, params: Record<string, any> = {}) {
  const cleanParams: Record<string, string> = {
    api_key: TMDB_API_KEY,
  };

  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== '') {
      cleanParams[key] = String(val);
    }
  }

  const searchParams = new URLSearchParams(cleanParams);
  const cacheKey = `${endpoint}?${searchParams.toString()}`;

  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey)!;
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    cache.delete(cacheKey);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (process.env.TMDB_READ_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.TMDB_READ_TOKEN}`;
  }

  const response = await fetch(`${TMDB_BASE_URL}${endpoint}?${searchParams.toString()}`, {
    headers,
    next: { revalidate: 300 }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`TMDB Error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  cache.set(cacheKey, { timestamp: Date.now(), data });
  return data;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await context.params;
    const pathStr = path.join('/');
    const { searchParams } = new URL(request.url);

    // 1. /api/discover
    if (pathStr === 'discover') {
      const type = searchParams.get('type') === 'tv' ? 'tv' : 'movie';
      const genreId = searchParams.get('genreId');
      const page = searchParams.get('page') || '1';

      const params: Record<string, any> = {
        language: 'en-US',
        sort_by: 'popularity.desc',
        page
      };
      if (genreId) params.with_genres = genreId;

      const data = await fetchFromTMDB(`/discover/${type}`, params);
      return NextResponse.json(data);
    }

    // 2. /api/movies/trending
    if (pathStr === 'movies/trending') {
      const data = await fetchFromTMDB('/trending/movie/day', { language: 'en-US' });
      return NextResponse.json(data);
    }

    // 3. /api/tv/trending
    if (pathStr === 'tv/trending') {
      const data = await fetchFromTMDB('/trending/tv/day', { language: 'en-US' });
      return NextResponse.json(data);
    }

    // 4. /api/movies/discover
    if (pathStr === 'movies/discover') {
      const page = searchParams.get('page') || '1';
      const filter = searchParams.get('filter');
      const genre = searchParams.get('genre');

      let endpoint = '/discover/movie';
      const params: Record<string, any> = {
        language: 'en-US',
        page
      };

      if (filter === '4k') {
        endpoint = '/discover/movie';
        params.sort_by = 'vote_average.desc';
        params['vote_count.gte'] = 200;
        params.with_original_language = 'en';
        if (genre) params.with_genres = genre;
      } else if (filter === 'top_rated') {
        endpoint = '/movie/top_rated';
      } else if (filter === 'upcoming') {
        endpoint = '/movie/upcoming';
      } else if (filter === 'now_playing') {
        endpoint = '/movie/now_playing';
      } else {
        endpoint = '/discover/movie';
        params.sort_by = 'popularity.desc';
        if (genre) params.with_genres = genre;
      }

      const data = await fetchFromTMDB(endpoint, params);
      return NextResponse.json(data);
    }

    // 5. /api/tv/discover
    if (pathStr === 'tv/discover') {
      const page = searchParams.get('page') || '1';
      const filter = searchParams.get('filter');
      const genre = searchParams.get('genre');

      let endpoint = '/discover/tv';
      const params: Record<string, any> = {
        language: 'en-US',
        page
      };

      if (filter === 'top_rated') {
        endpoint = '/tv/top_rated';
      } else if (filter === 'on_the_air') {
        endpoint = '/tv/on_the_air';
      } else if (filter === 'airing_today') {
        endpoint = '/tv/airing_today';
      } else {
        endpoint = '/discover/tv';
        params.sort_by = 'popularity.desc';
        if (genre) params.with_genres = genre;
      }

      const data = await fetchFromTMDB(endpoint, params);
      return NextResponse.json(data);
    }

    // 6. /api/movies/:id
    if (path.length === 2 && path[0] === 'movies' && path[1] !== 'trending' && path[1] !== 'discover') {
      const id = path[1];
      const data = await fetchFromTMDB(`/movie/${id}`, {
        append_to_response: 'credits,videos,similar,recommendations,reviews,images,external_ids'
      });
      return NextResponse.json(data);
    }

    // 7. /api/tv/:id/season/:seasonNumber
    if (path.length === 4 && path[0] === 'tv' && path[2] === 'season') {
      const id = path[1];
      const seasonNumber = path[3];
      const data = await fetchFromTMDB(`/tv/${id}/season/${seasonNumber}`, {
        language: 'en-US'
      });
      return NextResponse.json({
        ...data,
        episodes: (data.episodes || []).map((episode: any) => ({
          ...episode,
          overview: episode.overview || ''
        }))
      });
    }

    // 8. /api/tv/:id
    if (path.length === 2 && path[0] === 'tv' && path[1] !== 'trending' && path[1] !== 'discover') {
      const id = path[1];
      const data = await fetchFromTMDB(`/tv/${id}`, {
        append_to_response: 'credits,videos,similar,recommendations,reviews,images,external_ids'
      });
      return NextResponse.json(data);
    }

    // 9. /api/discover/provider/:providerId
    if (path.length === 3 && path[0] === 'discover' && path[1] === 'provider') {
      const providerId = path[2];
      const type = searchParams.get('type') === 'tv' ? 'tv' : 'movie';
      const page = searchParams.get('page') || '1';

      const data = await fetchFromTMDB(`/discover/${type}`, {
        with_watch_providers: providerId,
        watch_region: 'US',
        sort_by: 'popularity.desc',
        'vote_count.gte': 50,
        page
      });
      return NextResponse.json(data);
    }

    // 10. /api/providers
    if (pathStr === 'providers') {
      const data = await fetchFromTMDB('/watch/providers/movie', {
        watch_region: 'US'
      });
      return NextResponse.json(data);
    }

    // 11. /api/anime
    if (pathStr === 'anime') {
      const page = searchParams.get('page') || '1';
      const data = await fetchFromTMDB('/discover/tv', {
        with_genres: 16,
        with_original_language: 'ja',
        sort_by: 'popularity.desc',
        page
      });
      return NextResponse.json(data);
    }

    // 12. /api/search
    if (pathStr === 'search') {
      const query = searchParams.get('q');
      if (!query) return NextResponse.json({ results: [] });

      const data = await fetchFromTMDB('/search/multi', {
        query
      });
      return NextResponse.json(data);
    }

    // 13. /api/subtitles
    if (pathStr === 'subtitles') {
      const id = searchParams.get('id');
      const season = searchParams.get('season');
      const episode = searchParams.get('episode');
      const language = searchParams.get('language');

      if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

      const params = new URLSearchParams();
      params.set('id', id);
      if (season) params.set('season', season);
      if (episode) params.set('episode', episode);
      if (language) params.set('language', language);
      if (process.env.WYZIE_API_KEY) {
        params.set('key', process.env.WYZIE_API_KEY);
      }

      const response = await fetch(`https://sub.wyzie.io/search?${params.toString()}`);
      const data = await response.json();
      return NextResponse.json(data);
    }

    // 14. /api/stream/mediaInfo
    if (pathStr === 'stream/mediaInfo') {
      const id = searchParams.get('id');
      if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

      let data;
      try {
        const res = await fetch(`https://autoembed.cc/api/v1/mediaInfo?id=${id}`);
        data = await res.json();
      } catch {
        const res = await fetch(`https://autoembed.co/api/v1/mediaInfo?id=${id}`);
        data = await res.json();
      }
      return NextResponse.json(data);
    }

    // 15. /api/stream/proxy
    if (pathStr === 'stream/proxy') {
      const rawUrl = searchParams.get('url');
      if (!rawUrl) return new NextResponse('Missing URL', { status: 400 });

      const decodedUrl = decodeURIComponent(rawUrl);
      const isManifest = decodedUrl.includes('.m3u8');

      const response = await fetch(decodedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': new URL(decodedUrl).origin
        }
      });

      if (!response.ok) {
        return new NextResponse('Stream Fetch Error', { status: response.status });
      }

      if (isManifest) {
        const manifestText = await response.text();
        const baseUrl = decodedUrl.substring(0, decodedUrl.lastIndexOf('/') + 1);

        const lines = manifestText.split('\n');
        const host = request.headers.get('host') || 'localhost:3000';
        const protocol = request.headers.get('x-forwarded-proto') || 'https';

        const rewritten = lines.map(line => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            let fullChunkUrl = trimmed;
            if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
              fullChunkUrl = new URL(trimmed, baseUrl).href;
            }
            return `${protocol}://${host}/api/stream/proxy?url=${encodeURIComponent(fullChunkUrl)}`;
          }
          return line;
        }).join('\n');

        return new NextResponse(rewritten, {
          headers: {
            'Content-Type': 'application/vnd.apple.mpegurl',
            'Access-Control-Allow-Origin': '*'
          }
        });
      } else {
        const arrayBuffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'video/MP2T';
        return new NextResponse(arrayBuffer, {
          headers: {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }

    return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
  } catch (error: any) {
    console.error('API Error:', error.message);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await context.params;
    const pathStr = path.join('/');

    if (pathStr === 'stream/getStream') {
      const body = await request.json();
      const { file, key } = body;
      if (!file || !key) {
        return NextResponse.json({ error: 'Missing file or key' }, { status: 400 });
      }

      let data;
      try {
        const res = await fetch('https://autoembed.cc/api/v1/getStream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file, key })
        });
        data = await res.json();
      } catch {
        const res = await fetch('https://autoembed.co/api/v1/getStream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file, key })
        });
        data = await res.json();
      }
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
  } catch (error: any) {
    console.error('API Error:', error.message);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
