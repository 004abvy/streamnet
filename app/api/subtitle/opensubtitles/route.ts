import { NextRequest, NextResponse } from 'next/server';
import { getImdbIdFromTmdb } from '@/lib/subtitles';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tmdbId = searchParams.get('tmdbId');
    let imdbId = searchParams.get('imdbId');
    const query = searchParams.get('query');
    const type = (searchParams.get('type') || 'tv') as 'movie' | 'tv';
    const season = searchParams.get('season') || '1';
    const episode = searchParams.get('episode') || '1';
    const lang = searchParams.get('lang');

    let resolvedTmdbId = tmdbId;

    // Search TMDB by query if no tmdbId or imdbId is provided
    if (!resolvedTmdbId && !imdbId && query) {
      try {
        const tmdbApiKey = process.env.TMDB_API_KEY || '6d123e4a3cbda6ef1240c5f7c3dc9cb8';
        const searchEndpoint = `https://api.themoviedb.org/3/search/${type}?api_key=${tmdbApiKey}&query=${encodeURIComponent(query)}`;
        const searchRes = await fetch(searchEndpoint, { signal: AbortSignal.timeout(5000) });
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.results && searchData.results.length > 0) {
            resolvedTmdbId = String(searchData.results[0].id);
          }
        }
      } catch (e) {
        console.warn('[OpenSubtitles Route] TMDB query search failed:', e);
      }
    }

    // 1. Resolve IMDb ID if missing
    if (!imdbId && resolvedTmdbId) {
      imdbId = await getImdbIdFromTmdb(resolvedTmdbId, type);
    }

    const results: any[] = [];
    const seenLinks = new Set<string>();

    // 2. Fetch from OpenSubtitles REST API
    if (imdbId) {
      const numericImdbId = imdbId.replace(/^tt/, '');
      if (numericImdbId) {
        let searchUrl = '';
        const langParam = lang && lang !== 'all' ? `/sublanguageid-${lang}` : '';
        if (type === 'tv') {
          searchUrl = `https://rest.opensubtitles.org/search/episode-${episode}/imdbid-${numericImdbId}/season-${season}${langParam}`;
        } else {
          searchUrl = `https://rest.opensubtitles.org/search/imdbid-${numericImdbId}${langParam}`;
        }

        try {
          const res = await fetch(searchUrl, {
            headers: {
              'User-Agent': 'TemporaryUserAgent',
              'Accept': 'application/json',
            },
            signal: AbortSignal.timeout(8000),
          });

          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
              for (const item of data) {
                const dlLink = item.SubDownloadLink;
                if (!dlLink || seenLinks.has(dlLink)) continue;
                seenLinks.add(dlLink);

                const langName = item.LanguageName || item.SubLanguageID || 'English';
                const release = item.InfoReleaseGroup || item.MovieReleaseName || '';
                const cleanRelease = release ? ` - ${release.replace(/[\[\]]/g, '').trim()}` : '';
                const label = `${langName}${cleanRelease ? ` (${cleanRelease.slice(0, 24).trim()})` : ''}`;

                results.push({
                  id: item.IDSubtitleFile || item.IDSubtitle || `sub-${results.length}`,
                  url: dlLink,
                  label: label,
                  language: (item.ISO639 || item.SubLanguageID || 'en').substring(0, 2).toLowerCase(),
                  isDefault: results.length === 0 && (item.ISO639 === 'en' || item.SubLanguageID === 'eng'),
                  downloads: parseInt(item.SubDownloadsCnt || '0') || 0,
                  rating: parseFloat(item.SubRating || '0') || 0,
                  format: item.SubFormat || 'srt',
                });
              }
            }
          }
        } catch (e) {
          console.warn('[OpenSubtitles API] Error querying rest.opensubtitles.org:', e);
        }
      }
    }

    // Sort: English first, then by download count
    results.sort((a, b) => {
      const aIsEng = a.language === 'en';
      const bIsEng = b.language === 'en';
      if (aIsEng && !bIsEng) return -1;
      if (!aIsEng && bIsEng) return 1;
      return (b.downloads || 0) - (a.downloads || 0);
    });

    // Mark the top English subtitle as default
    let hasDefault = false;
    for (const sub of results) {
      if (!hasDefault && sub.language === 'en') {
        sub.isDefault = true;
        hasDefault = true;
      } else if (hasDefault) {
        sub.isDefault = false;
      }
    }

    return NextResponse.json({
      success: true,
      subtitles: results,
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err: any) {
    console.error('[OpenSubtitles API Route] Error:', err);
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
