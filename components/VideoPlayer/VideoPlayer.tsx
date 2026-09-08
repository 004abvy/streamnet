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

interface SubtitleTrack {
  id?: string;
  display?: string;
  language?: string;
  url: string;
  format?: string;
}

export default function VideoPlayer({ tmdbId, type, title, backdropPath, season, episode, imdbId, onEpisodeChange }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeServerId, setActiveServerId] = useState(SERVERS[0].id);
  const [showServerModal, setShowServerModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [subtitles, setSubtitles] = useState<SubtitleTrack[]>([]);
  const [selectedSub, setSelectedSub] = useState<SubtitleTrack | null>(null);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<'fit' | 'zoom' | 'stretch'>('fit');
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
    // Do not auto-fade menu while user is choosing server or subtitles
    if (showServerModal || showSubModal) return;

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

  const toggleControls = () => {
    if (controlsVisible) {
      hideControls();
    } else {
      showControls();
    }
  };

  // Start 7-second countdown when video begins playing or server changes
  useEffect(() => {
    if (isPlaying) {
      showControls();
    }
    return () => clearControlsTimer();
  }, [isPlaying, activeServerId]);

  // Keep menu visible while any modal is open; restart 7s timer on modal close
  useEffect(() => {
    if (showServerModal || showSubModal) {
      setControlsVisible(true);
      clearControlsTimer();
    } else if (isPlaying) {
      startControlsTimer(AUTO_HIDE_MS);
    }
  }, [showServerModal, showSubModal, isPlaying]);

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

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Fetch Wyzie Subtitles on demand when Subtitle Modal opens
  useEffect(() => {
    if (!showSubModal) return;

    setLoadingSubs(true);
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
    const queryId = imdbId || tmdbId;

    let subUrl = `${backendUrl}/api/subtitles?id=${queryId}`;
    if (type === 'tv') {
      subUrl += `&season=${season || 1}&episode=${episode || 1}`;
    }

    fetch(subUrl)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && (Array.isArray(data) || Array.isArray(data.subtitles))) {
          const list = Array.isArray(data) ? data : data.subtitles;
          setSubtitles(list);
        } else {
          setSubtitles([]);
        }
        setLoadingSubs(false);
      })
      .catch(err => {
        console.warn("Failed to fetch Wyzie subtitles:", err);
        setSubtitles([]);
        setLoadingSubs(false);
      });
  }, [showSubModal, tmdbId, imdbId, type, season, episode]);

  // Listen to CineSrc postMessage events
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

  const activeServer = SERVERS.find(s => s.id === activeServerId) || SERVERS[0];
  let videoUrl = activeServer.getUrl(tmdbId, type, season, episode, imdbId);

  // Append custom subtitle if selected
  if (selectedSub) {
    const sep = videoUrl.includes('?') ? '&' : '?';
    videoUrl += `${sep}sub_file=${encodeURIComponent(selectedSub.url)}&sub_label=${encodeURIComponent(selectedSub.display || selectedSub.language || 'English')}`;
  }

  const posterUrl = backdropPath ? `https://image.tmdb.org/t/p/w1280${backdropPath}` : '/fallback-backdrop.jpg';

  const handleServerChange = (id: string) => {
    setActiveServerId(id);
    setLastUsedServerId(id);
    setShowServerModal(false);
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (playerWrapperRef.current?.requestFullscreen) {
        playerWrapperRef.current.requestFullscreen().catch(err => {
          console.warn("Could not enter fullscreen mode:", err);
        });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const cycleAspect = () => {
    setAspectRatio((prev) => (prev === 'fit' ? 'zoom' : prev === 'zoom' ? 'stretch' : 'fit'));
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerBar}>
        <h2 className={styles.title}>Now Watching: {title}</h2>
      </div>

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
              style={{
                transform: aspectRatio === 'zoom' ? 'scale(1.2)' : aspectRatio === 'stretch' ? 'scaleX(1.3)' : 'scale(1)',
                transformOrigin: 'center center',
                transition: 'transform 0.3s ease',
              }}
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture; accelerometer; gyroscope"
              allowFullScreen={true}
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        )}

        {/* In-Player Floating Controls Overlay (7s auto-fade & tap-to-toggle) */}
        {isPlaying && (
          <div
            className={`${styles.playerOverlayControls} ${controlsVisible ? styles.controlsVisible : styles.controlsHidden}`}
          >
            {/* Top Bar */}
            <div className={styles.playerOverlayTop}>
              <div className={styles.playerOverlayTitleGroup}>
                <span className={styles.playerOverlayBadge}>
                  {type === 'tv' && season && episode ? `S${season}:E${episode}` : (activeServer.quality || '4K')}
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

            {/* Bottom Bar Controls */}
            <div className={styles.playerOverlayBottom}>
              <div className={styles.overlayButtonGroup}>
                {/* Server Switcher */}
                <button
                  className={`${styles.overlayBtn} ${showServerModal ? styles.overlayBtnActive : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowServerModal(true);
                  }}
                  title="Switch Video Streaming Server"
                >
                  <span>{activeServer.flag ? `${activeServer.flag} ` : '⚡ '}Server: {activeServer.name}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                {/* Subtitles */}
                <button
                  className={`${styles.overlayBtn} ${selectedSub ? styles.overlayBtnActive : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSubModal(true);
                  }}
                  title="Subtitles & Closed Captions"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <span>{selectedSub ? (selectedSub.display || selectedSub.language) : 'CC / Subs'}</span>
                </button>

                {/* Aspect Ratio */}
                <button
                  className={styles.overlayBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    cycleAspect();
                    startControlsTimer(AUTO_HIDE_MS);
                  }}
                  title="Cycle Aspect Ratio (Fit 16:9 / Zoom 1.2x / Stretch)"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                  <span>{aspectRatio === 'fit' ? 'Fit 16:9' : aspectRatio === 'zoom' ? 'Zoom 1.2x' : 'Stretch'}</span>
                </button>

                {/* Series Next Episode */}
                {type === 'tv' && onEpisodeChange && (
                  <button
                    className={styles.overlayBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEpisodeChange(season || 1, (episode || 1) + 1);
                    }}
                    title="Play Next Episode"
                  >
                    <span>Next Ep</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M5 4v16l11-8zm11 0v16h2V4z" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Fullscreen Button */}
              <button
                className={styles.overlayBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleFullscreen();
                  startControlsTimer(AUTO_HIDE_MS);
                }}
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              >
                {isFullscreen ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                    </svg>
                    <span>Exit</span>
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                    </svg>
                    <span>Fullscreen</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Floating Menu Trigger Button (shown when controls are hidden so user can also summon menu anytime) */}
        {!controlsVisible && isPlaying && (
          <button
            className={styles.floatingMenuTrigger}
            onClick={(e) => {
              e.stopPropagation();
              showControls();
            }}
            title="Open Player Menu"
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
                      className={`${styles.modalServerCard} ${isActive ? styles.activeModalServerCard : ''}`}
                      onClick={() => handleServerChange(server.id)}
                    >
                      <span className={styles.serverCardName}>
                        {server.flag ? `${server.flag} ` : ''}{server.name}
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

        {/* Wyzie Subtitles Selection Modal */}
        {showSubModal && (
          <div className={styles.serverModalOverlay} onClick={() => setShowSubModal(false)}>
            <div className={styles.serverModalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <span className={styles.modalHeaderTitle}>Wyzie Subtitles & CC</span>
                <button
                  className={styles.closeModalBtn}
                  onClick={() => setShowSubModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className={styles.modalServerGrid}>
                <button
                  className={`${styles.modalServerCard} ${!selectedSub ? styles.activeModalServerCard : ''}`}
                  onClick={() => { setSelectedSub(null); setShowSubModal(false); }}
                >
                  <span className={styles.serverCardName}>Off (None)</span>
                </button>

                {loadingSubs ? (
                  <div style={{ gridColumn: 'span 2', textAlign: 'center', color: '#888', padding: '1rem', fontSize: '0.85rem' }}>
                    Searching Wyzie Subtitles...
                  </div>
                ) : subtitles.length > 0 ? (
                  subtitles.map((sub, i) => {
                    const isSel = selectedSub?.url === sub.url;
                    return (
                      <button
                        key={i}
                        className={`${styles.modalServerCard} ${isSel ? styles.activeModalServerCard : ''}`}
                        onClick={() => { setSelectedSub(sub); setShowSubModal(false); }}
                      >
                        <span className={styles.serverCardName}>
                          {sub.display || sub.language || `Sub ${i + 1}`}
                        </span>
                        {sub.format && (
                          <span className={styles.qualityTag}>{sub.format.toUpperCase()}</span>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div style={{ gridColumn: 'span 2', textAlign: 'center', color: '#888', padding: '1rem', fontSize: '0.82rem' }}>
                    No extra Wyzie subtitles found. Native player subtitles available inside player.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={styles.toolbar}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            className={styles.toolbarBtn}
            onClick={() => setShowServerModal(true)}
            title="Change Streaming Server"
          >
            {activeServer.flag ? `${activeServer.flag} ` : '⚡ '}Server: {activeServer.name} ▾
          </button>

          <button
            className={styles.toolbarBtn}
            onClick={() => setShowSubModal(true)}
            title="Subtitles & Closed Captions"
          >
            💬 CC {selectedSub ? `(${selectedSub.display || selectedSub.language})` : ''}
          </button>

          <button
            className={styles.toolbarBtn}
            onClick={cycleAspect}
            title="Cycle Aspect Ratio (Fit / Zoom / Stretch)"
          >
            📐 Ratio: {aspectRatio.toUpperCase()}
          </button>

          {type === 'tv' && onEpisodeChange && (
            <button
              className={styles.toolbarBtn}
              onClick={() => onEpisodeChange(season || 1, (episode || 1) + 1)}
              title="Play Next Episode"
            >
              ⏭ Next Episode
            </button>
          )}
        </div>

        <button
          className={styles.toolbarBtn}
          onClick={handleToggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        </button>
      </div>
    </div>
  );
}
