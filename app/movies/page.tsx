'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PosterGrid from '../../components/PosterGrid/PosterGrid';
import Pagination from '../../components/Pagination/Pagination';
import Footer from '../../components/Footer/Footer';
import styles from './movies.module.css';

const INITIAL_GENRES = [
  { id: '', name: 'All Genres', poster: 'https://image.tmdb.org/t/p/w780/or06FN3Dka5tukK1e9sl16pB3iy.jpg' },
  { id: '28', name: 'Action', poster: 'https://image.tmdb.org/t/p/w780/2OMB0ynKlyIenMJWI2Dy9IWT4c.jpg' },
  { id: '35', name: 'Comedy', poster: 'https://image.tmdb.org/t/p/w780/hGhWE5hufwMsqMzELbK7p47DFeu.jpg' },
  { id: '27', name: 'Horror', poster: 'https://image.tmdb.org/t/p/w780/uKvVjHNqB5VmOrdxqAt2V7JMr8P.jpg' },
  { id: '878', name: 'Sci-Fi', poster: 'https://image.tmdb.org/t/p/w780/49WJfeN0moxb9IPfGn8AIqMGskD.jpg' },
  { id: '10749', name: 'Romance', poster: 'https://image.tmdb.org/t/p/w780/9PFonQ921jhuTMqq2esxIRnegeP.jpg' },
];

function MoviesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const filterParam = searchParams.get('filter') || 'popular';
  const genreParam = searchParams.get('genre') || '';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  const [movies, setMovies] = useState<any[]>([]);
  const [genreList, setGenreList] = useState(INITIAL_GENRES);
  const [loadingGenres, setLoadingGenres] = useState(true);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [wishlistMovies, setWishlistMovies] = useState<any[]>([]);

  // Fetch live TMDB trending posters for genre cards with strict uniqueness
  useEffect(() => {
    let isMounted = true;
    const fetchGenrePosters = async () => {
      try {
        const updated = INITIAL_GENRES.map((g) => ({ ...g }));
        const usedPaths = new Set<string>();

        const promises = INITIAL_GENRES.map((g) => {
          if (!g.id) {
            return fetch('/api/movies/trending').then((r) => r.json()).catch(() => null);
          }
          return fetch(`/api/discover?type=movie&genreId=${g.id}&sortBy=popularity.desc`).then((r) => r.json()).catch(() => null);
        });

        const results = await Promise.all(promises);

        for (let i = 0; i < updated.length; i++) {
          const res = results[i];
          if (res && res.results && res.results.length > 0) {
            const item = res.results.find((m: any) => {
              const path = m.backdrop_path || m.poster_path;
              return path && !usedPaths.has(path);
            });
            if (item) {
              const path = item.backdrop_path || item.poster_path;
              usedPaths.add(path);
              updated[i].poster = `https://image.tmdb.org/t/p/w780${path}`;
            }
          }
        }

        if (isMounted) {
          setGenreList(updated);
          setLoadingGenres(false);
        }
      } catch (err) {
        console.error('Failed to fetch live genre posters:', err);
        if (isMounted) setLoadingGenres(false);
      }
    };

    fetchGenrePosters();
    return () => { isMounted = false; };
  }, []);

  // Load wishlist from localStorage
  useEffect(() => {
    const loadWishlist = () => {
      try {
        const saved = localStorage.getItem('saved_items');
        const parsed = saved ? JSON.parse(saved) : [];
        if (Array.isArray(parsed)) {
          const moviesOnly = parsed.filter(
            (item: any) => !(item.media_type === 'tv' || Boolean(item.name && !item.title))
          );
          setWishlistMovies(moviesOnly);
        }
      } catch (e) {
        console.error("Failed to load wishlist", e);
      }
    };

    loadWishlist();
    window.addEventListener('storage', loadWishlist);
    return () => window.removeEventListener('storage', loadWishlist);
  }, []);

  useEffect(() => {
    if (genreParam === 'wishlist') {
      setMovies(wishlistMovies);
      setTotalPages(1);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';

    let url = `/api/movies/discover?page=${pageParam}&filter=${filterParam}`;
    if (genreParam) {
      url += `&genre=${genreParam}`;
    }

    fetch(url)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted) return;
        if (data && data.results && Array.isArray(data.results)) {
          setMovies(data.results);
          setTotalPages(Math.min(data.total_pages || 1, 500));
        } else {
          setMovies([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Failed to fetch movies:", err);
        if (isMounted) {
          setMovies([]);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [filterParam, genreParam, pageParam, wishlistMovies]);

  const updateQueryParams = (newFilter?: string, newGenre?: string, newPage?: number) => {
    const filter = newFilter !== undefined ? newFilter : filterParam;
    const genre = newGenre !== undefined ? newGenre : genreParam;
    const page = newPage !== undefined ? newPage : 1;

    const params = new URLSearchParams();
    if (filter && filter !== 'popular') params.set('filter', filter);
    if (genre) params.set('genre', genre);
    if (page > 1) params.set('page', page.toString());

    const queryString = params.toString();
    router.push(`/movies${queryString ? `?${queryString}` : ''}`);
  };

  const getPageInfo = () => {
    if (genreParam === 'wishlist') {
      return {
        title: 'My Wishlist Movies',
        subtitle: 'Your bookmarked movies saved for easy access and viewing.'
      };
    }

    const currentGenreObj = INITIAL_GENRES.find((g) => g.id === genreParam);
    const genreName = currentGenreObj && currentGenreObj.id ? currentGenreObj.name : '';

    let filterLabel = 'Popular';
    if (filterParam === '4k') filterLabel = '4K Ultra HD';
    else if (filterParam === 'top_rated') filterLabel = 'Top Rated';
    else if (filterParam === 'upcoming') filterLabel = 'Upcoming';
    else if (filterParam === 'now_playing') filterLabel = 'Now Playing';

    if (genreName && filterParam && filterParam !== 'popular') {
      return {
        title: `${filterLabel} ${genreName} Movies`,
        subtitle: `Discover ${filterLabel.toLowerCase()} ${genreName.toLowerCase()} movies available to stream now.`
      };
    } else if (genreName) {
      return {
        title: `${genreName} Movies`,
        subtitle: `Explore top ${genreName.toLowerCase()} movies available now.`
      };
    } else if (filterParam === '4k') {
      return {
        title: '4K Ultra HD Movies',
        subtitle: 'Experience cinema-quality visual clarity with our curated 4K Ultra HD movie selection.'
      };
    } else if (filterParam === 'top_rated') {
      return {
        title: 'Top Rated Movies',
        subtitle: 'The highest-rated feature films according to global audiences.'
      };
    } else if (filterParam === 'upcoming') {
      return {
        title: 'Upcoming Movies',
        subtitle: 'Get ready for upcoming releases hitting cinemas and streaming services soon.'
      };
    } else if (filterParam === 'now_playing') {
      return {
        title: 'Now Playing Movies',
        subtitle: 'Discover movies currently playing in theaters and available to stream.'
      };
    }

    return {
      title: 'Trending & Popular Movies',
      subtitle: "Stay on the pulse of what's hot in the movie scene worldwide."
    };
  };

  const handleGenreCardClick = (gId: string) => {
    if (genreParam === gId) {
      updateQueryParams(undefined, '');
    } else {
      updateQueryParams(undefined, gId);
    }
  };

  const pageInfo = getPageInfo();
  const activeMovies = genreParam === 'wishlist' ? wishlistMovies : movies;

  return (
    <div className={styles.content}>
      <div className={styles.headerSection}>
        <h1 className={styles.pageTitle}>{pageInfo.title}</h1>
        <p className={styles.pageSubtitle}>{pageInfo.subtitle}</p>

        {/* Filter Pills Bar */}
        <div className={styles.filterRow}>
          <div className={styles.filterPills}>
            <button
              className={`${styles.filterBtn} ${filterParam === 'popular' ? styles.activeFilterBtn : ''}`}
              onClick={() => updateQueryParams('popular', undefined)}
            >
              Popular
            </button>
            <button
              className={`${styles.filterBtn} ${filterParam === 'top_rated' ? styles.activeFilterBtn : ''}`}
              onClick={() => updateQueryParams('top_rated', undefined)}
            >
              Top Rated
            </button>
            <button
              className={`${styles.filterBtn} ${filterParam === '4k' ? styles.activeFilterBtn : ''}`}
              onClick={() => updateQueryParams('4k', undefined)}
            >
              <span style={{ background: '#fff', color: '#000', padding: '1px 4px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800 }}>4K</span>
              4K Movies
            </button>
            <button
              className={`${styles.filterBtn} ${filterParam === 'upcoming' ? styles.activeFilterBtn : ''}`}
              onClick={() => updateQueryParams('upcoming', undefined)}
            >
              Upcoming
            </button>
            <button
              className={`${styles.filterBtn} ${filterParam === 'now_playing' ? styles.activeFilterBtn : ''}`}
              onClick={() => updateQueryParams('now_playing', undefined)}
            >
              Now Playing
            </button>
          </div>
        </div>

        {/* Widescreen Cinematic Genre Cards Hub */}
        <div className={styles.genreCardsRow}>
          {loadingGenres ? (
            INITIAL_GENRES.map((g, i) => (
              <div key={i} className={styles.genreCard} style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }} />
            ))
          ) : (
          genreList.map((g) => (
            <button
              key={g.id}
              type="button"
              className={`${styles.genreCard} ${genreParam === g.id ? styles.activeGenreCard : ''}`}
              onClick={() => handleGenreCardClick(g.id)}
            >
              <img
                src={g.poster}
                alt={g.name}
                className={styles.genreCardImg}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src = 'https://image.tmdb.org/t/p/w780/or06FN3Dka5tukK1e9sl16pB3iy.jpg';
                }}
              />
              <div className={styles.genreCardOverlay} />
              <div className={styles.genreCardContent}>
                <span className={styles.genreCardName}>{g.name}</span>
                <span className={styles.genreCardDot} />
              </div>
            </button>
          ))
          )}
        </div>
      </div>

      {activeMovies.length === 0 && !loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#aaa' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
            {genreParam === 'wishlist'
              ? 'Your Wishlist is empty. Bookmark movies to see them here!'
              : 'No movies found for this filter or genre.'}
          </p>
          <button
            onClick={() => updateQueryParams('popular', '', 1)}
            style={{
              background: '#f59e0b',
              color: '#000',
              border: 'none',
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <>
          <PosterGrid title="" movies={activeMovies} isLoading={loading} />
          {!loading && genreParam !== 'wishlist' && totalPages > 1 && (
            <Pagination
              currentPage={pageParam}
              totalPages={totalPages}
              onPageChange={(p) => updateQueryParams(undefined, undefined, p)}
            />
          )}
        </>
      )}
    </div>
  );
}

export default function MoviesPage() {
  return (
    <main className={styles.container}>
      <Suspense fallback={<div className={styles.loading}>Loading Movies...</div>}>
        <MoviesContent />
      </Suspense>
      <Footer />
    </main>
  );
}
