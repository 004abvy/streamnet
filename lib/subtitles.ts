export interface SubtitleItem {
  url: string;
  label: string;
  language?: string;
  format: string;
}

const TMDB_API_KEY = process.env.TMDB_API_KEY || 'a4e8c9bd39aadd7d67d8f0736c7a882a';

/**
 * Resolve IMDb ID from TMDB ID for movies or TV shows
 */
export async function getImdbIdFromTmdb(
  tmdbId: string,
  mediaType: 'movie' | 'tv'
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/${mediaType}/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.imdb_id || null;
  } catch {
    return null;
  }
}

/**
 * Fetch English subtitles from OpenSubtitles REST API as a reliable fallback
 */
export async function fetchOpenSubtitles(
  imdbId: string,
  mediaType: 'movie' | 'tv',
  season?: string,
  episode?: string
): Promise<SubtitleItem[]> {
  try {
    const numericImdbId = imdbId.replace(/^tt/, '');
    if (!numericImdbId) return [];

    let searchUrl = '';
    if (mediaType === 'tv' && season && episode) {
      searchUrl = `https://rest.opensubtitles.org/search/episode-${episode}/imdbid-${numericImdbId}/season-${season}/sublanguageid-eng`;
    } else {
      searchUrl = `https://rest.opensubtitles.org/search/imdbid-${numericImdbId}/sublanguageid-eng`;
    }

    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'TemporaryUserAgent',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return [];

    // Filter valid downloads and pick top 2-3 highest rated / best matches
    const results: SubtitleItem[] = [];
    const seenLinks = new Set<string>();

    for (const item of data) {
      const link = item.SubDownloadLink;
      if (!link || seenLinks.has(link)) continue;
      seenLinks.add(link);

      const label = item.MovieName
        ? `English (${item.SubFileName?.slice(-25) || 'OpenSubtitles'})`
        : 'English';

      results.push({
        url: link,
        label: results.length === 0 ? 'English (CC)' : `English #${results.length + 1}`,
        language: 'en',
        format: 'vtt',
      });

      if (results.length >= 3) break;
    }

    return results;
  } catch (err) {
    console.warn('[fetchOpenSubtitles] Error:', err);
    return [];
  }
}
