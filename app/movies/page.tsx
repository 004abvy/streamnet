'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar/Navbar';
import PosterGrid from '../../components/PosterGrid/PosterGrid';
import Pagination from '../../components/Pagination/Pagination';
import Footer from '../../components/Footer/Footer';
import styles from './movies.module.css';

const GENRES = [
  { id: '', name: 'All Genres' },
  { id: '28', name: 'Action' },
  { id: '35', name: 'Comedy' },
  { id: '18', name: 'Drama' },
  { id: '878', name: 'Sci-Fi' },
  { id: '27', name: 'Horror' },
  { id: '53', name: 'Thriller' },
  { id: '10749', name: 'Romance' },
  { id: '16', name: 'Animation' },
  { id: '80', name: 'Crime' },
];

function MoviesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const filterParam = searchParams.get('filter') || 'popular';
  const genreParam = searchParams.get('genre') || '';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  const [movies, setMovies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';

    let url = `${backendUrl}/api/movies/discover?page=${pageParam}&filter=${filterParam}`;
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
    router.push(`/movies${queryString ? `?${queryString}` : ''}`);
  };

  const getPageInfo = () => {
    if (filterParam === '4k') {
      return {
        title: '4K Ultra HD Movies',
        subtitle: 'Experience cinema-quality visual clarity with our curated 4K Ultra HD movie selection.'
      };
    }
    if (filterParam === 'top_rated') {
      return {
        title: 'Top Rated Movies',
        subtitle: 'The highest-rated feature films according to global audiences.'
      };
    }
    if (filterParam === 'upcoming') {
      return {
        title: 'Upcoming Movies',
        subtitle: 'Get ready for upcoming releases hitting cinemas and streaming services soon.'
      };
    }
    if (filterParam === 'now_playing') {
      return {
        title: 'Now Playing',
        subtitle: 'Discover movies currently playing in theaters and available to stream.'
      };
    }
    const currentGenreObj = GENRES.find((g) => g.id === genreParam);
    if (currentGenreObj && currentGenreObj.id) {
      return {
        title: `${currentGenreObj.name} Movies`,
        subtitle: `Explore top ${currentGenreObj.name.toLowerCase()} movies available now.`
      };
    }
    return {
      title: 'Trending & Popular Movies',
      subtitle: "Stay on the pulse of what's hot in the movie scene worldwide."
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
              className={`${styles.filterBtn} ${filterParam === '4k' ? styles.activeFilterBtn : ''}`}
              onClick={() => updateQueryParams('4k', '')}
            >
              <span style={{ background: '#fff', color: '#000', padding: '1px 4px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800 }}>4K</span>
              4K Movies
            </button>
            <button
              className={`${styles.filterBtn} ${filterParam === 'upcoming' ? styles.activeFilterBtn : ''}`}
              onClick={() => updateQueryParams('upcoming', '')}
            >
              Upcoming
            </button>
            <button
              className={`${styles.filterBtn} ${filterParam === 'now_playing' ? styles.activeFilterBtn : ''}`}
              onClick={() => updateQueryParams('now_playing', '')}
            >
              Now Playing
            </button>
          </div>
        </div>

        {/* Genre Tabs Bar */}
        <div className={styles.genreNav}>
          {GENRES.map((g) => (
            <button
              key={g.id}
              className={`${styles.genreTab} ${genreParam === g.id ? styles.activeGenreTab : ''}`}
              onClick={() => updateQueryParams(filterParam === '4k' ? '4k' : 'popular', g.id)}
            >
              {g.name}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading Movies...</div>
      ) : movies.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#aaa' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>No movies found for this filter or genre.</p>
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
          <PosterGrid title="" movies={movies} />
          <Pagination
            currentPage={pageParam}
            totalPages={totalPages}
            onPageChange={(p) => updateQueryParams(undefined, undefined, p)}
          />
        </>
      )}
    </div>
  );
}

export default function MoviesPage() {
  return (
    <main className={styles.container}>
      <Navbar />
      <Suspense fallback={<div className={styles.loading}>Loading Movies...</div>}>
        <MoviesContent />
      </Suspense>
      <Footer />
    </main>
  );
}
