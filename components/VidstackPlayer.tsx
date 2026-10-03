'use client';

import React, { useEffect, useLayoutEffect, useRef, useState, useMemo } from 'react';
import { MediaPlayer, MediaProvider, Poster, MediaPlayerInstance, isHLSProvider, TextTrack, type AudioTrack, type MediaSrc } from '@vidstack/react';
import { DefaultVideoLayout, defaultLayoutIcons } from '@vidstack/react/player/layouts/default';
import { clearMediaSession, suppressMediaSession } from '../utils/mediaSessionManager';

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
  onDurationChange?: (durationSeconds: number) => void;
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
  onDurationChange,
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

  // Suppress MediaSession API metadata to prevent iOS Dynamic Island & Lockscreen/Widget persistence
  useEffect(() => {
    suppressMediaSession();
    clearMediaSession();

    const handleClear = () => {
      clearMediaSession();
    };

    window.addEventListener('pagehide', handleClear);
    window.addEventListener('beforeunload', handleClear);

    return () => {
      clearMediaSession();
      window.removeEventListener('pagehide', handleClear);
      window.removeEventListener('beforeunload', handleClear);
    };
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

  const [failedTrackSrcs, setFailedTrackSrcs] = useState<Set<string>>(new Set());

  // Reset failed tracks on media source change
  useEffect(() => {
    setFailedTrackSrcs(new Set());
  }, [src]);

  const uniqueTracks = useMemo<VidstackTrack[]>(() => {
    const seenSrcs = new Set<string>();
    const seenLabels = new Map<string, number>();
    const result: VidstackTrack[] = [];

    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      if (!track || !track.src) continue;
      if (failedTrackSrcs.has(track.src)) continue;

      // Filter: Keep ONLY English subtitles in popup menu
      const rawLower = (track.label || '').toLowerCase();
      const langLower = (track.language || '').toLowerCase();
      const isEnglish =
        rawLower.includes('english') ||
        rawLower.includes('eng') ||
        langLower === 'en' ||
        langLower.startsWith('en-') ||
        langLower === 'eng';

      if (!isEnglish) {
        continue;
      }

      if (seenSrcs.has(track.src)) continue;
      seenSrcs.add(track.src);

      // Clean raw label
      let rawLabel = (track.label || 'English').trim();
      // Remove any trailing counter suffixes if already attached
      rawLabel = rawLabel
        .replace(/\s+\d+$/, '')
        .replace(/\s*\(\d+\)$/, '')
        .replace(/\s*\(\s*-\s*[^)]+\)$/, (match) => {
          const inner = match.replace(/^[(-.\s]+|[)-.\s]+$/g, '');
          if (/netflix|crunchyroll|horriblesubs|funimation|hidive|full|original/i.test(inner)) {
            return ` (${inner})`;
          }
          return '';
        })
        .trim();

      if (!rawLabel) rawLabel = 'English';

      const lower = rawLabel.toLowerCase();
      const count = seenLabels.get(lower) || 0;
      seenLabels.set(lower, count + 1);

      const label = count === 0 ? rawLabel : `${rawLabel} (${count + 1})`;

      result.push({
        ...track,
        label,
        language: track.language || (lower.includes('english') ? 'en' : 'en'),
        type: 'vtt',
      });
    }

    function getTrackPriority(label: string): number {
      const l = (label || '').toLowerCase();
      if (l.includes('signs') || l.includes('songs') || l.includes('episode name')) return -10;
      if (l.includes('netflix')) return 100;
      if (l.includes('crunchyroll')) return 95;
      if (l.includes('funimation') || l.includes('hidive')) return 90;
      if (l.includes('full') || l.includes('original') || l.includes('orignal')) return 85;
      if (l.includes('english') && !l.includes('(')) return 80;
      if (l.includes('english') || l.includes('eng')) return 70;
      return 10;
    }

    result.sort((a, b) => {
      const scoreA = getTrackPriority(a.label || '');
      const scoreB = getTrackPriority(b.label || '');
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      return (a.label || '').localeCompare(b.label || '');
    });

    // Ensure the top prioritized compatible track is marked as default
    let assigned = false;
    for (let i = 0; i < result.length; i++) {
      if (!assigned && getTrackPriority(result[i].label || '') > 0) {
        result[i].default = true;
        assigned = true;
      } else {
        result[i].default = false;
      }
    }
    if (!assigned && result.length > 0) {
      result[0].default = true;
    }

    return result;
  }, [tracks, failedTrackSrcs]);

  const useIsomorphicLayoutEffect =
    typeof window !== 'undefined' ? useLayoutEffect : useEffect;

  const tracksSignature = useMemo(() => {
    return uniqueTracks.map((t) => `${t.src}#${t.label}`).join(';;');
  }, [uniqueTracks]);

  // Imperatively synchronize text tracks with Vidstack's TextTrackList
  useIsomorphicLayoutEffect(() => {
    if (!player.current) return;
    const textTracks = player.current.textTracks;
    if (!textTracks) return;

    // 1. Remove all existing non-native/custom text tracks
    for (const t of Array.from(textTracks)) {
      if (t) {
        try {
          textTracks.remove(t);
        } catch {}
      }
    }

    if (uniqueTracks.length === 0) return;

    // 2. Add deduplicated unique tracks in priority order
    const savedSub = tmdbId ? localStorage.getItem(`streamnet_sub_${tmdbId}`) : null;

    uniqueTracks.forEach((track, idx) => {
      const isDefault = track.default ?? (idx === 0);
      const safeLang =
        idx === 0
          ? track.language || 'en'
          : `${track.language || 'en'}-${idx + 1}`;

      const textTrack = new TextTrack({
        id: `vds-trk-${idx}-${Math.random().toString(36).slice(2, 7)}`,
        src: track.src,
        kind: track.kind || 'subtitles',
        label: track.label,
        language: safeLang,
        type: 'vtt',
        default: isDefault,
      });

      if (savedSub === 'off') {
        textTrack.mode = 'disabled';
      } else if (savedSub && savedSub === track.label) {
        textTrack.mode = 'showing';
      } else if (!savedSub && isDefault) {
        textTrack.mode = 'showing';
      } else {
        textTrack.mode = 'disabled';
      }

      textTracks.add(textTrack);
    });
  }, [uniqueTracks, tracksSignature, src, tmdbId]);

  // Dynamic subtitle auto-activation when tracks change asynchronously
  useEffect(() => {
    if (!player.current || uniqueTracks.length === 0) return;

    const activateSubtitle = () => {
      if (!player.current) return;
      const textTracks = player.current.textTracks;
      if (!textTracks || textTracks.length === 0) return;

      const trackList = Array.from(textTracks).filter(Boolean) as TextTrack[];
      const savedSub = tmdbId ? localStorage.getItem(`streamnet_sub_${tmdbId}`) : null;

      if (savedSub === 'off') return;

      let target: TextTrack | undefined;
      if (savedSub) {
        target = trackList.find((t) => t && t.label === savedSub);
      }
      if (!target) {
        target =
          trackList.find((t) => t && (t as any).default) ||
          trackList.find((t) => t.label?.toLowerCase().includes('netflix')) ||
          trackList.find((t) => t.label?.toLowerCase().includes('crunchyroll')) ||
          trackList.find((t) => t.label?.toLowerCase().includes('english') && !t.label.includes('(')) ||
          trackList.find(
            (t) =>
              t &&
              (t.label.toLowerCase().includes('english') ||
                t.language?.startsWith('en')),
          ) ||
          trackList[0];
      }

      if (target) {
        for (const t of trackList) {
          if (!t) continue;
          if (t === target) {
            t.mode = 'showing';
          } else if (t.mode === 'showing') {
            t.mode = 'disabled';
          }
        }
      }
    };

    const timer1 = setTimeout(activateSubtitle, 150);
    const timer2 = setTimeout(activateSubtitle, 600);
    const timer3 = setTimeout(activateSubtitle, 1500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [uniqueTracks, tmdbId]);

  // Force English/Preferred audio & subtitles whenever tracks change, unless there is a saved preference
  useEffect(() => {
    if (!player.current) return;

    return player.current.subscribe(({ audioTracks, textTracks, canPlay }) => {
      // Restore saved progress once per source change when player is ready
      if (tmdbId && hasResumedRef.current !== src && player.current && canPlay) {
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
        const savedAudio = tmdbId ? localStorage.getItem(`streamnet_audio_${tmdbId}`) : null;
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

      // Restore saved subtitle preference or force English/Default
      if (textTracks.length > 0) {
        const savedSub = tmdbId ? localStorage.getItem(`streamnet_sub_${tmdbId}`) : null;

        if (savedSub === 'off') {
          // User explicitly toggled subtitles off
        } else if (savedSub) {
          const targetSub = textTracks.find(t => t.label === savedSub);
          if (targetSub && targetSub.mode !== 'showing') {
            targetSub.mode = 'showing';
          }
        } else {
          const activeSub = textTracks.find(t => (t as any).default) ||
            textTracks.find(t =>
              t.label.toLowerCase().includes('english') || t.language?.startsWith('en')
            ) || textTracks[0];
          if (activeSub && activeSub.mode !== 'showing') {
            activeSub.mode = 'showing';
          }
        }
      }
    });
  }, [src, preferredLanguage, tmdbId]);

  return (
    <div className={`relative w-full rounded-xl overflow-hidden shadow-2xl bg-black ${className || 'aspect-video'}`}>

      <MediaPlayer
        ref={player}
        src={formattedMediaSrc}
        poster={poster}
        autoPlay={autoPlay}
        lang={preferredLanguage === 'hi' ? 'hi' : 'en'}
        onError={(err: any) => {
          console.warn('[VidstackPlayer] Stream error encountered:', err?.detail || err, 'Advancing to next available stream source...');
          onInvalidDuration?.(0);
        }}
        onDurationChange={(detail: any) => {
          const duration = typeof detail === 'number' ? detail : detail?.duration;
          if (typeof duration === 'number' && !isNaN(duration) && duration > 0) {
            onDurationChange?.(duration);
          }
        }}
        onLoadedMetadata={() => {
          if (player.current && typeof player.current.duration === 'number' && player.current.duration > 0) {
            onDurationChange?.(player.current.duration);
          }
        }}
        onEnded={() => {
          clearMediaSession();
          if (tmdbId) {
            localStorage.removeItem(`streamnet_progress_${tmdbId}`);
          }
          onEnded?.();
        }}
        onCanPlay={() => {
          if (!player.current) return;

          if (typeof player.current.duration === 'number' && player.current.duration > 0) {
            onDurationChange?.(player.current.duration);
          }

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
        onProviderChange={(provider) => {
          if (isHLSProvider(provider)) {
            provider.config = {
              ...provider.config,
              fragLoadingMaxRetry: 6,
              fragLoadingMaxRetryTimeout: 15000,
              manifestLoadingMaxRetry: 6,
              manifestLoadingMaxRetryTimeout: 15000,
              levelLoadingMaxRetry: 6,
            };
          }
        }}
        onAudioTracksChange={(tracks) => {
          if (!tracks || !tmdbId) return;
          try {
            const trackList = (Array.isArray(tracks) ? tracks : Array.prototype.slice.call(tracks)) as AudioTrack[];
            const selected = trackList.find((t) => t.selected);
            if (selected) {
              localStorage.setItem(`streamnet_audio_${tmdbId}`, selected.label);
            }
          } catch {}
        }}
        onTextTracksChange={(tracks) => {
          if (!tracks || !tmdbId) return;
          try {
            const trackList = (Array.isArray(tracks) ? tracks : Array.prototype.slice.call(tracks)) as TextTrack[];
            if (trackList.length > 0) {
              const showing = trackList.find((t) => t.mode === 'showing');
              if (showing) {
                localStorage.setItem(`streamnet_sub_${tmdbId}`, showing.label);
              }
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
        crossOrigin="anonymous"
      >
        <MediaProvider>
          {poster && (
            <Poster
              className="vds-poster absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-300 data-visible:opacity-100"
              src={poster}
              alt={title || 'Video poster'}
            />
          )}
        </MediaProvider>

        <DefaultVideoLayout
          thumbnails={thumbnails}
          icons={defaultLayoutIcons}
        />
      </MediaPlayer>
    </div>
  );
}
