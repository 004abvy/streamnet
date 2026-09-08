'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './VideoPlayer.module.css';
import { SERVERS, getLastUsedServerId, setLastUsedServerId } from '../../utils/serverManager';

interface VideoPlayerProps {
  tmdbId: string;
  type: 'movie' | 'tv';
  title: string;
  backdropPath?: string;
  season?: number;
  episode?: number;
  imdbId?: string;
  onEpisodeChange?: (season: number, episode: number) => void;
}

export default function VideoPlayer({
  tmdbId,
  type,
  title,
  backdropPath,
  season,
  episode,
  imdbId,
  onEpisodeChange,
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeServerId, setActiveServerId] = useState(SERVERS[0].id);
  const [showServerModal, setShowServerModal] = useState(false);
  const [showServerNotice, setShowServerNotice] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const playerWrapperRef = useRef<HTMLDivElement>(null);

  const AUTO_HIDE_MS = 7000; // 7 seconds time before auto-fading menu

  const clearControlsTimer = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = null;
    }
  };

  const startControlsTimer = (duration = AUTO_HIDE_MS) => {
    clearControlsTimer();
    // Do not auto-fade menu while user is choosing server
    if (showServerModal) return;

    controlsTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, duration);
  };

  const showControls = () => {
    setControlsVisible(true);
    startControlsTimer(AUTO_HIDE_MS);
  };

  const hideControls = () => {
    clearControlsTimer();
    setControlsVisible(false);
  };

  // Start 7-second countdown when video begins playing or server changes
  useEffect(() => {
    if (isPlaying) {
      showControls();
    }
    return () => clearControlsTimer();
  }, [isPlaying, activeServerId]);

  // Keep menu visible while server modal is open; restart 7s timer on modal close
  useEffect(() => {
    if (showServerModal) {
      setControlsVisible(true);
      clearControlsTimer();
    } else if (isPlaying) {
      startControlsTimer(AUTO_HIDE_MS);
    }
  }, [showServerModal, isPlaying]);

  // Detect user clicks/taps inside cross-origin video iframe to toggle controls
  useEffect(() => {
    const handleWindowBlur = () => {
      setTimeout(() => {
        if (document.activeElement && document.activeElement.tagName === 'IFRAME') {
          // User pressed in the video!
          setControlsVisible((prev) => {
            if (prev) {
              clearControlsTimer();
              return false;
            } else {
              clearControlsTimer();
              controlsTimeoutRef.current = setTimeout(() => {
                setControlsVisible(false);
              }, AUTO_HIDE_MS);
              return true;
            }
          });
        }
      }, 60);
    };

    window.addEventListener('blur', handleWindowBlur);
    return () => window.removeEventListener('blur', handleWindowBlur);
  }, []);

  useEffect(() => {
    setActiveServerId(getLastUsedServerId());
  }, []);

  // Listen to CineSrc postMessage events for auto-next episode
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== 'https://cinesrc.st') return;
      const { type: eventType, ...data } = event.data || {};

      if (eventType === 'cinesrc:nextepisode') {
        if (data.season && data.episode && onEpisodeChange) {
          onEpisodeChange(data.season, data.episode);
        }
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onEpisodeChange]);

  const activeServer = SERVERS.find((s) => s.id === activeServerId) || SERVERS[0];
  const videoUrl = activeServer.getUrl(tmdbId, type, season, episode, imdbId);
  const posterUrl = backdropPath ? `https://image.tmdb.org/t/p/w1280${backdropPath}` : '/fallback-backdrop.jpg';

  const handleServerChange = (id: string) => {
    setActiveServerId(id);
    setLastUsedServerId(id);
    setShowServerModal(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerBar}>
        <h2 className={styles.title}>Now Watching: {title}</h2>
      </div>

      {/* Dismissible Notice Box Above Player */}
      {showServerNotice && (
        <div className={styles.serverNoticeBox}>
          <div className={styles.serverNoticeContent}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={styles.serverNoticeIcon}
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className={styles.serverNoticeText}>
              If the current server does not work,{' '}
              <button
                className={styles.noticeServerLink}
                onClick={() => setShowServerModal(true)}
                title="Choose another server"
              >
                choose another server
              </button>
            </span>
          </div>
          <button
            className={styles.closeServerNoticeBtn}
            onClick={() => setShowServerNotice(false)}
            aria-label="Close notice"
            title="Dismiss notice"
          >
            ✕
          </button>
        </div>
      )}

      <div
        className={styles.playerWrapper}
        ref={playerWrapperRef}
        onMouseMove={() => {
          if (!controlsVisible) {
            showControls();
          } else {
            startControlsTimer(AUTO_HIDE_MS);
          }
        }}
        onTouchStart={() => {
          if (!controlsVisible) {
            showControls();
          } else {
            startControlsTimer(AUTO_HIDE_MS);
          }
        }}
      >
        {!isPlaying ? (
          <div
            className={styles.posterOverlay}
            style={{ backgroundImage: `url(${posterUrl})` }}
            onClick={() => setIsPlaying(true)}
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
            <iframe
              key={videoUrl}
              className={styles.iframe}
              src={videoUrl}
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture; accelerometer; gyroscope"
              allowFullScreen={true}
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        )}

        {/* In-Player Floating Controls Overlay (7s auto-fade & tap-to-toggle) - Server ONLY */}
        {isPlaying && (
          <div
            className={`${styles.playerOverlayControls} ${
              controlsVisible ? styles.controlsVisible : styles.controlsHidden
            }`}
          >
            {/* Top Bar */}
            <div className={styles.playerOverlayTop}>
              <div className={styles.playerOverlayTitleGroup}>
                <span className={styles.playerOverlayBadge}>
                  {type === 'tv' && season && episode
                    ? `S${season}:E${episode}`
                    : activeServer.quality || '4K'}
                </span>
                <h3 className={styles.playerOverlayTitle} title={title}>
                  {title}
                </h3>
              </div>

              <button
                className={styles.playerOverlayCloseBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  hideControls();
                }}
                title="Hide Menu (Tap video anytime to re-open)"
              >
                <span>Hide</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Center Tap Area (clicking/pressing in video immediately fades away controls) */}
            <div
              className={styles.playerOverlayCenterTap}
              onClick={(e) => {
                e.stopPropagation();
                hideControls();
              }}
            >
              <span className={styles.tapHintText}>Tap video to hide menu</span>
            </div>

            {/* Bottom Bar Controls - ONLY Server Switcher */}
            <div className={styles.playerOverlayBottom}>
              <button
                className={`${styles.overlayBtn} ${showServerModal ? styles.overlayBtnActive : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowServerModal(true);
                }}
                title="Switch Video Streaming Server"
              >
                <span>
                  {activeServer.flag ? `${activeServer.flag} ` : '⚡ '}Server: {activeServer.name}
                </span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Floating Menu Trigger Button (shown when controls are hidden) */}
        {!controlsVisible && isPlaying && (
          <button
            className={styles.floatingMenuTrigger}
            onClick={(e) => {
              e.stopPropagation();
              showControls();
            }}
            title="Open Server Menu"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            <span>{activeServer.name}</span>
          </button>
        )}

        {/* Minimal Server Popup Modal */}
        {showServerModal && (
          <div className={styles.serverModalOverlay} onClick={() => setShowServerModal(false)}>
            <div className={styles.serverModalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <span className={styles.modalHeaderTitle}>Select Server</span>
                <button
                  className={styles.closeModalBtn}
                  onClick={() => setShowServerModal(false)}
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
                      <span className={styles.serverCardName}>
                        {server.flag ? `${server.flag} ` : ''}
                        {server.name}
                      </span>
                      {server.quality && (
                        <span className={styles.qualityTag}>{server.quality}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toolbar Below Player - ONLY Server Switcher */}
      <div className={styles.toolbar}>
        <button
          className={styles.toolbarBtn}
          onClick={() => setShowServerModal(true)}
          title="Change Streaming Server"
        >
          {activeServer.flag ? `${activeServer.flag} ` : '⚡ '}Server: {activeServer.name} ▾
        </button>
      </div>
    </div>
  );
}
