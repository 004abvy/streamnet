'use client';

import React, { useState, useEffect } from 'react';
import { X, Maximize2 } from 'lucide-react';
import { installAdblockProtection } from '../utils/adblockFramework';

interface RivePlayerProps {
  tmdbId: string;
  type: 'movie' | 'tv';
  season?: number;
  episode?: number;
  className?: string;
}

export default function RivePlayer({
  tmdbId,
  type,
  season,
  episode,
  className = ''
}: RivePlayerProps) {
  const [theaterMode, setTheaterMode] = useState(false);

  const embedUrl = type === 'movie'
    ? `https://rivestream.ru/embed?type=movie&id=${tmdbId}`
    : `https://rivestream.ru/embed?type=tv&id=${tmdbId}&season=${season}&episode=${episode}`;

  // Install adblock protection when Rive player is active
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const cleanup = installAdblockProtection(true, (action, target) => {
      console.log(`[RivePlayer] Adblock intercepted: ${action}`, target);
    });
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  // Auto-open theater mode on mobile when this player mounts
  useEffect(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
    if (isMobile) {
      setTheaterMode(true);
    }
  }, []);

  // Lock body scroll when in theater mode
  useEffect(() => {
    if (theaterMode) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [theaterMode]);

  // Inline player (desktop or after closing theater mode)
  const inlinePlayer = (
    <div
      className={`w-full relative overflow-hidden bg-black ${className}`}
      style={{ height: 'clamp(260px, 70vw, 100%)' }}
    >
      {/* Expand button (mobile only) */}
      <button
        onClick={() => setTheaterMode(true)}
        className="absolute top-2 right-2 z-20 p-1.5 bg-black/60 hover:bg-black/80 rounded-lg text-white/80 hover:text-white transition-all backdrop-blur-sm sm:hidden"
        title="Expand player"
      >
        <Maximize2 className="w-4 h-4" />
      </button>

      <iframe
        src={embedUrl}
        allowFullScreen
        sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
        {...({ webkitallowfullscreen: "true", mozallowfullscreen: "true" } as any)}
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer"
        className="w-full h-full border-0 block"
        title="Rive Player"
      />
    </div>
  );

  // Theater mode: fixed full-screen overlay that fills the entire viewport
  const theaterPlayer = (
    <div className="fixed inset-0 z-[99999] bg-black flex flex-col">
      {/* Top bar with close */}
      <div className="flex items-center justify-end px-3 py-2 bg-black/80 backdrop-blur-sm shrink-0">
        <button
          onClick={() => setTheaterMode(false)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-semibold transition-all"
        >
          <X className="w-3.5 h-3.5" />
          Exit
        </button>
      </div>

      {/* Full iframe */}
      <div className="flex-1 relative overflow-hidden">
        <iframe
          src={embedUrl}
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
          {...({ webkitallowfullscreen: "true", mozallowfullscreen: "true" } as any)}
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer"
          className="w-full h-full border-0 block"
          title="Rive Player"
        />
      </div>
    </div>
  );

  return (
    <>
      {inlinePlayer}
      {theaterMode && theaterPlayer}
    </>
  );
}
