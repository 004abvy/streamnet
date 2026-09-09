'use client';

import { useState } from 'react';
import styles from './VideoPlayer.module.css';
import NativeHlsPlayer from './NativeHlsPlayer';
import { ALL_PROVIDERS, ProviderAdapter } from '../../utils/serverManager';
import { resolveEmbedSecurity } from '../../utils/embedSecurity';

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

interface ResolvedStream {
  streamUrl: string;
  streamType?: 'hls' | 'mp4' | 'webm';
  provider?: string;
  quality?: string;
}

export default function VideoPlayer({
  tmdbId,
  type,
  title,
  backdropPath,
  season,
  episode,
  imdbId,
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerMode, setPlayerMode] = useState<'hls' | 'iframe'>('hls');
  const [activeProvider, setActiveProvider] = useState<ProviderAdapter>(ALL_PROVIDERS[0]);
  const [showServerModal, setShowServerModal] = useState(false);

  const [stream, setStream] = useState<ResolvedStream | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  const posterUrl = backdropPath
    ? `https://image.tmdb.org/t/p/w1280${backdropPath}`
    : '/fallback-backdrop.jpg';

  const handleStartPlayback = async () => {
    setIsPlaying(true);
    if (stream || isResolving) return;

    setIsResolving(true);
    setStreamError(null);

    try {
      const params = new URLSearchParams({
        id: tmdbId,
        type,
        season: String(season || 1),
        episode: String(episode || 1),
      });
      const res = await fetch(`/api/stream/auto-resolve?${params.toString()}`);
      const data = await res.json();

      if (data?.streamUrl) {
        setStream({
          streamUrl: data.streamUrl,
          streamType: data.streamType || 'hls',
          provider: data.provider || 'HLS Direct',
          quality: data.quality || '1080p',
        });
      }
    } catch (e) {
      setStreamError('Connecting direct stream...');
    } finally {
      setIsResolving(false);
    }
  };

  const currentIframeUrl = activeProvider.buildUrl(type, tmdbId, season, episode, imdbId);
  const embedSecurity = resolveEmbedSecurity(activeProvider, true);

  return (
    <div className={styles.container}>
      <div className={styles.playerWrapper}>
        {!isPlaying ? (
          <div
            className={styles.posterOverlay}
            style={{ backgroundImage: `url(${posterUrl})` }}
            onClick={handleStartPlayback}
          >
            <div className={styles.posterGradient} />
            <button className={styles.playBtn} aria-label="Play video" type="button">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          </div>
        ) : playerMode === 'hls' && stream ? (
          <NativeHlsPlayer
            key={stream.streamUrl}
            streamUrl={stream.streamUrl}
            streamType={stream.streamType || 'hls'}
            posterUrl={posterUrl}
            title={title}
            onError={(msg) => {
              setStreamError(msg || 'Re-buffering stream...');
            }}
          />
            }}
          />
        ) : playerMode === 'hls' && isResolving ? (
          <div className={styles.loadingOverlay}>
            <div className={styles.spinnerRing} />
            <span className={styles.loadingServerTitle}>Connecting HLS Stream...</span>
            <span className={styles.loadingSubText}>0 Ads • Direct Playback</span>
          </div>
        ) : (
          <div className={styles.iframeContainer}>
            <iframe
              key={`${activeProvider.id}-${currentIframeUrl}`}
              className={styles.iframe}
              src={currentIframeUrl}
              {...(embedSecurity.sandbox ? { sandbox: embedSecurity.sandbox } : {})}
              allow={embedSecurity.allow}
              allowFullScreen
              referrerPolicy={embedSecurity.referrerPolicy}
            />
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
                  const isActive = activeProvider.id === provider.id && playerMode === 'iframe';
                  return (
                    <button
                      key={provider.id}
                      className={`${styles.modalServerCard} ${isActive ? styles.activeModalServerCard : ''}`}
                      onClick={() => {
                        setActiveProvider(provider);
                        setPlayerMode('iframe');
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
            <span>{playerMode === 'hls' ? '⚡ Direct HLS' : `${activeProvider.flag || '🌐'} ${activeProvider.name}`}</span>
            <span className={styles.qualityTag}>
              {playerMode === 'hls' ? '1080p' : activeProvider.capabilities.quality}
            </span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {/* Mode Switcher Pill: Direct HLS vs Embed */}
          <div className={styles.modePillGroup}>
            <button
              className={`${styles.modePill} ${playerMode === 'hls' ? styles.activeModePill : ''}`}
              onClick={() => setPlayerMode('hls')}
              title="0 Ads Direct Playback"
              type="button"
            >
              ⚡ HLS Direct
            </button>
            <button
              className={`${styles.modePill} ${playerMode === 'iframe' ? styles.activeModePill : ''}`}
              onClick={() => setPlayerMode('iframe')}
              title="Embed Server iFrame"
              type="button"
            >
              🖼️ iFrame
            </button>
          </div>
        </div>

        <div className={styles.toolbarRight}>
          <span className={styles.shieldBadge}>
            {playerMode === 'hls' ? '⚡ 0 Ads' : '🛡️ Shielded'}
          </span>
        </div>
      </div>
    </div>
  );
}
