import { useState } from 'react';
import Link from 'next/link';
import styles from './PosterGrid.module.css';

interface Movie {
  id: number;
  title?: string;
  name?: string;
  poster_path: string;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  media_type?: string;
  genre_ids?: number[];
}

interface PosterGridProps {
  title: string;
  movies: Movie[];
  gridColumns?: number;
  square?: boolean;
  isLoading?: boolean;
}

export default function PosterGrid({ title, movies, gridColumns, square = false, isLoading }: PosterGridProps) {
  const [savedIds, setSavedIds] = useState<number[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = JSON.parse(localStorage.getItem('saved_items') || '[]');
      return Array.isArray(saved) ? saved.map((item) => item.id) : [];
    } catch {
      return [];
    }
  });

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
    localStorage.setItem('saved_items', JSON.stringify(nextItems));
    localStorage.setItem('user_bookmarks', JSON.stringify(nextIds));
  };

  if (isLoading) {
    return (
      <section className={styles.container}>
        <h2 className={styles.title}>{title}</h2>
        <div className={styles.grid}>
          {[...Array(10)].map((_, i) => (
            <div key={`skel-${i}`} className={styles.skeletonCard} />
          ))}
        </div>
      </section>
    );
  }

  if (!movies || movies.length === 0) return null;

  return (
    <div className={styles.container}>
      {title && <h2 className={styles.title}>{title}</h2>}
      <div
        className={`${styles.grid} ${gridColumns === 4 ? styles.grid4 : ''} ${gridColumns === 2 ? styles.grid2 : ''}`}
      >
        {movies.map((movie) => {
          const displayTitle = movie.title || movie.name;
          const displayDate = movie.release_date || movie.first_air_date;
          const year = displayDate ? displayDate.split('-')[0] : '';
          const rating = movie.vote_average ? movie.vote_average.toFixed(1) : '8.0';

          const isTV = movie.media_type === 'tv' || (movie.name && !movie.title);
          const linkHref = isTV ? `/tv/${movie.id}` : `/movie/${movie.id}`;
          
          return (
            <Link href={linkHref} key={movie.id} className={`${styles.card} ${square ? styles.squareCard : ''}`}>
              <img
                src={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop'}
                alt={displayTitle}
                className={styles.poster}
                loading="lazy"
              />
              <div className={styles.overlay}></div>

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
