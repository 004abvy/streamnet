'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar/Navbar';
import PosterGrid from '../../components/PosterGrid/PosterGrid';
import Pagination from '../../components/Pagination/Pagination';
import Footer from '../../components/Footer/Footer';
import styles from './anime.module.css';

const GENRES = [
  { id: '', name: 'All Genres' },
  { id: 'wishlist', name: 'Wishlist ♡' },
  { id: '10759', name: 'Action & Adventure' },
  { id: '35', name: 'Comedy' },
  { id: '18', name: 'Drama' },
  { id: '10765', name: 'Sci-Fi & Fantasy' },
  { id: '9648', name: 'Mystery' },
];

function AnimeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const filterParam = searchParams.get('filter') || 'popular';
  const genreParam = searchParams.get('genre') || '';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  const [shows, setShows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [wishlistShows, setWishlistShows] = useState<any[]>([]);

  // Load wishlist from localStorage
  useEffect(() => {
    const loadWishlist = () => {
      try {
        const saved = localStorage.getItem('saved_items');
        const parsed = saved ? JSON.parse(saved) : [];
        if (Array.isArray(parsed)) {
          const animeOnly = parsed.filter(
            (item: any) => item.original_language === 'ja' || item.genre_ids?.includes(16)
          );
          setWishlistShows(animeOnly);
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

    let url = `/api/anime?page=${pageParam}&filter=${filterParam}`;
    if (genreParam) {
      url += `&genre=${genreParam}`;
    }

    fetch(url)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted) return;
        if (data && data.results) {
          setShows(data.results.map((item: any) => ({ ...item, media_type: 'tv' })));
          setTotalPages(Math.min(data.total_pages || 1, 500));
        } else {
          setShows([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Failed to fetch anime:", err);
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
    router.push(`/anime${queryString ? `?${queryString}` : ''}`);
  };

  const getPageInfo = () => {
    if (genreParam === 'wishlist') {
      return {
        title: 'My Wishlist Anime',
        subtitle: 'Your bookmarked anime series saved for easy access.'
      };
    }
    if (filterParam === 'top_rated') {
      return {
        title: 'Top Rated Anime',
        subtitle: 'The highest-rated anime series according to global fans.'
      };
    }
    if (filterParam === 'on_the_air') {
      return {
        title: 'Currently Airing Anime',
        subtitle: 'Anime series currently broadcasting new episodes this season.'
      };
    }
    if (filterParam === 'upcoming') {
      return {
        title: 'Upcoming Anime',
        subtitle: 'Highly anticipated upcoming anime releases coming soon.'
      };
    }
    const currentGenreObj = GENRES.find((g) => g.id === genreParam);
    if (currentGenreObj && currentGenreObj.id) {
      return {
        title: `${currentGenreObj.name} Anime`,
        subtitle: `Explore popular ${currentGenreObj.name.toLowerCase()} anime series.`
      };
    }
    return {
      title: 'Popular Anime',
      subtitle: 'Discover and stream the most popular anime series, Japanese animation, and fan favorites.'
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
              className={`${styles.filterBtn} ${filterParam === 'popular' && !genreParam ? styles.activeFilterBtn : ''}`}
              onClick={() => updateQueryParams('popular', '')}
            >
              Popular
            </button>
            <button
              className={`${styles.filterBtn} ${filterParam === 'top_rated' ? styles.activeFilterBtn : ''}`}
              onClick={() => updateQueryParams('top_rated', '')}
            >
              Top Rated
            </button>
            <button
              className={`${styles.filterBtn} ${filterParam === 'on_the_air' ? styles.activeFilterBtn : ''}`}
              onClick={() => updateQueryParams('on_the_air', '')}
            >
              Currently Airing
            </button>
            <button
              className={`${styles.filterBtn} ${filterParam === 'upcoming' ? styles.activeFilterBtn : ''}`}
              onClick={() => updateQueryParams('upcoming', '')}
            >
              Upcoming
            </button>
          </div>
        </div>

        {/* Genre Tabs Bar */}
        <div className={styles.genreNav}>
          {GENRES.map((g) => (
            <button
              key={g.id}
              className={`${styles.genreTab} ${genreParam === g.id ? styles.activeGenreTab : ''}`}
              onClick={() => updateQueryParams(filterParam === 'popular' ? 'popular' : filterParam, g.id)}
            >
              {g.name}
            </button>
          ))}
        </div>
      </div>

      {activeShows.length === 0 && !loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#aaa' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
            {genreParam === 'wishlist'
              ? 'Your Wishlist is empty. Bookmark anime series to see them here!'
              : 'No anime found for this filter or genre.'}
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

export default function AnimePage() {
  return (
    <main className={styles.container}>
      <Navbar />
      <Suspense fallback={<div className={styles.loading}>Loading Anime...</div>}>
        <AnimeContent />
      </Suspense>
      <Footer />
    </main>
  );
}
