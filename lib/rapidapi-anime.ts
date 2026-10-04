export interface CrunchyrollAnimeItem {
  title: string;
  type?: string;
  description?: string;
  release_year?: number;
  age_certification?: string;
  runtime?: number;
  genres?: string[];
  production_countries?: string[];
  seasons?: number;
  imdb_id?: string;
  imdb_score?: number;
  tmdb_popularity?: number;
  tmdb_score?: number;
}

export interface CrunchyrollTopResponse {
  items: CrunchyrollAnimeItem[];
  page?: number;
  total_pages?: number;
  total_items?: number;
}

/**
 * Fetch top anime list from RapidAPI Crunchyroll endpoint (with optional pagination & title search)
 */
export async function fetchCrunchyrollTopAnime(params?: {
  page?: number;
  name?: string;
}): Promise<CrunchyrollTopResponse | null> {
  try {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.name) searchParams.set('name', params.name);

    const qs = searchParams.toString();
    const endpoint = `/api/anime-api/rapidapi/top${qs ? `?${qs}` : ''}`;
    const res = await fetch(endpoint);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('[rapidapi-anime] fetchCrunchyrollTopAnime error:', err);
    return null;
  }
}

/**
 * Fetch a random anime recommendation from RapidAPI Crunchyroll endpoint
 */
export async function fetchCrunchyrollRandomAnime(): Promise<CrunchyrollAnimeItem | null> {
  try {
    const res = await fetch('/api/anime-api/rapidapi/random');
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('[rapidapi-anime] fetchCrunchyrollRandomAnime error:', err);
    return null;
  }
}
