'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar/Navbar';
import PosterGrid from '../../components/PosterGrid/PosterGrid';
import Pagination from '../../components/Pagination/Pagination';
import Footer from '../../components/Footer/Footer';
import styles from './tv.module.css';

const GENRES = [
  { id: '', name: 'All Genres' },
  { id: '10759', name: 'Action & Adventure' },
  { id: '35', name: 'Comedy' },
  { id: '18', name: 'Drama' },
  { id: '10765', name: 'Sci-Fi & Fantasy' },
  { id: '80', name: 'Crime' },
  { id: '9648', name: 'Mystery' },
  { id: '16', name: 'Animation' },
  { id: '10762', name: 'Kids' },
];

function TvContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const filterParam = searchParams.get('filter') || 'popular';
  const genreParam = searchParams.get('genre') || '';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  const [shows, setShows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';

    let url = `${backendUrl}/api/tv/discover?page=${pageParam}&filter=${filterParam}`;
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
  }, [filterParam, genreParam, pageParam]);

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
    if (filterParam === 'top_rated') {
      return {
        title: 'Top Rated TV Shows',
        subtitle: 'Critically acclaimed series and top-rated television shows.'
      };
    }
    if (filterParam === 'on_the_air') {
      return {
        title: 'On The Air',
        subtitle: 'Series currently airing new episodes this season.'
      };
    }
    if (filterParam === 'airing_today') {
      return {
        title: 'Airing Today',
        subtitle: 'TV shows with brand new episodes airing today.'
      };
    }
    const currentGenreObj = GENRES.find((g) => g.id === genreParam);
    if (currentGenreObj && currentGenreObj.id) {
      return {
        title: `${currentGenreObj.name} Series`,
        subtitle: `Explore popular ${currentGenreObj.name.toLowerCase()} TV shows.`
      };
    }
    return {
      title: 'Popular TV Shows',
      subtitle: 'Binge-worthy series, trending drama, comedy, and fan favorites.'
    };
  };

  const pageInfo = getPageInfo();

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
              On The Air
            </button>
            <button
              className={`${styles.filterBtn} ${filterParam === 'airing_today' ? styles.activeFilterBtn : ''}`}
              onClick={() => updateQueryParams('airing_today', '')}
            >
              Airing Today
            </button>
          </div>
        </div>

        {/* Genre Tabs Bar */}
        <div className={styles.genreNav}>
          {GENRES.map((g) => (
            <button
              key={g.id}
              className={`${styles.genreTab} ${genreParam === g.id ? styles.activeGenreTab : ''}`}
              onClick={() => updateQueryParams('popular', g.id)}
            >
              {g.name}
            </button>
          ))}
        </div>
      </div>

      {shows.length === 0 && !loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#aaa' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>No TV shows found for this filter or genre.</p>
          <button
            onClick={() => updateQueryParams('popular', '', 1)}
            style={{
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <>
          <PosterGrid title="" movies={shows} isLoading={loading} />
          {!loading && totalPages > 1 && (
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
      <Navbar />
      <Suspense fallback={<div className={styles.loading}>Loading TV Shows...</div>}>
        <TvContent />
      </Suspense>
      <Footer />
    </main>
  );
}
