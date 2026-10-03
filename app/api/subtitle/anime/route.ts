import { NextRequest, NextResponse } from 'next/server';
import { getImdbIdFromTmdb } from '@/lib/subtitles';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 30;

interface AnimeSubtitleResult {
  id: string;
  url: string;
  label: string;
  language: string;
  isDefault?: boolean;
  downloads?: number;
  format?: string;
  source?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tmdbId = searchParams.get('tmdbId');
    let imdbId = searchParams.get('imdbId');
    const query = searchParams.get('query') || '';
    const season = searchParams.get('season') || '1';
    const episode = searchParams.get('episode') || '1';
    const lang = searchParams.get('lang') || 'all';

    let resolvedTmdbId = tmdbId;

    // 1. Resolve TMDB ID if not provided
    if (!resolvedTmdbId && !imdbId && query) {
      try {
        const tmdbApiKey = process.env.TMDB_API_KEY || '6d123e4a3cbda6ef1240c5f7c3dc9cb8';
        const searchEndpoint = `https://api.themoviedb.org/3/search/tv?api_key=${tmdbApiKey}&query=${encodeURIComponent(query)}`;
        const searchRes = await fetch(searchEndpoint, { signal: AbortSignal.timeout(4000) });
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.results && searchData.results.length > 0) {
            resolvedTmdbId = String(searchData.results[0].id);
          }
        }
      } catch (e) {
        console.warn('[Anime Subtitles] TMDB query search error:', e);
      }
    }

    // 2. Resolve IMDb ID
    if (!imdbId && resolvedTmdbId) {
      imdbId = await getImdbIdFromTmdb(resolvedTmdbId, 'tv');
    }

    const results: AnimeSubtitleResult[] = [];
    const seenUrls = new Set<string>();

    const fetchTasks: Promise<any>[] = [];

    // 3. OpenSubtitles Search via IMDb Episode & Season
    if (imdbId) {
      const numericImdbId = imdbId.replace(/^tt/, '');
      if (numericImdbId) {
        const langFilter = lang && lang !== 'all' ? `/sublanguageid-${lang}` : '';
        const searchUrl = `https://rest.opensubtitles.org/search/episode-${episode}/imdbid-${numericImdbId}/season-${season}${langFilter}`;
        
        fetchTasks.push(
          fetch(searchUrl, {
            headers: { 'User-Agent': 'TemporaryUserAgent', Accept: 'application/json' },
            signal: AbortSignal.timeout(6000),
          })
            .then(async (res) => {
              if (!res.ok) return [];
              return await res.json();
            })
            .then((data) => {
              if (Array.isArray(data)) {
                for (const item of data) {
                  const dl = item.SubDownloadLink;
                  if (!dl || seenUrls.has(dl)) continue;
                  seenUrls.add(dl);

                  const langName = item.LanguageName || item.SubLanguageID || 'English';
                  const release = (item.InfoReleaseGroup || item.MovieReleaseName || '').replace(/[\[\]]/g, '').trim();
                  
                  let cleanTag = '';
                  if (/netflix/i.test(release)) cleanTag = ' (Netflix)';
                  else if (/crunchyroll/i.test(release)) cleanTag = ' (Crunchyroll)';
                  else if (/horriblesubs/i.test(release)) cleanTag = ' (HorribleSubs)';
                  else if (/full/i.test(release)) cleanTag = ' (Full)';

                  results.push({
                    id: item.IDSubtitleFile || item.IDSubtitle || `os-${results.length}`,
                    url: dl,
                    label: `${langName}${cleanTag}`,
                    language: (item.ISO639 || item.SubLanguageID || 'en').substring(0, 2).toLowerCase(),
                    downloads: parseInt(item.SubDownloadsCnt || '0', 10) || 0,
                    format: item.SubFormat || 'vtt',
                    source: 'OpenSubtitles',
                  });
                }
              }
            })
            .catch(() => {})
        );
      }
    }

    // 4. OpenSubtitles Text Query Fallback (e.g. "Black Clover E101")
    if (query) {
      const cleanTitle = query.replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
      const textSearchUrl = `https://rest.opensubtitles.org/search/query-${encodeURIComponent(`${cleanTitle} E${episode}`)}/sublanguageid-eng`;
      fetchTasks.push(
        fetch(textSearchUrl, {
          headers: { 'User-Agent': 'TemporaryUserAgent', Accept: 'application/json' },
          signal: AbortSignal.timeout(5000),
        })
          .then(async (res) => {
            if (!res.ok) return [];
            return await res.json();
          })
          .then((data) => {
            if (Array.isArray(data)) {
              for (const item of data) {
                const dl = item.SubDownloadLink;
                if (!dl || seenUrls.has(dl)) continue;
                seenUrls.add(dl);

                const langName = item.LanguageName || 'English';
                results.push({
                  id: item.IDSubtitleFile || `os-q-${results.length}`,
                  url: dl,
                  label: `${langName}`,
                  language: (item.ISO639 || 'en').substring(0, 2).toLowerCase(),
                  downloads: parseInt(item.SubDownloadsCnt || '0', 10) || 0,
                  format: item.SubFormat || 'vtt',
                  source: 'OpenSubtitles',
                });
              }
            }
          })
          .catch(() => {})
      );
    }

    // 5. SubDL API Integration (Free public anime & movie subtitles search)
    if (imdbId || query) {
      const subdlKey = 'X5iR1i1HjY6L4s7Y9e7K';
      const subdlUrl = imdbId
        ? `https://api.subdl.com/api/v1/subtitles?api_key=${subdlKey}&imdb_id=${imdbId}&season_number=${season}&episode_number=${episode}&type=tv`
        : `https://api.subdl.com/api/v1/subtitles?api_key=${subdlKey}&film_name=${encodeURIComponent(query)}&season_number=${season}&episode_number=${episode}&type=tv`;

      fetchTasks.push(
        fetch(subdlUrl, { signal: AbortSignal.timeout(6000) })
          .then(async (res) => {
            if (!res.ok) return null;
            return await res.json();
          })
          .then((data) => {
            if (data?.status && Array.isArray(data.subtitles)) {
              for (const sub of data.subtitles) {
                const subUrl = sub.url ? `https://dl.subdl.com${sub.url}` : null;
                if (!subUrl || seenUrls.has(subUrl)) continue;
                seenUrls.add(subUrl);

                const langName = sub.language || 'English';
                results.push({
                  id: `subdl-${sub.release_info || results.length}`,
                  url: subUrl,
                  label: `${langName}`,
                  language: (sub.lang || 'en').substring(0, 2).toLowerCase(),
                  downloads: 100,
                  format: 'vtt',
                  source: 'SubDL',
                });
              }
            }
          })
          .catch(() => {})
      );
    }

    await Promise.allSettled(fetchTasks);

    // 6. Sort and clean results
    results.sort((a, b) => {
      const aIsEng = a.language === 'en';
      const bIsEng = b.language === 'en';
      if (aIsEng && !bIsEng) return -1;
      if (!aIsEng && bIsEng) return 1;
      return (b.downloads || 0) - (a.downloads || 0);
    });

    // Clean and uniquely label
    const labelCounts = new Map<string, number>();
    const cleanedResults = results.slice(0, 15).map((sub, idx) => {
      let base = sub.label.trim();
      const count = labelCounts.get(base) || 0;
      labelCounts.set(base, count + 1);

      const uniqueLabel = count === 0 ? base : `${base} ${count + 1}`;
      return {
        ...sub,
        label: uniqueLabel,
        isDefault: idx === 0 && sub.language === 'en',
      };
    });

    return NextResponse.json({
      success: true,
      subtitles: cleanedResults,
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err: any) {
    console.error('[Anime Subtitles API] Error:', err);
    return NextResponse.json({
      success: false,
      subtitles: [],
      error: err.message,
    }, {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
}
