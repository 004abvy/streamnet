'use client';

import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar/Navbar';
import HeroCarousel from '../components/HeroCarousel/HeroCarousel';
import PosterCarousel from '../components/PosterCarousel/PosterCarousel';
import TrendingSection from '../components/TrendingSection/TrendingSection';
import ProvidersSection from '../components/ProvidersSection/ProvidersSection';
import GenreExplorerSection from '../components/GenreExplorerSection/GenreExplorerSection';
import Footer from '../components/Footer/Footer';
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
  const [trendingMovies, setTrendingMovies] = useState<HomeMediaItem[]>([]);
  const [trendingTv, setTrendingTv] = useState<HomeMediaItem[]>([]);
  const [continueWatching, setContinueWatching] = useState<HomeMediaItem[]>([]);
  const [loading, setLoading] = useState(true);

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

    window.addEventListener('focus', loadContinueWatching);
    window.addEventListener('popstate', loadContinueWatching);

    return () => {
      window.removeEventListener('focus', loadContinueWatching);
      window.removeEventListener('popstate', loadContinueWatching);
    };
  }, []);

  const handleClearContinueWatching = () => {
    if (confirm('Clear all continue watching history?')) {
      localStorage.removeItem('continueWatching');
      setContinueWatching([]);
    }
  };

  const handleRemoveContinueWatchingItem = (id: number) => {
    const updated = continueWatching.filter((item) => item.id !== id);
    setContinueWatching(updated);
    localStorage.setItem('continueWatching', JSON.stringify(updated));
  };

  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 8000);

    Promise.all([
      fetch(`${backendUrl}/api/movies/trending`, { signal: controller.signal }).then(res => res.ok ? res.json() : null),
      fetch(`${backendUrl}/api/tv/trending`, { signal: controller.signal }).then(res => res.ok ? res.json() : null)
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

  return (
    <main className={styles.main}>
      <Navbar />
      <HeroCarousel movies={trendingMovies} isLoading={loading} />

      <div style={{ marginTop: '2rem', position: 'relative', zIndex: 10 }}>
        {continueWatching.length > 0 && !loading && (
          <PosterCarousel
            title="Continue Watching"
            movies={continueWatching}
            viewAllLink="/continue-watching"
            onClear={handleClearContinueWatching}
            onRemoveItem={handleRemoveContinueWatchingItem}
          />
        )}

        <ProvidersSection />

        <GenreExplorerSection />

        <TrendingSection title="Trending Movies" items={trendingMovies} viewAllLink="/movies" isLoading={loading} />
        <TrendingSection title="Trending Series" items={trendingTv} viewAllLink="/tv" isLoading={loading} />
      </div>

      <Footer />
    </main>
  );
}
