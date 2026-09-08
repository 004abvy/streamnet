'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import styles from './Navbar.module.css';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  // Close search suggestions on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSuggestions([]);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch search suggestions as user types
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      setLoadingSuggestions(true);
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';

      fetch(`${backendUrl}/api/search?q=${encodeURIComponent(query.trim())}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.results) {
            const filtered = data.results
              .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
              .slice(0, 6);
            setSuggestions(filtered);
          } else {
            setSuggestions([]);
          }
          setLoadingSuggestions(false);
        })
        .catch((err) => {
          console.warn("Error fetching search suggestions:", err);
          setSuggestions([]);
          setLoadingSuggestions(false);
        });
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setShowSearch(false);
      setSuggestions([]);
    }
  };

  const handleSelectSuggestion = (item: any) => {
    setShowSearch(false);
    setSuggestions([]);
    setQuery('');
    if (item.media_type === 'tv') {
      router.push(`/tv/${item.id}`);
    } else {
      router.push(`/movie/${item.id}`);
    }
  };

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const navLinksRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMenuEnter = (menu: string) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHoveredMenu(menu);
  };

  const handleMenuLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredMenu(null);
    }, 280);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Close user menu and expanded navigation on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (navLinksRef.current && !navLinksRef.current.contains(event.target as Node)) {
        setExpandedMenu(null);
        setHoveredMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDropdownClick = (menu: string) => {
    if (typeof window !== 'undefined' && window.innerWidth <= 1200) {
      setExpandedMenu(expandedMenu === menu ? null : menu);
    }
  };

  return (
    <nav className={styles.navbar}>
      <Link href="/" prefetch={false} className={styles.logo}>
        <svg className={styles.logoIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 3h18v4H3V3z" />
          <path d="M4 7l2 14h12l2-14" />
          <path d="M9 3v18" />
          <path d="M15 3v18" />
        </svg>
      </Link>

      {/* Backdrop for mobile menu */}
      {mobileMenuOpen && (
        <div className={styles.menuBackdrop} onClick={() => setMobileMenuOpen(false)} />
      )}

      <button
        className={`${styles.mobileMenuBtn} ${mobileMenuOpen ? styles.mobileMenuBtnHidden : ''}`}
        onClick={() => setMobileMenuOpen(true)}
        aria-label="Open menu"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>

      <div ref={navLinksRef} className={`${styles.navLinks} ${mobileMenuOpen ? styles.navLinksOpen : ''}`}>
        <button
          type="button"
          className={styles.closeSheetBtn}
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close menu"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div className={styles.navLinksScroll}>
          <h3 className={styles.menuHeading}>Menu</h3>

          <Link href="/" prefetch={false} className={`${styles.navLink} ${pathname === '/' ? styles.active : ''}`} onClick={() => setMobileMenuOpen(false)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
            Home
          </Link>

          {/* Movies Mega Dropdown */}
          <div
            className={`${styles.navLinkDropdown} ${styles.megaDropdownWrapper} ${
              expandedMenu === 'movies' || hoveredMenu === 'movies' ? styles.expanded : ''
            } ${hoveredMenu === 'movies' ? styles.hoverActive : ''}`}
            onMouseEnter={() => handleMenuEnter('movies')}
            onMouseLeave={handleMenuLeave}
          >
            <div className={styles.navLink} onClick={() => handleDropdownClick('movies')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line></svg>
              Movies
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.chevron}><path d="M6 9l6 6 6-6" /></svg>
            </div>
            <div
              className={`${styles.dropdownMenu} ${styles.megaDropdownMenu} ${
                hoveredMenu === 'movies' ? styles.megaDropdownOpen : ''
              }`}
              onMouseEnter={() => handleMenuEnter('movies')}
              onMouseLeave={handleMenuLeave}
            >
              <div className={styles.megaHeader}>
                <div className={styles.megaTitle}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line></svg>
                  <span>Movies</span>
                </div>
                <p className={styles.megaDesc}>
                  Embark on a journey through the world of movies. From the latest hits to timeless classics, discover new stories and revisit your favorites.
                </p>
              </div>

              <div className={styles.megaGrid}>
                <Link href="/movies" prefetch={false} className={styles.megaItem} onClick={() => setMobileMenuOpen(false)}>
                  <div className={styles.megaItemTitleRow}>
                    <svg className={styles.megaItemIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                      <polyline points="17 6 23 6 23 12" />
                    </svg>
                    <span className={styles.megaItemTitle}>Trending Movies</span>
                  </div>
                  <p className={styles.megaItemDesc}>Catch up with the world and see what movies are currently trending. From viral...</p>
                </Link>

                <Link href="/movies?filter=top_rated" prefetch={false} className={styles.megaItem} onClick={() => setMobileMenuOpen(false)}>
                  <div className={styles.megaItemTitleRow}>
                    <svg className={styles.megaItemIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m10 12.5-6.2 1.3a1 1 0 0 1-1.1-.7l-.5-2.2a1 1 0 0 1 .7-1.3l13.5-4.4" />
                      <path d="m13.5 11.7 4.3-.9" />
                      <path d="m16 21-3.1-6.2" />
                      <path d="M16.5 6a2 2 0 0 1 1.4-2.5l1.1-.3a2 2 0 0 1 2.4 1.5l.3 1.1a2 2 0 0 1-1.5 2.4l-1.1.3A2 2 0 0 1 16.5 6z" />
                      <path d="m6.1 13.9.5 2.1a1 1 0 0 0 1.1.7l2.5-.5" />
                      <path d="M8.5 18 12 13.5" />
                    </svg>
                    <span className={styles.megaItemTitle}>Discover</span>
                    <span className={styles.megaItemBadge}>NEW</span>
                  </div>
                  <p className={styles.megaItemDesc}>Unearth new movies and hidden gems in the vast landscape of cinema. Whether...</p>
                </Link>

                <Link href="/movies" prefetch={false} className={styles.megaItem} onClick={() => setMobileMenuOpen(false)}>
                  <div className={styles.megaItemTitleRow}>
                    <svg className={styles.megaItemIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    <span className={styles.megaItemTitle}>Popular</span>
                  </div>
                  <p className={styles.megaItemDesc}>Dive into the world of popular movies that have captured the hearts of audience...</p>
                </Link>

                <Link href="/movies?filter=now_playing" prefetch={false} className={styles.megaItem} onClick={() => setMobileMenuOpen(false)}>
                  <div className={styles.megaItemTitleRow}>
                    <svg className={styles.megaItemIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="6 4 18 12 6 20 6 4" />
                    </svg>
                    <span className={styles.megaItemTitle}>In Theaters</span>
                  </div>
                  <p className={styles.megaItemDesc}>Don't miss out on the latest cinema releases and blockbuster movies now showing...</p>
                </Link>

                <Link href="/movies?filter=4k" prefetch={false} className={styles.megaItem} onClick={() => setMobileMenuOpen(false)}>
                  <div className={styles.megaItemTitleRow}>
                    <svg className={styles.megaItemIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="7" width="20" height="15" rx="2" />
                      <polyline points="17 2 12 7 7 2" />
                    </svg>
                    <span className={styles.megaItemTitle}>4K Ultra HD</span>
                    <span className={styles.megaItemBadge}>4K</span>
                  </div>
                  <p className={styles.megaItemDesc}>Tune in to crystal clear 4K resolution movies with ultra high bitrate streaming...</p>
                </Link>

                <Link href="/movies?filter=top_rated" prefetch={false} className={styles.megaItem} onClick={() => setMobileMenuOpen(false)}>
                  <div className={styles.megaItemTitleRow}>
                    <svg className={styles.megaItemIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    <span className={styles.megaItemTitle}>Top Rated</span>
                  </div>
                  <p className={styles.megaItemDesc}>Explore the pinnacle of cinema excellence with our collection of top-rated...</p>
                </Link>
              </div>
            </div>
          </div>

          {/* TV Shows Mega Dropdown */}
          <div
            className={`${styles.navLinkDropdown} ${styles.megaDropdownWrapper} ${
              expandedMenu === 'tv' || hoveredMenu === 'tv' ? styles.expanded : ''
            } ${hoveredMenu === 'tv' ? styles.hoverActive : ''}`}
            onMouseEnter={() => handleMenuEnter('tv')}
            onMouseLeave={handleMenuLeave}
          >
            <div className={styles.navLink} onClick={() => handleDropdownClick('tv')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>
              TV Shows
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.chevron}><path d="M6 9l6 6 6-6" /></svg>
            </div>
            <div
              className={`${styles.dropdownMenu} ${styles.megaDropdownMenu} ${styles.tvMegaDropdown} ${
                hoveredMenu === 'tv' ? styles.megaDropdownOpen : ''
              }`}
              onMouseEnter={() => handleMenuEnter('tv')}
              onMouseLeave={handleMenuLeave}
            >
              <div className={styles.megaHeader}>
                <div className={styles.megaTitle}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>
                  <span>TV Shows</span>
                </div>
                <p className={styles.megaDesc}>
                  Embark on a journey through the world of TV shows. From the latest hits to timeless classics, discover new stories and revisit your favorites.
                </p>
              </div>

              <div className={styles.megaGrid}>
                <Link href="/tv" prefetch={false} className={styles.megaItem} onClick={() => setMobileMenuOpen(false)}>
                  <div className={styles.megaItemTitleRow}>
                    <svg className={styles.megaItemIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                      <polyline points="17 6 23 6 23 12" />
                    </svg>
                    <span className={styles.megaItemTitle}>Trending TV Shows</span>
                  </div>
                  <p className={styles.megaItemDesc}>Catch up with the world and see what TV shows are currently trending. From viral...</p>
                </Link>

                <Link href="/tv?filter=top_rated" prefetch={false} className={styles.megaItem} onClick={() => setMobileMenuOpen(false)}>
                  <div className={styles.megaItemTitleRow}>
                    <svg className={styles.megaItemIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m10 12.5-6.2 1.3a1 1 0 0 1-1.1-.7l-.5-2.2a1 1 0 0 1 .7-1.3l13.5-4.4" />
                      <path d="m13.5 11.7 4.3-.9" />
                      <path d="m16 21-3.1-6.2" />
                      <path d="M16.5 6a2 2 0 0 1 1.4-2.5l1.1-.3a2 2 0 0 1 2.4 1.5l.3 1.1a2 2 0 0 1-1.5 2.4l-1.1.3A2 2 0 0 1 16.5 6z" />
                      <path d="m6.1 13.9.5 2.1a1 1 0 0 0 1.1.7l2.5-.5" />
                      <path d="M8.5 18 12 13.5" />
                    </svg>
                    <span className={styles.megaItemTitle}>Discover</span>
                    <span className={styles.megaItemBadge}>NEW</span>
                  </div>
                  <p className={styles.megaItemDesc}>Unearth new TV shows and hidden gems in the vast landscape of television. Whether...</p>
                </Link>

                <Link href="/tv" prefetch={false} className={styles.megaItem} onClick={() => setMobileMenuOpen(false)}>
                  <div className={styles.megaItemTitleRow}>
                    <svg className={styles.megaItemIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    <span className={styles.megaItemTitle}>Popular</span>
                  </div>
                  <p className={styles.megaItemDesc}>Dive into the world of popular TV shows that have captured the hearts of audience...</p>
                </Link>

                <Link href="/tv?filter=airing_today" prefetch={false} className={styles.megaItem} onClick={() => setMobileMenuOpen(false)}>
                  <div className={styles.megaItemTitleRow}>
                    <svg className={styles.megaItemIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="6 4 18 12 6 20 6 4" />
                    </svg>
                    <span className={styles.megaItemTitle}>Airing Today</span>
                  </div>
                  <p className={styles.megaItemDesc}>Don't miss out on the latest episodes of your favorite TV shows airing today. Stay...</p>
                </Link>

                <Link href="/tv?filter=on_the_air" prefetch={false} className={styles.megaItem} onClick={() => setMobileMenuOpen(false)}>
                  <div className={styles.megaItemTitleRow}>
                    <svg className={styles.megaItemIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4.93 4.93a10 10 0 0 1 14.14 0" />
                      <path d="M7.76 7.76a6 6 0 0 1 8.48 0" />
                      <circle cx="12" cy="12" r="2" />
                    </svg>
                    <span className={styles.megaItemTitle}>On The Air</span>
                  </div>
                  <p className={styles.megaItemDesc}>Tune in to the latest buzz with shows currently on the air. From gripping dramas...</p>
                </Link>

                <Link href="/tv?filter=top_rated" prefetch={false} className={styles.megaItem} onClick={() => setMobileMenuOpen(false)}>
                  <div className={styles.megaItemTitleRow}>
                    <svg className={styles.megaItemIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    <span className={styles.megaItemTitle}>Top Rated</span>
                  </div>
                  <p className={styles.megaItemDesc}>Explore the pinnacle of television excellence with our collection of top-rated...</p>
                </Link>
              </div>
            </div>
          </div>

          <Link href="/anime" prefetch={false} className={`${styles.navLink} ${pathname === '/anime' ? styles.active : ''}`} onClick={() => setMobileMenuOpen(false)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 17.5L3 6l4-4 11.5 11.5L21 16l-1 4-4 1-2.5-3.5z" /></svg>
            Anime
          </Link>

          <Link href="/movies?filter=4k" prefetch={false} className={`${styles.navLink} ${pathname === '/movies' ? styles.active : ''}`} onClick={() => setMobileMenuOpen(false)}>
            <span className={styles.badge4k}>4K</span>
            Movies
          </Link>

          <Link href="/live-tv" prefetch={false} className={`${styles.navLink} ${pathname === '/live-tv' ? styles.active : ''}`} onClick={() => setMobileMenuOpen(false)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12h4l2-9 4 18 2-9h4" /></svg>
            Live TV
          </Link>

          <Link href="/android-app" prefetch={false} className={`${styles.navLink} ${pathname === '/android-app' ? styles.active : ''}`} onClick={() => setMobileMenuOpen(false)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18h12v-6a6 6 0 0 0-12 0v6z" /><path d="M6 12h-2v6h2" /><path d="M18 12h2v6h-2" /><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="9" r="1" fill="currentColor"/><path d="M8 5l-2-2" /><path d="M16 5l2-2" /></svg>
            Android App
          </Link>

          <Link href="/saved" prefetch={false} className={`${styles.navLink} ${styles.showOnMobile}`} onClick={() => setMobileMenuOpen(false)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
            Saved
          </Link>
          
          <div className={`${styles.navLink} ${styles.showOnMobile}`} style={{ cursor: 'pointer' }} onClick={() => setMobileMenuOpen(false)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
            Download
          </div>

          {/* More Dropdown */}
          <div className={`${styles.navLinkDropdown} ${expandedMenu === 'more' ? styles.expanded : ''}`}>
            <div className={styles.navLink} onClick={() => handleDropdownClick('more')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></svg>
              More
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.chevron}><path d="M6 9l6 6 6-6" /></svg>
            </div>
            <div className={styles.dropdownMenu}>
              <Link href="/anime" prefetch={false} className={styles.dropdownItem} onClick={() => setMobileMenuOpen(false)}>Anime</Link>
              <Link href="/live-tv" prefetch={false} className={styles.dropdownItem} onClick={() => setMobileMenuOpen(false)}>Live TV</Link>
              <Link href="/movies?filter=now_playing" prefetch={false} className={styles.dropdownItem} onClick={() => setMobileMenuOpen(false)}>In Theaters</Link>
            </div>
          </div>

          {/* Mobile Auth Section */}
          <div className={styles.mobileAuthRow}>
            {!user ? (
              <>
                <Link href="/login" prefetch={false} className={styles.mobileLoginBtn} onClick={() => setMobileMenuOpen(false)}>
                  Sign In
                </Link>
                <Link href="/signup" prefetch={false} className={styles.mobileSignupBtn} onClick={() => setMobileMenuOpen(false)}>
                  Sign Up
                </Link>
              </>
            ) : (
              <div className={styles.mobileUserMenu}>
                <span className={styles.mobileUserName}>Logged in as <strong>{user.name}</strong></span>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className={styles.mobileLogoutBtn}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', marginRight: '4px' }}>
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.rightSection} ref={searchContainerRef}>
        <button className={`${styles.iconButton} ${styles.hideOnMobile}`} aria-label="Download">
          <svg className={styles.navActionIcon} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
        </button>

        {showSearch ? (
          <div className={styles.searchWrapper}>
            <form onSubmit={handleSearchSubmit} className={styles.searchBox}>
              <input
                ref={searchInputRef}
                type="text"
                className={styles.searchInput}
                placeholder="Search movies, tv..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button type="submit" className={styles.iconButton} style={{ opacity: 1 }}>
                <svg className={styles.navActionIcon} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </button>
              <button type="button" className={styles.clearBtn} onClick={() => { setShowSearch(false); setSuggestions([]); }}>
                ✕
              </button>
            </form>

            {/* Suggestions Popup */}
            {(suggestions.length > 0 || loadingSuggestions) && (
              <div className={styles.suggestionsDropdown}>
                {loadingSuggestions && suggestions.length === 0 ? (
                  <div className={styles.suggestionLoading}>Searching...</div>
                ) : (
                  <>
                    {suggestions.map((item) => {
                      const year = (item.release_date || item.first_air_date || '').split('-')[0];
                      const poster = item.poster_path
                        ? `https://image.tmdb.org/t/p/w92${item.poster_path}`
                        : 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=100&auto=format&fit=crop';

                      return (
                        <div
                          key={item.id}
                          className={styles.suggestionItem}
                          onClick={() => handleSelectSuggestion(item)}
                        >
                          <img
                            src={poster}
                            alt={item.title || item.name}
                            className={styles.suggestionPoster}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.onerror = null;
                              target.src = 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=100&auto=format&fit=crop';
                            }}
                          />
                          <div className={styles.suggestionInfo}>
                            <div className={styles.suggestionTitle}>
                              {item.title || item.name}
                            </div>
                            <div className={styles.suggestionMeta}>
                              <span className={styles.suggestionType}>
                                {item.media_type === 'tv' ? 'TV' : 'Movie'}
                              </span>
                              {year && <span>• {year}</span>}
                              {item.vote_average > 0 && (
                                <span className={styles.suggestionRating}>
                                  ★ {item.vote_average.toFixed(1)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div
                      className={styles.viewAllFooter}
                      onClick={() => handleSearchSubmit()}
                    >
                      View all results for "{query}" →
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          <button className={styles.iconButton} onClick={() => setShowSearch(true)} aria-label="Search">
            <svg className={styles.navActionIcon} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </button>
        )}

        <Link href="/saved" prefetch={false} className={`${styles.iconButton} ${styles.hideOnMobile}`} aria-label="Saved" title="Saved">
          <svg className={styles.navActionIcon} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </Link>

        {user ? (
          <div className={styles.userProfileGroup} ref={userMenuRef}>
            <button
              type="button"
              className={`${styles.userAvatarBtn} ${userMenuOpen ? styles.userAvatarBtnActive : ''}`}
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              aria-label="User account menu"
              aria-expanded={userMenuOpen}
              title={`Account: ${user.name || user.email}`}
            >
              <svg className={styles.userIcon} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
            </button>

            {userMenuOpen && (
              <div className={styles.userDropdownMenu}>
                <div className={styles.userDropdownHeader}>
                  <div className={styles.userDropdownAvatar}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                  </div>
                  <div className={styles.userDropdownInfo}>
                    <span className={styles.userDropdownName}>{user.name || 'User'}</span>
                    <span className={styles.userDropdownEmail}>{user.email}</span>
                  </div>
                </div>

                <div className={styles.userDropdownDivider} />

                <Link
                  href="/saved"
                  prefetch={false}
                  className={styles.userDropdownItem}
                  onClick={() => setUserMenuOpen(false)}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                  <span>Saved Titles</span>
                </Link>

                <Link
                  href="/continue-watching"
                  prefetch={false}
                  className={styles.userDropdownItem}
                  onClick={() => setUserMenuOpen(false)}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  <span>Continue Watching</span>
                </Link>

                <div className={styles.userDropdownDivider} />

                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    logout();
                  }}
                  className={styles.userDropdownLogoutBtn}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.authButtons}>
            <Link href="/login" prefetch={false} className={styles.loginBtn}>
              Sign In
            </Link>
            <Link href="/signup" prefetch={false} className={styles.signupBtn}>
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
