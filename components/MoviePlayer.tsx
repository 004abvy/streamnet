// MoviePlayer using ScreenScape embed with sandbox to block ads
'use client';

import React from 'react';

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

  return (
    <div className="w-full flex flex-col items-center">
      <iframe
        src={embedUrl}
        allowFullScreen
        sandbox="allow-scripts allow-same-origin allow-forms"
        allow="autoplay; fullscreen; picture-in-picture"
        className="w-full max-w-6xl aspect-video rounded-xl overflow-hidden shadow-2xl border-0"
        title="Movie Player"
      />
    </div>
  );
}
