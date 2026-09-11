'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MediaPlayer, MediaProvider, Poster, Track, MediaPlayerInstance } from '@vidstack/react';
import { DefaultVideoLayout, defaultLayoutIcons } from '@vidstack/react/player/layouts/default';

import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';

export interface VidstackTrack {
  src: string;
  label?: string;
  language?: string;
  kind: 'subtitles' | 'captions' | 'chapters' | 'descriptions';
  default?: boolean;
}

export interface VidstackSource {
  src: string;
  type?: string;
}

export interface DirectSourceItem {
  id: string;
  name: string;
  url: string;
  audioLanguages?: string[];
  isWorking?: boolean;
}

export interface VidstackPlayerProps {
  title?: string;
  poster?: string;
  src: string | VidstackSource[] | any;
  tracks?: VidstackTrack[];
  thumbnails?: string;
  className?: string;
  autoPlay?: boolean;
  onEnded?: () => void;
  onInvalidDuration?: (duration: number) => void;
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
  const [showStreamsDropdown, setShowStreamsDropdown] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const hasResumedRef = useRef<string | null>(null);

  // Force English/Preferred audio whenever tracks change, unless there is a saved preference
  useEffect(() => {
    if (!player.current || !tmdbId) return;

    return player.current.subscribe(({ audioTracks, textTracks, currentTime, paused, canPlay }) => {
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

        if (savedSub) {
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

  // Find active source object to extract audio language info
  const activeSourceObj = availableDirectSources.find(
    s => s.name === serverName || s.url === src
  );

  // Handle outside clicks to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowStreamsDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl bg-black ${className}`}>
      {/* Top Right Overlay: Sleek Glassmorphism Streams Dropdown Menu & Always-visible Audio Badge */}
      {availableDirectSources && availableDirectSources.length > 0 && (
        <div className="absolute top-3.5 right-3.5 z-40 flex items-center gap-2" ref={menuRef}>
          {/* Always Visible Audio Language Badge Overlay */}
          {activeSourceObj?.audioLanguages && activeSourceObj.audioLanguages.length > 0 ? (
            activeSourceObj.audioLanguages.some(l => l.toLowerCase().includes('hin')) ? (
              <button
                onClick={() => setShowStreamsDropdown(!showStreamsDropdown)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 hover:border-amber-400/60 rounded-xl text-xs font-extrabold backdrop-blur-2xl transition cursor-pointer shadow-lg active:scale-95"
                title="Active Audio: Hindi"
              >
                <span className="text-sm">🇮🇳</span>
                <span>Hindi Audio</span>
              </button>
            ) : (
              <button
                onClick={() => setShowStreamsDropdown(!showStreamsDropdown)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-950/80 hover:bg-neutral-900 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold backdrop-blur-2xl transition cursor-pointer shadow-lg"
                title={`Active Audio: ${activeSourceObj.audioLanguages.join(', ')}`}
              >
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
                <span>Audio: {activeSourceObj.audioLanguages.join('/')}</span>
              </button>
            )
          ) : (
            <button
              onClick={() => setShowStreamsDropdown(!showStreamsDropdown)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-950/80 hover:bg-neutral-900 text-neutral-300 border border-white/15 rounded-xl text-xs font-bold backdrop-blur-2xl transition cursor-pointer shadow-lg"
              title="Default Audio"
            >
              <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
              <span>Audio: Default</span>
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => setShowStreamsDropdown(!showStreamsDropdown)}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-neutral-950/80 hover:bg-neutral-900/95 text-white border border-white/15 hover:border-white/30 rounded-xl text-xs font-bold tracking-wide backdrop-blur-2xl shadow-xl transition-all duration-200 cursor-pointer group"
              title="Select Direct Stream Server"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <span className="tracking-wide flex items-center gap-1.5">
                <span>Streams ({serverName || 'VidSrc Direct'})</span>
              </span>
              <svg
                className={`w-3.5 h-3.5 text-neutral-400 group-hover:text-white transition-transform duration-200 ${showStreamsDropdown ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

          {showStreamsDropdown && (
            <div className="absolute right-0 mt-2 w-64 p-2 bg-neutral-950/95 border border-white/15 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-1 max-h-80 overflow-y-auto">
              <div className="px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 border-b border-white/10 flex items-center justify-between">
                <span>Direct Servers & Audio</span>
                <span className="text-emerald-400 font-bold">{availableDirectSources.length} Verified</span>
              </div>
              {availableDirectSources.map((source, idx) => {
                const isActive = source.name === serverName || src === source.url;
                const hasHindi = source.audioLanguages?.some(l => l.toLowerCase().includes('hin'));
                return (
                  <button
                    key={`src-${idx}`}
                    onClick={() => {
                      onSelectDirectSource?.(source);
                      setShowStreamsDropdown(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                      isActive
                        ? 'bg-white/15 text-white border border-white/20'
                        : 'text-neutral-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <svg className="w-3.5 h-3.5 text-neutral-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex flex-col truncate">
                        <span className="truncate font-medium">{source.name}</span>
                        {source.audioLanguages && source.audioLanguages.length > 0 && (
                          <span className={`text-[9px] font-semibold leading-tight ${hasHindi ? 'text-amber-300 font-bold' : 'text-neutral-400'}`}>
                            Audio: {source.audioLanguages.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                    {isActive ? (
                      <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <span className="text-[10px] text-emerald-400 font-bold uppercase shrink-0">Online</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          </div>
        </div>
      )}

      <MediaPlayer
        ref={player}
        title={title}
        src={src as any}
        poster={poster}
        autoPlay={autoPlay}
        crossOrigin="anonymous"
        lang={preferredLanguage === 'hi' ? 'hi' : 'en'}
        onEnded={() => {
          if (tmdbId) {
            localStorage.removeItem(`streamnet_progress_${tmdbId}`);
          }
          onEnded?.();
        }}
        onDurationChange={(detail) => {
          if (typeof detail === 'number' && detail > 0 && detail < 60) {
            onInvalidDuration?.(detail);
          }
        }}
        onCanPlay={() => {
          // Direct seek on ready for HLS stability
          if (tmdbId && hasResumedRef.current !== src && player.current) {
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
        onAudioTracksChange={(event) => {
          const tracks = event.detail || event.target;
          if (!tracks || !tmdbId) return;
          try {
            const trackList = Array.isArray(tracks) ? tracks : Array.from(tracks as any);
            const selected = trackList.find((t: any) => t.selected);
            if (selected) {
              localStorage.setItem(`streamnet_audio_${tmdbId}`, (selected as any).label);
            }
          } catch {}
        }}
        onTextTracksChange={(event) => {
          const tracks = event.detail || event.target;
          if (!tracks || !tmdbId) return;
          try {
            const trackList = Array.isArray(tracks) ? tracks : Array.from(tracks as any);
            const showing = trackList.find((t: any) => t.mode === 'showing');
            if (showing) {
              localStorage.setItem(`streamnet_sub_${tmdbId}`, (showing as any).label);
            } else {
              localStorage.removeItem(`streamnet_sub_${tmdbId}`);
            }
          } catch {}
        }}
        onTimeUpdate={(event) => {
          const currentTime = event.detail?.currentTime;
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
              className="vds-poster absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-300 data-[visible]:opacity-100"
              src={poster}
              alt={title || 'Video poster'}
            />
          )}
          {tracks.map((track, idx) => (
            <Track
              key={`track-${idx}`}
              src={track.src}
              kind={track.kind}
              label={track.label}
              lang={track.language}
              default={track.default}
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
