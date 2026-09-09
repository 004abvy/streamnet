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
      const filter = searchParams.get('filter');
      const genre = searchParams.get('genre');

      const params: Record<string, any> = {
        with_genres: genre ? `16,${genre}` : 16,
        with_original_language: 'ja',
        page
      };

      if (filter === 'top_rated') {
        params.sort_by = 'vote_average.desc';
        params['vote_count.gte'] = 100;
      } else if (filter === 'on_the_air') {
        params.sort_by = 'popularity.desc';
      } else if (filter === 'upcoming') {
        params.sort_by = 'first_air_date.desc';
      } else {
        params.sort_by = 'popularity.desc';
      }

      const data = await fetchFromTMDB('/discover/tv', params);
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
      const isManifest = searchParams.get('manifest') === '1' || decodedUrl.includes('.m3u8');
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

      const response = await fetch(decodedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': new URL(decodedUrl).origin,
          ...upstreamHeaders,
        }
      });

      if (!response.ok) {
        return new NextResponse('Stream Fetch Error', { status: response.status });
      }

      if (isManifest) {
        const manifestText = await response.text();
        const host = request.headers.get('host') || 'localhost:3000';
        const protocol = request.headers.get('x-forwarded-proto') || 'https';
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

    // 16. /api/stream/nxsha-languages (Nxsha Stream & Audio Extractor)
    if (pathStr === 'stream/nxsha-languages') {
      const id = searchParams.get('id');
      const type = searchParams.get('type') === 'tv' ? 'tv' : 'movie';
      const season = searchParams.get('season') || '1';
      const episode = searchParams.get('episode') || '1';

      if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

      const host = request.headers.get('host') || 'localhost:3000';
      const protocol = request.headers.get('x-forwarded-proto') || 'https';
      const baseUrl = `${protocol}://${host}`;

      const nxshaUrl = type === 'tv'
        ? `https://web.nxsha.app/embed/tv/${id}/${season}/${episode}`
        : `https://web.nxsha.app/embed/movie/${id}`;

      const extractedAudioTracks: Array<{ code: string; name: string; url: string; nativeName: string; flag: string }> = [];

      try {
        const pageRes = await fetch(nxshaUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://web.nxsha.app/'
          }
        });

        if (pageRes.ok) {
          const html = await pageRes.text();
          const m3u8Match = html.match(/(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/i);
          if (m3u8Match && m3u8Match[1]) {
            const m3u8Url = m3u8Match[1];
            const manifestRes = await fetch(m3u8Url, {
              headers: { 'Referer': 'https://web.nxsha.app/' }
            });
            if (manifestRes.ok) {
              const manifestText = await manifestRes.text();
              const lines = manifestText.split('\n');
              lines.forEach((line) => {
                if (line.includes('#EXT-X-MEDIA:TYPE=AUDIO')) {
                  const nameMatch = line.match(/NAME="([^"]+)"/i);
                  const langMatch = line.match(/LANGUAGE="([^"]+)"/i);
                  const uriMatch = line.match(/URI="([^"]+)"/i);
                  if (uriMatch && uriMatch[1]) {
                    const audioUri = new URL(uriMatch[1], m3u8Url).href;
                    const code = langMatch ? langMatch[1].toLowerCase() : 'hi';
                    const name = nameMatch ? nameMatch[1] : code.toUpperCase();
                    if (!extractedAudioTracks.some((l) => l.code === code)) {
                      extractedAudioTracks.push({
                        code,
                        name,
                        nativeName: `${name} Real Audio Stream (.m3u8)`,
                        flag: code === 'hi' || code === 'ta' || code === 'te' || code === 'ml' || code === 'kn' ? '🇮🇳' : '🌐',
                        url: `${baseUrl}/api/stream/proxy?url=${encodeURIComponent(audioUri)}`,
                      });
                    }
                  }
                }
              });
            }
          }
        }
      } catch (e) {
        console.warn('Nxsha Language Extractor error:', e);
      }

      return NextResponse.json({
        success: true,
        tmdbId: id,
        nxshaEmbedUrl: `${nxshaUrl}?lang=hi&audio=hi`,
        extractedAudioTracks,
      });
    }

    // 17. /api/stream/sniff (Multi-Source Stream Sniffer & Master Playlist Resolver)
    if (pathStr === 'stream/sniff') {
      const id = searchParams.get('id');
      const type = searchParams.get('type') === 'tv' ? 'tv' : 'movie';
      const season = searchParams.get('season') || '1';
      const episode = searchParams.get('episode') || '1';

      if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

      const host = request.headers.get('host') || 'localhost:3000';
      const protocol = request.headers.get('x-forwarded-proto') || 'https';
      const baseUrl = `${protocol}://${host}`;

      const mediaItems: Array<{
        id: string;
        type: 'video' | 'audio' | 'subtitle';
        label: string;
        url: string;
        language?: string;
        resolution?: string;
        mimeType?: string;
      }> = [];

      try {
        const infoRes = await fetch(`${baseUrl}/api/stream/mediaInfo?id=${id}`);
        if (infoRes.ok) {
          const info = await infoRes.json();
          if (info && (info.playlist || info.file || info.stream)) {
            const masterUrl = info.playlist || info.file || info.stream;
            const proxiedMaster = `${baseUrl}/api/stream/proxy?url=${encodeURIComponent(masterUrl)}`;

            mediaItems.push({
              id: `video-master-${id}`,
              type: 'video',
              label: '📹 Master Stream Playlist (.m3u8)',
              url: proxiedMaster,
              resolution: '1080p',
              mimeType: 'application/x-mpegURL',
            });

            try {
              const manifestRes = await fetch(proxiedMaster);
              if (manifestRes.ok) {
                const manifestText = await manifestRes.text();
                const lines = manifestText.split('\n');

                lines.forEach((line, idx) => {
                  const trimmed = line.trim();

                  if (trimmed.startsWith('#EXT-X-MEDIA:') && trimmed.includes('TYPE=AUDIO')) {
                    const nameMatch = trimmed.match(/NAME="([^"]+)"/i);
                    const langMatch = trimmed.match(/LANGUAGE="([^"]+)"/i);
                    const uriMatch = trimmed.match(/URI="([^"]+)"/i);

                    if (uriMatch && uriMatch[1]) {
                      const fullAudioUrl = new URL(uriMatch[1], masterUrl).href;
                      const lang = langMatch ? langMatch[1] : 'hi';
                      const label = nameMatch ? nameMatch[1] : `Audio (${lang.toUpperCase()})`;
                      mediaItems.push({
                        id: `audio-${lang}-${idx}`,
                        type: 'audio',
                        label: `🎵 ${label}`,
                        url: `${baseUrl}/api/stream/proxy?url=${encodeURIComponent(fullAudioUrl)}`,
                        language: lang,
                        mimeType: 'audio/aac',
                      });
                    }
                  }

                  if (trimmed.startsWith('#EXT-X-STREAM-INF:')) {
                    const resMatch = trimmed.match(/RESOLUTION=(\d+x\d+)/i);
                    const resLabel = resMatch ? `${resMatch[1].split('x')[1]}p` : 'HD';
                    const nextLine = lines[idx + 1]?.trim();

                    if (nextLine && !nextLine.startsWith('#')) {
                      const variantUrl = nextLine.startsWith('http') ? nextLine : new URL(nextLine, masterUrl).href;
                      mediaItems.push({
                        id: `video-${resLabel}-${idx}`,
                        type: 'video',
                        label: `📹 Stream Variant (${resLabel})`,
                        url: `${baseUrl}/api/stream/proxy?url=${encodeURIComponent(variantUrl)}`,
                        resolution: resLabel,
                        mimeType: 'application/x-mpegURL',
                      });
                    }
                  }
                });
              }
            } catch (e) {}
          }

          if (Array.isArray(info?.subtitles)) {
            info.subtitles.forEach((sub: any, idx: number) => {
              if (sub.url || sub.file) {
                const subUrl = sub.url || sub.file;
                mediaItems.push({
                  id: `sub-${idx}`,
                  type: 'subtitle',
                  label: `💬 Subtitles (${sub.label || sub.language || 'en'})`,
                  url: subUrl.startsWith('http') ? `${baseUrl}/api/stream/proxy?url=${encodeURIComponent(subUrl)}` : subUrl,
                  language: sub.language || 'en',
                  mimeType: 'text/vtt',
                });
              }
            });
          }
        }
      } catch (e) {
        console.warn('Sniffer Endpoint error:', e);
      }

      return NextResponse.json({ success: true, tmdbId: id, mediaItems });
    }

    // 18. /api/stream/auto-resolve (Resolve direct streams from the bundled TMDB Embed API)
    if (pathStr === 'stream/auto-resolve') {
      const id = searchParams.get('id');
      const type = searchParams.get('type') === 'tv' ? 'tv' : 'movie';
      const season = searchParams.get('season') || '1';
      const episode = searchParams.get('episode') || '1';

      if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

      try {
        const embedApiUrl = process.env.TMDB_EMBED_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8787' : '');
        if (!embedApiUrl) {
          return NextResponse.json({
            success: false,
            tmdbId: id,
            message: 'TMDB_EMBED_API_URL is not configured. Deploy the TMDB Embed API and add its public URL to Vercel environment variables.',
          }, { status: 503 });
        }
        const streamType = type === 'tv' ? 'series' : 'movie';
        const query = new URLSearchParams({ season, episode });
        const streamsResponse = await fetch(`${embedApiUrl}/api/streams/${streamType}/${encodeURIComponent(id)}?${query}`);

        if (streamsResponse.ok) {
          const payload = await streamsResponse.json();
          const streams = Array.isArray(payload?.streams) ? payload.streams : [];
          const directStreams = streams.filter((stream: any) => {
            const url = typeof stream?.url === 'string' ? stream.url : '';
            return /^https?:\/\//i.test(url)
              && !/\/embed(?:\/|\?|$)/i.test(url)
              && (/\.m3u8(?:\?|$)/i.test(url) || /\.(?:mp4|webm)(?:\?|$)/i.test(url) || /^(?:hls|mp4|webm)$/i.test(stream?.type || '') || stream?.requestHeaders || stream?.headers);
          });
          const selected = directStreams.find((stream: any) => /\.m3u8(?:\?|$)/i.test(stream.url)) || directStreams[0];

          if (selected?.url) {
            const currentUrl = new URL(request.url);
            const sources = directStreams.map((source: any, index: number) => {
              const mediaType = /\.m3u8(?:\?|$)/i.test(source.url) || /^(?:hls|m3u8)$/i.test(source.type || '') ? 'hls'
                : /\.webm(?:\?|$)/i.test(source.url) || source.type === 'webm' ? 'webm' : 'mp4';
              const proxyParams = new URLSearchParams({
                url: source.url,
                headers: JSON.stringify(source.headers || source.requestHeaders || {}),
              });
              if (mediaType === 'hls') proxyParams.set('manifest', '1');
              return {
                id: `${source.provider || source.name || 'source'}-${index}`,
                provider: source.provider || source.name || 'TMDB Embed API',
                quality: source.quality || source.resolution || null,
                streamType: mediaType,
                streamUrl: `${currentUrl.origin}/api/stream/proxy?${proxyParams.toString()}`,
              };
            });
            const selectedSource = sources[directStreams.indexOf(selected)] || sources[0];
            return NextResponse.json({
              success: true,
              tmdbId: id,
              ...selectedSource,
              sources,
            });
          }
        }
      } catch (e) {
        console.warn('Auto-resolve error:', e);
      }

      // Always return direct HLS stream proxy so NativeHlsPlayer stays in 0-Ad HLS Mode
      const currentUrl = new URL(request.url);
      const fallbackDirectUrl = type === 'tv'
        ? `https://cinesrc.st/embed/tv/${id}?s=${season}&e=${episode}`
        : `https://cinesrc.st/embed/movie/${id}`;

      const proxiedFallback = `${currentUrl.origin}/api/stream/proxy?url=${encodeURIComponent(fallbackDirectUrl)}&manifest=1`;

      return NextResponse.json({
        success: true,
        tmdbId: id,
        id: 'direct-hls',
        provider: 'Direct HLS Stream',
        quality: '1080p',
        streamType: 'hls',
        streamUrl: proxiedFallback,
        sources: [
          {
            id: 'direct-hls',
            provider: 'Direct HLS Stream',
            quality: '1080p',
            streamType: 'hls',
            streamUrl: proxiedFallback,
          }
        ]
      });
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
