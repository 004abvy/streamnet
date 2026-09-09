'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './VideoPlayer.module.css';
import { ALL_PROVIDERS, ProviderAdapter } from '../../utils/serverManager';
import {
  installAdblockProtection,
  resolveServerIframeAttributes,
  getAdShieldPreference,
  setAdShieldPreference,
} from '../../utils/adblockFramework';

interface VideoPlayerProps {
  tmdbId: string;
  type: 'movie' | 'tv';
  title?: string;
  backdropPath?: string;
  season?: number;
  episode?: number;
  imdbId?: string;
  onEpisodeChange?: (season: number, episode: number) => void;
}

/** Human-readable labels for AdShield block events, shown in the live toast. */
function formatBlockedLabel(actionType: string): string {
  switch (actionType) {
    case 'popup_blocked':
      return '🚫 Popup window blocked';
    case 'navigation_redirect_forbidden':
      return '🚫 Redirect to ad page blocked';
    case 'ad_event_listener_prevented':
      return '🚫 Ad click-trap defused';
    case 'newtab_link_disabled':
      return '🚫 New-tab ad link blocked';
    case 'synthetic_click_prevented':
      return '🚫 Hidden ad click blocked';
    case 'form_submit_prevented':
      return '🚫 Ad form submit blocked';
    case 'fetch_ad_blocked':
    case 'xhr_ad_blocked':
      return '🚫 Ad network request blocked';
    case 'overlay_buster_activated':
      return '🚫 Fullscreen overlay removed';
    case 'rogue_iframe_blocked':
      return '🚫 Rogue iframe removed';
    case 'z_axis_defused':
      return '🚫 Ad popup neutralized';
    case 'notification_suppressed':
      return '🚫 Fake alert blocked';
    default:
      return '🚫 Threat blocked';
  }
}

export default function VideoPlayer({
  tmdbId,
  type,
  backdropPath,
  season,
  episode,
  imdbId,
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeProvider, setActiveProvider] = useState<ProviderAdapter>(ALL_PROVIDERS[0]);
  const [showServerModal, setShowServerModal] = useState(false);

  // --- AdShield: native sandbox on CineSrc + parent-window popup/ad blocker ---
  // Lazy initializer: safe because shieldActive only affects rendered output
  // once isPlaying is true, which never happens before hydration.
  const [shieldActive, setShieldActive] = useState<boolean>(() => getAdShieldPreference());
  const [blockedCount, setBlockedCount] = useState(0);
  const [blockToast, setBlockToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Install the full uBlock-style protection suite only while the embed is live
  useEffect(() => {
    if (!isPlaying) return;

    const cleanup = installAdblockProtection(shieldActive, (actionType) => {
      setBlockedCount((count) => count + 1);
      setBlockToast(formatBlockedLabel(actionType));
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => setBlockToast(null), 2500);
    });

    return () => {
      cleanup();
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [isPlaying, shieldActive]);

  const toggleShield = () => {
    setShieldActive((prev) => {
      const next = !prev;
      setAdShieldPreference(next);
      return next;
    });
  };

  const posterUrl = backdropPath
    ? `https://image.tmdb.org/t/p/w1280${backdropPath}`
    : '/fallback-backdrop.jpg';

  const currentIframeUrl = activeProvider.buildUrl(type, tmdbId, season, episode, imdbId);
  const iframeSecurity = resolveServerIframeAttributes(activeProvider.id, currentIframeUrl, shieldActive);

  return (
    <div className={styles.container}>
      {isPlaying && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            padding: '0.6rem 0.9rem',
            background: 'rgba(245, 158, 11, 0.08)',
            borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
            fontSize: '0.8rem',
            color: '#fbbf24',
            fontWeight: 600,
          }}
        >
          <span>⚠️ Video not loading, stuck, or showing ads? Try switching the server.</span>
          <button
            type="button"
            onClick={() => setShowServerModal(true)}
            style={{
              flexShrink: 0,
              background: '#f59e0b',
              color: '#111',
              border: 'none',
              borderRadius: '6px',
              padding: '0.35rem 0.75rem',
              fontWeight: 700,
              fontSize: '0.78rem',
              cursor: 'pointer',
            }}
          >
            🔁 Change Server
          </button>
        </div>
      )}

      <div className={styles.playerWrapper}>
        {!isPlaying ? (
          <div
            className={styles.posterOverlay}
            style={{ backgroundImage: `url(${posterUrl})` }}
            onClick={() => setIsPlaying(true)}
          >
            <div className={styles.posterGradient} />
            <button className={styles.playBtn} aria-label="Play video" type="button">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          </div>
        ) : (
          <div className={styles.iframeContainer} style={{ position: 'relative' }}>
            <iframe
              key={`${activeProvider.id}-${iframeSecurity.src}`}
              className={styles.iframe}
              src={iframeSecurity.src}
              {...(iframeSecurity.sandbox ? { sandbox: iframeSecurity.sandbox } : {})}
              allow={iframeSecurity.allow}
              allowFullScreen
              referrerPolicy={iframeSecurity.referrerPolicy}
            />
            {blockToast && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '14px',
                  left: '14px',
                  background: 'rgba(5, 150, 105, 0.95)',
                  color: '#fff',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
                  zIndex: 5,
                  pointerEvents: 'none',
                }}
              >
                {blockToast}
              </div>
            )}
          </div>
        )}

        {/* Sleek Server Selection Modal */}
        {showServerModal && (
          <div className={styles.serverModalOverlay} onClick={() => setShowServerModal(false)}>
            <div className={styles.serverModalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <span className={styles.modalHeaderTitle}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                    <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                  </svg>
                  Select Server
                </span>
                <button
                  className={styles.closeModalBtn}
                  onClick={() => setShowServerModal(false)}
                  type="button"
                >
                  ✕
                </button>
              </div>

              <div className={styles.modalServerGrid}>
                {ALL_PROVIDERS.map((provider) => {
                  const isActive = activeProvider.id === provider.id;
                  return (
                    <button
                      key={provider.id}
                      className={`${styles.modalServerCard} ${isActive ? styles.activeModalServerCard : ''}`}
                      onClick={() => {
                        setActiveProvider(provider);
                        setIsPlaying(true);
                        setShowServerModal(false);
                      }}
                      type="button"
                    >
                      <div className={styles.cardTopRow}>
                        <span className={styles.serverCardName}>
                          {provider.flag ? `${provider.flag} ` : ''}
                          {provider.name}
                          {isActive && <span className={styles.activeCheckIcon}>✓</span>}
                        </span>
                        <span className={styles.qualityTag}>{provider.capabilities.quality}</span>
                      </div>
                      {provider.description && (
                        <span className={styles.serverCardDesc}>{provider.description}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* AdShield VIP Status Card */}
              <div className={styles.shieldStatusCard}>
                <div className={styles.shieldStatusLeft}>
                  <span className={styles.shieldStatusPulse}>
                    <span className={styles.shieldDot} />
                    {shieldActive && <span className={styles.shieldRing} />}
                  </span>
                  <div>
                    <div className={styles.shieldStatusTitle}>
                      🛡️ AdShield Protection
                      {blockedCount > 0 && (
                        <span className={styles.activeBadge}>{blockedCount} Blocked</span>
                      )}
                    </div>
                    <div className={styles.shieldStatusDesc}>
                      {shieldActive
                        ? 'Blocking popups & redirects (native sandbox on CineSrc 4K, script shield elsewhere)'
                        : 'Protection disabled — embeds may show ads or popups'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className={`${styles.shieldToggleBtn} ${shieldActive ? styles.shieldToggleBtnActive : ''}`}
                  onClick={toggleShield}
                  aria-label="Toggle AdShield protection"
                  aria-pressed={shieldActive}
                  title={shieldActive ? 'Disable AdShield' : 'Enable AdShield'}
                >
                  <span className={styles.shieldToggleThumb} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sleek Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          {/* Server Selector Button */}
          <button
            className={styles.toolbarBtn}
            onClick={() => setShowServerModal(true)}
            title="Change Server"
            type="button"
          >
            <span>{activeProvider.flag || '🌐'} {activeProvider.name}</span>
            <span className={styles.qualityTag}>{activeProvider.capabilities.quality}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>

        <div className={styles.toolbarRight}>
          <button
            type="button"
            className={styles.shieldBadge}
            onClick={() => setShowServerModal(true)}
            title={shieldActive ? 'AdShield is active — click for details' : 'AdShield is disabled — click to enable'}
            style={{ cursor: 'pointer', border: 'none' }}
          >
            {shieldActive ? '🛡️ Shielded' : '⚠️ Unshielded'}
            {blockedCount > 0 && (
              <span className={styles.blockedBadge}>{blockedCount} Blocked</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
