'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { MediaPlayer, MediaProvider, Poster, Track, MediaPlayerInstance, type AudioTrack, type TextTrack, type MediaSrc } from '@vidstack/react';
import { DefaultVideoLayout, defaultLayoutIcons } from '@vidstack/react/player/layouts/default';

import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';

export interface VidstackTrack {
  src: string;
  label?: string;
  language?: string;
  kind: 'subtitles' | 'captions' | 'chapters' | 'descriptions';
  default?: boolean;
  type?: string;
}

export interface VidstackSource {
  src: string;
  type?: string;
}

export interface DirectSourceItem {
  id: string;
  name: string;
  url: string;
  rawUrl?: string;
  audioLanguages?: string[];
  isWorking?: boolean;
}

export interface VidstackPlayerProps {
  title?: string;
  poster?: string;
  src: MediaSrc;
  tracks?: VidstackTrack[];
  thumbnails?: string;
  className?: string;
  autoPlay?: boolean;
  onEnded?: () => void;
  onInvalidDuration?: (durationSeconds: number) => void;
  onSelectDirectSource?: (source: DirectSourceItem) => void;
  availableDirectSources?: DirectSourceItem[];
  serverName?: string;
  preferredLanguage?: string;
  tmdbId?: string;
}

export default function VidstackPlayer({
  title,
  poster,
  src,
  tracks = [],
  thumbnails,
  className = '',
  autoPlay = false,
  onEnded,
  onInvalidDuration,
  onSelectDirectSource,
  availableDirectSources = [],
  serverName,
  preferredLanguage,
  tmdbId,
}: VidstackPlayerProps) {
  const player = useRef<MediaPlayerInstance>(null);
  const [activeMediaSrc, setActiveMediaSrc] = useState<MediaSrc>(src);
  const hasResumedRef = useRef<MediaSrc | null>(null);

  useEffect(() => {
    setActiveMediaSrc(src);
  }, [src]);

  // Dead stream detection: if the video doesn't reach canPlay within 15 seconds, auto-switch
  useEffect(() => {
    if (!src || !tmdbId) return;
    
    const loadTimeout = setTimeout(() => {
      if (player.current) {
        const state = player.current.state;
        if ((!state.canPlay && state.currentTime === 0) || (state.waiting && state.currentTime === 0)) {
          console.warn('[VidstackPlayer] Stream load timeout (8s). Stream is likely dead. Auto-advancing...');
          onInvalidDuration?.(0);
        }
      }
    }, 8000);

    return () => clearTimeout(loadTimeout);
  }, [src, tmdbId]);

  const formattedMediaSrc = useMemo<MediaSrc>(() => {
    if (typeof activeMediaSrc === 'string') {
      const lower = activeMediaSrc.toLowerCase();
      if (lower.includes('.mp4') || lower.includes('type=mp4')) {
        return { src: activeMediaSrc, type: 'video/mp4' };
      }
      return { src: activeMediaSrc, type: 'application/x-mpegurl' };
    }
    return activeMediaSrc;
  }, [activeMediaSrc]);

  // Force English/Preferred audio whenever tracks change, unless there is a saved preference
  useEffect(() => {
    if (!player.current || !tmdbId) return;

    return player.current.subscribe(({ audioTracks, textTracks, canPlay }) => {
      // Restore saved progress once per source change when player is ready
      if (hasResumedRef.current !== src && player.current && canPlay) {
        const savedProgress = localStorage.getItem(`streamnet_progress_${tmdbId}`);
        if (savedProgress) {
          const time = parseFloat(savedProgress);
          // Resume if we have saved time
          if (time > 1) {
            console.log(`[Vidstack] Resuming ${tmdbId} at ${time}s`);
            player.current.currentTime = time;
          }
        }
        hasResumedRef.current = src;
      }

      // Restore saved audio preference or force English
      if (audioTracks.length > 0) {
        const savedAudio = localStorage.getItem(`streamnet_audio_${tmdbId}`);
        let targetTrack = null;

        if (savedAudio) {
          targetTrack = audioTracks.find(t => t.label === savedAudio);
        }

        if (!targetTrack && preferredLanguage === 'hi') {
          targetTrack = audioTracks.find(t =>
            t.label.toLowerCase().includes('hindi') || t.language?.startsWith('hi')
          );
        }

        if (!targetTrack && !savedAudio) {
          targetTrack = audioTracks.find(t =>
            t.label.toLowerCase().includes('english') || t.language?.startsWith('en')
          );
        }

        if (targetTrack && !targetTrack.selected) {
          targetTrack.selected = true;
        }
      }

      // Restore saved subtitle preference or force English
      if (textTracks.length > 0) {
        const savedSub = localStorage.getItem(`streamnet_sub_${tmdbId}`);

        if (savedSub === 'off') {
          // User explicitly toggled subtitles off
        } else if (savedSub) {
          const targetSub = textTracks.find(t => t.label === savedSub);
          if (targetSub && targetSub.mode !== 'showing') {
            targetSub.mode = 'showing';
          }
        } else {
          const englishSub = textTracks.find(t =>
            t.label.toLowerCase().includes('english') || t.language?.startsWith('en')
          );
          if (englishSub && englishSub.mode !== 'showing') {
            englishSub.mode = 'showing';
          }
        }
      }
    });
  }, [src, preferredLanguage, tmdbId]);

  return (
    <div className={`relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl bg-black ${className}`}>

      <MediaPlayer
        ref={player}
        title={title}
        src={formattedMediaSrc}
        poster={poster}
        autoPlay={autoPlay}
        crossOrigin="anonymous"
        lang={preferredLanguage === 'hi' ? 'hi' : 'en'}
        onError={(err: any) => {
          console.warn('[VidstackPlayer] Stream error encountered:', err?.detail || err, 'Advancing to next available stream source...');
          onInvalidDuration?.(0);
        }}
        onEnded={() => {
          if (tmdbId) {
            localStorage.removeItem(`streamnet_progress_${tmdbId}`);
          }
          onEnded?.();
        }}
        onCanPlay={() => {
          if (!player.current) return;

          // Direct seek on ready for HLS stability
          if (tmdbId && hasResumedRef.current !== src) {
            const savedProgress = localStorage.getItem(`streamnet_progress_${tmdbId}`);
            if (savedProgress) {
              const time = parseFloat(savedProgress);
              if (time > 1) {
                player.current.currentTime = time;
              }
            }
          }
        }}
        className="w-full h-full text-white font-sans"
        playsInline
        onAudioTracksChange={(tracks) => {
          if (!tracks || !tmdbId) return;
          try {
            const trackList = (Array.isArray(tracks) ? tracks : Array.from(tracks)) as AudioTrack[];
            const selected = trackList.find((t) => t.selected);
            if (selected) {
              localStorage.setItem(`streamnet_audio_${tmdbId}`, selected.label);
            }
          } catch {}
        }}
        onTextTracksChange={(tracks) => {
          if (!tracks || !tmdbId) return;
          try {
            const trackList = (Array.isArray(tracks) ? tracks : Array.from(tracks)) as TextTrack[];
            const showing = trackList.find((t) => t.mode === 'showing');
            if (showing) {
              localStorage.setItem(`streamnet_sub_${tmdbId}`, showing.label);
            } else {
              localStorage.setItem(`streamnet_sub_${tmdbId}`, 'off');
            }
          } catch {}
        }}
        onTimeUpdate={(detail) => {
          const currentTime = detail.currentTime;
          if (tmdbId && typeof currentTime === 'number' && currentTime > 0) {
            // Save every 1 second for precision
            const lastSaved = parseFloat(localStorage.getItem(`streamnet_progress_${tmdbId}_last_save`) || '0');
            if (Math.abs(currentTime - lastSaved) >= 1) {
              localStorage.setItem(`streamnet_progress_${tmdbId}`, currentTime.toString());
              localStorage.setItem(`streamnet_progress_${tmdbId}_last_save`, currentTime.toString());
            }
          }
        }}
      >
        <MediaProvider>
          {poster && (
            <Poster
              className="vds-poster absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-300 data-visible:opacity-100"
              src={poster}
              alt={title || 'Video poster'}
            />
          )}
          {tracks.map((track, idx) => (
            <Track
              key={track.src || `track-${idx}`}
              src={track.src}
              kind={track.kind}
              label={track.label}
              lang={track.language}
              default={track.default}
              type={(track.type as "vtt" | "srt") || 'vtt'}
            />
          ))}
        </MediaProvider>

        <DefaultVideoLayout
          thumbnails={thumbnails}
          icons={defaultLayoutIcons}
        />
      </MediaPlayer>
    </div>
  );
}
