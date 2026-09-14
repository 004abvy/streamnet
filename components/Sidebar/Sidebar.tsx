'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import styles from './Sidebar.module.css';
import {
  Home,
  Search,
  Compass,
  Bot,
  Film,
  Monitor,
  Trophy,
  Tv,
  Radio,
  BookOpen,
  Eye,
  VenetianMask,
  FolderOpen,
  Library,
  Settings,
  Menu,
  Command,
  Bell,
  User,
  X
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setShowSearch(false);
      setMobileMenuOpen(false);
    }
  };

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const sidebarLinks = [
    { label: 'Home', link: '/', icon: Home },
    { label: 'Search', action: 'search', icon: Search },
    { label: 'Discover', link: '/discover', icon: Compass },
    { label: 'RiveAI', link: '/ai', icon: Bot, isAi: true },
    { label: 'Movies', link: '/movies', icon: Film },
    { label: 'TV Shows', link: '/tv', icon: Monitor },
    { label: 'Sports', link: '/live-sports', icon: Trophy },
    { label: 'Live TV', link: '/live-tv', icon: Tv },
    { label: 'Radio', link: '/radio', icon: Radio },
    { label: 'Manga', link: '/manga', icon: BookOpen },
    { label: 'Anime', link: '/anime', icon: Eye },
    { label: 'KDrama', link: '/kdrama', icon: VenetianMask },
    { label: 'Collections', link: '/collections', icon: FolderOpen },
    { label: 'Library', link: '/library', icon: Library },
    { label: 'Settings', link: '/settings', icon: Settings }
  ];

  const activeIndex = sidebarLinks.findIndex(item => {
    if (!item.link) return false;
    if (item.link === '/') return pathname === '/';
    return pathname.startsWith(item.link);
  });
  const currentActiveIndex = activeIndex === -1 ? 0 : activeIndex;

  const isPathActive = (link?: string) => {
    if (!link) return false;
    if (link === '/') return pathname === '/';
    return pathname.startsWith(link);
  };

  const getIconColor = (link?: string, isAi?: boolean) => {
    if (isAi) return '#eab308';
    return isPathActive(link) ? '#ffffff' : 'rgba(255, 255, 255, 0.75)';
  };

  return (
    <>
      {/* Desktop Matte Clear Glass Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarInner}>
          {sidebarLinks.map((item, idx) => {
            const Icon = item.icon;
            const active = isPathActive(item.link);
            const isCurrentActive = idx === currentActiveIndex;

            const itemClass = `${styles.sidebarLink} ${active ? styles.activeLink : ''} ${!isCurrentActive ? styles.hiddenWhenCollapsed : ''
              }`;

            if (item.action === 'search') {
              return (
                <button
                  key={item.label}
                  className={itemClass}
                  onClick={() => setShowSearch(true)}
                  title={item.label}
                >
                  <Icon size={16} color={getIconColor(item.link)} />
                  <span className={styles.tooltip}>{item.label}</span>
                </button>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.link || '/'}
                className={itemClass}
                title={item.label}
              >
                <Icon size={16} color={getIconColor(item.link, item.isAi)} />
                <span className={styles.tooltip}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </aside>

      {/* Desktop Search Overlay */}
      {showSearch && (
        <div className={styles.searchOverlay}>
          <div className={styles.searchContainer}>
            <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
              <Search size={24} className={styles.searchIcon} />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search movies, tv..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={styles.searchInput}
              />
              <button type="button" onClick={() => setShowSearch(false)} className={styles.closeSearchBtn}>
                <X size={24} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Bottom Bar */}
      <nav className={styles.bottomBar}>
        <Link href="/" className={styles.bottomBarLink}>
          <Home color={getIconColor('/')} size={24} />
        </Link>
        <button className={styles.bottomBarLink} onClick={() => { setShowSearch(true); setMobileMenuOpen(false); }}>
          <Search size={24} />
        </button>
        <Link href="/movies" className={styles.bottomBarLink}>
          <Film color={getIconColor('/movies')} size={24} />
        </Link>
        <Link href="/tv" className={styles.bottomBarLink}>
          <Monitor color={getIconColor('/tv')} size={24} />
        </Link>
        <Link href="/library" className={styles.bottomBarLink}>
          <Library color={getIconColor('/library')} size={24} />
        </Link>
        <button className={styles.bottomBarLink} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Dropdown / Overlay Menu */}
      {mobileMenuOpen && (
        <div className={styles.mobileDropdownOverlay}>
          <div className={styles.mobileDropdownContent}>
            <div className={styles.userProfileSection}>
              <div className={styles.userAvatar}>
                <User size={24} />
              </div>
              <div className={styles.userInfo}>
                {user ? (
                  <>
                    <div className={styles.userName}>{user.name || 'User'}</div>
                    <div className={styles.userSub} onClick={() => logout()}>Sign out</div>
                  </>
                ) : (
                  <>
                    <div className={styles.userName}>Guest User</div>
                    <Link href="/login" className={styles.userSub}>Sign in to sync your profile</Link>
                  </>
                )}
              </div>
            </div>

            <div className={styles.menuGrid}>
              <div className={styles.menuColumn}>
                <h4 className={styles.menuGroupTitle}>MENU</h4>
                <Link href="/" className={styles.menuItem}>
                  <Home size={18} /> Home
                </Link>
                <button onClick={() => { setShowSearch(true); setMobileMenuOpen(false); }} className={styles.menuItem}>
                  <Search size={18} /> Search
                </button>
                <Link href="/discover" className={styles.menuItem}>
                  <Compass size={18} /> Discover
                </Link>
                <Link href="/command" className={styles.menuItem}>
                  <Command size={18} /> Command Menu
                </Link>
                <Link href="/ai" className={`${styles.menuItem} ${styles.riveAiItem}`}>
                  <Bot size={18} color="#eab308" /> <span style={{ color: '#eab308', fontWeight: 600 }}>RiveAI</span>
                </Link>
                <Link href="/library" className={styles.menuItem}>
                  <Library size={18} /> Library
                </Link>

                <h4 className={styles.menuGroupTitle} style={{ marginTop: '1.5rem' }}>SERVICES</h4>
                <Link href="/live-sports" className={styles.menuItem}>
                  <Trophy size={18} /> Live Sports
                </Link>
                <Link href="/live-tv" className={styles.menuItem}>
                  <Tv size={18} /> IPTV
                </Link>
                <Link href="/radio" className={styles.menuItem}>
                  <Radio size={18} /> Radio
                </Link>
                <Link href="/manga" className={styles.menuItem}>
                  <BookOpen size={18} /> Manga
                </Link>
              </div>

              <div className={styles.menuColumn}>
                <h4 className={styles.menuGroupTitle}>MEDIA</h4>
                <Link href="/movies" className={styles.menuItem}>
                  <Film size={18} /> Movies
                </Link>
                <Link href="/tv" className={styles.menuItem}>
                  <Monitor size={18} /> Tv shows
                </Link>
                <Link href="/anime" className={styles.menuItem}>
                  <Eye size={18} /> Anime
                </Link>
                <Link href="/kdrama" className={styles.menuItem}>
                  <VenetianMask size={18} /> K-Drama
                </Link>
                <Link href="/collections" className={styles.menuItem}>
                  <FolderOpen size={18} /> Collections
                </Link>

                <h4 className={styles.menuGroupTitle} style={{ marginTop: '1.5rem' }}>SYSTEM</h4>
                <Link href="/announcements" className={styles.menuItem}>
                  <Bell size={18} /> Announcements
                </Link>
                <Link href="/settings" className={styles.menuItem}>
                  <Settings size={18} /> Settings
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
