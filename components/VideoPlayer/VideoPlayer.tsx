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
  const playerWrapperRef = useRef<HTMLDivElement>(null);

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
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
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

  const posterUrl = backdropPath ? `https://image.tmdb.org/t/p/original${backdropPath}` : '/fallback-backdrop.jpg';

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

  return (
    <div className={styles.container}>
      <div className={styles.headerBar}>
        <h2 className={styles.title}>Now Watching: {title}</h2>
      </div>

      <div className={styles.playerWrapper} ref={playerWrapperRef}>
        {/* Mid-top Server Button on Player Viewport */}
        <button
          className={styles.midTopServerBtn}
          onClick={() => setShowServerModal(true)}
        >
          <span>Server: {activeServer.name}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>

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
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={styles.toolbarBtn}
            onClick={() => setShowServerModal(true)}
          >
            Change Server
          </button>

          <button
            className={styles.toolbarBtn}
            onClick={() => setShowSubModal(true)}
          >
            CC / Subtitles {selectedSub ? `(${selectedSub.display || selectedSub.language})` : ''}
          </button>
        </div>

        <button
          className={styles.toolbarBtn}
          onClick={handleToggleFullscreen}
          title="Toggle Fullscreen"
        >
          {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        </button>
      </div>
    </div>
  );
}
