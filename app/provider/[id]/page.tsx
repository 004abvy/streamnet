'use client';

import { use, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '../../../components/Navbar/Navbar';
import PosterGrid from '../../../components/PosterGrid/PosterGrid';
import Pagination from '../../../components/Pagination/Pagination';
import styles from './provider.module.css';

export default function ProviderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const type = searchParams.get('type') || 'movie';
  const providerName = searchParams.get('name') || 'Provider';
  
  // Safely parse page param
  const initialPage = parseInt(searchParams.get('page') || '1', 10);
  const [currentPage, setCurrentPage] = useState(isNaN(initialPage) ? 1 : initialPage);
  
  const [content, setContent] = useState<any[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    
    const fetchContent = async () => {
      setLoading(true);
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
        const res = await fetch(`${backendUrl}/api/discover/provider/${id}?type=${type}&page=${currentPage}`);
        const data = await res.json();
        
        if (data.results) {
          const contentWithMediaType = data.results.map((item: any) => ({
            ...item,
            media_type: type
          }));
          setContent(contentWithMediaType);
          // TMDB limits pagination to 500 pages max
          setTotalPages(Math.min(data.total_pages || 1, 500));
        }
      } catch (err) {
        console.error("Failed to fetch provider content", err);
      } finally {
        setLoading(false);
        // Scroll to top when page changes
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    fetchContent();
  }, [id, type, currentPage]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    router.push(`/provider/${id}?type=${type}&name=${encodeURIComponent(providerName)}&page=${newPage}`);
  };

  const title = `All ${type === 'tv' ? 'TV Shows' : 'Movies'} from ${providerName}`;

  return (
    <main className={styles.main}>
      <Navbar />
      
      <div className={styles.container}>
        <div className={styles.header}>
          <button onClick={() => router.back()} className={styles.backBtn}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back
          </button>
          <h1 className={styles.title}>{title}</h1>
        </div>

        {loading ? (
          <div className={styles.loading}>Loading content...</div>
        ) : content.length > 0 ? (
          <>
            {/* The PosterGrid natively adapts to multiple rows */}
            <PosterGrid title="" movies={content} />
            <Pagination 
              currentPage={currentPage} 
              totalPages={totalPages} 
              onPageChange={handlePageChange} 
            />
          </>
        ) : (
          <div className={styles.loading}>No content found.</div>
        )}
      </div>
    </main>
  );
}
