'use client';

import { useState, useEffect } from 'react';
import styles from './VideoPlayer.module.css';
import { SERVERS, getLastUsedServerId, setLastUsedServerId } from '../../utils/serverManager';
import {
  resolveServerIframeAttributes,
  installAdblockProtection,
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
  const [isLoading, setIsLoading] = useState(true);
  const [activeServerId, setActiveServerId] = useState(SERVERS[0].id);
  const [showServerModal, setShowServerModal] = useState(false);
  const [sandboxEnabled, setSandboxEnabled] = useState(true);
  const [blockedCount, setBlockedCount] = useState(0);

  useEffect(() => {
    setActiveServerId(getLastUsedServerId());
    setSandboxEnabled(getAdShieldPreference());
  }, []);

  const toggleSandbox = () => {
    setSandboxEnabled((prev) => {
      const next = !prev;
      setAdShieldPreference(next);
      return next;
    });
  };

  // Hardened automatic popup, redirect, and click-jack defense via JavaScript Injector
  useEffect(() => {
    if (!isPlaying) return;
    if (typeof window !== 'undefined' && (window as any).__STREAMNET_BLOCKED_COUNT__) {
      setBlockedCount((c) => Math.max(c, (window as any).__STREAMNET_BLOCKED_COUNT__));
    }
    return installAdblockProtection(true, (_type, _target) => {
      setBlockedCount((c) => c + 1);
    });
  }, [isPlaying]);

  // Listen to postMessage events (e.g., CineSrc, VidLink) for auto-next episode
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!event.data) return;

      // CineSrc auto-next
      if (event.origin === 'https://cinesrc.st' && event.data.type === 'cinesrc:nextepisode') {
        const { season: s, episode: e } = event.data;
        if (s && e && onEpisodeChange) {
          onEpisodeChange(s, e);
        }
      }

      // VidLink media events
      if (event.origin === 'https://vidlink.pro') {
        const { type: eventType, data } = event.data;
        if (eventType === 'PLAYER_EVENT' && data?.event === 'nextEpisode' && onEpisodeChange) {
          if (season && episode) {
            onEpisodeChange(season, episode + 1);
          }
        }
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onEpisodeChange, season, episode]);

  const activeServer = SERVERS.find((s) => s.id === activeServerId) || SERVERS[0];
  const rawVideoUrl = activeServer.getUrl(tmdbId, type, season, episode, imdbId);
  const posterUrl = backdropPath ? `https://image.tmdb.org/t/p/w1280${backdropPath}` : '/fallback-backdrop.jpg';
  const iframeConfig = resolveServerIframeAttributes(activeServer.id, rawVideoUrl, sandboxEnabled);

  const handleServerChange = (id: string) => {
    if (id === activeServerId) {
      setShowServerModal(false);
      return;
    }
    setIsLoading(true);
    setActiveServerId(id);
    setLastUsedServerId(id);
    setShowServerModal(false);
  };

  const handleStartPlayback = () => {
    setIsLoading(true);
    setIsPlaying(true);
  };

  return (
    <div className={styles.container}>
      <div className={styles.playerWrapper}>
        {!isPlaying ? (
          <div
            className={styles.posterOverlay}
            style={{ backgroundImage: `url(${posterUrl})` }}
            onClick={handleStartPlayback}
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
            {/* Ambient Loading State while stream connects */}
            {isLoading && (
              <div className={styles.loadingOverlay}>
                <div className={styles.spinnerRing}></div>
                <span className={styles.loadingServerTitle}>
                  Connecting to {activeServer.name}...
                </span>
                <span className={styles.loadingSubText}>
                  {activeServer.quality || '4K UHD'} • {sandboxEnabled ? 'iFrame Sandbox Active' : 'Direct Stream'}
                </span>
              </div>
            )}

            <iframe
              key={`${iframeConfig.src}-${activeServerId}-${sandboxEnabled}`}
              className={styles.iframe}
              src={iframeConfig.src}
              {...(iframeConfig.sandbox ? { sandbox: iframeConfig.sandbox } : {})}
              allow={iframeConfig.allow}
              allowFullScreen={true}
              referrerPolicy={iframeConfig.referrerPolicy}
              onLoad={() => setIsLoading(false)}
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
                {SERVERS.map((server) => {
                  const isActive = activeServerId === server.id;
                  return (
                    <button
                      key={server.id}
                      className={`${styles.modalServerCard} ${
                        isActive ? styles.activeModalServerCard : ''
                      }`}
                      onClick={() => handleServerChange(server.id)}
                    >
                      <div className={styles.cardTopRow}>
                        <span className={styles.serverCardName}>
                          {server.flag ? `${server.flag} ` : ''}
                          {server.name}
                          {isActive && <span className={styles.activeCheckIcon}>✓</span>}
                        </span>
                        <div className={styles.serverBadgeGroup}>
                          {server.quality && (
                            <span className={styles.qualityTag}>{server.quality}</span>
                          )}
                          {server.badge && (
                            <span className={styles.featureBadge}>{server.badge}</span>
                          )}
                        </div>
                      </div>
                      {server.description && (
                        <span className={styles.serverCardDesc}>{server.description}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* JavaScript Injector & uBlock Origin Controls */}
              <div className={styles.shieldStatusCard}>
                <div className={styles.shieldStatusLeft}>
                  <div className={styles.shieldStatusPulse}>
                    <span className={styles.shieldDot}></span>
                    <span className={styles.shieldRing}></span>
                  </div>
                  <div>
                    <div className={styles.shieldStatusTitle}>
                      JavaScript Injector & uBlock Shield
                      <span className={styles.activeBadge}>
                        {sandboxEnabled ? 'ENABLED' : 'DIRECT MODE'}
                      </span>
                      {blockedCount > 0 && (
                        <span className={styles.blockedBadge}>{blockedCount} blocked</span>
                      )}
                    </div>
                    <div className={styles.shieldStatusDesc}>
                      {sandboxEnabled
                        ? 'Document-start JS Injector & Sandbox Active • Popups, redirects & new tabs strictly forbidden'
                        : 'Document-start JS Injector Active • Seamless stream playback with dynamic DOM & popup defusal'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleSandbox}
                  className={`${styles.shieldToggleBtn} ${sandboxEnabled ? styles.shieldToggleBtnActive : ''}`}
                  title={sandboxEnabled ? 'Switch to Direct Mode (Avoid Sandbox Errors)' : 'Enable Strict Sandbox'}
                  aria-label="Toggle iFrame Sandbox Protection"
                >
                  <span className={styles.shieldToggleThumb} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toolbar Below Player - ONLY Change Server */}
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
            {activeServer.flag ? `${activeServer.flag} ` : '✨ '}{activeServer.name}
          </span>
          {activeServer.quality && (
            <span className={styles.qualityTag}>{activeServer.quality}</span>
          )}
          <span className={styles.shieldBadge} title="JavaScript Injector Status">
            {sandboxEnabled ? '🛡️ JS Injector + Sandbox' : '🛡️ JS Injector Active'}
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
