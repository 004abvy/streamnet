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

let hasAnimatedIntro = false;

interface HomeDataCache {
  trendingMovies: HomeMediaItem[];
  trendingTv: HomeMediaItem[];
  upcomingMovies: HomeMediaItem[];
  upcomingTv: HomeMediaItem[];
}

let memoryHomeCache: HomeDataCache | null = null;

function ScrollToTopButton() {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setShowScrollTop(window.scrollY > 400);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
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
  );
}

export default function Home() {
  const { user } = useAuth();
  const [trendingMovies, setTrendingMovies] = useState<HomeMediaItem[]>([]);
  const [trendingTv, setTrendingTv] = useState<HomeMediaItem[]>([]);
  const [upcomingMovies, setUpcomingMovies] = useState<HomeMediaItem[]>([]);
  const [upcomingTv, setUpcomingTv] = useState<HomeMediaItem[]>([]);
  const [continueWatching, setContinueWatching] = useState<HomeMediaItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasAnimated, setHasAnimated] = useState<boolean>(false);

  useEffect(() => {
    // Hydrate cached data immediately on client mount without causing SSR mismatch
    if (memoryHomeCache?.trendingMovies?.length) {
      setTrendingMovies(memoryHomeCache.trendingMovies);
      setTrendingTv(memoryHomeCache.trendingTv || []);
      setUpcomingMovies(memoryHomeCache.upcomingMovies || []);
      setUpcomingTv(memoryHomeCache.upcomingTv || []);
      setLoading(false);
    } else {
      try {
        const stored = sessionStorage.getItem('home_data_cache');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.trendingMovies?.length) {
            memoryHomeCache = parsed;
            setTrendingMovies(parsed.trendingMovies);
            setTrendingTv(parsed.trendingTv || []);
            setUpcomingMovies(parsed.upcomingMovies || []);
            setUpcomingTv(parsed.upcomingTv || []);
            setLoading(false);
          }
        }
      } catch {}
    }

    if (hasAnimatedIntro) {
      setHasAnimated(true);
    } else {
      try {
        if (sessionStorage.getItem('home_has_animated') === 'true') {
          hasAnimatedIntro = true;
          setHasAnimated(true);
        }
      } catch {}
    }
  }, []);

  useEffect(() => {
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
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 8000);

    Promise.all([
      fetch(`/api/movies/trending`, { signal: controller.signal }).then(res => res.ok ? res.json() : null),
      fetch(`/api/tv/trending`, { signal: controller.signal }).then(res => res.ok ? res.json() : null),
      fetch(`/api/movies/upcoming`, { signal: controller.signal }).then(res => res.ok ? res.json() : null),
      fetch(`/api/tv/upcoming`, { signal: controller.signal }).then(res => res.ok ? res.json() : null)
    ])
      .then(([moviesData, tvData, upMoviesData, upTvData]) => {
        let sortedMovies = memoryHomeCache?.trendingMovies || [];
        let sortedTv = memoryHomeCache?.trendingTv || [];
        let sortedUpMovies = memoryHomeCache?.upcomingMovies || [];
        let sortedUpTv = memoryHomeCache?.upcomingTv || [];

        if (moviesData?.results) {
          sortedMovies = [...moviesData.results].sort((a, b) => {
            const aUp = isUpcomingMedia(a) ? 1 : 0;
            const bUp = isUpcomingMedia(b) ? 1 : 0;
            return aUp - bUp;
          });
          setTrendingMovies(sortedMovies);
        }
        if (tvData?.results) {
          sortedTv = [...tvData.results].sort((a, b) => {
            const aUp = isUpcomingMedia(a) ? 1 : 0;
            const bUp = isUpcomingMedia(b) ? 1 : 0;
            return aUp - bUp;
          });
          setTrendingTv(sortedTv);
        }
        if (upMoviesData?.results) {
          const onlyUpcoming = upMoviesData.results.filter((m: any) => isUpcomingMedia(m));
          sortedUpMovies = onlyUpcoming.length > 0 ? onlyUpcoming : upMoviesData.results;
          setUpcomingMovies(sortedUpMovies);
        }
        if (upTvData?.results) {
          const onlyUpcoming = upTvData.results.filter((t: any) => isUpcomingMedia(t));
          sortedUpTv = onlyUpcoming.length > 0 ? onlyUpcoming : upTvData.results;
          setUpcomingTv(sortedUpTv);
        }

        memoryHomeCache = {
          trendingMovies: sortedMovies,
          trendingTv: sortedTv,
          upcomingMovies: sortedUpMovies,
          upcomingTv: sortedUpTv,
        };

        try {
          sessionStorage.setItem('home_data_cache', JSON.stringify(memoryHomeCache));
        } catch {}
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

  const contentSections = (
    <>
      <ProvidersSection />

      {continueWatching.length > 0 && !loading && (
        <PosterCarousel
          title="Continue Watching"
          movies={continueWatching}
          viewAllLink="/continue-watching"
          onClear={handleClearContinueWatching}
          onRemoveItem={handleRemoveContinueWatchingItem}
        />
      )}

      <GenreExplorerSection />
      <TrendingSection title="Trending Movies" items={trendingMovies} viewAllLink="/movies" isLoading={loading} />
      <TrendingSection title="Trending Series" items={trendingTv} viewAllLink="/tv" isLoading={loading} />
      <TrendingSection title="Upcoming Movies" items={upcomingMovies} viewAllLink="/movies?filter=upcoming" isLoading={loading} />
      <TrendingSection title="Upcoming Series" items={upcomingTv} viewAllLink="/tv?filter=upcoming" isLoading={loading} />
    </>
  );

  return (
    <main className={styles.main}>
      <HeroCarousel movies={trendingMovies} isLoading={loading} />

      {hasAnimated ? (
        <div style={{ marginTop: '2rem', position: 'relative', zIndex: 10 }}>
          {contentSections}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          onAnimationComplete={() => {
            hasAnimatedIntro = true;
            try {
              sessionStorage.setItem('home_has_animated', 'true');
            } catch {}
            setHasAnimated(true);
          }}
          style={{ marginTop: '2rem', position: 'relative', zIndex: 10 }}
        >
          {contentSections}
        </motion.div>
      )}

      <Footer />
      
      <ScrollToTopButton />
    </main>
  );
}
