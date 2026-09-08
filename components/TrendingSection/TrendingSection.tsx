'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import styles from './TrendingSection.module.css';

interface TrendingItem {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string;
  backdrop_path?: string;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  media_type?: string;
}

interface TrendingSectionProps {
  title: string;
  items: TrendingItem[];
  viewAllLink?: string;
  isLoading?: boolean;
}

export default function TrendingSection({ title, items, viewAllLink, isLoading }: TrendingSectionProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [direction, setDirection] = useState(1);
  const ITEMS_PER_PAGE = 9;

  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>(() => {
    if (typeof window === 'undefined') return [];

    try {
      const stored = localStorage.getItem('user_bookmarks');
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed.filter((id): id is number => typeof id === 'number') : [];
    } catch (error) {
      console.error('Failed to load bookmarks', error);
      return [];
    }
  });

  // Handle Loading State
  if (isLoading) {
    return (
      <section className={styles.section}>
        <div className={styles.header}>
          <div className={styles.titleWrapper}>
            <h2 className={styles.title}>{title}</h2>
          </div>
        </div>
        <div className={styles.postersRow}>
          {[...Array(5)].map((_, i) => (
            <div key={`skel-row-${i}`} className={styles.skeletonCard} />
          ))}
        </div>
        <div className={styles.heroGrid}>
          {[...Array(4)].map((_, i) => (
            <div key={`skel-hero-${i}`} className={styles.skeletonHero} />
          ))}
        </div>
      </section>
    );
  }

  if (!items || items.length === 0) return null;

  const toggleBookmark = (e: React.MouseEvent, item: TrendingItem) => {
    e.preventDefault();
    e.stopPropagation();

    setBookmarkedIds((prev) => {
      let updated: number[];
      if (prev.includes(item.id)) {
        updated = prev.filter((id) => id !== item.id);
      } else {
        updated = [...prev, item.id];
      }
      try {
        localStorage.setItem('user_bookmarks', JSON.stringify(updated));
        const storedItems = localStorage.getItem('saved_items');
        const savedItems: TrendingItem[] = storedItems ? JSON.parse(storedItems) : [];
        const nextItems = item
          ? updated.includes(item.id)
            ? [...savedItems.filter((saved) => saved.id !== item.id), item]
            : savedItems.filter((saved) => saved.id !== item.id)
          : savedItems;
        localStorage.setItem('saved_items', JSON.stringify(nextItems));
      } catch (err) {
        console.error('Failed to save bookmark', err);
      }
      return updated;
    });
  };

  const handlePlayNow = (e: React.MouseEvent, item: TrendingItem, isTv: boolean) => {
    try {
      const stored = localStorage.getItem('continueWatching');
      let list: TrendingItem[] = stored ? JSON.parse(stored) : [];
      list = list.filter((media) => media.id !== item.id);
      list.unshift({ ...item, media_type: isTv ? 'tv' : 'movie' });
      if (list.length > 20) list.pop();
      localStorage.setItem('continueWatching', JSON.stringify(list));
    } catch (err) {
      console.error('Failed to save to continue watching', err);
    }
  };

  if (!items || items.length === 0) return null;

  const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentBatch = items.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const featuredPosters = currentBatch.slice(0, 5);
  const heroGridItems = currentBatch.slice(5, 9);

  const handlePrevPage = () => {
    setDirection(-1);
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setDirection(1);
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  const renderNormalPoster = (item: TrendingItem) => {
    const displayTitle = item.title || item.name || 'Untitled';
    const displayDate = item.release_date || item.first_air_date;
    const year = displayDate ? displayDate.split('-')[0] : '';
    const rating = item.vote_average && item.vote_average > 0 ? item.vote_average.toFixed(1) : 'N/A';
    const isTv = item.media_type === 'tv' || Boolean(item.name && !item.title);
    const href = isTv ? `/tv/${item.id}` : `/movie/${item.id}`;
    const poster = item.poster_path
      ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
      : 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop';
    const isBookmarked = bookmarkedIds.includes(item.id);

    return (
      <Link href={href} key={item.id} className={styles.posterCard}>
        <img src={poster} alt={displayTitle} className={styles.posterImg} loading="lazy" />
        <div className={styles.posterOverlay} />

        <button
          type="button"
          className={`${styles.bookmarkBtn} ${isBookmarked ? styles.bookmarked : ''}`}
          onClick={(e) => toggleBookmark(e, item)}
          aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </button>

        <div className={styles.posterInfo}>
          <div className={styles.ratingBadge}>{rating}</div>
          <h3 className={styles.posterTitle}>{displayTitle}</h3>
          {year && <p className={styles.posterYear}>{year}</p>}
        </div>
      </Link>
    );
  };

  const renderMiniHeroCard = (item: TrendingItem) => {
    const displayTitle = item.title || item.name || 'Untitled';
    const isTv = item.media_type === 'tv' || Boolean(item.name && !item.title);
    const detailsHref = isTv ? `/tv/${item.id}` : `/movie/${item.id}`;
    const watchHref = isTv ? `/watch/tv/${item.id}/1/1` : `/watch/${item.id}`;
    const backdrop = item.backdrop_path
      ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}`
      : item.poster_path
        ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
        : 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop';
    const isBookmarked = bookmarkedIds.includes(item.id);
    const overview = item.overview || 'Explore details, cast, trailers, and streaming options for this trending title.';

    return (
      <div key={item.id} className={styles.heroCard}>
        <img src={backdrop} alt={displayTitle} className={styles.heroBackdrop} loading="lazy" />
        <div className={styles.heroOverlay} />

        <button
          type="button"
          className={`${styles.bookmarkBtn} ${isBookmarked ? styles.bookmarked : ''}`}
          onClick={(e) => toggleBookmark(e, item)}
          aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </button>

        <div className={styles.heroContent}>
          <h3 className={styles.heroTitle}>{displayTitle}</h3>
          <p className={styles.heroDescription}>{overview}</p>

          <div className={styles.heroActions}>
            <Link
              href={watchHref}
              className={styles.playBtn}
              onClick={(e) => handlePlayNow(e, item, isTv)}
            >
              <svg className={styles.playIcon} viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              Play Now
            </Link>

            <Link href={detailsHref} className={styles.detailsBtn}>
              Details
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div className={styles.titleWrapper}>
          <h2 className={styles.title}>{title}</h2>
          {viewAllLink && (
            <>
              <span className={styles.separator}>|</span>
              <Link href={viewAllLink} className={styles.viewAll}>
                View All
              </Link>
            </>
          )}
        </div>

        <div className={styles.controls}>
          <div className={styles.pageIndicator}>
            <span>{currentPage}</span> / {totalPages}
          </div>
          <div className={styles.buttonGroup}>
            <button
              type="button"
              className={styles.controlBtn}
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              aria-label="Previous Page"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              className={styles.controlBtn}
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              aria-label="Next Page"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentPage}
            custom={direction}
            initial={{ opacity: 0, x: direction > 0 ? 50 : -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -50 : 50 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{ width: '100%' }}
          >
            <div className={styles.postersRow}>
              {featuredPosters.map((item) => renderNormalPoster(item))}
            </div>
            {heroGridItems.length > 0 && (
              <div className={styles.heroGrid}>
                {heroGridItems.map((item) => renderMiniHeroCard(item))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
