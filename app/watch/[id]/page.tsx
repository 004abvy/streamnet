'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '../../../components/Navbar/Navbar';
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
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';

    fetch(`${backendUrl}/api/movies/${id}`)
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
    <main className="min-h-screen bg-neutral-950 text-white flex flex-col items-center p-4 md:p-8 pt-20 md:pt-24">
      <Navbar />

      <div className="w-full max-w-[1050px] mb-4 flex items-center justify-between flex-wrap gap-3">
        <Link
          href={`/movie/${id}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-300 hover:text-white bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-500/50 px-4 py-2 rounded-xl transition-all shadow-md"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          <span>Back</span>
        </Link>

        {movie && (
          <div className="flex items-center gap-2.5">
            <div className="inline-flex items-center gap-2 text-amber-400 font-extrabold text-sm bg-amber-500/10 border border-amber-500/40 px-4 py-2 rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.12)]">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span>{movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'} {movie.release_date ? `• ${movie.release_date.split('-')[0]}` : ''}</span>
            </div>
          </div>
        )}
      </div>

      <div className="w-full max-w-[1050px] mt-2">
        {loading ? (
          <div className="w-full flex flex-col gap-6">
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-neutral-900/90 border border-white/10 shadow-2xl flex flex-col justify-between p-6">
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

              {/* Top Bar Skeleton */}
              <div className="relative z-10 flex items-center justify-between w-full opacity-60">
                <div className="h-4 w-32 rounded-full bg-neutral-800" />
                <div className="h-4 w-20 rounded-full bg-neutral-800" />
              </div>

              {/* Center Glowing Play Ring */}
              <div className="relative z-10 flex flex-col items-center justify-center gap-3">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-amber-500/40 backdrop-blur-md flex items-center justify-center shadow-[0_0_25px_rgba(245,158,11,0.3)] animate-pulse">
                  <div className="w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[14px] border-l-amber-400 ml-1" />
                </div>
                <span className="text-xs font-semibold tracking-wider uppercase text-neutral-400">
                  Preparing Cinema Stream...
                </span>
              </div>

              {/* Bottom Scrubber & Controls Skeleton */}
              <div className="relative z-10 flex flex-col gap-3 w-full bg-gradient-to-t from-black/80 to-transparent -mx-6 -mb-6 p-6">
                {/* Scrubber track */}
                <div className="w-full h-1.5 rounded-full bg-neutral-800 relative overflow-hidden">
                  <div
                    className="h-full w-1/3 bg-amber-500/60 rounded-full"
                    style={{
                      animation: 'sleekPulse 2s ease-in-out infinite',
                    }}
                  />
                </div>
                {/* Control buttons */}
                <div className="flex items-center justify-between opacity-50">
                  <div className="flex items-center gap-4">
                    <div className="w-6 h-6 rounded bg-neutral-700" />
                    <div className="w-6 h-6 rounded bg-neutral-700" />
                    <div className="w-16 h-3 rounded bg-neutral-700" />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-6 h-6 rounded bg-neutral-700" />
                    <div className="w-6 h-6 rounded bg-neutral-700" />
                  </div>
                </div>
              </div>
            </div>

            {/* Below Player Metadata Skeleton */}
            <div className="w-full flex flex-col gap-3 pt-2">
              <div className="h-8 w-1/2 rounded-lg bg-neutral-800/80 animate-pulse" />
              <div className="flex items-center gap-3">
                <div className="h-5 w-20 rounded-md bg-neutral-800/60" />
                <div className="h-5 w-16 rounded-md bg-neutral-800/60" />
                <div className="h-5 w-24 rounded-md bg-neutral-800/60" />
              </div>
              <div className="h-16 w-full rounded-lg bg-neutral-800/40 mt-1" />
            </div>
          </div>
        ) : movie ? (
          <>
            <VideoPlayer
              tmdbId={id}
              type="movie"
              title={movie.title || movie.name}
              backdropPath={movie.backdrop_path}
              imdbId={imdbId}
            />

            {similarMovies.length > 0 && (
              <div className="w-full mt-8">
                <PosterCarousel title="You May Also Like" movies={similarMovies} />
              </div>
            )}
          </>
        ) : (
          <div className="w-full aspect-video flex items-center justify-center text-neutral-500 bg-neutral-900 rounded-xl border border-neutral-800">
            Movie details could not be loaded. Please ensure your backend is running.
          </div>
        )}
      </div>
    </main>
  );
}
