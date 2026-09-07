'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '../../../components/Navbar/Navbar';
import VideoPlayer from '../../../components/VideoPlayer/VideoPlayer';
import styles from './watch.module.css';

export default function WatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [movie, setMovie] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
    fetch(`${backendUrl}/api/movies/${id}`)
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data && !data.error) setMovie(data);
      })
      .catch((err) => console.warn("Error fetching movie:", err));
  }, [id]);

  const imdbId = movie?.external_ids?.imdb_id || movie?.imdb_id;

  return (
    <main className={styles.container}>
      <Navbar />

      <div className={styles.header}>
        <Link
          href={`/movie/${id}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.88rem',
            fontWeight: 600,
            color: '#d1d5db',
            background: 'rgba(20, 20, 28, 0.8)',
            border: '1px solid #2a2a3c',
            padding: '0.5rem 1rem',
            borderRadius: '12px',
            textDecoration: 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to Details
        </Link>
        <span className={styles.idText}>
          TMDB: {id} {imdbId ? `• IMDB: ${imdbId}` : ''}
        </span>
      </div>

      <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
        {movie ? (
          <VideoPlayer 
            tmdbId={id}
            type="movie"
            title={movie.title || movie.name}
            backdropPath={movie.backdrop_path}
            imdbId={imdbId}
          />
        ) : (
          <div style={{ textAlign: 'center', color: '#fff', padding: '4rem' }}>
            Loading player...
          </div>
        )}
      </div>
    </main>
  );
}
