'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { saveContinueWatching } from '../../utils/userStorage';
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
    return (
      <div className={styles.skeletonHero} aria-label="Loading featured spotlight">
        <div className={styles.skeletonBackdropShimmer} />
        <div className={styles.skeletonAmbientGlow} />
        <div className={styles.skeletonOverlay} />
        <div className={styles.skeletonBottomFade} />
        <div className={styles.skeletonContent}>
          <div className={styles.skeletonBadge} />
          <div className={styles.skeletonTitle} />
          <div className={styles.skeletonTitleSecondary} />
          <div className={styles.skeletonMetaRow}>
            <div className={styles.skeletonPill} style={{ width: '56px' }} />
            <div className={styles.skeletonPill} style={{ width: '74px' }} />
            <div className={styles.skeletonPill} style={{ width: '64px' }} />
            <div className={styles.skeletonPill} style={{ width: '48px' }} />
          </div>
          <div className={styles.skeletonDescLine} style={{ width: '90%' }} />
          <div className={styles.skeletonDescLine} style={{ width: '70%' }} />
          <div className={styles.skeletonActions}>
            <div className={styles.skeletonBtnPrimary}>
              <span className={styles.skeletonPlayIcon} />
              <span className={styles.skeletonBtnText} style={{ width: '78px' }} />
            </div>
            <div className={styles.skeletonBtnSecondary}>
              <span className={styles.skeletonBtnText} style={{ width: '92px' }} />
            </div>
          </div>
        </div>
        <div className={styles.skeletonIndicators}>
          {[...Array(5)].map((_, i) => (
            <div
              key={`skel-dot-${i}`}
              className={`${styles.skeletonDot} ${i === 0 ? styles.skeletonDotActive : ''}`}
            />
          ))}
        </div>
      </div>
    );
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
              src={`https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`}
              alt={movie.title}
              className={styles.backdrop}
              loading={index === 0 ? "eager" : "lazy"}
              decoding="async"
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
                      saveContinueWatching(list);
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
