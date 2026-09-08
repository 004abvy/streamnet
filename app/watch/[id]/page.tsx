'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '../../../components/Navbar/Navbar';
import VideoPlayer from '../../../components/VideoPlayer/VideoPlayer';
import DetailsTabs from '../../../components/DetailsTabs/DetailsTabs';

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
        if (data && !data.error) setMovie(data);
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Error fetching movie:", err);
        setLoading(false);
      });
  }, [id]);

  const imdbId = movie?.external_ids?.imdb_id || movie?.imdb_id;

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
          <span>Back to Movie Details</span>
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
          <div className="w-full aspect-video flex items-center justify-center text-neutral-500 bg-neutral-900 rounded-xl border border-neutral-800">
            Loading player...
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

            <DetailsTabs movie={movie} />
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
