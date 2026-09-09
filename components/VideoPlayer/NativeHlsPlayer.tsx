'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import styles from './VideoPlayer.module.css';

interface NativeHlsPlayerProps {
  streamUrl: string;
  posterUrl?: string;
  title?: string;
  onEnded?: () => void;
  onError?: (err: string) => void;
}

export default function NativeHlsPlayer({
  streamUrl,
  posterUrl,
  title,
  onEnded,
  onError,
}: NativeHlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [qualities, setQualities] = useState<Array<{ id: number; label: string }>>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1); // -1 = Auto
  const [audioTracks, setAudioTracks] = useState<Array<{ id: number; label: string; lang: string }>>([]);
  const [currentAudioTrack, setCurrentAudioTrack] = useState<number>(-1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    setIsLoading(true);
    setErrorState(null);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
    const proxiedUrl = streamUrl.startsWith('http')
      ? `${backendUrl}/api/stream/proxy?url=${encodeURIComponent(streamUrl)}`
      : streamUrl;

    // 1. If Hls.js is supported in modern browsers
    if (Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });

      hlsRef.current = hls;
      hls.loadSource(proxiedUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setIsLoading(false);

        // Quality levels
        const levels = data.levels.map((level, idx) => ({
          id: idx,
          label: level.height ? `${level.height}p` : `Level ${idx + 1}`,
        }));
        setQualities(levels);

        // Audio tracks
        if (hls.audioTracks && hls.audioTracks.length > 0) {
          const tracks = hls.audioTracks.map((track, idx) => ({
            id: idx,
            label: track.name || track.lang || `Track ${idx + 1}`,
            lang: track.lang || 'en',
          }));
          setAudioTracks(tracks);
        }

        video.play().catch((e) => console.warn('Autoplay waiting for click:', e));
      });

      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_, data) => {
        if (data.audioTracks && data.audioTracks.length > 0) {
          const tracks = data.audioTracks.map((track, idx) => ({
            id: idx,
            label: track.name || track.lang || `Track ${idx + 1}`,
            lang: track.lang || 'en',
          }));
          setAudioTracks(tracks);
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          console.error('Fatal HLS Error:', data);
          setIsLoading(false);
          const err = 'Failed to load direct HLS stream.';
          setErrorState(err);
          if (onError) onError(err);
        }
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    }
    // 2. Fallback for native Safari / iOS HLS support
    else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = proxiedUrl;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        video.play().catch((e) => console.warn(e));
      });
      video.addEventListener('error', () => {
        setIsLoading(false);
        setErrorState('Native stream error.');
      });
    }
  }, [streamUrl]);

  const handleQualityChange = (levelId: number) => {
    setCurrentQuality(levelId);
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelId;
    }
  };

  const handleAudioTrackChange = (trackId: number) => {
    setCurrentAudioTrack(trackId);
    if (hlsRef.current) {
      hlsRef.current.audioTrack = trackId;
    }
  };

  return (
    <div className={styles.iframeContainer} style={{ background: '#000', position: 'relative' }}>
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinnerRing}></div>
          <span className={styles.loadingServerTitle}>
            Loading Zenith Direct Native HLS Stream...
          </span>
          <span className={styles.loadingSubText}>
            ⚡ 100% Ad-Free • 0 Popups • Native Browser HTML5 Player
          </span>
        </div>
      )}

      {errorState ? (
        <div className={styles.loadingOverlay} style={{ background: '#0a0a0f' }}>
          <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.95rem' }}>
            ⚠️ {errorState}
          </span>
          <span className={styles.loadingSubText}>
            Please switch to Iframe Mode below to stream via VidLink / YapGrid / CineSrc.
          </span>
        </div>
      ) : (
        <video
          ref={videoRef}
          className={styles.iframe}
          controls
          playsInline
          poster={posterUrl}
          onEnded={onEnded}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      )}

      {/* Native Quality & Audio Selectors Toolbar */}
      {!isLoading && !errorState && (qualities.length > 0 || audioTracks.length > 0) && (
        <div
          style={{
            position: 'absolute',
            bottom: '3.5rem',
            right: '1rem',
            zIndex: 20,
            display: 'flex',
            gap: '0.5rem',
            background: 'rgba(10, 10, 16, 0.88)',
            padding: '0.4rem 0.75rem',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {qualities.length > 0 && (
            <select
              value={currentQuality}
              onChange={(e) => handleQualityChange(Number(e.target.value))}
              style={{
                background: '#161622',
                color: '#f59e0b',
                border: '1px solid #28283a',
                borderRadius: '4px',
                fontSize: '0.75rem',
                padding: '2px 6px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <option value={-1}>Auto Quality</option>
              {qualities.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.label}
                </option>
              ))}
            </select>
          )}

          {audioTracks.length > 0 && (
            <select
              value={currentAudioTrack}
              onChange={(e) => handleAudioTrackChange(Number(e.target.value))}
              style={{
                background: '#161622',
                color: '#10b981',
                border: '1px solid #28283a',
                borderRadius: '4px',
                fontSize: '0.75rem',
                padding: '2px 6px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <option value={-1}>Default Audio</option>
              {audioTracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label} ({t.lang.toUpperCase()})
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}
