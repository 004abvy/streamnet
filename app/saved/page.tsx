'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar/Navbar';
import PosterGrid from '../../components/PosterGrid/PosterGrid';
import Footer from '../../components/Footer/Footer';
import { useAuth } from '../../context/AuthContext';
import { saveWatchlist } from '../../utils/userStorage';
import styles from './saved.module.css';

interface SavedItem {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string;
  backdrop_path?: string;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  media_type?: string;
  genre_ids?: number[];
  overview?: string;
}

const MOVIE_GENRES: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  18: 'Drama', 27: 'Horror', 10749: 'Romance', 878: 'Sci-Fi', 53: 'Thriller'
};

const TV_GENRES: Record<number, string> = {
  10759: 'Action & Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  18: 'Drama', 10765: 'Sci-Fi & Fantasy', 9648: 'Mystery', 10762: 'Kids'
};

const MOVIE_GENRE_TABS = Object.entries(MOVIE_GENRES).map(([id, name]) => ({ id: Number(id), name }));
const TV_GENRE_TABS = Object.entries(TV_GENRES).map(([id, name]) => ({ id: Number(id), name }));

export default function SavedPage() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [contentType, setContentType] = useState<'all' | 'movie' | 'tv'>('all');
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'rating' | 'title'>('newest');

  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const loadSavedItems = () => {
      try {
        const saved = localStorage.getItem('saved_items');
        const parsed = saved ? JSON.parse(saved) : [];
        if (Array.isArray(parsed)) setItems(parsed);
      } catch (error) {
        console.error('Failed to load saved items', error);
      }
    };

    loadSavedItems();
    window.addEventListener('storage', loadSavedItems);
    return () => window.removeEventListener('storage', loadSavedItems);
  }, []);

  useEffect(() => {
    if (user?.saved_items && Array.isArray(user.saved_items)) {
      setItems(user.saved_items);
    }
  }, [user?.saved_items]);

  const clearAll = () => {
    if (confirm('Are you sure you want to clear your saved collection?')) {
      setItems([]);
      saveWatchlist([]);
    }
  };

  // Counts
  const movieCount = useMemo(() => {
    return items.filter(item => !(item.media_type === 'tv' || (item.name && !item.title))).length;
  }, [items]);

  const tvCount = useMemo(() => {
    return items.filter(item => item.media_type === 'tv' || (item.name && !item.title)).length;
  }, [items]);

  const activeGenres = contentType === 'tv' ? TV_GENRE_TABS : MOVIE_GENRE_TABS;

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const isSeries = item.media_type === 'tv' || Boolean(item.name && !item.title);

      // Type filter
      if (contentType === 'movie' && isSeries) return false;
      if (contentType === 'tv' && !isSeries) return false;

      // Genre filter
      if (selectedGenre !== null && !item.genre_ids?.includes(selectedGenre)) return false;

      // Search query
      if (searchQuery.trim()) {
        const title = (item.title || item.name || '').toLowerCase();
        if (!title.includes(searchQuery.toLowerCase().trim())) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'rating') {
        return (b.vote_average || 0) - (a.vote_average || 0);
      }
      if (sortBy === 'title') {
        const titleA = (a.title || a.name || '').toLowerCase();
        const titleB = (b.title || b.name || '').toLowerCase();
        return titleA.localeCompare(titleB);
      }
      return 0;
    });
  }, [items, contentType, selectedGenre, searchQuery, sortBy]);

  if (loading || !user) {
    return (
      <main className={styles.container}>
        <Navbar />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          Loading...
        </div>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <Navbar />

      <div className={styles.ambientGlow} />

      <div className={styles.content}>
        {/* Header Section */}
        <div className={styles.headerSection}>
          <div className={styles.headerTop}>
            <div className={styles.headerTitleGroup}>
              <h1 className={styles.pageTitle}>Saved</h1>
              <p className={styles.subtitle}>
                {items.length === 0
                  ? "Titles you bookmark will show up here."
                  : `${items.length} ${items.length === 1 ? 'title' : 'titles'} you've bookmarked to watch later.`}
              </p>
            </div>

            {items.length > 0 && (
              <button onClick={clearAll} className={styles.clearBtn} title="Clear collection">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Clear All
              </button>
            )}
          </div>

          {items.length > 0 && (
            <>
              {/* Toolbar: Search, Type Switcher & Sort */}
              <div className={styles.toolbar}>
                <div className={styles.typeTabs}>
                  <button
                    className={`${styles.typeTab} ${contentType === 'all' ? styles.activeTypeTab : ''}`}
                    onClick={() => { setContentType('all'); setSelectedGenre(null); }}
                  >
                    All ({items.length})
                  </button>
                  <button
                    className={`${styles.typeTab} ${contentType === 'movie' ? styles.activeTypeTab : ''}`}
                    onClick={() => { setContentType('movie'); setSelectedGenre(null); }}
                  >
                    Movies ({movieCount})
                  </button>
                  <button
                    className={`${styles.typeTab} ${contentType === 'tv' ? styles.activeTypeTab : ''}`}
                    onClick={() => { setContentType('tv'); setSelectedGenre(null); }}
                  >
                    Series ({tvCount})
                  </button>
                </div>

                <div className={styles.searchAndSort}>
                  <div className={styles.searchBox}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search saved..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button className={styles.clearSearchBtn} onClick={() => setSearchQuery('')}>✕</button>
                    )}
                  </div>

                  <div className={styles.sortWrapper}>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as 'newest' | 'rating' | 'title')}
                      className={styles.sortSelect}
                    >
                      <option value="newest">Recently Saved</option>
                      <option value="rating">Highest Rating</option>
                      <option value="title">Title (A-Z)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Genre Filter Tabs */}
              <div className={styles.genreNav}>
                <button
                  className={`${styles.genreTab} ${selectedGenre === null ? styles.activeGenreTab : ''}`}
                  onClick={() => setSelectedGenre(null)}
                >
                  All Genres
                </button>
                {activeGenres.map((genre) => (
                  <button
                    key={genre.id}
                    className={`${styles.genreTab} ${selectedGenre === genre.id ? styles.activeGenreTab : ''}`}
                    onClick={() => setSelectedGenre(genre.id)}
                  >
                    {genre.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {loading ? (
          <PosterGrid title="" movies={[]} isLoading={true} />
        ) : items.length === 0 ? (
          <div className={styles.emptyContainer}>
            <div className={styles.emptyIconWrapper}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h2 className={styles.emptyTitle}>Your watchlist is empty</h2>
            <p className={styles.emptyDesc}>
              Explore movies and TV shows to bookmark your favorite titles and watch them anytime.
            </p>
            <div className={styles.emptyActions}>
              <Link href="/movies" className={styles.primaryBtn}>
                Browse Movies
              </Link>
              <Link href="/tv" className={styles.secondaryBtn}>
                Explore Series
              </Link>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className={styles.noFilterResults}>
            <p>No saved titles match your selected filters.</p>
            <button
              onClick={() => {
                setContentType('all');
                setSelectedGenre(null);
                setSearchQuery('');
              }}
              className={styles.resetFilterBtn}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <PosterGrid title="" movies={filteredItems} />
        )}
      </div>

      <Footer />
    </main>
  );
}
