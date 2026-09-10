// MoviePlayer using ScreenScape embed with sandbox to block ads
// Auto-rotates to landscape on fullscreen (mobile)
'use client';

import React, { useEffect, useRef } from 'react';
import vpStyles from './VideoPlayer/VideoPlayer.module.css';

interface MoviePlayerProps {
  /** TMDB ID of the movie */
  movieId: string;
  /** Preferred audio language (e.g. 'eng', 'hindi'). Optional. */
  language?: string;
}

function buildEmbedUrl(movieId: string, language?: string): string {
  let url = `https://screenscape.me/embed?tmdb=${movieId}&type=movie`;
  if (language) {
    url += `&lan=${language}`;
  }
  return url;
}

export default function MoviePlayer({ movieId, language }: MoviePlayerProps) {
  const embedUrl = buildEmbedUrl(movieId, language);
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
        {...({ webkitAllowFullScreen: true, mozAllowFullScreen: true } as any)}
        sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write; web-share"
        className={`w-full max-w-6xl aspect-video rounded-xl overflow-hidden shadow-2xl border-0 ${vpStyles.embedIframe}`}
        title="Movie Player"
      />
    </div>
  );
}
