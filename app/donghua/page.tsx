'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PosterGrid from '../../components/PosterGrid/PosterGrid';
import Pagination from '../../components/Pagination/Pagination';
import Footer from '../../components/Footer/Footer';
import styles from '../anime/anime.module.css';

function DonghuaContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const filterParam = searchParams.get('filter') || 'popular';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  const [shows, setShows] = useState<any[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/donghua?page=${pageParam}&filter=${filterParam}`);
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
        console.warn("Failed to fetch TMDB donghua:", err);
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
  }, [filterParam, pageParam]);

  const updateQueryParams = (newFilter?: string, newPage?: number) => {
    const filter = newFilter !== undefined ? newFilter : filterParam;
    const page = newPage !== undefined ? newPage : 1;

    const params = new URLSearchParams();
    if (filter) params.set('filter', filter);
    if (page > 1) params.set('page', page.toString());

    const queryString = params.toString();
    router.push(`/donghua${queryString ? `?${queryString}` : ''}`);
  };

  return (
    <div className={styles.content}>
      <div className={styles.headerSection}>
        <h1 className={styles.pageTitle}>Donghua (Chinese Animation)</h1>
        <p className={styles.pageSubtitle}>Explore top-rated Chinese animated series, cultivation sagas, and martial arts donghua.</p>

        {/* Filter Pills Bar */}
        <div className={styles.filterRow}>
          <div className={styles.filterPills}>
            <button
              className={`${styles.filterBtn} ${filterParam === 'popular' ? styles.activeFilterBtn : ''}`}
              onClick={() => updateQueryParams('popular', 1)}
            >
              Popular
            </button>
            <button
              className={`${styles.filterBtn} ${filterParam === 'top_rated' ? styles.activeFilterBtn : ''}`}
              onClick={() => updateQueryParams('top_rated', 1)}
            >
              Top Rated
            </button>
          </div>
        </div>
      </div>

      {shows.length === 0 && !loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#aaa' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>No donghua found.</p>
        </div>
      ) : (
        <>
          <PosterGrid title="" movies={shows} isLoading={loading} />
          {!loading && totalPages > 1 && (
            <Pagination
              currentPage={pageParam}
              totalPages={totalPages}
              onPageChange={(p) => updateQueryParams(undefined, p)}
            />
          )}
        </>
      )}
    </div>
  );
}

export default function DonghuaPage() {
  return (
    <main className={styles.container}>
      <Suspense fallback={<div className={styles.loading}>Loading Donghua...</div>}>
        <DonghuaContent />
      </Suspense>
      <Footer />
    </main>
  );
}
