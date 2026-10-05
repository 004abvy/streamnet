'use client';

import React, { useEffect } from 'react';
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

  return (
    <div className={`w-full h-[64vw] max-h-[420px] min-h-[250px] sm:h-[56vw] sm:max-h-[520px] md:h-[650px] md:max-h-[80vh] md:min-h-[540px] lg:h-[720px] xl:h-[780px] relative overflow-hidden bg-black ${className}`}>
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
}
