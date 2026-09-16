'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PosterGrid from '../../components/PosterGrid/PosterGrid';
import Pagination from '../../components/Pagination/Pagination';
import Footer from '../../components/Footer/Footer';
import styles from './tv.module.css';

const INITIAL_GENRES = [
  { id: '', name: 'All Genres', poster: 'https://image.tmdb.org/t/p/w780/ggFHVNu6YYI5L9pCfOacjizRGt.jpg' },
  { id: '10759', name: 'Action', poster: 'https://image.tmdb.org/t/p/w780/2OMB0ynKlyIenMJWI2Dy9IWT4c.jpg' },
  { id: '35', name: 'Comedy', poster: 'https://image.tmdb.org/t/p/w780/hGhWE5hufwMsqMzELbK7p47DFeu.jpg' },
  { id: '27', name: 'Horror', poster: 'https://image.tmdb.org/t/p/w780/uKvVjHNqB5VmOrdxqAt2V7JMr8P.jpg' },
  { id: '10765', name: 'Sci-Fi', poster: 'https://image.tmdb.org/t/p/w780/49WJfeN0moxb9IPfGn8AIqMGskD.jpg' },
  { id: '10749', name: 'Romance', poster: 'https://image.tmdb.org/t/p/w780/9PFonQ921jhuTMqq2esxIRnegeP.jpg' },
];

function TvContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const filterParam = searchParams.get('filter') || 'popular';
  const genreParam = searchParams.get('genre') || '';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  const [shows, setShows] = useState<any[]>([]);
  const [genreList, setGenreList] = useState(INITIAL_GENRES);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [wishlistShows, setWishlistShows] = useState<any[]>([]);

  // Fetch live TMDB trending posters for TV genre cards with strict uniqueness
  useEffect(() => {
    let isMounted = true;
    const fetchTvGenrePosters = async () => {
      try {
        const updated = INITIAL_GENRES.map((g) => ({ ...g }));
        const usedPaths = new Set<string>();

        const promises = INITIAL_GENRES.map((g) => {
          if (!g.id) {
            return fetch('/api/tv/trending').then((r) => r.json()).catch(() => null);
          }
          return fetch(`/api/discover?type=tv&genreId=${g.id}&sortBy=popularity.desc`).then((r) => r.json()).catch(() => null);
        });

        const results = await Promise.all(promises);

        for (let i = 0; i < updated.length; i++) {
          const res = results[i];
          if (res && res.results && res.results.length > 0) {
            const item = res.results.find((show: any) => {
              const path = show.backdrop_path || show.poster_path;
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
        }
      } catch (err) {
        console.error('Failed to fetch live TV genre posters:', err);
      }
    };

    fetchTvGenrePosters();
    return () => { isMounted = false; };
  }, []);

  // Load wishlist from localStorage
  useEffect(() => {
    const loadWishlist = () => {
      try {
        const saved = localStorage.getItem('saved_items');
        const parsed = saved ? JSON.parse(saved) : [];
        if (Array.isArray(parsed)) {
          const tvOnly = parsed.filter(
            (item: any) => item.media_type === 'tv' || Boolean(item.name && !item.title)
          );
          setWishlistShows(tvOnly);
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
      setShows(wishlistShows);
      setTotalPages(1);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';

    let url = `/api/tv/discover?page=${pageParam}&filter=${filterParam}`;
    if (genreParam) {
      url += `&genre=${genreParam}`;
    }

    fetch(url)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted) return;
        if (data && data.results && Array.isArray(data.results)) {
          setShows(data.results);
          setTotalPages(Math.min(data.total_pages || 1, 500));
        } else {
          setShows([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Failed to fetch tv shows:", err);
        if (isMounted) {
          setShows([]);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [filterParam, genreParam, pageParam, wishlistShows]);

  const updateQueryParams = (newFilter?: string, newGenre?: string, newPage?: number) => {
    const filter = newFilter !== undefined ? newFilter : filterParam;
    const genre = newGenre !== undefined ? newGenre : genreParam;
    const page = newPage !== undefined ? newPage : 1;

    const params = new URLSearchParams();
    if (filter && filter !== 'popular') params.set('filter', filter);
    if (genre) params.set('genre', genre);
    if (page > 1) params.set('page', page.toString());

    const queryString = params.toString();
    router.push(`/tv${queryString ? `?${queryString}` : ''}`);
  };

  const getPageInfo = () => {
    if (genreParam === 'wishlist') {
      return {
        title: 'My Wishlist Series',
        subtitle: 'Your bookmarked TV series saved for easy access and viewing.'
      };
    }

    const currentGenreObj = INITIAL_GENRES.find((g) => g.id === genreParam);
    const genreName = currentGenreObj && currentGenreObj.id ? currentGenreObj.name : '';

    let filterLabel = 'Popular';
    if (filterParam === 'top_rated') filterLabel = 'Top Rated';
    else if (filterParam === 'on_the_air') filterLabel = 'On The Air';
    else if (filterParam === 'airing_today') filterLabel = 'Airing Today';

    if (genreName && filterParam && filterParam !== 'popular') {
      return {
        title: `${filterLabel} ${genreName} Series`,
        subtitle: `Discover ${filterLabel.toLowerCase()} ${genreName.toLowerCase()} TV shows available to stream now.`
      };
    } else if (genreName) {
      return {
        title: `${genreName} Series`,
        subtitle: `Explore top ${genreName.toLowerCase()} TV shows available now.`
      };
    } else if (filterParam === 'top_rated') {
      return {
        title: 'Top Rated TV Shows',
        subtitle: 'Critically acclaimed series and top-rated television shows.'
      };
    } else if (filterParam === 'on_the_air') {
      return {
        title: 'On The Air TV Shows',
        subtitle: 'Series currently airing new episodes this season.'
      };
    } else if (filterParam === 'airing_today') {
      return {
        title: 'Airing Today TV Shows',
        subtitle: 'TV shows with brand new episodes airing today.'
      };
    }

    return {
      title: 'Popular TV Shows',
      subtitle: 'Binge-worthy series, trending drama, comedy, and fan favorites.'
    };
  };

  const pageInfo = getPageInfo();
  const activeShows = genreParam === 'wishlist' ? wishlistShows : shows;

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
              className={`${styles.filterBtn} ${filterParam === 'on_the_air' ? styles.activeFilterBtn : ''}`}
              onClick={() => updateQueryParams('on_the_air', undefined)}
            >
              On The Air
            </button>
            <button
              className={`${styles.filterBtn} ${filterParam === 'airing_today' ? styles.activeFilterBtn : ''}`}
              onClick={() => updateQueryParams('airing_today', undefined)}
            >
              Airing Today
            </button>
          </div>
        </div>

        {/* Widescreen Cinematic Genre Cards Hub */}
        <div className={styles.genreCardsRow}>
          {genreList.map((g) => (
            <button
              key={g.id}
              type="button"
              className={`${styles.genreCard} ${genreParam === g.id ? styles.activeGenreCard : ''}`}
              onClick={() => updateQueryParams(undefined, g.id)}
            >
              <img
                src={g.poster}
                alt={g.name}
                className={styles.genreCardImg}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src = 'https://image.tmdb.org/t/p/w780/ggFHVNu6YYI5L9pCfOacjizRGt.jpg';
                }}
              />
              <div className={styles.genreCardOverlay} />
              <div className={styles.genreCardContent}>
                <span className={styles.genreCardName}>{g.name}</span>
                <span className={styles.genreCardDot} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {activeShows.length === 0 && !loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#aaa' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
            {genreParam === 'wishlist'
              ? 'Your Wishlist is empty. Bookmark series to see them here!'
              : 'No TV shows found for this filter or genre.'}
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
          <PosterGrid title="" movies={activeShows} isLoading={loading} />
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

export default function TvPage() {
  return (
    <main className={styles.container}>
      <Suspense fallback={<div className={styles.loading}>Loading TV Shows...</div>}>
        <TvContent />
      </Suspense>
      <Footer />
    </main>
  );
}
