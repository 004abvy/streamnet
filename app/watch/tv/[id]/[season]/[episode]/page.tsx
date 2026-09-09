'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../../../../../../components/Navbar/Navbar';
import VideoPlayer from '../../../../../../components/VideoPlayer/VideoPlayer';
import SeasonEpisodeSelector from '../../../../../../components/SeasonEpisodeSelector/SeasonEpisodeSelector';
import PosterCarousel from '../../../../../../components/PosterCarousel/PosterCarousel';
import { saveContinueWatching } from '../../../../../../utils/userStorage';

export default function WatchTvPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const seasonParam = params?.season as string;
  const episodeParam = params?.episode as string;

  const season = parseInt(seasonParam) || 1;
  const episode = parseInt(episodeParam) || 1;

  const [show, setShow] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';

    fetch(`${backendUrl}/api/tv/${id}`)
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data && !data.error) {
          setShow(data);

          // Add/update TV continue watching with season and episode
          try {
            const stored = localStorage.getItem('continueWatching');
            const list = stored ? JSON.parse(stored) : [];
            const filtered = list.filter((i: any) => String(i.id) !== String(data.id || id));
            const itemToSave = {
              id: data.id || Number(id),
              title: data.name || data.title,
              name: data.name || data.title,
              poster_path: data.poster_path,
              backdrop_path: data.backdrop_path,
              vote_average: data.vote_average,
              first_air_date: data.first_air_date || data.release_date,
              media_type: 'tv',
              last_season: season,
              last_episode: episode,
              season: season,
              episode: episode
            };
            saveContinueWatching([itemToSave, ...filtered]);
          } catch (e) {
            console.warn(e);
          }
        } else {
          setShow(null);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Metadata fetch error:", err);
        setShow(null);
        setLoading(false);
      });
  }, [id, season, episode]);

  const handleEpisodeChange = (newSeason: number, newEpisode: number) => {
    router.push(`/watch/tv/${id}/${newSeason}/${newEpisode}`);
  };

  const imdbId = show?.external_ids?.imdb_id || show?.imdb_id;
  const similarShows = show?.similar?.results || show?.recommendations?.results || [];

  return (
    <main className="min-h-screen bg-neutral-950 text-white flex flex-col items-center p-0 md:p-8 pt-20 md:pt-24">
      <Navbar />

      <div className="w-full max-w-[1050px] px-4 md:px-0 mb-4 flex items-center justify-between flex-wrap gap-3">
        <Link
          href={`/tv/${id}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-300 hover:text-white bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-500/50 px-4 py-2 rounded-xl transition-all shadow-md"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          <span>Back</span>
        </Link>

        <div className="inline-flex items-center gap-2 text-amber-400 font-extrabold text-sm bg-amber-500/10 border border-amber-500/40 px-4 py-2 rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.12)]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="7" width="20" height="15" rx="2" ry="2"/>
            <polyline points="17 2 12 7 7 2"/>
          </svg>
          <span>Season {season} • Episode {episode}</span>
        </div>
      </div>

      <div className="w-full max-w-[1050px] px-0 md:px-0 mt-2">
        {loading ? (
          <div className="w-full flex flex-col gap-6">
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-neutral-900/90 border border-white/10 shadow-2xl flex flex-col items-center justify-center p-6">
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
                  Preparing Episode Stream...
                </span>
              </div>
            </div>

            {/* Below Player Metadata Skeleton */}
            <div className="w-full flex flex-col gap-3 pt-2">
              <div className="h-8 w-1/2 rounded-lg bg-neutral-800/80 animate-pulse" />
              <div className="flex items-center gap-3">
                <div className="h-5 w-24 rounded-md bg-neutral-800/60" />
                <div className="h-5 w-20 rounded-md bg-neutral-800/60" />
              </div>
            </div>
          </div>
        ) : show ? (
          <>
            <VideoPlayer
              tmdbId={id}
              type="tv"
              title={`${show.name || show.title} (S${season} E${episode})`}
              backdropPath={show.backdrop_path}
              season={season}
              episode={episode}
              imdbId={imdbId}
            />

            <SeasonEpisodeSelector
              tvId={id}
              seasons={show.seasons || []}
              currentSeason={season}
              currentEpisode={episode}
              onEpisodeSelect={handleEpisodeChange}
            />

            {similarShows.length > 0 && (
              <div className="w-full mt-8">
                <PosterCarousel title="You May Also Like" movies={similarShows} />
              </div>
            )}
          </>
        ) : (
          <div className="w-full aspect-video flex items-center justify-center text-neutral-500 bg-neutral-900 rounded-xl border border-neutral-800">
            TV show details could not be loaded. Please ensure your backend is running.
          </div>
        )}
      </div>
    </main>
  );
}
