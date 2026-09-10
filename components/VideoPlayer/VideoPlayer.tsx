// VideoPlayer using ScreenScape embed with sandbox to block ads
// Auto-rotates to landscape on fullscreen (mobile)
'use client';

import React, { useEffect, useRef } from 'react';
import vpStyles from './VideoPlayer.module.css';

interface VideoPlayerProps {
  /** TMDB ID of the movie or TV show */
  tmdbId: string;
  /** Media type */
  type: 'movie' | 'tv';
  /** Season number (required for TV) */
  season?: number;
  /** Episode number (required for TV) */
  episode?: number;
  /** Preferred audio language (e.g. 'eng', 'hindi'). Optional. */
  language?: string;
  // Optional props that page components may pass (not used for URL building)
  title?: string;
  backdropPath?: string;
  imdbId?: string;
}

function buildEmbedUrl({ tmdbId, type, season, episode, language }: {
  tmdbId: string;
  type: 'movie' | 'tv';
  season?: number;
  episode?: number;
  language?: string;
}): string {
  let url = `https://screenscape.me/embed?tmdb=${tmdbId}&type=${type}`;
  if (type === 'tv') {
    if (season != null) url += `&s=${season}`;
    if (episode != null) url += `&e=${episode}`;
  }
  if (language) {
    url += `&lan=${language}`;
  }
  return url;
}

export default function VideoPlayer({ tmdbId, type, season, episode, language }: VideoPlayerProps) {
  const embedUrl = buildEmbedUrl({ tmdbId, type, season, episode, language });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const fsElement = document.fullscreenElement;

      if (fsElement && containerRef.current?.contains(fsElement)) {
        // Entering fullscreen — lock to landscape
        try {
          (screen.orientation as any).lock('landscape').catch(() => {});
        } catch {
          // screen.orientation.lock not available
        }
      } else {
        // Exiting fullscreen — unlock orientation
        try {
          screen.orientation.unlock();
        } catch {
          // Silently fail
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <div ref={containerRef} className={`w-full flex flex-col items-center ${vpStyles.embedPlayerContainer}`}>
      <iframe
        src={embedUrl}
        allowFullScreen
        allow="autoplay; fullscreen; picture-in-picture"
        className={`w-full max-w-6xl aspect-video rounded-xl overflow-hidden shadow-2xl border-0 ${vpStyles.embedIframe}`}
        title="Video Player"
      />
    </div>
  );
}
