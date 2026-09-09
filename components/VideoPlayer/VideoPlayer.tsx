'use client';

import { type CSSProperties, useEffect, useRef, useState } from 'react';
import styles from './VideoPlayer.module.css';
import { ALL_PROVIDERS, ProviderAdapter } from '../../utils/serverManager';
import {
  installAdblockProtection,
  resolveServerIframeAttributes,
} from '../../utils/adblockFramework';

type AspectMode = 'fit' | 'zoom' | 'stretch';

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
    case 'page_leave_intercepted':
      return '🚫 Page-hijack redirect blocked';
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
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [aspectMode, setAspectMode] = useState<AspectMode>('fit');
  const [zoomScale, setZoomScale] = useState(1);

  // AdShield (native sandbox + parent-window popup/ad blocker) always runs
  // while playing — not user-toggleable, no status UI shown for it anymore.
  const shieldActive = true;
  const [blockedCount, setBlockedCount] = useState(0);
  const [blockToast, setBlockToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

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

  useEffect(() => {
    if (!isPlaying || activeProvider.id !== 'cinesrc') return;

    let orientationLocked = false;
    const handleFullscreenChange = () => {
      const orientation = window.screen.orientation as ScreenOrientation & {
        lock?: (orientation: 'landscape') => Promise<void>;
      };
      if (!orientation || typeof orientation.lock !== 'function') return;

      if (document.fullscreenElement !== iframeRef.current) {
        if (orientationLocked) {
          orientation.unlock();
          orientationLocked = false;
        }
        return;
      }

      orientation.lock('landscape').then(() => {
        if (document.fullscreenElement === iframeRef.current) {
          orientationLocked = true;
        } else {
          orientation.unlock();
        }
      }).catch(() => {
        orientationLocked = false;
      });
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (orientationLocked) window.screen.orientation.unlock();
    };
  }, [activeProvider.id, isPlaying]);

  const posterUrl = backdropPath
    ? `https://image.tmdb.org/t/p/w1280${backdropPath}`
    : '/fallback-backdrop.jpg';

  const currentIframeUrl = activeProvider.buildUrl(type, tmdbId, season, episode, imdbId);
  const iframeSecurity = resolveServerIframeAttributes(activeProvider.id, currentIframeUrl, shieldActive);
  const iframeModeClass = aspectMode === 'zoom'
    ? styles.iframeZoom
    : aspectMode === 'stretch'
      ? styles.iframeStretch
      : styles.iframeFit;
  const iframeStyle = { '--player-scale': zoomScale } as CSSProperties;

  const updateZoom = (nextScale: number) => {
    setZoomScale(Math.min(2.5, Math.max(1, Number(nextScale.toFixed(2)))));
  };

  return (
    <div className={styles.container}>
      {isPlaying && !bannerDismissed && (
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
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
              Change Server
            </button>
            <button
              type="button"
              onClick={() => setBannerDismissed(true)}
              aria-label="Dismiss"
              title="Dismiss"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fbbf24',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: 'pointer',
                lineHeight: 1,
                padding: '0.1rem 0.3rem',
              }}
            >
              ✕
            </button>
          </div>
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
              ref={iframeRef}
              className={`${styles.iframe} ${iframeModeClass}`}
              style={iframeStyle}
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
                        setAspectMode('fit');
                        setZoomScale(1);
                        setIsPlaying(true);
                        setShowServerModal(false);
                      }}
                      type="button"
                    >
                      <div className={styles.cardTopRow}>
                        <span className={styles.serverCardName}>
                          {provider.name}
                        </span>
                        <span className={styles.qualityTag}>{provider.capabilities.quality}</span>
                        {isActive && <span className={styles.activeCheckIcon}>✓</span>}
                      </div>
                    </button>
                  );
                })}
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
            <span>{activeProvider.name}</span>
            <span className={styles.qualityTag}>{activeProvider.capabilities.quality}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {activeProvider.id === 'cinesrc' && (
            <div className={styles.playerControlGroup}>
              <span className={styles.controlGroupLabel}>View</span>
              <div className={styles.modePillGroup} aria-label="Cinesrc aspect mode">
                {(['fit', 'zoom', 'stretch'] as const).map((mode) => (
                  <button
                    key={mode}
                    className={`${styles.modePill} ${aspectMode === mode ? styles.activeModePill : ''}`}
                    onClick={() => {
                      setAspectMode(mode);
                      setZoomScale(1);
                    }}
                    aria-pressed={aspectMode === mode}
                    title={`${mode[0].toUpperCase()}${mode.slice(1)} video`}
                    type="button"
                  >
                    {mode[0].toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeProvider.id === 'cinesrc' && (
            <div className={styles.playerControlGroup}>
              <span className={styles.controlGroupLabel}>Zoom</span>
              <div className={styles.zoomControls} aria-label="Cinesrc zoom controls">
              <button
                className={styles.zoomButton}
                onClick={() => updateZoom(zoomScale - 0.1)}
                disabled={zoomScale <= 1}
                aria-label="Zoom out"
                title="Zoom out"
                type="button"
              >
                −
              </button>
              <input
                className={styles.zoomSlider}
                type="range"
                min="1"
                max="2.5"
                step="0.05"
                value={zoomScale}
                onChange={(event) => updateZoom(Number(event.target.value))}
                aria-label="Zoom level"
                aria-valuetext={`${Math.round(zoomScale * 100)} percent`}
              />
              <button
                className={styles.zoomButton}
                onClick={() => updateZoom(zoomScale + 0.1)}
                disabled={zoomScale >= 2.5}
                aria-label="Zoom in"
                title="Zoom in"
                type="button"
              >
                +
              </button>
              <button
                className={styles.zoomValue}
                onClick={() => updateZoom(1)}
                title="Reset zoom"
                type="button"
              >
                {Math.round(zoomScale * 100)}%
              </button>
              </div>
            </div>
          )}
        </div>

        <div className={styles.toolbarRight}>
          {blockedCount > 0 && (
            <span className={styles.blockedBadge}>{blockedCount} Blocked</span>
          )}
        </div>
      </div>
    </div>
  );
}
