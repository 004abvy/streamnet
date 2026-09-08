'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './HeroCarousel.module.css';

interface Movie {
  id: number;
  title: string;
  backdrop_path: string;
  overview: string;
  vote_average: number;
  release_date: string;
}

interface HeroCarouselProps {
  movies: Movie[];
  isLoading?: boolean;
}

export default function HeroCarousel({ movies, isLoading }: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const visibleMovies = movies ? movies.slice(0, 5) : [];
  const loopMovies = visibleMovies.length > 1 ? [...visibleMovies, visibleMovies[0]] : visibleMovies;

  useEffect(() => {
    if (loopMovies.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= loopMovies.length - 1) {
          return 0;
        }
        return prev + 1;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [loopMovies.length]);

  // Handle Loading State
  if (isLoading) {
    return <div className={styles.skeletonHero} />;
  }

  if (loopMovies.length === 0) return null;

  return (
    <div className={styles.container}>
      <div
        className={styles.track}
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {loopMovies.map((movie, index) => (
          <div key={`${movie.id}-${index}`} className={styles.slide}>
            <img
              src={`https://image.tmdb.org/t/p/original${movie.backdrop_path}`}
              alt={movie.title}
              className={styles.backdrop}
            />
            <div className={styles.overlay}></div>
            <div className={styles.bottomGradient}></div>

            <div className={styles.content}>
              <h1 className={styles.title}>{movie.title}</h1>
              <div className={styles.meta}>
                <span>TV</span>
                <span>★ {movie.vote_average?.toFixed(1)}</span>
                <span>🗓 {movie.release_date?.split('-')[0]}</span>
              </div>
              <p className={styles.description}>{movie.overview}</p>

              <div className={styles.buttons}>
                <Link
                  href={`/watch/${movie.id}`}
                  className={styles.playBtn}
                  onClick={() => {
                    try {
                      const stored = localStorage.getItem('continueWatching');
                      let list = stored ? JSON.parse(stored) : [];
                      list = list.filter((m: any) => m.id !== movie.id);
                      list.unshift(movie);
                      if (list.length > 20) list.pop();
                      localStorage.setItem('continueWatching', JSON.stringify(list));
                    } catch (e) {
                      console.error('Failed to save to continue watching', e);
                    }
                  }}
                >
                  <svg className={styles.playIcon} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  Play Now
                </Link>
                <Link href={`/movie/${movie.id}`} className={styles.detailsBtn}>
                  Details
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
