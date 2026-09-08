'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar/Navbar';
import PosterGrid from '../../components/PosterGrid/PosterGrid';
import Pagination from '../../components/Pagination/Pagination';
import Footer from '../../components/Footer/Footer';
import styles from './anime.module.css';

function AnimeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  const [shows, setShows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';

    fetch(`${backendUrl}/api/anime?page=${pageParam}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.results) {
          setShows(data.results);
          setTotalPages(Math.min(data.total_pages || 1, 500));
        } else {
          setShows([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Failed to fetch anime:", err);
        setShows([]);
        setLoading(false);
      });
  }, [pageParam]);

  const handlePageChange = (newPage: number) => {
    router.push(`/anime?page=${newPage}`);
  };

  return (
    <div className={styles.content}>
      <div style={{ maxWidth: '1550px', margin: '0 auto', padding: '0 1.5rem 1.5rem 1.5rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#fff' }}>
          Popular Anime
        </h1>
        <p style={{ color: '#888', fontSize: '1rem', margin: 0 }}>
          Explore trending Japanese anime series and feature films.
        </p>
      </div>

      {shows.length === 0 && !loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#aaa' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>No anime found for this filter or genre.</p>
        </div>
      ) : (
        <>
          <PosterGrid title="" movies={shows} isLoading={loading} />
          {!loading && totalPages > 1 && (
            <Pagination
              currentPage={pageParam}
              totalPages={totalPages}
              onPageChange={handlePageChange}
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
