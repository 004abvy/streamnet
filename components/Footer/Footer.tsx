'use client';

import React from 'react';
import Link from 'next/link';
import { Mail, ChevronRight } from 'lucide-react';
import styles from './Footer.module.css';

const TwitterIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
  </svg>
);

const InstagramIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

const YoutubeIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path>
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon>
  </svg>
);

export default function Footer() {
  return (
    <footer className={styles.footer}>
      {/* Animated Top Border */}
      <div className={styles.liveBorder} />
      
      {/* Ambient background glow */}
      <div className={styles.ambientGlow} />

      <div className={styles.container}>
        <div className={styles.mainContent}>
          
          {/* Brand & Socials */}
          <div className={styles.brandSection}>
            <Link href="/" prefetch={false} className={styles.logo}>
              <span className={styles.logoDot} />
              <span className={styles.logoText}>StreamFlix</span>
            </Link>
            <p className={styles.tagline}>
              Your ultimate destination for endless entertainment. Stream movies, TV series, and anime in stunning 4K Ultra HD.
            </p>
            <div className={styles.socials}>
              <a href="#" aria-label="Twitter" className={styles.socialIcon}><TwitterIcon size={18} /></a>
              <a href="#" aria-label="Instagram" className={styles.socialIcon}><InstagramIcon size={18} /></a>
              <a href="#" aria-label="YouTube" className={styles.socialIcon}><YoutubeIcon size={18} /></a>
            </div>
          </div>

          {/* Navigation Columns */}
          <div className={styles.navColumns}>
            <div className={styles.column}>
              <h3 className={styles.columnTitle}>Browse</h3>
              <ul className={styles.linkList}>
                <li><Link href="/movies" prefetch={false} className={styles.link}>Movies</Link></li>
                <li><Link href="/tv" prefetch={false} className={styles.link}>TV Series</Link></li>
                <li><Link href="/anime" prefetch={false} className={styles.link}>Anime</Link></li>
                <li><Link href="/trending" prefetch={false} className={styles.link}>Trending Now</Link></li>
              </ul>
            </div>
            <div className={styles.column}>
              <h3 className={styles.columnTitle}>Account</h3>
              <ul className={styles.linkList}>
                <li><Link href="/watchlist" prefetch={false} className={styles.link}>My Watchlist</Link></li>
                <li><Link href="/settings" prefetch={false} className={styles.link}>Account Settings</Link></li>
                <li><Link href="/billing" prefetch={false} className={styles.link}>Billing</Link></li>
                <li><Link href="/support" prefetch={false} className={styles.link}>Help Center</Link></li>
              </ul>
            </div>
            <div className={styles.column}>
              <h3 className={styles.columnTitle}>Legal</h3>
              <ul className={styles.linkList}>
                <li><Link href="/terms" prefetch={false} className={styles.link}>Terms of Use</Link></li>
                <li><Link href="/privacy" prefetch={false} className={styles.link}>Privacy Policy</Link></li>
                <li><Link href="/cookies" prefetch={false} className={styles.link}>Cookie Preferences</Link></li>
                <li><Link href="/corporate" prefetch={false} className={styles.link}>Corporate Info</Link></li>
              </ul>
            </div>
          </div>

          {/* Newsletter */}
          <div className={styles.newsletterSection}>
            <h3 className={styles.columnTitle}>Stay Updated</h3>
            <p className={styles.newsletterDesc}>Get the latest releases and exclusive content directly to your inbox.</p>
            <form className={styles.newsletterForm} onSubmit={(e) => e.preventDefault()}>
              <div className={styles.inputWrapper}>
                <Mail size={16} className={styles.inputIcon} />
                <input type="email" placeholder="Enter your email" className={styles.input} required />
                <button type="submit" className={styles.submitBtn} aria-label="Subscribe">
                  <ChevronRight size={18} />
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className={styles.divider} />

        {/* Bottom Bar */}
        <div className={styles.bottomBar}>
          <p className={styles.copyright}>
            © {new Date().getFullYear()} StreamFlix. All rights reserved.
          </p>
          <div className={styles.badges}>
            <span className={styles.badge}>4K Ultra HD</span>
            <span className={styles.badge}>Dolby Atmos</span>
            <span className={styles.badge}>Ad-Free</span>
          </div>
        </div>
      </div>
    </footer>
  );
}