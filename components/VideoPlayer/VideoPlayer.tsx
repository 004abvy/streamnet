'use client';

import { useState, useEffect } from 'react';
import styles from './VideoPlayer.module.css';
import { SERVERS, getLastUsedServerId, setLastUsedServerId } from '../../utils/serverManager';

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
  const [activeServerId, setActiveServerId] = useState(SERVERS[0].id);
  const [showServerModal, setShowServerModal] = useState(false);

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
      <div className={styles.playerWrapper}>
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

        {/* Server Selection Modal */}
        {showServerModal && (
          <div className={styles.serverModalOverlay} onClick={() => setShowServerModal(false)}>
            <div className={styles.serverModalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <span className={styles.modalHeaderTitle}>Select Server</span>
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
          <span>Change Server:</span>
          <span className={styles.activeServerBadge}>
            {activeServer.flag ? `${activeServer.flag} ` : '⚡ '}{activeServer.name}
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
