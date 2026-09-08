'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './VideoPlayer.module.css';
import {
  ALL_PROVIDERS,
  getProviderById,
  getLastUsedServerId,
  setLastUsedServerId,
  ProviderAdapter,
} from '../../utils/serverManager';
import { resolveEmbedSecurity } from '../../utils/embedSecurity';
import {
  calculateServerScore,
  isServerCircuitTripped,
  getBestAvailableProvider,
} from '../../utils/serverHealth';
import { PlaybackManager, PlaybackSession } from '../../utils/playbackManager';
import { getPlayerPreferences, updatePlayerPreferences } from '../../utils/playerPreferences';
import { installAdblockProtection, InterceptedPopupInfo } from '../../utils/adblockFramework';

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

export default function VideoPlayer({
  tmdbId,
  type,
  backdropPath,
  season,
  episode,
  imdbId,
  onEpisodeChange,
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showServerModal, setShowServerModal] = useState(false);
  const [sandboxEnabled, setSandboxEnabled] = useState(false);
  const [blockedCount, setBlockedCount] = useState(0);
  const [failoverToast, setFailoverToast] = useState<string | null>(null);

  // Active provider and playback session state
  const [activeProvider, setActiveProvider] = useState<ProviderAdapter>(() => {
    const lastId = getLastUsedServerId();
    return getProviderById(lastId);
  });

  const [sessionState, setSessionState] = useState<PlaybackSession>({
    state: 'idle',
    currentProvider: activeProvider,
    loadStartTime: 0,
  });

  const playbackManagerRef = useRef<PlaybackManager | null>(null);
  const toastTimeoutRef = useRef<any>(null);
  const popupTimeoutRef = useRef<any>(null);

  const [pending1DmPopup, setPending1DmPopup] = useState<InterceptedPopupInfo | null>(null);

  // Initialize preferences and initial best server
  useEffect(() => {
    const prefs = getPlayerPreferences();
    setSandboxEnabled(prefs.sandboxActive);

    const initialProvider = prefs.useSafestServerFirst
      ? getBestAvailableProvider(ALL_PROVIDERS, prefs.preferredServer)
      : getProviderById(getLastUsedServerId());

    setActiveProvider(initialProvider);
  }, []);

  // Initialize PlaybackManager instance
  useEffect(() => {
    const manager = new PlaybackManager(ALL_PROVIDERS, activeProvider, (session) => {
      setSessionState(session);
      setActiveProvider(session.currentProvider);
      setLastUsedServerId(session.currentProvider.id);

      if (session.message) {
        setFailoverToast(session.message);
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = setTimeout(() => {
          setFailoverToast(null);
        }, 4500);
      }
    });

    playbackManagerRef.current = manager;

    return () => {
      manager.destroy();
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
    };
  }, [activeProvider]);

  // Install parent-level uBlock & JS Injector protections during active playback
  useEffect(() => {
    if (!isPlaying) return;
    if (typeof window !== 'undefined' && (window as any).__STREAMNET_BLOCKED_COUNT__) {
      setBlockedCount((c) => Math.max(c, (window as any).__STREAMNET_BLOCKED_COUNT__));
    }
    return installAdblockProtection(
      true,
      (_type, _target) => {
        setBlockedCount((c) => c + 1);
      },
      (popupInfo) => {
        setBlockedCount((c) => c + 1);
        setPending1DmPopup(popupInfo);
        if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
        // Auto-dismiss 1DM prompt after 7 seconds (keeping it blocked by default)
        popupTimeoutRef.current = setTimeout(() => {
          setPending1DmPopup(null);
        }, 7000);
      }
    );
  }, [isPlaying]);

  // Documented cross-frame message listener (CineSrc, VidLink)
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!event.data) return;

      // Delegate to provider adapter if it defines a message handler
      if (activeProvider.handleMessage) {
        const handled = activeProvider.handleMessage(event, onEpisodeChange);
        if (handled) {
          playbackManagerRef.current?.handleIframeLoad();
          return;
        }
      }

      // Legacy fallback handlers
      if (event.origin === 'https://cinesrc.st' && event.data.type === 'cinesrc:nextepisode') {
        const { season: s, episode: e } = event.data;
        if (s && e && onEpisodeChange) onEpisodeChange(s, e);
      }

      if (event.origin === 'https://vidlink.pro' && event.data.type === 'PLAYER_EVENT') {
        if (event.data.data?.event === 'nextEpisode' && season && episode && onEpisodeChange) {
          onEpisodeChange(season, episode + 1);
        }
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [activeProvider, onEpisodeChange, season, episode]);

  // Pre-warms server selection on mouse hover over play button
  const handlePreWarm = useCallback(() => {
    if (isPlaying) return;
    const best = getBestAvailableProvider(ALL_PROVIDERS, activeProvider.id);
    if (best.id !== activeProvider.id) {
      setActiveProvider(best);
    }
  }, [isPlaying, activeProvider.id]);

  const handleStartPlayback = () => {
    setIsPlaying(true);
    playbackManagerRef.current?.startPlayback();
  };

  const handleServerChange = (provider: ProviderAdapter) => {
    setShowServerModal(false);
    setActiveProvider(provider);
    setLastUsedServerId(provider.id);
    updatePlayerPreferences({ preferredServer: provider.id });
    playbackManagerRef.current?.selectServer(provider);
  };

  const toggleSandbox = () => {
    setSandboxEnabled((prev) => {
      const next = !prev;
      updatePlayerPreferences({ sandboxActive: next });
      return next;
    });
  };

  const currentUrl = activeProvider.buildUrl(type, tmdbId, season, episode, imdbId);
  const posterUrl = backdropPath ? `https://image.tmdb.org/t/p/w1280${backdropPath}` : '/fallback-backdrop.jpg';
  const securityAttributes = resolveEmbedSecurity(activeProvider, sandboxEnabled);

  const isBufferingOrMounting =
    isPlaying &&
    (sessionState.state === 'mounting_iframe' ||
      sessionState.state === 'idle');

  return (
    <div className={styles.container}>
      <div className={styles.playerWrapper}>
        {/* Failover Toast Notification */}
        {failoverToast && (
          <div className={styles.failoverToast}>
            <span>⚡</span>
            <span>{failoverToast}</span>
          </div>
        )}

        {/* 1DM-Style Popup Interceptor Prompt Banner */}
        {pending1DmPopup && (
          <div className={styles.oneDmBanner}>
            <div className={styles.oneDmLeft}>
              <div className={styles.oneDmShieldPulse}>
                <span className={styles.oneDmShieldDot} />
                <span className={styles.oneDmShieldRing} />
              </div>
              <div className={styles.oneDmTextCol}>
                <div className={styles.oneDmHeader}>
                  <span>🛡️ 1DM Popup Interceptor</span>
                  <span className={styles.oneDmBadge}>Blocked</span>
                </div>
                <div className={styles.oneDmSubText}>
                  Embed requested popup:{' '}
                  <span className={styles.oneDmUrlHost}>
                    {(() => {
                      try {
                        return new URL(pending1DmPopup.url).hostname;
                      } catch (e) {
                        return pending1DmPopup.url.substring(0, 25);
                      }
                    })()}
                  </span>
                </div>
              </div>
            </div>
            <div className={styles.oneDmActionGroup}>
              <button
                type="button"
                className={styles.oneDmBlockBtn}
                onClick={() => {
                  setPending1DmPopup(null);
                  if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
                }}
              >
                🛑 Block & Stay
              </button>
              <button
                type="button"
                className={styles.oneDmAllowBtn}
                onClick={() => {
                  pending1DmPopup.proceed();
                  setPending1DmPopup(null);
                  if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
                }}
              >
                ↗️ Open Link
              </button>
            </div>
          </div>
        )}

        {!isPlaying ? (
          <div
            className={styles.posterOverlay}
            style={{ backgroundImage: `url(${posterUrl})` }}
            onClick={handleStartPlayback}
            onMouseEnter={handlePreWarm}
          >
            <div className={styles.posterGradient}></div>
            <button className={styles.playBtn} aria-label="Play Video">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          </div>
        ) : (
          <div className={styles.iframeContainer}>
            {/* Cinematic Loading Shield */}
            {isBufferingOrMounting && (
              <div className={styles.loadingOverlay}>
                <div className={styles.spinnerRing}></div>
                <span className={styles.loadingServerTitle}>
                  Connecting to {activeProvider.name}...
                </span>
                <span className={styles.loadingSubText}>
                  {activeProvider.capabilities.quality} • {securityAttributes.isSandboxed ? 'Strict Sandbox Active' : 'Direct Stream (uBlock Protected)'}
                </span>
              </div>
            )}

            <iframe
              key={`${activeProvider.id}-${currentUrl}-${securityAttributes.isSandboxed}`}
              className={styles.iframe}
              src={currentUrl}
              {...(securityAttributes.sandbox ? { sandbox: securityAttributes.sandbox } : {})}
              allow={securityAttributes.allow}
              allowFullScreen={true}
              referrerPolicy={securityAttributes.referrerPolicy}
              loading="eager"
              onLoad={() => {
                playbackManagerRef.current?.handleIframeLoad();
                setSessionState((prev) => ({ ...prev, state: 'ready' }));
              }}
            ></iframe>
          </div>
        )}

        {/* Server Selection Modal */}
        {showServerModal && (
          <div className={styles.serverModalOverlay} onClick={() => setShowServerModal(false)}>
            <div className={styles.serverModalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <div className={styles.modalHeaderTitle}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                    <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                    <line x1="6" y1="6" x2="6.01" y2="6" />
                    <line x1="6" y1="18" x2="6.01" y2="18" />
                  </svg>
                  <span>Select Streaming Server</span>
                </div>
                <button
                  className={styles.closeModalBtn}
                  onClick={() => setShowServerModal(false)}
                  aria-label="Close server selection"
                >
                  ✕
                </button>
              </div>

              <div className={styles.modalServerGrid}>
                {ALL_PROVIDERS.map((provider) => {
                  const isActive = activeProvider.id === provider.id;
                  const score = calculateServerScore(provider);
                  const isTripped = isServerCircuitTripped(provider.id);

                  return (
                    <button
                      key={provider.id}
                      className={`${styles.modalServerCard} ${
                        isActive ? styles.activeModalServerCard : ''
                      }`}
                      onClick={() => handleServerChange(provider)}
                    >
                      <div className={styles.cardTopRow}>
                        <span className={styles.serverCardName}>
                          {provider.flag ? `${provider.flag} ` : ''}
                          {provider.name}
                          {isActive && <span className={styles.activeCheckIcon}>✓</span>}
                        </span>
                        <div className={styles.serverBadgeGroup}>
                          {isTripped ? (
                            <span className={styles.circuitTrippedTag}>Cooling Off</span>
                          ) : (
                            <span className={styles.serverScoreTag}>{score}% Health</span>
                          )}
                          <span className={styles.qualityTag}>{provider.capabilities.quality}</span>
                          {provider.badge && (
                            <span className={styles.featureBadge}>{provider.badge}</span>
                          )}
                        </div>
                      </div>
                      {provider.description && (
                        <span className={styles.serverCardDesc}>{provider.description}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Security & Sandbox Controls */}
              <div className={styles.shieldStatusCard}>
                <div className={styles.shieldStatusLeft}>
                  <div className={styles.shieldStatusPulse}>
                    <span className={styles.shieldDot}></span>
                    <span className={styles.shieldRing}></span>
                  </div>
                  <div>
                    <div className={styles.shieldStatusTitle}>
                      Iframe Sandbox & Popup Shield
                      <span className={styles.activeBadge}>
                        {securityAttributes.isSandboxed ? 'ENABLED' : 'DIRECT MODE'}
                      </span>
                      {blockedCount > 0 && (
                        <span className={styles.blockedBadge}>{blockedCount} blocked</span>
                      )}
                    </div>
                    <div className={styles.shieldStatusDesc}>
                      {securityAttributes.isSandboxed
                        ? 'Hardware-level Sandbox Active • Popups, redirects & new tabs strictly forbidden'
                        : 'Direct Mode Active • Protected by parent-level JavaScript Injector'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleSandbox}
                  className={`${styles.shieldToggleBtn} ${sandboxEnabled ? styles.shieldToggleBtnActive : ''}`}
                  title={sandboxEnabled ? 'Switch to Direct Mode' : 'Enable Strict Sandbox'}
                  aria-label="Toggle Iframe Sandbox"
                >
                  <span className={styles.shieldToggleThumb} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toolbar Below Player */}
      <div className={styles.toolbar}>
        <button
          className={styles.toolbarBtn}
          onClick={() => setShowServerModal(true)}
          title="Change Streaming Server"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
            <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
            <line x1="6" y1="6" x2="6.01" y2="6" />
            <line x1="6" y1="18" x2="6.01" y2="18" />
          </svg>
          <span>Server:</span>
          <span className={styles.activeServerBadge}>
            {activeProvider.flag ? `${activeProvider.flag} ` : '✨ '}{activeProvider.name}
          </span>
          <span className={styles.qualityTag}>{activeProvider.capabilities.quality}</span>
          <span className={styles.shieldBadge} title="Security Status">
            {securityAttributes.isSandboxed ? '🛡️ Sandbox Active' : '🛡️ uBlock Shield'}
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
