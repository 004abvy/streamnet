'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../../../../../../components/Navbar/Navbar';
import DetailsTabs from '../../../../../../components/DetailsTabs/DetailsTabs';
import VideoPlayer from '../../../../../../components/VideoPlayer/VideoPlayer';
import SeasonEpisodeSelector from '../../../../../../components/SeasonEpisodeSelector/SeasonEpisodeSelector';

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
  }, [id]);

  const handleEpisodeChange = (newSeason: number, newEpisode: number) => {
    router.push(`/watch/tv/${id}/${newSeason}/${newEpisode}`);
  };

  const imdbId = show?.external_ids?.imdb_id || show?.imdb_id;

  return (
    <main className="min-h-screen bg-neutral-950 text-white flex flex-col items-center p-4 md:p-8 pt-20 md:pt-24">
      <Navbar />

      <div className="w-full max-w-[1050px] mb-4 flex items-center justify-between flex-wrap gap-3">
        <Link
          href={`/tv/${id}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-300 hover:text-white bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-500/50 px-4 py-2 rounded-xl transition-all shadow-md"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          <span>Back to TV Details</span>
        </Link>

        <div className="flex items-center gap-2.5">
          {(season > 1 || episode > 1) && (
            <button
              onClick={() => {
                if (episode > 1) {
                  handleEpisodeChange(season, episode - 1);
                } else if (season > 1) {
                  handleEpisodeChange(season - 1, 1);
                }
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-500/50 text-neutral-300 hover:text-white transition-all shadow-md"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
              <span>Prev Ep</span>
            </button>
          )}

          <div className="inline-flex items-center gap-2 text-amber-400 font-extrabold text-sm bg-amber-500/10 border border-amber-500/40 px-4 py-2 rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.12)]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="7" width="20" height="15" rx="2" ry="2"/>
              <polyline points="17 2 12 7 7 2"/>
            </svg>
            <span>Season {season} • Episode {episode}</span>
          </div>

          <button
            onClick={() => handleEpisodeChange(season, episode + 1)}
            className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black shadow-[0_4px_14px_rgba(245,158,11,0.3)] transition-all hover:scale-[1.03]"
          >
            <span>Next Ep</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="w-full max-w-[1050px] mt-2">
        {loading ? (
          <div className="w-full aspect-video flex items-center justify-center text-neutral-500 bg-neutral-900 rounded-xl">
            Loading player...
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

            <DetailsTabs movie={show} />
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
