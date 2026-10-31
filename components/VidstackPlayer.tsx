'use client';

import React, { useEffect, useLayoutEffect, useRef, useState, useMemo } from 'react';
import { MediaPlayer, MediaProvider, Poster, Track, MediaPlayerInstance, isHLSProvider, TextTrack, TextTrackList, type AudioTrack, type MediaSrc } from '@vidstack/react';
import { DefaultVideoLayout, defaultLayoutIcons } from '@vidstack/react/player/layouts/default';

// Global patch to prevent duplicate subtitle/caption keys in Vidstack DefaultVideoLayout
if (typeof window !== 'undefined' && TextTrackList?.prototype) {
  const origAdd = TextTrackList.prototype.add;
  if (!(origAdd as any).__dedupePatched) {
    TextTrackList.prototype.add = function (init: any, trigger?: any) {
      const track = init instanceof TextTrack ? init : new TextTrack(init);
      const trackId = track.id || '';
      const trackKey = `${trackId}:${track.kind}-${(track.label || '').toLowerCase()}`;

      // Check for an existing track with identical ID or identical value key
      const duplicate = (this as any).items?.find((t: any) => {
        if (!t) return false;
        if (trackId && t.id === trackId) return true;
        const k = `${t.id || ''}:${t.kind}-${(t.label || '').toLowerCase()}`;
        return k === trackKey;
      });

      if (duplicate) {
        if (track.src && (!duplicate.src || duplicate.src !== track.src)) {
          this.remove(duplicate);
          return origAdd.call(this, track, trigger);
        }
        return this;
      }

      return origAdd.call(this, track, trigger);
    };
    (TextTrackList.prototype.add as any).__dedupePatched = true;
  }
}
import { clearMediaSession, suppressMediaSession } from '../utils/mediaSessionManager';
import { Clock, RotateCcw, X } from 'lucide-react';

import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';

import { getSavedProgress, clearWatchProgress, updateWatchProgress, getProgressKey } from '../utils/userStorage';

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
  mediaType?: 'movie' | 'tv' | 'anime' | string;
  season?: number;
  episode?: number;
  episodeId?: string;
  playerType?: 'standard' | 'vip' | 'anime';
  server?: string;
  audioType?: string;
  onTimeProgress?: (currentTime: number, duration: number) => void;
  waitForSubtitles?: boolean;
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
  mediaType = 'movie',
  season,
  episode,
  episodeId,
  playerType = 'standard',
  server,
  audioType,
  onTimeProgress,
  waitForSubtitles,
}: VidstackPlayerProps) {
  const player = useRef<MediaPlayerInstance>(null);
  const [activeMediaSrc, setActiveMediaSrc] = useState<MediaSrc>(src);
  const [hasStartedPlaying, setHasStartedPlaying] = useState<boolean>(false);
  const hasResumedRef = useRef<MediaSrc | null>(null);
  const resumeSeekAppliedRef = useRef<boolean>(false);

  const shouldWaitForSubs = waitForSubtitles ?? (tracks.length > 0 && audioType !== 'dub');
  const [isVideoReady, setIsVideoReady] = useState<boolean>(!shouldWaitForSubs);
  const [isSubReady, setIsSubReady] = useState<boolean>(!shouldWaitForSubs);
  const [isStreamStarted, setIsStreamStarted] = useState<boolean>(false);

  const formattedPoster = useMemo(() => {
    if (!poster || typeof poster !== 'string') return undefined;
    const trimmed = poster.trim();
    if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return undefined;
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `https://image.tmdb.org/t/p/w1280${cleanPath}`;
  }, [poster]);

  useEffect(() => {
    setActiveMediaSrc(src);
    setHasStartedPlaying(false);
    resumeSeekAppliedRef.current = false;
    hasResumedRef.current = null;
    const needsWait = waitForSubtitles ?? (tracks.length > 0 && audioType !== 'dub');
    setIsVideoReady(!needsWait);
    setIsSubReady(!needsWait);
    setIsStreamStarted(false);
    if (player.current) {
      try {
        player.current.currentTime = 0;
      } catch {}
    }
  }, [src, episodeId, season, episode, waitForSubtitles, audioType, tracks.length]);

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

  // Dead stream detection: if the video doesn't reach canPlay within 25 seconds, auto-switch
  useEffect(() => {
    if (!src || !tmdbId) return;
    
    const loadTimeout = setTimeout(() => {
      if (player.current) {
        const state = player.current.state;
        if ((!state.canPlay && state.currentTime === 0) || (state.waiting && state.currentTime === 0)) {
          console.warn('[VidstackPlayer] Stream load timeout (25s). Stream is likely dead. Auto-advancing...');
          onInvalidDuration?.(0);
        }
      }
    }, 25000);

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
  const [subtitleOffset, setSubtitleOffset] = useState<number>(0);
  const [isSyncPanelOpen, setIsSyncPanelOpen] = useState<boolean>(false);
  const [hudMessage, setHudMessage] = useState<string | null>(null);
  const hudTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const syncPanelRef = useRef<HTMLDivElement>(null);

  // Restore saved subtitle offset for this media
  useEffect(() => {
    if (tmdbId) {
      const savedOffset = localStorage.getItem(`streamnet_sub_offset_${tmdbId}`);
      if (savedOffset) {
        const val = parseFloat(savedOffset);
        if (!isNaN(val)) {
          setSubtitleOffset(val);
        }
      }
    }
  }, [tmdbId, src]);

  // Function to apply offset to all loaded cues
  const applyOffsetToCues = (offsetSeconds: number) => {
    if (!player.current) return;
    try {
      const textTracks = player.current.textTracks;
      if (!textTracks) return;

      const trackList = Array.from(textTracks).filter(Boolean) as any[];
      for (const track of trackList) {
        const cues = track.cues || track._cues;
        if (cues && cues.length > 0) {
          for (let i = 0; i < cues.length; i++) {
            const cue = cues[i];
            if (cue && typeof cue.startTime === 'number') {
              if (cue._origStart === undefined) {
                cue._origStart = cue.startTime;
                cue._origEnd = cue.endTime;
              }
              cue.startTime = Math.max(0, cue._origStart + offsetSeconds);
              cue.endTime = Math.max(0, cue._origEnd + offsetSeconds);
            }
          }
        }
      }
    } catch (e) {
      console.warn('[VidstackPlayer] Error adjusting subtitle cues:', e);
    }
  };

  const handleUpdateOffset = (newOffset: number) => {
    const rounded = Math.round(newOffset * 20) / 20; // 0.05s precision
    setSubtitleOffset(rounded);
    applyOffsetToCues(rounded);

    if (tmdbId) {
      localStorage.setItem(`streamnet_sub_offset_${tmdbId}`, rounded.toString());
    }

    const sign = rounded > 0 ? `+${rounded.toFixed(1)}s` : `${rounded.toFixed(1)}s`;
    const msg = rounded === 0 ? 'Subtitles Synced (0.0s)' : `Subtitle Sync: ${sign}`;
    setHudMessage(msg);
    if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    hudTimeoutRef.current = setTimeout(() => setHudMessage(null), 2200);
  };

  // Re-apply offset periodically if non-zero to catch any newly parsed chunk cues
  useEffect(() => {
    if (subtitleOffset === 0) return;
    const interval = setInterval(() => {
      applyOffsetToCues(subtitleOffset);
    }, 1500);
    return () => clearInterval(interval);
  }, [subtitleOffset]);

  // Click outside to close sync panel
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (syncPanelRef.current && !syncPanelRef.current.contains(e.target as Node)) {
        setIsSyncPanelOpen(false);
      }
    };
    if (isSyncPanelOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSyncPanelOpen]);

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

      const rawSrc = (track.src || '').toLowerCase();
      const rawKind = (track.kind || '').toLowerCase();
      const trackLabel = (track.label || '').toLowerCase();

      // Guard: Never render scrubber thumbnails/sprites or metadata as subtitle text tracks
      if (
        rawKind === 'thumbnails' ||
        rawKind === 'thumbnail' ||
        rawKind === 'metadata' ||
        rawKind === 'chapters' ||
        rawSrc.includes('thumbnail') ||
        rawSrc.includes('sprite') ||
        rawSrc.includes('#xywh') ||
        rawSrc.includes('/thumbnails/') ||
        trackLabel.includes('thumbnail') ||
        trackLabel.includes('sprite')
      ) {
        continue;
      }

      // Filter: Keep ONLY English subtitles in popup menu
      const rawLower = (track.label || '').toLowerCase();
      const langLower = (track.language || '').toLowerCase();
      const isNonEng =
        rawLower.includes('arabic') ||
        rawLower.includes('italian') ||
        rawLower.includes('russian') ||
        rawLower.includes('french') ||
        rawLower.includes('german') ||
        rawLower.includes('spanish') ||
        rawLower.includes('portuguese') ||
        rawLower.includes('japanese') ||
        rawLower.includes('chinese') ||
        rawLower.includes('korean');

      const isHindi =
        rawLower.includes('hindi') ||
        rawLower.includes('हिन्दी') ||
        langLower === 'hi' ||
        langLower.startsWith('hi-');

      const isEnglish =
        !isNonEng &&
        (rawLower.includes('english') ||
          rawLower.includes('eng') ||
          langLower === 'en' ||
          langLower.startsWith('en-') ||
          langLower === 'eng');

      if (!isEnglish && !isHindi) {
        continue;
      }

      if (seenSrcs.has(track.src)) continue;
      seenSrcs.add(track.src);

      // Clean raw label
      let rawLabel = (track.label || (isHindi ? 'Hindi' : 'English')).trim();
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

      if (!rawLabel) rawLabel = isHindi ? 'Hindi' : 'English';

      const lower = rawLabel.toLowerCase();
      const count = seenLabels.get(lower) || 0;
      seenLabels.set(lower, count + 1);

      const label = count === 0 ? rawLabel : `${rawLabel} (${count + 1})`;

      result.push({
        ...track,
        label,
        language: track.language || (isHindi ? 'hi' : 'en'),
        type: 'vtt',
      });
    }

    function getTrackPriority(label: string): number {
      const l = (label || '').toLowerCase();
      if (l.includes('signs') || l.includes('songs') || l.includes('episode name')) return -10;
      if (preferredLanguage === 'hi' && (l.includes('hindi') || l.includes('हिन्दी'))) return 130;
      if (l.includes('aniwatch') || l.includes('hianime') || l.includes('megacloud') || l.includes('rapidcloud')) return 120;
      if (l.includes('netflix')) return 100;
      if (l.includes('crunchyroll')) return 95;
      if (l.includes('funimation') || l.includes('hidive')) return 90;
      if (l.includes('full') || l.includes('original') || l.includes('orignal')) return 85;
      if (l.includes('english') && !l.includes('(')) return 80;
      if (l.includes('hindi') || l.includes('हिन्दी')) return 75;
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



  // Safety timeout: never block playback for more than 3.2s if subtitle fails or network is slow
  useEffect(() => {
    if (!shouldWaitForSubs) return;
    const timeoutId = setTimeout(() => {
      setIsSubReady(true);
    }, 3200);
    return () => clearTimeout(timeoutId);
  }, [shouldWaitForSubs, src]);

  const activateSubtitle = (textTracks?: TextTrackList | null): boolean => {
    const list = textTracks || player.current?.textTracks;
    if (!list) return false;

    const trackArray = Array.from(list).filter(Boolean) as TextTrack[];
    const subTracks = trackArray.filter(
      (t) => t && (t.kind === 'subtitles' || t.kind === 'captions')
    );
    if (subTracks.length === 0) return false;

    const savedSub = tmdbId ? localStorage.getItem(`streamnet_sub_${tmdbId}`) : null;
    const isAnimeSub = playerType === 'anime' && audioType === 'sub';
    if (savedSub === 'off' && !isAnimeSub) return false;

    let target: TextTrack | undefined;
    if (savedSub && savedSub !== 'off') {
      target = subTracks.find((t) => t && t.label === savedSub);
    }
    if (!target) {
      target =
        subTracks.find((t) => t && (t as any).default) ||
        subTracks.find((t) => t.label?.toLowerCase().includes('aniwatch')) ||
        subTracks.find((t) => t.label?.toLowerCase().includes('megacloud')) ||
        subTracks.find((t) => t.label?.toLowerCase().includes('netflix')) ||
        subTracks.find((t) => t.label?.toLowerCase().includes('crunchyroll')) ||
        subTracks.find((t) => t.label?.toLowerCase().includes('english') && !t.label.includes('(')) ||
        subTracks.find(
          (t) =>
            t &&
            (t.label.toLowerCase().includes('english') ||
              t.language?.startsWith('en')),
        ) ||
        subTracks[0];
    }

    if (target) {
      for (const t of subTracks) {
        if (t === target) {
          if (t.mode !== 'showing') t.mode = 'showing';
        } else {
          if (t.mode === 'showing') t.mode = 'disabled';
        }
      }
      return true;
    }
    return false;
  };

  // Dynamic subtitle auto-activation when tracks change or are added asynchronously
  useEffect(() => {
    const attachTrackListeners = () => {
      if (!player.current) return;
      const textTracks = player.current.textTracks;
      if (!textTracks) return;

      const onTracksUpdated = () => {
        const activated = activateSubtitle(textTracks);
        if (activated) {
          setIsSubReady(true);
        }
      };

      textTracks.addEventListener('add', onTracksUpdated);
      textTracks.addEventListener('mode-change', onTracksUpdated);
      textTracks.addEventListener('remove', onTracksUpdated);

      onTracksUpdated();

      return () => {
        textTracks.removeEventListener('add', onTracksUpdated);
        textTracks.removeEventListener('mode-change', onTracksUpdated);
        textTracks.removeEventListener('remove', onTracksUpdated);
      };
    };

    const cleanup = attachTrackListeners();

    const timer1 = setTimeout(() => {
      if (activateSubtitle()) setIsSubReady(true);
    }, 100);
    const timer2 = setTimeout(() => {
      if (activateSubtitle()) setIsSubReady(true);
    }, 400);
    const timer3 = setTimeout(() => {
      if (activateSubtitle()) setIsSubReady(true);
    }, 1000);
    const timer4 = setTimeout(() => {
      if (activateSubtitle()) setIsSubReady(true);
    }, 2200);

    return () => {
      cleanup?.();
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [uniqueTracks, tmdbId, src, playerType, audioType]);

  // Start stream when both video and subtitles are loaded
  useEffect(() => {
    if (isVideoReady && isSubReady && !isStreamStarted) {
      setIsStreamStarted(true);
      if (player.current && autoPlay) {
        activateSubtitle(player.current.textTracks);
        player.current.play().catch(() => {});
      }
    }
  }, [isVideoReady, isSubReady, isStreamStarted, autoPlay]);

  // Restore saved progress directly on media element
  const applyResumeSeek = () => {
    if (!tmdbId || !player.current || resumeSeekAppliedRef.current) return;
    const targetProgress = getSavedProgress(tmdbId, mediaType, season, episode, episodeId);
    if (targetProgress > 1) {
      const dur = player.current.duration;
      if (!dur || targetProgress < dur - 10) {
        console.log(`[Vidstack] Resuming ${tmdbId} at ${targetProgress}s`);
        player.current.currentTime = targetProgress;
        resumeSeekAppliedRef.current = true;
      }
    } else {
      // Brand new episode or starting from beginning: strictly seek to 0:00
      try {
        player.current.currentTime = 0;
      } catch {}
      resumeSeekAppliedRef.current = true;
    }
  };

  // Force English/Preferred audio & subtitles whenever tracks change, unless there is a saved preference
  useEffect(() => {
    if (!player.current) return;

    return player.current.subscribe(({ audioTracks, textTracks, canPlay }) => {
      // Restore saved progress once per source change when player is ready
      if (tmdbId && hasResumedRef.current !== src && player.current && canPlay) {
        applyResumeSeek();
        hasResumedRef.current = src;
      }

      // Always default audio language to English
      if (audioTracks.length > 0) {
        const savedAudio = tmdbId ? localStorage.getItem(`streamnet_audio_${tmdbId}`) : null;
        let targetTrack = null;

        if (savedAudio) {
          targetTrack = audioTracks.find(t => t.label === savedAudio);
        }

        // Always prioritize English by default
        if (!targetTrack) {
          targetTrack = audioTracks.find(t => {
            const l = (t.label || '').toLowerCase();
            const lang = (t.language || '').toLowerCase();
            return l.includes('english') || l.includes('eng') || lang.startsWith('en');
          });
        }

        if (!targetTrack && preferredLanguage === 'hi') {
          targetTrack = audioTracks.find(t =>
            (t.label || '').toLowerCase().includes('hindi') || (t.language || '').startsWith('hi')
          );
        }

        if (!targetTrack) {
          targetTrack = audioTracks[0];
        }

        if (targetTrack && !targetTrack.selected) {
          targetTrack.selected = true;
        }
      }

      // Restore saved subtitle preference or force English/Default
      if (textTracks.length > 0) {
        const savedSub = tmdbId ? localStorage.getItem(`streamnet_sub_${tmdbId}`) : null;
        const isAnimeSub = playerType === 'anime' && audioType === 'sub';

        if (savedSub === 'off' && !isAnimeSub) {
          // User explicitly toggled subtitles off
        } else {
          const isAnySubShowing = textTracks.some(
            (t) => t && (t.kind === 'subtitles' || t.kind === 'captions') && t.mode === 'showing'
          );
          if (!isAnySubShowing) {
            const activated = activateSubtitle(player.current?.textTracks);
            if (activated) {
              setIsSubReady(true);
            }
          }
        }
      }
    });
  }, [src, preferredLanguage, tmdbId, mediaType, season, episode, episodeId, playerType, audioType]);

  return (
    <div className={`relative w-full rounded-xl overflow-hidden shadow-2xl bg-black ${className || 'aspect-video'}`}>

      <MediaPlayer
        ref={player}
        src={formattedMediaSrc}
        poster={playerType === 'anime' || hasStartedPlaying ? undefined : formattedPoster}
        autoPlay={shouldWaitForSubs ? false : autoPlay}
        onPlay={() => {
          setHasStartedPlaying(true);
        }}
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
            applyResumeSeek();
          }
        }}
        onEnded={() => {
          clearMediaSession();
          if (tmdbId) {
            clearWatchProgress(tmdbId, mediaType, season, episode, episodeId);
          }
          onEnded?.();
        }}
        onCanPlay={() => {
          if (!player.current) return;

          if (typeof player.current.duration === 'number' && player.current.duration > 0) {
            onDurationChange?.(player.current.duration);
          }

          // Direct seek on ready for HLS stability
          applyResumeSeek();
          setIsVideoReady(true);
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
              const showing = trackList.find((t) => (t.kind === 'subtitles' || t.kind === 'captions') && t.mode === 'showing');
              if (showing) {
                localStorage.setItem(`streamnet_sub_${tmdbId}`, showing.label);
                setIsSubReady(true);
              }
            }
          } catch {}
        }}
        onTimeUpdate={(detail) => {
          const currentTime = detail.currentTime;
          if (currentTime > 0 && !hasStartedPlaying) {
            setHasStartedPlaying(true);
          }
          const dur = player.current?.duration || 0;
          if (tmdbId && typeof currentTime === 'number' && currentTime > 0) {
            const progressSaveKey = getProgressKey(tmdbId, mediaType, season, episode, episodeId);
            const lastSaved = parseFloat(localStorage.getItem(`${progressSaveKey}_last_save`) || '0');
            if (Math.abs(currentTime - lastSaved) >= 1.5) {
              localStorage.setItem(`${progressSaveKey}_last_save`, currentTime.toString());
              updateWatchProgress({
                id: tmdbId,
                title,
                media_type: mediaType || 'movie',
                season,
                episode,
                episodeId,
                currentTime,
                duration: dur,
                playerType: (playerType as any) || 'standard',
                server,
                audioType: preferredLanguage || audioType,
                poster_path: formattedPoster || poster,
              });
              onTimeProgress?.(currentTime, dur);
            }
          }
        }}
        crossOrigin="anonymous"
      >
        <MediaProvider>
          {playerType !== 'anime' && !hasStartedPlaying && formattedPoster && (
            <Poster
              className="vds-poster absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-300 data-visible:opacity-100 pointer-events-none"
              src={formattedPoster}
              alt=""
            />
          )}
          {uniqueTracks.map((track, idx) => {
            const isDefault = track.default ?? (idx === 0);
            const safeLang =
              idx === 0
                ? track.language || 'en'
                : `${track.language || 'en'}-${idx + 1}`;
            const trackId = `track-${idx}-${(track.label || 'sub')
              .toLowerCase()
              .replace(/[^a-z0-9]/g, '-')}-${season || 1}-${episode || 1}`;

            return (
              <Track
                key={`vds-track-${track.src || trackId}-${trackId}-${idx}`}
                id={trackId}
                src={track.src}
                kind={track.kind}
                label={track.label}
                lang={safeLang}
                default={isDefault}
                type={(track.type as 'vtt' | 'srt') || 'vtt'}
              />
            );
          })}
        </MediaProvider>

        <DefaultVideoLayout
          thumbnails={thumbnails}
          icons={defaultLayoutIcons}
          noModal={true}
        />
      </MediaPlayer>

      {/* Stream & Subtitle Synchronization Loading Overlay */}
      {shouldWaitForSubs && (!isVideoReady || !isSubReady) && (
        <div className="absolute inset-0 z-40 bg-neutral-950/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3.5 transition-all duration-300 pointer-events-none">
          <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-white animate-spin flex items-center justify-center shadow-[0_0_25px_rgba(255,255,255,0.2)]">
            <div className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="text-xs font-bold tracking-wider uppercase text-white">
              {!isVideoReady ? 'Buffering Stream...' : 'Synchronizing Subtitles...'}
            </span>
            <span className="text-[10px] text-neutral-400 font-medium">
              Starting stream when both video and subtitles are loaded
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
