export interface MediaItem {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  poster_path?: string;
  backdrop_path?: string;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  media_type?: string;
  release_date?: string;
  first_air_date?: string;
  overview?: string;
  original_language?: string;
}

/**
 * Intelligent Recommendation Engine:
 * Filters and ranks "You May Also Like" items by rating, genre match, franchise keywords,
 * and TMDB collaborative recommendations.
 */
export function getRelevantRecommendations(
  currentItem: any,
  limit: number = 12
): any[] {
  if (!currentItem) return [];

  const rawRecs: any[] = currentItem.recommendations?.results || [];
  const rawSimilar: any[] = currentItem.similar?.results || [];

  // Current item attributes
  const currentId = currentItem.id;
  const currentGenres: number[] = Array.isArray(currentItem.genres)
    ? currentItem.genres.map((g: any) => (typeof g === 'number' ? g : g.id))
    : Array.isArray(currentItem.genre_ids)
      ? currentItem.genre_ids
      : [];

  const currentTitle = (currentItem.title || currentItem.name || '').toLowerCase();
  const currentWords = currentTitle
    .replace(/[^\w\s]/gi, '')
    .split(/\s+/)
    .filter((w: string) => w.length > 2);

  const currentLang = currentItem.original_language;
  const currentRating = typeof currentItem.vote_average === 'number' ? currentItem.vote_average : 7.0;

  // Deduplicate and score candidates
  const seenIds = new Set<number>();
  seenIds.add(currentId);

  interface ScoredCandidate {
    item: any;
    score: number;
  }

  const scoredCandidates: ScoredCandidate[] = [];

  const processCandidate = (cand: any, isFromRecommendations: boolean) => {
    if (!cand || !cand.id || seenIds.has(cand.id)) return;
    if (!cand.poster_path) return; // Must have valid poster

    seenIds.add(cand.id);

    const candRating = typeof cand.vote_average === 'number' ? cand.vote_average : 0;
    const candVoteCount = typeof cand.vote_count === 'number' ? cand.vote_count : 0;
    const candPop = typeof cand.popularity === 'number' ? cand.popularity : 0;

    // Filter out very poor ratings if vote count is present
    if (candVoteCount > 5 && candRating < 4.8) return;

    let score = 0;

    // 1. TMDB Recommendations boost (User viewing behavior)
    if (isFromRecommendations) {
      score += 15;
    } else {
      score += 5;
    }

    // 2. High rating boost (reward well-rated titles, proportional to source item)
    if (candRating >= 7.5) {
      score += candRating * 2.5;
    } else if (candRating >= 6.0) {
      score += candRating * 1.8;
    } else {
      score += candRating * 1.0;
    }

    // Proximity to current movie's rating
    const ratingDiff = Math.abs(currentRating - candRating);
    if (ratingDiff <= 1.0) {
      score += 6;
    }

    // 3. Genre matching (Critical for relevance)
    const candGenres: number[] = Array.isArray(cand.genre_ids)
      ? cand.genre_ids
      : Array.isArray(cand.genres)
        ? cand.genres.map((g: any) => (typeof g === 'number' ? g : g.id))
        : [];

    if (currentGenres.length > 0 && candGenres.length > 0) {
      let matchingGenres = 0;
      for (const gId of candGenres) {
        if (currentGenres.includes(gId)) {
          matchingGenres++;
        }
      }
      // Each matching genre gives a big boost
      score += matchingGenres * 8;
    }

    // 4. Franchise / Keyword match in Title (e.g. Spider-Man, Avengers, Doraemon)
    const candTitle = (cand.title || cand.name || '').toLowerCase();
    for (const word of currentWords) {
      if (['the', 'and', 'for', 'with', 'movie', 'show', 'part'].includes(word)) continue;
      if (candTitle.includes(word)) {
        score += 25; // Massive boost for direct franchise/series titles
      }
    }

    // 5. Language / Cultural match (e.g. Japanese anime with Japanese anime)
    if (currentLang && cand.original_language === currentLang) {
      score += 8;
    }

    // 6. Popularity & Vote Count trustworthiness (avoids obscure broken entries)
    if (candVoteCount >= 50) {
      score += 8;
    } else if (candVoteCount >= 10) {
      score += 4;
    }
    score += Math.min(candPop * 0.05, 10);

    scoredCandidates.push({
      item: {
        ...cand,
        media_type: cand.media_type || (cand.name && !cand.title ? 'tv' : 'movie')
      },
      score
    });
  };

  // Process recommendations first, then similar
  rawRecs.forEach((item) => processCandidate(item, true));
  rawSimilar.forEach((item) => processCandidate(item, false));

  // Sort descending by calculated score
  scoredCandidates.sort((a, b) => b.score - a.score);

  return scoredCandidates.slice(0, limit).map((c) => c.item);
}
