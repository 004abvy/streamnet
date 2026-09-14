'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { saveContinueWatching } from '../../utils/userStorage';
import styles from './HeroCarousel.module.css';
import {
  Bell,
  Command,
  User,
  Play,
  Bookmark,
  Share2
} from 'lucide-react';

interface Movie {
  id: number;
  title?: string;
  name?: string;
  backdrop_path: string;
  overview: string;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  media_type?: string;
}

interface HeroCarouselProps {
  movies: Movie[];
  isLoading?: boolean;
}

export default function HeroCarousel({ movies, isLoading }: HeroCarouselProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [saved, setSaved] = useState(false);

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
    }, 5000);

    return () => clearInterval(interval);
  }, [loopMovies.length]);

  if (isLoading) {
    return (
      <div className={styles.heroWrapper}>
        <div className={styles.skeletonHero} aria-label="Loading hero spotlight">
          <div className={styles.skeletonBackdropShimmer} />
        </div>
      </div>
    );
  }

  if (loopMovies.length === 0) return null;

  const currentMovie = loopMovies[currentIndex] || loopMovies[0];
  const displayTitle = currentMovie.title || currentMovie.name || 'Featured Title';
  const isTvShow = currentMovie.media_type === 'tv' || !!currentMovie.first_air_date;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: displayTitle,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className={styles.heroWrapper}>
      <div className={styles.container}>
        {/* Rounded Backdrop Frame (Clips backdrop image & top right actions) */}
        <div className={styles.backdropFrame}>
          {/* Top Right Actions Pill (Announcements, Command, Profile) */}
          <div className={styles.topRightActions}>
            <button
              className={styles.topActionBtn}
              title="Announcements"
              onClick={() => router.push('/announcements')}
            >
              <Bell size={18} />
            </button>
            <div className={styles.topActionDivider} />
            <button
              className={styles.topActionBtn}
              title="Command Menu"
              onClick={() => router.push('/command')}
            >
              <Command size={18} />
            </button>
            <div className={styles.topActionDivider} />
            <button
              className={styles.topActionBtn}
              title="Profile / Login"
              onClick={() => router.push(user ? '/settings' : '/login')}
            >
              <User size={18} />
            </button>
          </div>

          {/* Carousel Track */}
          <div
            className={styles.track}
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {loopMovies.map((movie, index) => (
              <div key={`${movie.id}-${index}`} className={styles.slide}>
                <img
                  src={`https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`}
                  alt={movie.title || movie.name || 'Hero Backdrop'}
                  className={styles.backdrop}
                  loading={index === 0 ? "eager" : "lazy"}
                  decoding="async"
                />
                <div className={styles.overlay}></div>
                <div className={styles.bottomGradient}></div>
              </div>
            ))}
          </div>

          {/* Dot Indicators at Bottom Right */}
          <div className={styles.indicators}>
            {visibleMovies.map((_, i) => (
              <div
                key={`dot-${i}`}
                className={`${styles.dot} ${i === (currentIndex % visibleMovies.length) ? styles.activeDot : ''}`}
                onClick={() => setCurrentIndex(i)}
              />
            ))}
          </div>
        </div>

        {/* Floating Bottom Center Movie Details Pill with Cutout Wrapping */}
        <div className={styles.cutoutWrapper}>
          <div className={styles.floatingCard}>
            <div className={styles.mediaTypeTag}>
              {isTvShow ? 'SHOW' : 'MOVIE'}
            </div>

            <div className={styles.cardMainContent}>
              <h2 className={styles.cardTitle}>{displayTitle}</h2>
              
              <div className={styles.cardActions}>
                <Link
                  href={isTvShow ? `/watch/tv/${currentMovie.id}/1/1` : `/watch/${currentMovie.id}`}
                  className={styles.watchBtn}
                  onClick={() => {
                    try {
                      const stored = localStorage.getItem('continueWatching');
                      let list = stored ? JSON.parse(stored) : [];
                      list = list.filter((m: any) => m.id !== currentMovie.id);
                      list.unshift(currentMovie);
                      if (list.length > 20) list.pop();
                      saveContinueWatching(list);
                    } catch (e) {
                      console.error('Failed to save to continue watching', e);
                    }
                  }}
                >
                  <Play size={14} fill="currentColor" /> Watch
                </Link>

                <Link
                  href={isTvShow ? `/tv/${currentMovie.id}` : `/movie/${currentMovie.id}`}
                  className={styles.detailsBtn}
                >
                  Details
                </Link>

                <button
                  className={styles.iconActionBtn}
                  title={saved ? 'Remove Bookmark' : 'Add Bookmark'}
                  onClick={() => setSaved(!saved)}
                >
                  <Bookmark size={16} fill={saved ? '#eab308' : 'none'} color={saved ? '#eab308' : '#a1a1aa'} />
                </button>

                <button
                  className={styles.iconActionBtn}
                  title="Share Title"
                  onClick={handleShare}
                >
                  <Share2 size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
