'use client';

import { useState } from 'react';
import Footer from '../../components/Footer/Footer';
import styles from './announcements.module.css';

interface Announcement {
  id: string;
  title: string;
  date: string;
  category: 'Feature' | 'UI' | 'Performance' | 'Fix';
  categoryLabel: string;
  categoryClass: string;
  isPinned?: boolean;
  author: string;
  summary: string;
  highlights: string[];
  initialLikes: number;
}

const ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'announcement-4k-tmdb',
    title: 'Major Platform Overhaul: 4K TMDB Backdrops & Glassmorphic Spotlight Hubs',
    date: 'Feb 18, 2025 • 4:00 PM',
    category: 'UI',
    categoryLabel: '🎨 UI & 4K Overhaul',
    categoryClass: styles.uiTag,
    isPinned: true,
    author: 'Platform Lead',
    summary: 'We have completely upgraded visual clarity and browsing across the entire streaming platform. All backdrop imagery has been upgraded to TMDB uncompressed 4K resolutions.',
    highlights: [
      'Upgraded image URLs across Hero, Detailed, and Provider views to TMDB original 4K.',
      'Constructed 1-line widescreen Glassmorphic Spotlight Genre Hubs on Movies, TV Shows, and Anime pages.',
      'Enabled combining filter pills (Upcoming, Top Rated, 4K, Popular) and genre card selections simultaneously.',
      'Configured dynamic ambient provider backdrops on the Streaming Providers section.'
    ],
    initialLikes: 248
  },
  {
    id: 'announcement-collections-masonry',
    title: 'Brand New Collections Page & Cascading Masonry Grid',
    date: 'Feb 18, 2025 • 2:15 PM',
    category: 'Feature',
    categoryLabel: '✨ New Feature',
    categoryClass: styles.featureTag,
    isPinned: true,
    author: 'Design & Eng',
    summary: 'Explore 14 iconic cinematic universes and franchises on our new dedicated Collections page (/collections) with vertical TMDB posters and cascading masonry layouts.',
    highlights: [
      'Interactive Masonry Grid featuring Marvel, Star Wars, Batman, Harry Potter, Lord of the Rings, Spider-Man, Matrix, and more.',
      'Sleek Medium font typography (Plus Jakarta Sans / Outfit) with bottom-to-top rising GSAP animations.',
      '100% parallel image preloading for zero-flicker card entrances.'
    ],
    initialLikes: 194
  },
  {
    id: 'announcement-livetv-fullscreen',
    title: 'IPTV Live TV Enhancements & Fullscreen Player Mode',
    date: 'Feb 17, 2025 • 8:30 PM',
    category: 'Feature',
    categoryLabel: '📺 Live TV Upgrade',
    categoryClass: styles.featureTag,
    isPinned: false,
    author: 'Stream Team',
    summary: 'Watching live channels is now smoother than ever with our upgraded IPTV player interface and 1-click theater fullscreen playback.',
    highlights: [
      '1-Click Fullscreen Player Mode button on the live stream header.',
      'Frosted Glass Category Filter Capsules with icons (📺 All, ⭐ Favorites, 🕒 Recent, 🎬 Movies, ⚽ Sports, 📰 News, 🍿 Entertainment).',
      'Glassmorphic channel cards with live active glowing borders and instant preview.'
    ],
    initialLikes: 162
  },
  {
    id: 'announcement-search-pagination',
    title: 'Multi-Page Search Results & Smooth Scroll Fixes',
    date: 'Feb 17, 2025 • 11:00 AM',
    category: 'Fix',
    categoryLabel: '⚡ Fix & Search',
    categoryClass: styles.fixTag,
    isPinned: false,
    author: 'Core Dev',
    summary: 'Resolved search results scroll locking and added multi-page search results with pagination controls.',
    highlights: [
      'Added multi-page pagination controls (<Pagination />) to the Search page for browsing all pages of TMDB search results.',
      'Fixed scroll locking container styles on the search page.',
      'Disabled automatic search suggestion popups when navigating from Collections.'
    ],
    initialLikes: 115
  }
];

export default function AnnouncementsPage() {
  const [selectedFilter, setSelectedFilter] = useState<string>('All');
  const [likedIds, setLikedIds] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    ANNOUNCEMENTS.forEach((a) => {
      initial[a.id] = a.initialLikes;
    });
    return initial;
  });

  const toggleLike = (id: string) => {
    setLikedIds((prev) => {
      const isLiked = !!prev[id];
      const nextLiked = !isLiked;

      setLikeCounts((counts) => ({
        ...counts,
        [id]: (counts[id] || 0) + (nextLiked ? 1 : -1)
      }));

      return { ...prev, [id]: nextLiked };
    });
  };

  const filteredAnnouncements = ANNOUNCEMENTS.filter((item) => {
    if (selectedFilter === 'All') return true;
    if (selectedFilter === 'Platform Upgrades') return item.category === 'UI' || item.category === 'Feature';
    if (selectedFilter === 'Bug Fixes') return item.category === 'Fix';
    if (selectedFilter === 'Performance') return item.category === 'Performance';
    return true;
  });

  return (
    <main className={styles.container}>
      <div className={styles.content}>
        {/* Hero Header Section */}
        <div className={styles.heroHeader}>
          <div className={styles.statusBadge}>
            <span className={styles.statusDot} />
            <span>All Systems Operational</span>
          </div>
          <h1 className={styles.title}>Announcements & Release Notes</h1>
          <p className={styles.pageSubtitle}>
            Stay on the pulse of new platform features, UI enhancements, streaming improvements, and system updates.
          </p>
        </div>

        {/* Filter Row */}
        <div className={styles.filterRow}>
          {['All', 'Platform Upgrades', 'Bug Fixes', 'Performance'].map((cat) => (
            <button
              key={cat}
              className={`${styles.filterBtn} ${selectedFilter === cat ? styles.activeFilterBtn : ''}`}
              onClick={() => setSelectedFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Timeline Feed */}
        <div className={styles.timeline}>
          {filteredAnnouncements.map((item) => {
            const isLiked = !!likedIds[item.id];
            const currentLikes = likeCounts[item.id] || item.initialLikes;

            return (
              <article
                key={item.id}
                className={`${styles.announcementCard} ${item.isPinned ? styles.pinnedCard : ''}`}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.metaGroup}>
                    <span className={`${styles.tagPill} ${item.categoryClass}`}>
                      {item.categoryLabel}
                    </span>
                    <span className={styles.dateText}>{item.date}</span>
                  </div>

                  {item.isPinned && (
                    <span className={styles.pinnedBadge}>
                      📌 Pinned Update
                    </span>
                  )}
                </div>

                <h2 className={styles.cardTitle}>{item.title}</h2>
                <p className={styles.cardBody}>{item.summary}</p>

                {/* Highlights List */}
                <div className={styles.highlightsList}>
                  {item.highlights.map((highlight, idx) => (
                    <div key={idx} className={styles.highlightItem}>
                      <span className={styles.highlightBullet}>•</span>
                      <span>{highlight}</span>
                    </div>
                  ))}
                </div>

                <div className={styles.cardFooter}>
                  <div className={styles.authorInfo}>
                    <div className={styles.authorAvatar}>
                      {item.author.charAt(0)}
                    </div>
                    <span className={styles.authorName}>{item.author}</span>
                  </div>

                  <div className={styles.actionButtons}>
                    <button
                      type="button"
                      className={`${styles.likeBtn} ${isLiked ? styles.liked : ''}`}
                      onClick={() => toggleLike(item.id)}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                      <span>{currentLikes} Likes</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
      <Footer />
    </main>
  );
}
