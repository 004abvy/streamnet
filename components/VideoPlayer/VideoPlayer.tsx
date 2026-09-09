// VideoPlayer using Screenscape embed URLs
import React from 'react';

/** Props for the VideoPlayer component */
interface VideoPlayerProps {
  /** TMDB ID of the movie or TV show */
  tmdbId: string;
  /** Media type */
  type: 'movie' | 'tv';
  /** Season number (required for TV) */
  season?: number;
  /** Episode number (required for TV) */
  episode?: number;
}

/** Build Screenscape embed URL */
function buildEmbedUrl({ tmdbId, type, season, episode }: {
  tmdbId: string;
  type: 'movie' | 'tv';
  season?: number;
  episode?: number;
}): string {
  const base = 'https://screenscape.me/embed';
  if (type === 'movie') {
    return `${base}?tmdb=${tmdbId}&type=movie`;
  } else {
    const s = season ?? '';
    const e = episode ?? '';
    return `${base}?tmdb=${tmdbId}&type=tv&s=${s}&e=${e}`;
  }
}

export default function VideoPlayer({ tmdbId, type, season, episode }: VideoPlayerProps) {
  const embedUrl = buildEmbedUrl({ tmdbId, type, season, episode });

  return (
    <div className="w-full flex flex-col items-center">
      <iframe
        src={embedUrl}
        allowFullScreen
        className="w-full max-w-6xl aspect-video rounded-xl overflow-hidden shadow-2xl"
        title="Video Player"
      ></iframe>
    </div>
  );
}
