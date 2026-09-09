'use client';

import { useState, useEffect } from 'react';
import NativeHlsPlayer from './VideoPlayer/NativeHlsPlayer';

export default function MoviePlayer({ movieId }: { movieId: string }) {
  const [movie, setMovie] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState<any[]>([]);
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);
  const [stream, setStream] = useState<any>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch TMDB metadata (optional)
  useEffect(() => {
    if (!movieId) return;
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
    fetch(`${backendUrl}/api/movies/${movieId}`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        setMovie(data);
        setLoading(false);
      })
      .catch(() => {
        setMovie(null);
        setLoading(false);
      });
  }, [movieId]);

  // Resolve HLS sources on first play
  const handleStart = async () => {
    if (stream || isResolving) return;
    setIsResolving(true);
    setError(null);
    try {
      const params = new URLSearchParams({ id: movieId, type: 'movie' });
      const res = await fetch(`/api/stream/auto-resolve?${params.toString()}`);
      const data = await res.json();
      const resolved = Array.isArray(data?.sources) && data.sources.length > 0
        ? data.sources
        : data?.streamUrl
        ? [{
            streamUrl: data.streamUrl,
            streamType: data.streamType || 'hls',
            provider: data.provider || 'HLS Direct',
            quality: data.quality || '1080p',
          }]
        : [];
      if (resolved.length > 0) {
        setSources(resolved);
        setActiveSourceIndex(0);
        setStream(resolved[0]);
      } else {
        setError('No HLS streams available.');
      }
    } catch (e) {
      setError('Failed to resolve HLS stream.');
    } finally {
      setIsResolving(false);
    }
  };

  const handleHlsError = (msg?: string) => {
    if (sources.length > 1 && activeSourceIndex < sources.length - 1) {
      const next = activeSourceIndex + 1;
      setActiveSourceIndex(next);
      setStream(sources[next]);
    } else {
      setError(msg || 'All HLS streams failed.');
    }
  };

  const posterUrl = movie?.poster_path ? `https://image.tmdb.org/t/p/w1280${movie.poster_path}` : '/fallback-backdrop.jpg';

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full max-w-6xl aspect-video rounded-xl overflow-hidden shadow-2xl bg-black border border-neutral-800 relative">
        {stream ? (
          <NativeHlsPlayer
            streamUrl={stream.streamUrl}
            streamType={stream.streamType || 'hls'}
            posterUrl={posterUrl}
            title={movie?.title}
            onError={handleHlsError}
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full cursor-pointer" onClick={handleStart}>
            <button className="px-4 py-2 bg-amber-500 text-black rounded">Play Movie (HLS)</button>
          </div>
        )}
      </div>

      {/* Metadata Section */}
      <div className="w-full max-w-6xl mt-8 text-left">
        {loading ? (
          <p>Loading movie details…</p>
        ) : movie && movie.id ? (
          <div className="flex flex-col gap-4">
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">{movie.title}</h1>
            {movie.tagline && <p className="text-lg text-neutral-400 italic">"{movie.tagline}"</p>}
            <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-neutral-300">
              <span className="flex items-center gap-1">⭐ {movie.vote_average?.toFixed(1)} / 10</span>
              <span>•</span>
              <span>{movie.release_date?.split('-')[0]}</span>
              <span>•</span>
              <span>{movie.runtime} min</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {movie.genres?.map((genre:any) => (
                <span key={genre.id} className="px-3 py-1 bg-neutral-800 border border-neutral-700 rounded-full text-xs text-neutral-300">
                  {genre.name}
                </span>
              ))}
            </div>
            <div className="mt-4">
              <h3 className="text-xl font-semibold text-white mb-2 border-b border-neutral-800 pb-2">Overview</h3>
              <p className="text-neutral-400 leading-relaxed max-w-4xl text-sm md:text-base">{movie.overview}</p>
            </div>
          </div>
        ) : (
          <p className="text-neutral-500 bg-neutral-900 p-4 rounded-lg border border-neutral-800">Movie details could not be loaded. Please ensure your backend is running.</p>
        )}
      </div>
    </div>
  );
}
