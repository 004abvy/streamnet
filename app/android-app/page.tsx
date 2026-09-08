import Link from 'next/link';
import Navbar from '../../components/Navbar/Navbar';
import Footer from '../../components/Footer/Footer';
import styles from './android.module.css';

export default function AndroidAppPage() {
  return (
    <main className={styles.page}>
      <Navbar />
      <div className={styles.ambientGlow} />

      <div className={styles.content}>
        <section className={styles.hero}>
          <div className={styles.badge}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 18h12v-6a6 6 0 0 0-12 0v6z" />
              <path d="M6 12h-2v6h2" />
              <path d="M18 12h2v6h-2" />
              <circle cx="9" cy="9" r="1" fill="currentColor" />
              <circle cx="15" cy="9" r="1" fill="currentColor" />
              <path d="M8 5l-2-2" />
              <path d="M16 5l2-2" />
            </svg>
            OFFICIAL ANDROID APP
          </div>

          <h1 className={styles.title}>StreamNet for Android</h1>
          <p className={styles.subtitle}>
            Experience blazing fast streaming, 4K HDR playback, offline sync, and real-time watchlist on your Android phone and TV.
          </p>

          <div className={styles.ctaGroup}>
            <a href="/streamnet.apk" download className={styles.downloadBtn}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download APK (v1.0.0)
            </a>
            <Link href="/movies" style={{ display: 'inline-flex', alignItems: 'center', padding: '14px 24px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', textDecoration: 'none', fontWeight: 600 }}>
              Browse Web App
            </Link>
          </div>
        </section>

        <section className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
            <h3 className={styles.featureTitle}>Ultra HD & 4K Streaming</h3>
            <p className={styles.featureDesc}>
              Watch your favorite movies and shows in crystal clear 1080p and 4K quality with multi-server auto-failover.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h3 className={styles.featureTitle}>Multi-Device Sync</h3>
            <p className={styles.featureDesc}>
              Log in with your Gmail account to instantly sync your saved titles and continue-watching history across all your devices.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
                <polyline points="17 2 12 7 7 2" />
              </svg>
            </div>
            <h3 className={styles.featureTitle}>Android TV Compatible</h3>
            <p className={styles.featureDesc}>
              Full D-Pad remote control support designed for seamless playback on Android TV and streaming boxes.
            </p>
          </div>
        </section>
      </div>

      <Footer />
    </main>
  );
}
