'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import HeroCarousel from '../components/HeroCarousel/HeroCarousel';
import PosterCarousel from '../components/PosterCarousel/PosterCarousel';
import TrendingSection from '../components/TrendingSection/TrendingSection';
import ProvidersSection from '../components/ProvidersSection/ProvidersSection';
import GenreExplorerSection from '../components/GenreExplorerSection/GenreExplorerSection';
import Footer from '../components/Footer/Footer';
import SlingButton from '../components/reactbits/SlingButton';
import { useAuth } from '../context/AuthContext';
import { saveContinueWatching } from '../utils/userStorage';
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
        if (moviesData?.results) setTrendingMovies(moviesData.results);
        if (tvData?.results) setTrendingTv(tvData.results);
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
      
      {/* Scroll to Top Sling Button (Rendered via Portal to escape Framer Motion transforms) */}
      {mounted && typeof document !== 'undefined' && createPortal(
        <div 
          style={{
            position: 'fixed',
            bottom: '15%',
            right: '2rem',
            zIndex: 99999, // Guaranteed to be on top of everything
            opacity: showScrollTop ? 1 : 0,
            pointerEvents: showScrollTop ? 'auto' : 'none',
            transform: showScrollTop ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.3s ease-out'
          }}
        >
          <SlingButton
            onSend={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            padColor="#f5f5f5"
            iconColor="#18181b"
            accentColor="#f5f5f5"
            wellColor="#27272a"
            bandColor="#f59e0b"
            size={56}
            strokeWidth={3}
            armAt={48}
            maxPull={160}
            launchSpeed={2600}
            recoil={0.2}
            flight={120}
            particles={14}
            spread={60}
            axis="vertical"
            tapSends
            disabled={!showScrollTop}
          />
        </div>,
        document.body
      )}
    </main>
  );
}
