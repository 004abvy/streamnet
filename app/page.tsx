'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import HeroCarousel from '../components/HeroCarousel/HeroCarousel';
import PosterCarousel from '../components/PosterCarousel/PosterCarousel';
import TrendingSection from '../components/TrendingSection/TrendingSection';
import ProvidersSection from '../components/ProvidersSection/ProvidersSection';
import GenreExplorerSection from '../components/GenreExplorerSection/GenreExplorerSection';
import Footer from '../components/Footer/Footer';
import { ArrowUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { saveContinueWatching, isUpcomingMedia, enrichContinueWatchingPosters } from '../utils/userStorage';
import { motion } from 'framer-motion';
import styles from './page.module.css';

interface HomeMediaItem {
  id: number;
  title: string;
  name?: string;
  poster_path: string;
  backdrop_path: string;
  overview: string;
  vote_average: number;
  release_date: string;
  first_air_date?: string;
  media_type?: string;
}

export default function Home() {
  const { user } = useAuth();
  const [trendingMovies, setTrendingMovies] = useState<HomeMediaItem[]>([]);
  const [trendingTv, setTrendingTv] = useState<HomeMediaItem[]>([]);
  const [continueWatching, setContinueWatching] = useState<HomeMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Force scroll to top on page refresh
    if (typeof window !== 'undefined') {
      window.history.scrollRestoration = 'manual';
      window.scrollTo(0, 0);
    }

    const loadContinueWatching = () => {
      try {
        const stored = localStorage.getItem('continueWatching');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setContinueWatching(parsed);
        }
      } catch (e) {
        console.error("Failed to load continue watching from local storage", e);
      }
    };

    loadContinueWatching();
    enrichContinueWatchingPosters();

    window.addEventListener('focus', loadContinueWatching);
    window.addEventListener('popstate', loadContinueWatching);
    window.addEventListener('storage', loadContinueWatching);

    return () => {
      window.removeEventListener('focus', loadContinueWatching);
      window.removeEventListener('popstate', loadContinueWatching);
      window.removeEventListener('storage', loadContinueWatching);
    };
  }, []);

  useEffect(() => {
    if (user?.continueWatching && Array.isArray(user.continueWatching)) {
      setContinueWatching(user.continueWatching);
    }
  }, [user?.continueWatching]);

  const handleClearContinueWatching = () => {
    if (confirm('Clear all continue watching history?')) {
      saveContinueWatching([]);
      setContinueWatching([]);
    }
  };

  const handleRemoveContinueWatchingItem = (id: number) => {
    const updated = continueWatching.filter((item) => item.id !== id);
    setContinueWatching(updated);
    saveContinueWatching(updated);
  };

  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 8000);

    Promise.all([
      fetch(`/api/movies/trending`, { signal: controller.signal }).then(res => res.ok ? res.json() : null),
      fetch(`/api/tv/trending`, { signal: controller.signal }).then(res => res.ok ? res.json() : null)
    ])
      .then(([moviesData, tvData]) => {
        if (moviesData?.results) {
          const sorted = [...moviesData.results].sort((a, b) => {
            const aUp = isUpcomingMedia(a) ? 1 : 0;
            const bUp = isUpcomingMedia(b) ? 1 : 0;
            return aUp - bUp;
          });
          setTrendingMovies(sorted);
        }
        if (tvData?.results) {
          const sorted = [...tvData.results].sort((a, b) => {
            const aUp = isUpcomingMedia(a) ? 1 : 0;
            const bUp = isUpcomingMedia(b) ? 1 : 0;
            return aUp - bUp;
          });
          setTrendingTv(sorted);
        }
      })
      .catch(err => {
        if (err?.name !== 'AbortError') {
          console.warn("Failed to fetch data:", err);
        }
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
        setLoading(false);
      });

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  }, [loading]);

  return (
    <main className={styles.main}>
      <HeroCarousel movies={trendingMovies} isLoading={loading} />

      <div style={{ marginTop: '2rem', position: 'relative', zIndex: 10 }}>
        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true, margin: '-50px' }} 
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <ProvidersSection />
        </motion.div>

        {continueWatching.length > 0 && !loading && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: true, margin: '-50px' }} 
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
          >
            <PosterCarousel
              title="Continue Watching"
              movies={continueWatching}
              viewAllLink="/continue-watching"
              onClear={handleClearContinueWatching}
              onRemoveItem={handleRemoveContinueWatchingItem}
            />
          </motion.div>
        )}

        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true, margin: '-50px' }} 
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
        >
          <GenreExplorerSection />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true, margin: '-50px' }} 
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.3 }}
        >
          <TrendingSection title="Trending Movies" items={trendingMovies} viewAllLink="/movies" isLoading={loading} />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true, margin: '-50px' }} 
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.4 }}
        >
          <TrendingSection title="Trending Series" items={trendingTv} viewAllLink="/tv" isLoading={loading} />
        </motion.div>
      </div>

      <Footer />
      
      {/* Sleek Floating Scroll to Top Button */}
      {mounted && typeof document !== 'undefined' && createPortal(
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className={styles.scrollTopBtn}
          aria-label="Scroll to top"
          title="Scroll to top"
          style={{
            opacity: showScrollTop ? 1 : 0,
            pointerEvents: showScrollTop ? 'auto' : 'none',
            transform: showScrollTop ? 'translateY(0)' : 'translateY(16px)',
          }}
        >
          <ArrowUp size={18} strokeWidth={2.5} />
        </button>,
        document.body
      )}
    </main>
  );
}
