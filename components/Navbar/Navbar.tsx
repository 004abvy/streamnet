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
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className={styles.navbar}>
      <Link href="/" className={styles.logo}>
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

      <button className={styles.mobileMenuBtn} onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu">
        {mobileMenuOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        )}
      </button>

      <div className={`${styles.navLinks} ${mobileMenuOpen ? styles.navLinksOpen : ''}`}>
        
        {/* Bottom Sheet Header */}
        <div className={styles.bottomSheetHeader}>
          <div className={styles.dragHandle}></div>
          <h3 className={styles.menuTitle}>Menu</h3>
        </div>

        <Link href="/" className={`${styles.navLink} ${pathname === '/' ? styles.active : ''}`} onClick={() => setMobileMenuOpen(false)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
          Home
        </Link>

        {/* Movies Dropdown */}
        <div className={`${styles.navLinkDropdown} ${expandedMenu === 'movies' ? styles.expanded : ''}`}>
          <div className={styles.navLink} onClick={() => setExpandedMenu(expandedMenu === 'movies' ? null : 'movies')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line></svg>
            Movies
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.chevron}><path d="M6 9l6 6 6-6" /></svg>
          </div>
          <div className={styles.dropdownMenu}>
            <Link href="/movies" className={styles.dropdownItem} onClick={() => setMobileMenuOpen(false)}>Popular</Link>
            <Link href="/movies?filter=top_rated" className={styles.dropdownItem} onClick={() => setMobileMenuOpen(false)}>Top Rated</Link>
            <Link href="/movies?filter=4k" className={styles.dropdownItem} onClick={() => setMobileMenuOpen(false)}>
              <span className={styles.badge4k}>4K</span> 4K Ultra HD
            </Link>
            <Link href="/movies?filter=upcoming" className={styles.dropdownItem} onClick={() => setMobileMenuOpen(false)}>Upcoming</Link>
            <Link href="/movies?filter=now_playing" className={styles.dropdownItem} onClick={() => setMobileMenuOpen(false)}>Now Playing</Link>
          </div>
        </div>

        {/* TV Shows Dropdown */}
        <div className={`${styles.navLinkDropdown} ${expandedMenu === 'tv' ? styles.expanded : ''}`}>
          <div className={styles.navLink} onClick={() => setExpandedMenu(expandedMenu === 'tv' ? null : 'tv')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>
            TV Shows
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.chevron}><path d="M6 9l6 6 6-6" /></svg>
          </div>
          <div className={styles.dropdownMenu}>
            <Link href="/tv" className={styles.dropdownItem} onClick={() => setMobileMenuOpen(false)}>Popular Shows</Link>
            <Link href="/tv?filter=top_rated" className={styles.dropdownItem} onClick={() => setMobileMenuOpen(false)}>Top Rated</Link>
            <Link href="/tv?filter=on_the_air" className={styles.dropdownItem} onClick={() => setMobileMenuOpen(false)}>On The Air</Link>
            <Link href="/tv?filter=airing_today" className={styles.dropdownItem} onClick={() => setMobileMenuOpen(false)}>Airing Today</Link>
          </div>
        </div>

        <Link href="/anime" className={`${styles.navLink} ${pathname === '/anime' ? styles.active : ''}`} onClick={() => setMobileMenuOpen(false)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 17.5L3 6l4-4 11.5 11.5L21 16l-1 4-4 1-2.5-3.5z" /></svg>
          Anime
        </Link>

        <Link href="/movies?filter=4k" className={`${styles.navLink} ${pathname === '/movies' ? styles.active : ''}`} onClick={() => setMobileMenuOpen(false)}>
          <span className={styles.badge4k}>4K</span>
          Movies
        </Link>

        <Link href="/live-tv" className={`${styles.navLink} ${pathname === '/live-tv' ? styles.active : ''}`} onClick={() => setMobileMenuOpen(false)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12h4l2-9 4 18 2-9h4" /></svg>
          Live TV
        </Link>

        <Link href="/live-sports" className={`${styles.navLink} ${pathname === '/live-sports' ? styles.active : ''}`} onClick={() => setMobileMenuOpen(false)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 21h8M12 17v4M7 4h10M5 4h14a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M4 9a8 8 0 0 0 16 0" /></svg>
          Live Sports
        </Link>
        
        <Link href="/android-app" className={`${styles.navLink} ${pathname === '/android-app' ? styles.active : ''}`} onClick={() => setMobileMenuOpen(false)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18h12v-6a6 6 0 0 0-12 0v6z" /><path d="M6 12h-2v6h2" /><path d="M18 12h2v6h-2" /><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="9" r="1" fill="currentColor"/><path d="M8 5l-2-2" /><path d="M16 5l2-2" /></svg>
          Android App
        </Link>

        <Link href="/saved" className={`${styles.navLink} ${styles.showOnMobile}`} onClick={() => setMobileMenuOpen(false)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
          Saved
        </Link>
        
        <div className={`${styles.navLink} ${styles.showOnMobile}`} style={{ cursor: 'pointer' }} onClick={() => setMobileMenuOpen(false)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
          Download
        </div>

        {/* More Dropdown */}
        <div className={`${styles.navLinkDropdown} ${expandedMenu === 'more' ? styles.expanded : ''}`}>
          <div className={styles.navLink} onClick={() => setExpandedMenu(expandedMenu === 'more' ? null : 'more')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></svg>
            More
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.chevron}><path d="M6 9l6 6 6-6" /></svg>
          </div>
          <div className={styles.dropdownMenu}>
            <Link href="/anime" className={styles.dropdownItem} onClick={() => setMobileMenuOpen(false)}>Anime</Link>
            <Link href="/live-tv" className={styles.dropdownItem} onClick={() => setMobileMenuOpen(false)}>Live TV</Link>
            <Link href="/movies?filter=now_playing" className={styles.dropdownItem} onClick={() => setMobileMenuOpen(false)}>In Theaters</Link>
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

        <Link href="/saved" className={`${styles.iconButton} ${styles.hideOnMobile}`} aria-label="Saved" title="Saved">
          <svg className={styles.navActionIcon} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </Link>

        {user ? (
          <div className={styles.navLinkDropdown} ref={userMenuRef}>
            <button
              className={styles.iconButton}
              aria-label="Account"
              onClick={() => setUserMenuOpen((prev) => !prev)}
            >
              <svg className={styles.navActionIcon} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
            </button>
            <div
              className={`${styles.dropdownMenu} ${styles.userDropdownMenu} ${userMenuOpen ? styles.userDropdownMenuOpen : ''}`}
            >
              <div
                className={styles.dropdownItem}
                style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', cursor: 'default', fontWeight: 600, color: '#fff' }}
              >
                {user.name}
              </div>
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  logout();
                }}
                className={styles.dropdownItem}
                style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', color: '#ff2e3a', outline: 'none' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        ) : (
          <Link href="/login" className={styles.loginBtn}>
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}
