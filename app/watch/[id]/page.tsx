'use client';

import { use, useState, useEffect } from 'react';
import VideoPlayer from '../../../components/VideoPlayer/VideoPlayer';
import PosterCarousel from '../../../components/PosterCarousel/PosterCarousel';
import { saveContinueWatching } from '../../../utils/userStorage';

export default function WatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [movie, setMovie] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    fetch(`/api/movies/${id}`)
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data && !data.error) {
          setMovie(data);

          // Add/update to continue watching
          try {
            const stored = localStorage.getItem('continueWatching');
            const list = stored ? JSON.parse(stored) : [];
            const filtered = list.filter((i: any) => String(i.id) !== String(data.id || id));
            const itemToSave = {
              id: data.id || Number(id),
              title: data.title || data.name,
              name: data.name || data.title,
              poster_path: data.poster_path,
              backdrop_path: data.backdrop_path,
              vote_average: data.vote_average,
              release_date: data.release_date || data.first_air_date,
              media_type: 'movie'
            };
            saveContinueWatching([itemToSave, ...filtered]);
          } catch (e) {
            console.warn(e);
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Error fetching movie:", err);
        setLoading(false);
      });
  }, [id]);

  const imdbId = movie?.external_ids?.imdb_id || movie?.imdb_id;
  const similarMovies = movie?.similar?.results || movie?.recommendations?.results || [];

  return (
    <main className="min-h-screen bg-neutral-950 text-white flex flex-col items-center px-3 sm:px-6 md:px-8 pt-20 md:pt-24 pb-16 relative overflow-x-hidden">
      <div className="w-full max-w-6xl">
        {loading ? (
          <div className="w-full flex flex-col gap-6">
            <div className="relative w-full aspect-video rounded-2xl md:rounded-3xl overflow-hidden bg-neutral-900/90 border border-white/10 shadow-2xl flex flex-col items-center justify-center p-6">
              {/* Shimmer sweep */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(110deg, transparent 0%, transparent 35%, rgba(255,255,255,0.06) 50%, transparent 65%, transparent 100%)',
                  backgroundSize: '200% 100%',
                  animation: 'sleekShimmer 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite',
                }}
              />
              {/* Ambient Theater Glow */}
              <div
                className="absolute inset-0 pointer-events-none opacity-40"
                style={{
                  background: 'radial-gradient(circle at 50% 50%, rgba(245, 158, 11, 0.15) 0%, transparent 65%)',
                  animation: 'sleekPulse 3s ease-in-out infinite',
                }}
              />

              {/* Center Glowing Play Ring */}
              <div className="relative z-10 flex flex-col items-center justify-center gap-3">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-amber-500/40 backdrop-blur-md flex items-center justify-center shadow-[0_0_25px_rgba(245,158,11,0.3)] animate-pulse">
                  <div className="w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[14px] border-l-amber-400 ml-1" />
                </div>
                <span className="text-xs font-semibold tracking-wider uppercase text-neutral-400">
                  Preparing Cinema Stream...
                </span>
              </div>
            </div>

            {/* Below Player Metadata Skeleton */}
            <div className="w-full flex flex-col gap-3 pt-2">
              <div className="h-7 w-1/3 rounded-lg bg-neutral-800/80 animate-pulse" />
              <div className="flex items-center gap-3">
                <div className="h-5 w-20 rounded-md bg-neutral-800/60" />
                <div className="h-5 w-16 rounded-md bg-neutral-800/60" />
              </div>
            </div>
          </div>
        ) : (
          <>
            <VideoPlayer
              tmdbId={id}
              type="movie"
              title={movie?.title || movie?.name}
              backdropPath={movie?.backdrop_path}
              imdbId={imdbId}
              voteAverage={movie?.vote_average}
              releaseDate={movie?.release_date}
              backHref={`/movie/${id}`}
            />

            {similarMovies.length > 0 && (
              <div className="w-full mt-10">
                <PosterCarousel title="You May Also Like" movies={similarMovies} />
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
