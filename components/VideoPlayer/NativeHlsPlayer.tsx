'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import styles from './VideoPlayer.module.css';

interface NativeHlsPlayerProps {
  streamUrl: string;
  streamType: 'hls' | 'mp4' | 'webm';
  posterUrl?: string;
  onEnded?: () => void;
  onError?: (error: string) => void;
}

export default function NativeHlsPlayer({
  streamUrl,
  streamType,
  posterUrl,
  onEnded,
  onError,
}: NativeHlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    setIsLoading(true);
    setErrorState(null);

    const fail = (message: string) => {
      setIsLoading(false);
      setErrorState(message);
      onError?.(message);
    };

    if (streamType !== 'hls') {
      video.src = streamUrl;
      const handleLoadedMetadata = () => {
        setIsLoading(false);
        video.play().catch(() => {});
      };
      const handleError = () => fail('Failed to load the direct video stream.');
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('error', handleError);

      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('error', handleError);
        video.pause();
        video.removeAttribute('src');
        video.load();
      };
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) fail('Failed to load the direct HLS stream.');
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    }

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      const handleLoadedMetadata = () => {
        setIsLoading(false);
        video.play().catch(() => {});
      };
      const handleError = () => fail('Failed to load the native HLS stream.');
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('error', handleError);

      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('error', handleError);
        video.pause();
        video.removeAttribute('src');
        video.load();
      };
    }

    fail('This browser does not support HLS playback.');
  }, [onError, streamType, streamUrl]);

  return (
    <div className={styles.iframeContainer} style={{ background: '#000', position: 'relative' }}>
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinnerRing} />
          <span className={styles.loadingServerTitle}>
            Loading direct {streamType.toUpperCase()} stream...
          </span>
          <span className={styles.loadingSubText}>Native HTML5 playback with no embedded pages</span>
        </div>
      )}
      {errorState && (
        <div className={styles.loadingOverlay} style={{ background: '#0a0a0f' }}>
          <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.95rem' }}>{errorState}</span>
          <span className={styles.loadingSubText}>Try playing again or choose another title.</span>
        </div>
      )}
      <video
        ref={videoRef}
        className={styles.iframe}
        controls
        playsInline
        poster={posterUrl}
        onEnded={onEnded}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    </div>
  );
}
