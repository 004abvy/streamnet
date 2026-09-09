'use client';

import { useState } from 'react';
import styles from './VideoPlayer.module.css';
import NativeHlsPlayer from './NativeHlsPlayer';

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
  id?: string;
  streamUrl: string;
  streamType: 'hls' | 'mp4' | 'webm';
  provider?: string;
  quality?: string | null;
}

export default function VideoPlayer({
  tmdbId,
  type,
  title,
  backdropPath,
  season,
  episode,
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [stream, setStream] = useState<ResolvedStream | null>(null);
  const [sources, setSources] = useState<ResolvedStream[]>([]);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const posterUrl = backdropPath
    ? `https://image.tmdb.org/t/p/w1280${backdropPath}`
    : '/fallback-backdrop.jpg';

  const handleStartPlayback = async () => {
    if (isResolving || stream) {
      setIsPlaying(true);
      return;
    }

    setIsPlaying(true);
    setIsResolving(true);
    setStreamError(null);

    try {
      const params = new URLSearchParams({
        id: tmdbId,
        type,
        season: String(season || 1),
        episode: String(episode || 1),
      });
      const response = await fetch(`/api/stream/auto-resolve?${params.toString()}`);
      const data = await response.json();

      if (!response.ok || !data?.success || !data.streamUrl || !data.streamType) {
        throw new Error(data?.message || 'No direct HLS or video stream was returned.');
      }

      const resolvedSources = Array.isArray(data.sources) ? data.sources : [];
      const resolvedStream = {
        id: data.id,
        streamUrl: data.streamUrl,
        streamType: data.streamType,
        provider: data.provider,
        quality: data.quality,
      } satisfies ResolvedStream;
      setSources(resolvedSources.length > 0 ? resolvedSources : [resolvedStream]);
      setStream(resolvedStream);
    } catch (error) {
      setStreamError(error instanceof Error ? error.message : 'The direct stream could not be resolved.');
    } finally {
      setIsResolving(false);
    }
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
            <div className={styles.posterGradient} />
            <button className={styles.playBtn} aria-label="Play video" type="button">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          </div>
        ) : stream ? (
          <NativeHlsPlayer
            key={stream.streamUrl}
            streamUrl={stream.streamUrl}
            streamType={stream.streamType}
            posterUrl={posterUrl}
            onError={(message) => setStreamError(message)}
          />
        ) : (
          <div className={styles.loadingOverlay}>
            <span className={styles.loadingServerTitle}>
              {streamError || 'Resolving direct stream...'}
            </span>
            <span className={styles.loadingSubText}>
              {isResolving ? 'Finding an HLS or M3U8 source from the TMDB Embed API.' : 'No embedded provider page was loaded.'}
            </span>
          </div>
        )}
      </div>

      <div className={styles.toolbar}>
        <span className={styles.activeServerBadge}>
          {stream ? `${stream.provider || 'TMDB Embed API'}${stream.quality ? ` • ${stream.quality}` : ''}` : 'Direct HLS / M3U8 player'}
        </span>
        {sources.length > 1 && (
          <label className={styles.serverSelector}>
            <span>Change server</span>
            <select
              value={stream?.id || ''}
              onChange={(event) => {
                const nextSource = sources.find((source) => source.id === event.target.value);
                if (nextSource) {
                  setStream(nextSource);
                  setStreamError(null);
                }
              }}
              aria-label="Change direct stream server"
            >
              {sources.map((source, index) => (
                <option key={source.id || `${source.streamUrl}-${index}`} value={source.id}>
                  {source.provider || 'Direct source'}{source.quality ? ` • ${source.quality}` : ''}
                </option>
              ))}
            </select>
          </label>
        )}
        <span className={styles.shieldBadge} title="Native player status">No embedded pages</span>
      </div>
    </div>
  );
}
