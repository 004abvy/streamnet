'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
  const footerRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Plays the entrance once, the first time the footer scrolls into view.
  useEffect(() => {
    const node = footerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <footer
      ref={footerRef}
      className={`${styles.footer} ${isVisible ? styles.isVisible : ''}`}
    >
      <div className={styles.signalLine} />

      <div className={styles.container}>
        <div className={styles.topSection}>
          <div className={styles.brand}>
            <Link href="/" prefetch={false} className={styles.logo}>
              <span className={styles.logoDot} />
              <span className={styles.logoText}>StreamFlix</span>
            </Link>
            <p className={styles.tagline}>
              Unlimited streaming for movies, TV series, anime, and live entertainment.
            </p>

            <div className={styles.brandMeta}>
              <span>4K Ultra HD</span>
              <span>Ad-free viewing</span>
              <span>24/7 access</span>
            </div>
          </div>

          <div className={styles.infoGrid}>
            <div className={styles.infoColumn}>
              <h3 className={styles.sectionTitle}>Explore</h3>
              <ul className={styles.linkList}>
                <li><Link href="/movies" prefetch={false} className={styles.link}>Movies</Link></li>
                <li><Link href="/tv" prefetch={false} className={styles.link}>TV Series</Link></li>
                <li><Link href="/anime" prefetch={false} className={styles.link}>Anime</Link></li>
                <li><Link href="/live-tv" prefetch={false} className={styles.link}>Live TV</Link></li>
              </ul>
            </div>

            <div className={styles.infoColumn}>
              <h3 className={styles.sectionTitle}>Your space</h3>
              <ul className={styles.linkList}>
                <li><Link href="/saved" prefetch={false} className={styles.link}>Watchlist</Link></li>
                <li><Link href="/continue-watching" prefetch={false} className={styles.link}>Continue Watching</Link></li>
                <li><Link href="/search" prefetch={false} className={styles.link}>Search</Link></li>
                <li><Link href="/live-sports" prefetch={false} className={styles.link}>Live Sports</Link></li>
              </ul>
            </div>

            <div className={styles.infoColumn}>
              <h3 className={styles.sectionTitle}>Account</h3>
              <ul className={styles.linkList}>
                <li><Link href="/login" prefetch={false} className={styles.link}>Sign in</Link></li>
                <li><Link href="/signup" prefetch={false} className={styles.link}>Create account</Link></li>
                <li><Link href="/reset-password" prefetch={false} className={styles.link}>Reset password</Link></li>
                <li><Link href="/" prefetch={false} className={styles.link}>Support</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className={styles.divider} />

        <div className={styles.bottomSection}>
          <p className={styles.copyright}>
            © {new Date().getFullYear()} StreamFlix. All rights reserved.
          </p>

          <div className={styles.secondaryLinks}>
            <Link href="/movies?genre=16" prefetch={false} className={styles.secLink}>Animation</Link>
            <span className={styles.rule} aria-hidden="true" />
            <Link href="/movies?genre=28" prefetch={false} className={styles.secLink}>Action</Link>
            <span className={styles.rule} aria-hidden="true" />
            <Link href="/movies?genre=878" prefetch={false} className={styles.secLink}>Sci-Fi</Link>
            <span className={styles.rule} aria-hidden="true" />
            <span className={styles.secText}>4K Ultra HD</span>
          </div>
        </div>
      </div>
    </footer>
  );
}