'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { saveWatchlist } from '../../utils/userStorage';
import styles from './PosterCarousel.module.css';

interface Movie {
  id: number;
  title?: string;
  name?: string;
  poster_path: string;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  media_type?: string;
}

interface PosterCarouselProps {
  title: string;
  movies: Movie[];
  viewAllLink?: string;
  onClear?: () => void;
  onRemoveItem?: (id: number) => void;
}

export default function PosterCarousel({ title, movies, viewAllLink, onClear, onRemoveItem }: PosterCarouselProps) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [savedIds, setSavedIds] = useState<number[]>([]);

  useEffect(() => {
    const syncSaved = () => {
      if (typeof window === 'undefined') return;
      try {
        const saved = JSON.parse(localStorage.getItem('saved_items') || '[]');
        if (Array.isArray(saved)) setSavedIds(saved.map((item) => item.id));
      } catch {
        setSavedIds([]);
      }
    };
    syncSaved();
    window.addEventListener('storage', syncSaved);
    return () => window.removeEventListener('storage', syncSaved);
  }, []);

  const toggleSaved = (event: React.MouseEvent, movie: Movie) => {
    event.preventDefault();
    event.stopPropagation();
    const nextIds = savedIds.includes(movie.id)
      ? savedIds.filter((id) => id !== movie.id)
      : [...savedIds, movie.id];
    const saved = JSON.parse(localStorage.getItem('saved_items') || '[]');
    const nextItems = nextIds.includes(movie.id)
      ? [...saved.filter((item: Movie) => item.id !== movie.id), movie]
      : saved.filter((item: Movie) => item.id !== movie.id);
    setSavedIds(nextIds);
    saveWatchlist(nextItems);
  };

  const calculatePages = () => {
    if (carouselRef.current) {
      const { scrollWidth, clientWidth } = carouselRef.current;
      setTotalPages(Math.max(1, Math.ceil(scrollWidth / clientWidth)));
    }
  };

  useEffect(() => {
    calculatePages();
    window.addEventListener('resize', calculatePages);
    return () => window.removeEventListener('resize', calculatePages);
  }, [movies]);

  const handleScroll = () => {
    if (carouselRef.current) {
      const { scrollLeft, clientWidth } = carouselRef.current;
      const newPage = Math.round(scrollLeft / clientWidth) + 1;
      setCurrentPage(newPage);
    }
  };

  const getScrollAmount = () => {
    if (!carouselRef.current) return 420;
    return Math.max(carouselRef.current.clientWidth * 0.9, 320);
  };

  const scrollLeft = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: -getScrollAmount(), behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: getScrollAmount(), behavior: 'smooth' });
    }
  };

  if (!movies || movies.length === 0) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleWrapper}>
          <h2 className={styles.title}>{title}</h2>
          {viewAllLink && (
            <Link href={viewAllLink} className={styles.viewAll}>View All</Link>
          )}
        </div>

        <div className={styles.controls}>
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className={styles.clearBtn}
              title="Clear history"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Clear
            </button>
          )}
          <div className={styles.pageIndicator}>
            <span>{currentPage}</span> / {totalPages}
          </div>
          <div className={styles.buttonGroup}>
            <button 
              className={styles.controlBtn} 
              onClick={scrollLeft}
              disabled={currentPage === 1}
              aria-label="Previous"
            >
              ←
            </button>
            <button 
              className={styles.controlBtn} 
              onClick={scrollRight}
              disabled={currentPage === totalPages}
              aria-label="Next"
            >
              →
            </button>
          </div>
        </div>
      </div>

      <div 
        className={styles.carousel} 
        ref={carouselRef}
        onScroll={handleScroll}
      >
        {movies.map((movie) => {
          const displayTitle = movie.title || movie.name;
          const displayDate = movie.release_date || movie.first_air_date;
          const year = displayDate ? displayDate.split('-')[0] : '';
          const rating = movie.vote_average ? movie.vote_average.toFixed(1) : '8.0';

          const isTV = movie.media_type === 'tv' || (movie.name && !movie.title);
          const linkHref = isTV ? `/tv/${movie.id}` : `/movie/${movie.id}`;
          
          return (
            <Link href={linkHref} key={movie.id} className={styles.card}>
              <img
                src={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop'}
                alt={displayTitle}
                className={styles.poster}
                loading="lazy"
              />
              <div className={styles.overlay}></div>

              {onRemoveItem && (
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onRemoveItem(movie.id);
                  }}
                  title="Remove from history"
                  aria-label="Remove item"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              )}

              <button
                type="button"
                className={`${styles.bookmark} ${savedIds.includes(movie.id) ? styles.bookmarked : ''}`}
                onClick={(event) => toggleSaved(event, movie)}
                aria-label={savedIds.includes(movie.id) ? 'Remove from saved' : 'Save poster'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                </svg>
              </button>

              <div className={styles.info}>
                {movie.vote_average > 0 && (
                  <div className={styles.rating}>{rating}</div>
                )}
                <h3 className={styles.movieTitle}>{displayTitle}</h3>
                {year && <p className={styles.year}>{year}</p>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
