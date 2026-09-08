'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Navbar from '../../components/Navbar/Navbar';
import Footer from '../../components/Footer/Footer';
import styles from './continueWatching.module.css';

interface MediaItem {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string;
  backdrop_path?: string;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  media_type?: string;
}

export default function ContinueWatchingPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadItems = () => {
      try {
        const stored = localStorage.getItem('continueWatching');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setItems(parsed);
        }
      } catch (e) {
        console.error("Failed to load continue watching history", e);
      }
    };

    loadItems();
    window.addEventListener('focus', loadItems);
    window.addEventListener('storage', loadItems);
    return () => {
      window.removeEventListener('focus', loadItems);
      window.removeEventListener('storage', loadItems);
    };
  }, []);

  const removeItem = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = items.filter((item) => item.id !== id);
    setItems(updated);
    localStorage.setItem('continueWatching', JSON.stringify(updated));
  };

  const clearAll = () => {
    if (confirm('Are you sure you want to clear your continue watching history?')) {
      setItems([]);
      localStorage.removeItem('continueWatching');
    }
  };

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    return items.filter((item) => {
      const title = (item.title || item.name || '').toLowerCase();
      return title.includes(searchQuery.toLowerCase().trim());
    });
  }, [items, searchQuery]);

  return (
    <main className={styles.page}>
      <Navbar />

      <div className={styles.ambientGlow} />

      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitleGroup}>
            <div className={styles.badge}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              RESUME WATCHING
            </div>
            <h1 className={styles.pageTitle}>Continue Watching</h1>
            <p className={styles.subtitle}>
              Pick up right where you left off across all your devices.
            </p>
          </div>

          <div className={styles.headerActions}>
            <div className={styles.statChip}>
              <span className={styles.statNum}>{items.length}</span>
              <span className={styles.statLabel}>In Progress</span>
            </div>
            {items.length > 0 && (
              <button onClick={clearAll} className={styles.clearBtn} title="Clear watch history">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Clear History
              </button>
            )}
          </div>
        </div>

        {items.length === 0 ? (
          <div className={styles.emptyContainer}>
            <div className={styles.emptyIconWrapper}>
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
            <h2 className={styles.emptyTitle}>No watch history yet</h2>
            <p className={styles.emptyDesc}>
              Movies and TV shows you start watching will automatically appear here so you can easily resume them.
            </p>
            <Link href="/" className={styles.primaryBtn}>
              Explore Trending
            </Link>
          </div>
        ) : (
          <div>
            {/* Toolbar */}
            <div className={styles.toolbar}>
              <div className={styles.searchBox}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Search watch history..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button className={styles.clearSearchBtn} onClick={() => setSearchQuery('')}>✕</button>
                )}
              </div>
            </div>

            {/* Grid */}
            <div className={styles.grid}>
              {filteredItems.map((item) => {
                const title = item.title || item.name || 'Untitled';
                const watchHref = `/watch/${item.id}`;
                const date = item.release_date || item.first_air_date;
                const year = date ? date.split('-')[0] : '';
                const isTV = item.media_type === 'tv' || (item.name && !item.title);

                return (
                  <article className={styles.card} key={item.id}>
                    <Link href={watchHref} className={styles.cardLink}>
                      <div className={styles.posterWrapper}>
                        <img
                          src={
                            item.poster_path
                              ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
                              : 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop'
                          }
                          alt={title}
                          className={styles.poster}
                          loading="lazy"
                        />
                        <div className={styles.posterOverlay} />

                        {/* Play Action Overlay */}
                        <div className={styles.playOverlay}>
                          <div className={styles.playIconCircle}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                              <polygon points="6 3 20 12 6 21 6 3" />
                            </svg>
                          </div>
                        </div>

                        {/* Remove Button */}
                        <button
                          type="button"
                          className={styles.removeBtn}
                          onClick={(e) => removeItem(item.id, e)}
                          title="Remove from history"
                          aria-label={`Remove ${title}`}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      <div className={styles.cardInfo}>
                        <h3 className={styles.itemTitle}>{title}</h3>
                        <div className={styles.itemMeta}>
                          {year && <span>{year}</span>}
                          {isTV ? <span>• TV Series</span> : <span>• Movie</span>}
                        </div>
                      </div>
                    </Link>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}
