// MoviePlayer using Screenscape embed URL
import React from 'react';

/** Props for the MoviePlayer component */
interface MoviePlayerProps {
  /** TMDB ID of the movie */
  movieId: string;
}

/** Build Screenscape embed URL for a movie */
function buildEmbedUrl(movieId: string): string {
  const base = 'https://screenscape.me/embed';
  return `${base}?tmdb=${movieId}&type=movie`;
}

export default function MoviePlayer({ movieId }: MoviePlayerProps) {
  const embedUrl = buildEmbedUrl(movieId);

  return (
    <div className="w-full flex flex-col items-center">
      <iframe
        src={embedUrl}
        allowFullScreen
        className="w-full max-w-6xl aspect-video rounded-xl overflow-hidden shadow-2xl"
        title="Movie Player"
      ></iframe>
    </div>
  );
}
