'use client';

import Link from 'next/link';
import Footer from '../../components/Footer/Footer';
import styles from './announcements.module.css';

export default function AnnouncementsPage() {
  return (
    <main className={styles.container}>
      <div className={styles.content}>
        {/* Sleek Minimal Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Announcements</h1>
        </div>

        {/* Minimal "No New Notifications" Glassmorphic Card */}
        <div className={styles.emptyCard}>
          <div className={styles.bellWrapper}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={styles.bellIcon}>
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <h2 className={styles.emptyTitle}>No new notifications</h2>
          <p className={styles.emptySubtitle}>You&apos;re all caught up! Check back later for new updates.</p>

          <Link href="/" className={styles.homeBtn}>
            Back to Home
          </Link>
        </div>
      </div>
      <Footer />
    </main>
  );
}
