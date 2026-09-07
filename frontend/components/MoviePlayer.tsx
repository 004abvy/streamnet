'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const SERVERS = [
  { id: 'vidcore', name: 'Server 1 (VidCore)', getUrl: (id: string) => `https://vidcore.org/embed/movie/${id}` },
  { id: 'vidlux', name: 'Server 2 (VidLux)', getUrl: (id: string) => `https://vidlux.xyz/embed/movie/${id}` },
  { id: 'vidsrc-to', name: 'Server 3 (VidSrc.to)', getUrl: (id: string) => `https://vidsrc.to/embed/movie/${id}` },
  { id: 'vidsrc-me', name: 'Server 4 (VidSrc.me)', getUrl: (id: string) => `https://vidsrcme.ru/embed/movie/${id}` },
  { id: 'vidsrc-in', name: 'Server 5 (VidSrc.in)', getUrl: (id: string) => `https://vidsrc.in/embed/movie/${id}` },
  { id: 'vidsrc-io', name: 'Server 6 (VidSrc.io)', getUrl: (id: string) => `https://vidsrc.io/embed/movie/${id}` },
  { id: 'vsembed-ru', name: 'Server 7 (VSEmbed.ru)', getUrl: (id: string) => `https://vsembed.ru/embed/movie/${id}` },
  { id: 'vid-src-top', name: 'Server 8 (Vid-Src.top)', getUrl: (id: string) => `https://vid-src.top/embed/movie/${id}` },
  { id: '2embed', name: 'Server 9 (2Embed)', getUrl: (id: string) => `https://www.2embed.cc/embed/${id}` },
  { id: 'superembed-std', name: 'Server 10 (SuperEmbed)', getUrl: (id: string) => `https://multiembed.mov/?video_id=${id}&tmdb=1` },
  { id: 'superembed-vip', name: 'Server 11 (SuperEmbed VIP)', getUrl: (id: string) => `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1` },
  { id: 'moviesapi', name: 'Server 12 (MoviesAPI)', getUrl: (id: string) => `https://moviesapi.to/movie/${id}` },
  { id: 'vidfast-vc', name: 'Server 13 (VidFast)', getUrl: (id: string) => `https://vidfast.vc/movie/${id}` },
  { id: 'vidrock', name: 'Server 14 (VidRock)', getUrl: (id: string) => `https://vidrock.ru/movie/${id}` },
  { id: 'vidflix', name: 'Server 15 (VidFlix)', getUrl: (id: string) => `https://vidflix.club/movie/${id}` }
];

export default function MoviePlayer({ movieId }: { movieId: string }) {
  const [activeServer, setActiveServer] = useState(SERVERS[0]);
  const [movie, setMovie] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch the TMDB metadata safely
  useEffect(() => {
    if (!movieId) return;
    
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

    fetch(`${backendUrl}/api/movies/${movieId}`)
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data && !data.error) {
          setMovie(data);
        } else {
          setMovie(null);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Metadata fetch error:", err);
        setMovie(null);
        setLoading(false);
      });
  }, [movieId]);

  return (
    <div className="w-full flex flex-col items-center">
      {/* Video Player Container */}
      <div className="w-full max-w-6xl aspect-video rounded-xl overflow-hidden shadow-2xl bg-black border border-neutral-800 relative">
        {movieId && (
          <iframe
            key={activeServer.id} 
            src={activeServer.getUrl(movieId)}
            className="w-full h-full border-0 absolute top-0 left-0"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        )}
      </div>

      {/* Server Switcher UI */}
      <div className="w-full max-w-6xl mt-6 bg-neutral-900 border border-neutral-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-neutral-400 mb-3 uppercase tracking-wider">
          Source
        </h3>
        <div className="flex flex-wrap gap-2">
          {SERVERS.map((server) => {
            const isActive = activeServer.id === server.id;
            return (
              <button
                key={server.id}
                onClick={() => setActiveServer(server)}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white'
                }`}
              >
                {server.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Metadata Section */}
      <div className="w-full max-w-6xl mt-8 text-left">
        {loading ? (
          <div className="animate-pulse flex flex-col gap-4">
            <div className="h-8 bg-neutral-800 rounded w-1/3"></div>
            <div className="h-4 bg-neutral-800 rounded w-1/4"></div>
            <div className="h-24 bg-neutral-800 rounded w-full mt-4"></div>
          </div>
        ) : movie && movie.id ? (
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">
                {movie.title}
              </h1>
              {movie.tagline && (
                <p className="text-lg text-neutral-400 italic">"{movie.tagline}"</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-neutral-300">
              <span className="flex items-center gap-1">
                ⭐ {movie.vote_average?.toFixed(1)} / 10
              </span>
              <span>•</span>
              <span>{movie.release_date?.split('-')[0]}</span>
              <span>•</span>
              <span>{movie.runtime} min</span>
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              {movie.genres?.map((genre: any) => (
                <span
                  key={genre.id}
                  className="px-3 py-1 bg-neutral-800 border border-neutral-700 rounded-full text-xs text-neutral-300"
                >
                  {genre.name}
                </span>
              ))}
            </div>

            <div className="mt-4">
              <h3 className="text-xl font-semibold text-white mb-2 border-b border-neutral-800 pb-2">
                Overview
              </h3>
              <p className="text-neutral-400 leading-relaxed max-w-4xl text-sm md:text-base">
                {movie.overview}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-neutral-500 bg-neutral-900 p-4 rounded-lg border border-neutral-800">
            Movie details could not be loaded. Please ensure your backend is running.
          </p>
        )}
      </div>
    </div>
  );
}
