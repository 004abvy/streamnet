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

interface QualityOption {
  id: number;
  label: string;
}

interface SubtitleOption {
  id: number;
  label: string;
  language?: string;
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
  const [qualities, setQualities] = useState<QualityOption[]>([]);
  const [selectedQuality, setSelectedQuality] = useState(-1);
  const [subtitles, setSubtitles] = useState<SubtitleOption[]>([]);
  const [selectedSubtitle, setSelectedSubtitle] = useState(-1);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    setIsLoading(true);
    setErrorState(null);
    setQualities([]);
    setSelectedQuality(-1);
    setSubtitles([]);
    setSelectedSubtitle(-1);

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
        setQualities(hls.levels.map((level, index) => ({
          id: index,
          label: level.height ? `${level.height}p` : `Quality ${index + 1}`,
        })));
        setSubtitles(hls.subtitleTracks.map((track, index) => ({
          id: index,
          label: track.name || track.lang || `Subtitle ${index + 1}`,
          language: track.lang,
        })));
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_event, data) => {
        setSubtitles(data.subtitleTracks.map((track, index) => ({
          id: index,
          label: track.name || track.lang || `Subtitle ${index + 1}`,
          language: track.lang,
        })));
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

  const handleQualityChange = (level: number) => {
    setSelectedQuality(level);
    if (hlsRef.current) hlsRef.current.currentLevel = level;
  };

  const handleSubtitleChange = (track: number) => {
    setSelectedSubtitle(track);
    if (hlsRef.current) hlsRef.current.subtitleTrack = track;
  };

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
      {!isLoading && !errorState && (qualities.length > 0 || subtitles.length > 0) && (
        <div className={styles.playerOptions}>
          {qualities.length > 0 && (
            <label className={styles.playerOption}>
              <span>Quality</span>
              <select
                value={selectedQuality}
                onChange={(event) => handleQualityChange(Number(event.target.value))}
                aria-label="Video quality"
              >
                <option value={-1}>Auto</option>
                {qualities.map((quality) => (
                  <option key={quality.id} value={quality.id}>{quality.label}</option>
                ))}
              </select>
            </label>
          )}
          {subtitles.length > 0 && (
            <label className={styles.playerOption}>
              <span>Subtitles</span>
              <select
                value={selectedSubtitle}
                onChange={(event) => handleSubtitleChange(Number(event.target.value))}
                aria-label="Subtitles"
              >
                <option value={-1}>Off</option>
                {subtitles.map((subtitle) => (
                  <option key={subtitle.id} value={subtitle.id}>
                    {subtitle.label}{subtitle.language ? ` (${subtitle.language.toUpperCase()})` : ''}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}
    </div>
  );
}
