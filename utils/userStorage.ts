import { db, auth } from './firebase';
import { doc, setDoc } from 'firebase/firestore';

export interface ContinueWatchingItem {
  id: number | string;
  title?: string;
  name?: string;
  poster_path?: string;
  backdrop_path?: string;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  media_type?: 'movie' | 'tv' | 'anime' | string;
  genre_ids?: number[];
  genres?: any[];
  original_language?: string;
  origin_country?: string[];

  // Layer / Player info
  playerType?: 'standard' | 'vip' | 'anime';
  server?: string;
  directSource?: string;
  audioType?: 'sub' | 'dub' | 'hi' | 'en' | string;
  audioTrackLabel?: string;
  subtitleLabel?: string;

  // TV / Anime Episode info
  season?: number;
  episode?: number;
  last_season?: number;
  last_episode?: number;
  episodeId?: string;
  episodeTitle?: string;
  animeSource?: 'anivexa' | 'hianime' | 'aniwatch' | string;

  // Playback Progress & Duration
  currentTime?: number;
  duration?: number;
  progress?: number; // 0 - 100 percentage
  updatedAt?: number;
}

export function getUserDocKey(email?: string | null, uid?: string): string | null {
  if (uid) return uid;
  if (email && email.trim()) {
    return email.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '_');
  }
  return null;
}

export async function saveWatchlist(items: any[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('saved_items', JSON.stringify(items));
    localStorage.setItem('user_bookmarks', JSON.stringify(items.map((i: any) => i?.id).filter(Boolean)));
    window.dispatchEvent(new Event('storage'));

    const currentUser = auth.currentUser;
    const docKey = getUserDocKey(currentUser?.email, currentUser?.uid);
    if (docKey) {
      const userDocRef = doc(db, 'users', docKey);
      await setDoc(userDocRef, {
        saved_items: items,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
  } catch (e) {
    console.warn("saveWatchlist error:", e);
  }
}

export async function saveContinueWatching(items: any[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('continueWatching', JSON.stringify(items));
    window.dispatchEvent(new Event('storage'));

    const currentUser = auth.currentUser;
    const docKey = getUserDocKey(currentUser?.email, currentUser?.uid);
    if (docKey) {
      const userDocRef = doc(db, 'users', docKey);
      await setDoc(userDocRef, {
        continueWatching: items,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
  } catch (e) {
    console.warn("saveContinueWatching error:", e);
  }
}

/**
 * Returns a unique progress localStorage key for any media item, season, episode, or anime arc
 */
export function getProgressKey(
  id: string | number,
  type?: string,
  season?: number,
  episode?: number,
  episodeId?: string
): string {
  const cleanId = String(id).trim();
  const isTv = type === 'tv';
  const isAnime = type === 'anime' || cleanId.startsWith('anime_');

  if (isAnime) {
    if (episodeId) {
      return `streamnet_progress_anime_${cleanId}_${episodeId}`;
    }
    if (season || episode) {
      return `streamnet_progress_anime_${cleanId}_s${season || 1}_e${episode || 1}`;
    }
    return `streamnet_progress_anime_${cleanId}`;
  }

  if (isTv) {
    return `streamnet_progress_${cleanId}_s${season || 1}_e${episode || 1}`;
  }

  return `streamnet_progress_${cleanId}`;
}

/**
 * Reads saved progress in seconds for any video
 */
export function getSavedProgress(
  id: string | number,
  type?: string,
  season?: number,
  episode?: number,
  episodeId?: string
): number {
  if (typeof window === 'undefined' || !id) return 0;
  try {
    const primaryKey = getProgressKey(id, type, season, episode, episodeId);
    const saved = localStorage.getItem(primaryKey);
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }

    // Fallback: If TV episode, also check generic tmdb progress key
    if (type === 'tv') {
      const fallbackKey = `streamnet_progress_${id}`;
      const fallbackSaved = localStorage.getItem(fallbackKey);
      if (fallbackSaved) {
        const parsed = parseFloat(fallbackSaved);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    }

    // Fallback: Check continueWatching list
    const continueStored = localStorage.getItem('continueWatching');
    if (continueStored) {
      const list = JSON.parse(continueStored);
      if (Array.isArray(list)) {
        const cleanId = String(id);
        const match = list.find((item: any) => {
          if (String(item.id) !== cleanId) return false;
          if (type === 'tv' && (season || episode)) {
            const itemSeason = item.season || item.last_season || 1;
            const itemEpisode = item.episode || item.last_episode || 1;
            return itemSeason === (season || 1) && itemEpisode === (episode || 1);
          }
          if (episodeId && item.episodeId) {
            return item.episodeId === episodeId;
          }
          return true;
        });
        if (match && typeof match.currentTime === 'number' && match.currentTime > 0) {
          return match.currentTime;
        }
      }
    }
  } catch (e) {
    console.warn("getSavedProgress error:", e);
  }
  return 0;
}

/**
 * Clears saved watch progress for a finished episode or movie
 */
export function clearWatchProgress(
  id: string | number,
  type?: string,
  season?: number,
  episode?: number,
  episodeId?: string
): void {
  if (typeof window === 'undefined' || !id) return;
  try {
    const key = getProgressKey(id, type, season, episode, episodeId);
    localStorage.removeItem(key);
    localStorage.removeItem(`${key}_last_save`);
    if (!season && !episode) {
      localStorage.removeItem(`streamnet_progress_${id}`);
    }
  } catch {}
}

/**
 * Returns a reliable, high quality portrait poster URL for any media item
 */
export function getMediaPosterUrl(item: any): string {
  if (!item) return 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop';
  
  // Strictly prefer portrait posters over horizontal backdrops
  const rawPath =
    item.poster_path ||
    item.poster ||
    item.animeCover ||
    item.cover ||
    item.image;

  if (rawPath && typeof rawPath === 'string') {
    const trimmed = rawPath.trim();
    if (trimmed) {
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('//') || trimmed.startsWith('data:')) {
        return trimmed;
      }
      const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
      return `https://image.tmdb.org/t/p/w780${cleanPath}`;
    }
  }

  // Fallback only if no portrait poster exists
  const fallbackBackdrop = item.backdrop_path || item.backdrop;
  if (fallbackBackdrop && typeof fallbackBackdrop === 'string') {
    const trimmed = fallbackBackdrop.trim();
    if (trimmed) {
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('//') || trimmed.startsWith('data:')) {
        return trimmed;
      }
      const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
      return `https://image.tmdb.org/t/p/w780${cleanPath}`;
    }
  }

  return 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop';
}

/**
 * Automatically enriches continue watching items that are missing true portrait posters
 */
export async function enrichContinueWatchingPosters(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const stored = localStorage.getItem('continueWatching');
    if (!stored) return;
    const list = JSON.parse(stored);
    if (!Array.isArray(list) || list.length === 0) return;

    let modified = false;
    const updatedList = await Promise.all(
      list.map(async (item: any) => {
        if (!item || !item.id) return item;
        const hasGoodPoster = item.poster_path && typeof item.poster_path === 'string' && item.poster_path.length > 5 && item.poster_path !== item.backdrop_path;
        if (hasGoodPoster) return item;

        try {
          const isTv = item.media_type === 'tv' || (item.name && !item.title);
          const endpoint = isTv ? `/api/tv/${item.id}` : `/api/movies/${item.id}`;
          const res = await fetch(endpoint);
          if (!res.ok) return item;
          const data = await res.json();
          if (data?.poster_path) {
            modified = true;
            return {
              ...item,
              poster_path: data.poster_path,
              backdrop_path: data.backdrop_path || item.backdrop_path,
              title: data.title || data.name || item.title || item.name,
              name: data.name || data.title || item.name || item.title,
            };
          }
        } catch {}
        return item;
      })
    );

    if (modified) {
      saveContinueWatching(updatedList);
    }
  } catch {}
}

/**
 * Updates continue watching and exact progress for any movie, TV series, or anime
 */
let lastProgressSync = 0;
export function updateWatchProgress(item: Partial<ContinueWatchingItem>): void {
  if (typeof window === 'undefined' || !item.id) return;

  const now = Date.now();
  const idStr = String(item.id);
  const currentTime = item.currentTime ?? 0;
  const duration = item.duration ?? 0;
  const season = item.season || item.last_season || 1;
  const episode = item.episode || item.last_episode || 1;

  // 1. Save exact progress key in localStorage
  if (currentTime > 0) {
    const key = getProgressKey(item.id, item.media_type, season, episode, item.episodeId);
    try {
      localStorage.setItem(key, currentTime.toString());
      localStorage.setItem(`${key}_last_save`, currentTime.toString());
      localStorage.setItem(`streamnet_progress_${idStr}`, currentTime.toString());
    } catch {}
  }

  // 2. Throttle continueWatching array syncing to Firebase/storage (every 2 seconds)
  if (now - lastProgressSync < 1500) return;
  lastProgressSync = now;

  try {
    const stored = localStorage.getItem('continueWatching');
    let list: ContinueWatchingItem[] = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(list)) list = [];

    // Filter out previous entry of the same title
    const existingIndex = list.findIndex((m) => String(m.id) === idStr);
    const existing: Partial<ContinueWatchingItem> = existingIndex !== -1 ? list[existingIndex] : {};

    // Remove any undefined or null keys so they don't overwrite valid existing metadata (like poster_path)
    const cleanItem: Record<string, any> = {};
    for (const [k, v] of Object.entries(item)) {
      if (v !== undefined && v !== null && v !== '') {
        cleanItem[k] = v;
      }
    }

    // Strictly preserve portrait poster_path and never let backdrop overwrite it
    const posterPath =
      cleanItem.poster_path ||
      existing.poster_path ||
      cleanItem.poster ||
      (existing as any).poster ||
      undefined;

    const backdropPath = cleanItem.backdrop_path || existing.backdrop_path || undefined;
    const title = cleanItem.title || existing.title || cleanItem.name || existing.name || undefined;
    const name = cleanItem.name || existing.name || cleanItem.title || existing.title || undefined;
    const mediaType = cleanItem.media_type || existing.media_type || 'movie';

    const progressPct =
      duration > 0
        ? Math.min(100, Math.max(1, Math.round((currentTime / duration) * 100)))
        : existing.progress || 0;

    const mergedItem: ContinueWatchingItem = {
      ...existing,
      ...cleanItem,
      id: isNaN(Number(item.id)) ? item.id : Number(item.id),
      title,
      name,
      poster_path: posterPath,
      backdrop_path: backdropPath,
      media_type: mediaType,
      season: season,
      episode: episode,
      last_season: season,
      last_episode: episode,
      currentTime: currentTime > 0 ? currentTime : existing.currentTime || 0,
      duration: duration > 0 ? duration : existing.duration || 0,
      progress: progressPct,
      updatedAt: now,
    };

    const nextList = [mergedItem, ...list.filter((m) => String(m.id) !== idStr)];
    if (nextList.length > 30) nextList.pop();

    saveContinueWatching(nextList);
  } catch (e) {
    console.warn("updateWatchProgress error:", e);
  }
}

/**
 * Computes the exact resume URL to open the exact layer, player, season, episode, or anime arc
 */
export function getResumeHref(item: any): string {
  if (!item || !item.id) return '/';

  const isTV = item.media_type === 'tv' || Boolean(item.name && !item.title);
  const season = item.season || item.last_season || 1;
  const episode = item.episode || item.last_episode || 1;

  const isAnime =
    item.media_type === 'anime' ||
    item.playerType === 'anime' ||
    (Boolean(item.genres?.some((g: any) => g.id === 16 || g.name === 'Animation') || item.genre_ids?.includes(16)) &&
      (item.original_language === 'ja' || item.origin_country?.includes('JP')));

  // VIP Player layer
  if (item.playerType === 'vip') {
    return isTV
      ? `/watch/servers/${item.id}?type=tv&season=${season}&episode=${episode}`
      : `/watch/servers/${item.id}`;
  }

  // Anime Player layer
  if (isAnime) {
    const base = isTV ? `/tv/${item.id}` : `/movie/${item.id}`;
    const params = new URLSearchParams();
    params.set('playAnime', 'true');
    if (isTV) {
      params.set('season', String(season));
      params.set('episode', String(episode));
    }
    if (item.episodeId) {
      params.set('epId', item.episodeId);
    }
    return `${base}?${params.toString()}`;
  }

  // Standard TV Show
  if (isTV) {
    return `/watch/tv/${item.id}/${season}/${episode}`;
  }

  // Standard Movie
  return `/watch/${item.id}`;
}

/**
 * Checks if a movie or TV show is unreleased / upcoming.
 */
export function isUpcomingMedia(item: any): boolean {
  if (!item) return false;

  // 1. Explicit status check if provided by TMDB details
  if (item.status) {
    const unreleasedStatuses = ['Rumored', 'Planned', 'In Production', 'Post Production', 'Upcoming'];
    if (unreleasedStatuses.includes(item.status)) return true;
  }

  // 2. Check release_date / first_air_date against current date
  const dateStr = item.release_date || item.first_air_date;
  if (dateStr && typeof dateStr === 'string') {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const releaseDate = new Date(year, month, day);
      if (!isNaN(releaseDate.getTime())) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (releaseDate.getTime() > today.getTime()) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Returns a human-friendly formatted release date string for upcoming items.
 */
export function getFormattedReleaseDate(item: any): string {
  const dateStr = item?.release_date || item?.first_air_date;
  if (!dateStr) return 'Coming Soon';
  try {
    const parts = String(dateStr).split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    }
    return String(dateStr);
  } catch {
    return String(dateStr);
  }
}
