// VideoPlayer using ScreenScape embed with sandbox to block ads
'use client';

import React from 'react';

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

  return (
    <div className="w-full flex flex-col items-center">
      <iframe
        src={embedUrl}
        allowFullScreen
        sandbox="allow-scripts allow-same-origin allow-forms"
        allow="autoplay; fullscreen; picture-in-picture"
        className="w-full max-w-6xl aspect-video rounded-xl overflow-hidden shadow-2xl border-0"
        title="Video Player"
      />
    </div>
  );
}
