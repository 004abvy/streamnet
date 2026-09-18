'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PosterGrid from '../../components/PosterGrid/PosterGrid';
import Pagination from '../../components/Pagination/Pagination';
import Footer from '../../components/Footer/Footer';
import styles from './anime.module.css';

const INITIAL_GENRES = [
  { id: '', name: 'All Genres', poster: 'https://image.tmdb.org/t/p/w780/vChB4vCoS3I4v3O7aK2O1U2e2s8.jpg' },
  { id: '10759', name: 'Action', poster: 'https://image.tmdb.org/t/p/w780/vChB4vCoS3I4v3O7aK2O1U2e2s8.jpg' },
  { id: '35', name: 'Comedy', poster: 'https://image.tmdb.org/t/p/w780/m98R4G4u7C1x7B280f55xH9sM83.jpg' },
  { id: '10765', name: 'Fantasy', poster: 'https://image.tmdb.org/t/p/w780/49WJfeN0moxb9IPfGn8AIqMGskD.jpg' },
  { id: '878', name: 'Sci-Fi', poster: 'https://image.tmdb.org/t/p/w780/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg' },
  { id: '10749', name: 'Romance', poster: 'https://image.tmdb.org/t/p/w780/9PFonQ921jhuTMqq2esxIRnegeP.jpg' },
];

function AnimeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const filterParam = searchParams.get('filter') || 'popular';
  const genreParam = searchParams.get('genre') || '';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  const [shows, setShows] = useState<any[]>([]);
  const [genreList, setGenreList] = useState(INITIAL_GENRES);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Fetch live TMDB trending posters for Anime genre cards with strict uniqueness
  useEffect(() => {
    let isMounted = true;
    const fetchAnimeGenrePosters = async () => {
      try {
        const updated = INITIAL_GENRES.map((g) => ({ ...g }));
        const usedPaths = new Set<string>();

        const promises = INITIAL_GENRES.map((g) => {
          const endpoint = g.id ? `/api/anime?genre=${g.id}&filter=popular` : '/api/anime?filter=popular';
          return fetch(endpoint).then((r) => r.json()).catch(() => null);
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
        console.error('Failed to fetch live anime genre posters:', err);
      }
    };

    fetchAnimeGenrePosters();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const fetchData = async () => {
      try {
        let url = `/api/anime?page=${pageParam}&filter=${filterParam}`;
        if (genreParam) {
          url += `&genre=${genreParam}`;
        }

        const res = await fetch(url);
        const data = await res.json();

        if (isMounted) {
          if (data && data.results) {
            const results = data.results.map((item: any) => ({ ...item, media_type: 'tv' }));
            setShows(results);
            setTotalPages(Math.min(data.total_pages || 1, 500));
          } else {
            setShows([]);
          }
          setLoading(false);
        }
      } catch (err) {
        console.warn("Failed to fetch TMDB anime:", err);
        if (isMounted) {
          setShows([]);
          setLoading(false);
        }
      }
    };

    fetchData();

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
    router.push(`/anime${queryString ? `?${queryString}` : ''}`);
  };

  const getPageInfo = () => {
    const currentGenreObj = INITIAL_GENRES.find((g) => g.id === genreParam);
    const genreName = currentGenreObj && currentGenreObj.id ? currentGenreObj.name : '';

    let filterLabel = 'Popular';
    if (filterParam === 'top_rated') filterLabel = 'Top Rated';
    else if (filterParam === 'on_the_air') filterLabel = 'Currently Airing';
    else if (filterParam === 'upcoming') filterLabel = 'Upcoming';
    else if (filterParam === '4k') filterLabel = '4K Ultra HD';

    if (genreName && filterParam && filterParam !== 'popular') {
      return {
        title: `${filterLabel} ${genreName} Anime`,
        subtitle: `Discover ${filterLabel.toLowerCase()} ${genreName.toLowerCase()} anime series available to stream.`
      };
    } else if (genreName) {
      return {
        title: `${genreName} Anime`,
        subtitle: `Explore top ${genreName.toLowerCase()} anime series available now.`
      };
    } else if (filterParam === 'top_rated') {
      return { title: 'Top Rated Anime', subtitle: 'The highest-rated Japanese animation series of all time.' };
    } else if (filterParam === 'on_the_air') {
      return { title: 'Currently Airing Anime', subtitle: 'Catch up with the latest airing anime episodes this season.' };
    } else if (filterParam === 'upcoming') {
      return { title: 'Upcoming Anime', subtitle: 'Upcoming releases and new seasons coming soon.' };
    } else if (filterParam === '4k') {
      return { title: '4K Ultra HD Anime', subtitle: 'Experience anime with cinema-quality high definition visuals.' };
    }

    return { title: 'Trending & Popular Anime', subtitle: 'Discover and stream the most popular anime series worldwide.' };
  };

  const handleGenreCardClick = (gId: string) => {
    if (genreParam === gId) {
      updateQueryParams(undefined, '');
    } else {
      updateQueryParams(undefined, gId);
    }
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
              4K Anime
            </button>
            <button
              className={`${styles.filterBtn} ${filterParam === 'on_the_air' ? styles.activeFilterBtn : ''}`}
              onClick={() => updateQueryParams('on_the_air', undefined)}
            >
              Now Airing
            </button>
            <button
              className={`${styles.filterBtn} ${filterParam === 'upcoming' ? styles.activeFilterBtn : ''}`}
              onClick={() => updateQueryParams('upcoming', undefined)}
            >
              Upcoming
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
              onClick={() => handleGenreCardClick(g.id)}
            >
              <img
                src={g.poster}
                alt={g.name}
                className={styles.genreCardImg}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src = 'https://image.tmdb.org/t/p/w780/vChB4vCoS3I4v3O7aK2O1U2e2s8.jpg';
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

      {shows.length === 0 && !loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#aaa' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>No anime found for this filter or genre.</p>
          <button
            onClick={() => updateQueryParams('popular', '', 1)}
            style={{
              padding: '0.6rem 1.5rem',
              borderRadius: '999px',
              border: 'none',
              background: '#ffffff',
              color: '#000',
              fontWeight: 700,
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
            <div style={{ marginTop: '2rem' }}>
              <Pagination
                page={pageParam}
                totalPages={totalPages}
                onPageChange={(p) => updateQueryParams(undefined, undefined, p)}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function AnimePage() {
  return (
    <main className={styles.container}>
      <Suspense fallback={<div className={styles.loading}>Loading Anime...</div>}>
        <AnimeContent />
      </Suspense>
      <Footer />
    </main>
  );
}
