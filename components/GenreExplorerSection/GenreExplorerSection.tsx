'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { saveWatchlist } from '../../utils/userStorage';
import styles from './GenreExplorerSection.module.css';

interface Genre {
  id: number;
  tvId?: number;
  name: string;
}

const GENRES: Genre[] = [
  { id: 28, tvId: 10759, name: 'Action' },
  { id: 35, tvId: 35, name: 'Comedy' },
  { id: 18, tvId: 18, name: 'Drama' },
  { id: 10749, tvId: 10749, name: 'Romance' },
  { id: 878, tvId: 10765, name: 'Science Fiction' },
  { id: 53, tvId: 53, name: 'Thriller' },
  { id: 27, tvId: 27, name: 'Horror' },
  { id: 16, tvId: 16, name: 'Animation' },
  { id: 80, tvId: 80, name: 'Crime' },
];

export default function GenreExplorerSection() {
  const [contentType, setContentType] = useState<'movie' | 'tv'>('movie');
  const [selectedGenre, setSelectedGenre] = useState<Genre>(GENRES[0]);
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>([]);

  useEffect(() => {
    const fetchGenreContent = () => {
      setLoading(true);
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
      const genreId = contentType === 'tv' ? (selectedGenre.tvId || selectedGenre.id) : selectedGenre.id;

      fetch(`${backendUrl}/api/discover?type=${contentType}&genreId=${genreId}&page=${page}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.results) {
            setItems(data.results.slice(0, 5)); // 5 items per row as in screenshot
          } else {
            setItems([]);
          }
          setLoading(false);
        })
        .catch((err) => {
          console.warn("Error fetching genre content:", err);
          setItems([]);
          setLoading(false);
        });
    };

    fetchGenreContent();
  }, [contentType, selectedGenre, page]);

  const toggleBookmark = (e: React.MouseEvent, item: any) => {
    e.preventDefault();
    e.stopPropagation();
    setBookmarkedIds((prev) => {
      const updated = prev.includes(item.id)
        ? prev.filter((bId) => bId !== item.id)
        : [...prev, item.id];
      const stored = localStorage.getItem('saved_items');
      const savedItems = stored ? JSON.parse(stored) : [];
      const nextItems = updated.includes(item.id)
        ? [...savedItems.filter((saved: any) => saved.id !== item.id), { ...item, media_type: contentType }]
        : savedItems.filter((saved: any) => saved.id !== item.id);
      saveWatchlist(nextItems);
      return updated;
    });
  };

  const handleGenreSelect = (genre: Genre) => {
    setSelectedGenre(genre);
    setPage(1);
  };

  const handleTypeToggle = (type: 'movie' | 'tv') => {
    setContentType(type);
    setPage(1);
  };

  return (
    <section className={styles.section}>
      {/* Header Row */}
      <div className={styles.headerRow}>
        <div className={styles.headerText}>
          <h2 className={styles.title}>Genres</h2>
          <p className={styles.subtitle}>Explore content by genre</p>
        </div>

        {/* Movies / TV Shows Toggle Pill */}
        <div className={styles.typeToggleContainer}>
          <button
            className={`${styles.typeBtn} ${contentType === 'movie' ? styles.activeTypeBtn : ''}`}
            onClick={() => handleTypeToggle('movie')}
          >
            Movies
          </button>
          <button
            className={`${styles.typeBtn} ${contentType === 'tv' ? styles.activeTypeBtn : ''}`}
            onClick={() => handleTypeToggle('tv')}
          >
            TV Shows
          </button>
        </div>
      </div>

      {/* Genre Underline Navigation Bar */}
      <div className={styles.genreNavContainer}>
        <div className={styles.genreNav}>
          {GENRES.map((genre) => {
            const isActive = selectedGenre.id === genre.id;
            return (
              <button
                key={genre.id}
                className={`${styles.genreTab} ${isActive ? styles.activeGenreTab : ''}`}
                onClick={() => handleGenreSelect(genre)}
              >
                {genre.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Description Subtext */}
      <div className={styles.subtextRow}>
        <span>Browse top {contentType === 'movie' ? 'movies' : 'TV shows'} in </span>
        <strong style={{ color: '#fff' }}>{selectedGenre.name}</strong>
      </div>

      {/* Sub-header & Controls Bar */}
      <div className={styles.controlsRow}>
        <h3 className={styles.sectionTitle}>
          {selectedGenre.name} {contentType === 'movie' ? 'Movies' : 'TV Shows'}
        </h3>

        <div className={styles.controlsRight}>
          <button className={styles.filterBtn}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
            Filters
          </button>

          <span className={styles.pageIndicator}>
            <strong>{page}</strong> / 6
          </span>

          <div className={styles.arrowGroup}>
            <button
              className={styles.arrowBtn}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Previous Page"
            >
              ←
            </button>
            <button
              className={styles.arrowBtn}
              onClick={() => setPage((p) => Math.min(6, p + 1))}
              disabled={page === 6}
              aria-label="Next Page"
            >
              →
            </button>
          </div>
        </div>
      </div>

      {/* 5 Card Grid */}
      {loading ? (
        <div className={styles.loadingGrid}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={styles.cardSkeleton}></div>
          ))}
        </div>
      ) : (
        <div className={styles.cardGrid}>
          {items.map((item) => {
            const isBookmarked = bookmarkedIds.includes(item.id);
            const titleText = item.title || item.name;
            const releaseYear = (item.release_date || item.first_air_date || '').split('-')[0] || '2026';
            const rating = item.vote_average ? item.vote_average.toFixed(1) : '8.0';
            const posterUrl = item.poster_path
              ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
              : 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop';
            const href = contentType === 'tv' ? `/tv/${item.id}` : `/movie/${item.id}`;

            return (
              <Link href={href} key={item.id} className={styles.card}>
                <div
                  className={styles.posterWrapper}
                  style={{ backgroundImage: `url(${posterUrl})` }}
                >
                  {/* Top-Right Bookmark Button */}
                  <button
                    className={`${styles.bookmarkBtn} ${isBookmarked ? styles.activeBookmark : ''}`}
                    onClick={(e) => toggleBookmark(e, item)}
                    aria-label="Bookmark"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill={isBookmarked ? "#ffffff" : "none"} stroke="currentColor" strokeWidth="2">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                    </svg>
                  </button>

                  <div className={styles.posterOverlay}></div>

                  {/* Bottom Content Overlay (Rating, Title, Year) */}
                  <div className={styles.cardDetails}>
                    <div className={styles.ratingPill}>{rating}</div>
                    <div className={styles.cardTitle}>{titleText}</div>
                    <div className={styles.cardYear}>{releaseYear}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
