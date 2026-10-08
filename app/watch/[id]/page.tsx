'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import VideoPlayer from '../../../components/VideoPlayer/VideoPlayer';
import PosterCarousel from '../../../components/PosterCarousel/PosterCarousel';
import { saveContinueWatching, isUpcomingMedia, getFormattedReleaseDate } from '../../../utils/userStorage';
import { getRelevantRecommendations } from '../../../utils/recommendations';
import { Calendar, ArrowLeft, Play } from 'lucide-react';

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

          // Add/update to continue watching ONLY if already released
          if (!isUpcomingMedia(data)) {
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
        }
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Error fetching movie:", err);
        setLoading(false);
      });
  }, [id]);

  const imdbId = movie?.external_ids?.imdb_id || movie?.imdb_id;
  const similarMovies = getRelevantRecommendations(movie, 14);

  const isUpcoming = movie && isUpcomingMedia(movie);
  const trailer = movie?.videos?.results?.find(
    (v: any) => v.site === "YouTube" && v.type === "Trailer"
  ) || movie?.videos?.results?.find((v: any) => v.site === "YouTube");

  return (
    <main className="min-h-screen bg-neutral-950 text-white flex flex-col items-center px-3 sm:px-6 md:px-8 pt-20 md:pt-24 pb-16 relative overflow-x-hidden">
      <div className="w-full max-w-[88rem]">
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
                  background: 'radial-gradient(circle at 50% 50%, rgba(66, 132, 117, 0.3) 0%, transparent 65%)',
                  animation: 'sleekPulse 3s ease-in-out infinite',
                }}
              />

              {/* Center Glowing Play Ring */}
              <div className="relative z-10 flex flex-col items-center justify-center gap-3">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-[#89D7B7]/40 backdrop-blur-md flex items-center justify-center shadow-[0_0_25px_rgba(137,215,183,0.35)] animate-pulse">
                  <div className="w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[14px] border-l-[#89D7B7] ml-1" />
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
        ) : isUpcoming ? (
          /* Sleek Upcoming Release View */
          <div className="w-full flex flex-col gap-8">
            <div className="relative w-full rounded-2xl md:rounded-3xl overflow-hidden bg-neutral-900 border border-[#89D7B7]/30 shadow-2xl p-6 md:p-10 flex flex-col md:flex-row items-center gap-8">
              {movie?.backdrop_path && (
                <img
                  src={`https://image.tmdb.org/t/p/original${movie.backdrop_path}`}
                  alt={movie?.title || 'Backdrop'}
                  className="absolute inset-0 w-full h-full object-cover opacity-20 filter blur-sm pointer-events-none"
                />
              )}
              <div className="relative z-10 flex-1 flex flex-col gap-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#428475]/30 border border-[#89D7B7]/50 text-[#89D7B7] text-xs font-bold uppercase tracking-wider w-fit shadow-[0_0_12px_rgba(137,215,183,0.25)]">
                  <Calendar size={14} /> Upcoming Premiere
                </div>
                <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight">
                  {movie?.title || movie?.name}
                </h1>
                <p className="text-neutral-300 text-sm md:text-base leading-relaxed line-clamp-3">
                  {movie?.overview || 'This title is scheduled for an upcoming release. Stream links will be unlocked automatically when it premieres.'}
                </p>
                <div className="text-[#89D7B7]/90 text-sm font-semibold flex items-center gap-2">
                  <span>Premiere Date:</span>
                  <span className="text-white bg-white/10 px-2.5 py-0.5 rounded-md border border-white/15">
                    {getFormattedReleaseDate(movie)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link
                    href={`/movie/${id}`}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#428475] to-[#1A312C] hover:brightness-110 border border-[#89D7B7]/40 text-[#FFF4E1] font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-[#1A312C]/50"
                  >
                    <ArrowLeft size={16} /> View Movie Details
                  </Link>
                </div>
              </div>

              {trailer && (
                <div className="relative z-10 w-full md:w-[440px] aspect-video rounded-xl overflow-hidden border border-white/15 shadow-xl bg-black flex-shrink-0">
                  <iframe
                    src={`https://www.youtube.com/embed/${trailer.key}`}
                    title="Trailer"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              )}
            </div>

            {similarMovies.length > 0 && (
              <div className="w-full mt-6">
                <PosterCarousel title="You May Also Like" movies={similarMovies} />
              </div>
            )}
          </div>
        ) : (
          <>
            <VideoPlayer
              tmdbId={id}
              type="movie"
              title={movie?.title || movie?.name}
              posterPath={movie?.poster_path}
              backdropPath={movie?.backdrop_path}
              imdbId={imdbId}
              voteAverage={movie?.vote_average}
              releaseDate={movie?.release_date}
              expectedRuntime={movie?.runtime}
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
