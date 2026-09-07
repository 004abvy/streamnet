'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '../../../components/Navbar/Navbar';
import DetailsTabs from '../../../components/DetailsTabs/DetailsTabs';
import styles from '../../movie/[id]/movieDetails.module.css';

export default function TVDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [movie, setMovie] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

    fetch(`${backendUrl}/api/tv/${id}`)
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
        console.warn("Failed to fetch TV details:", err);
        setMovie(null);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!movie || !movie.id) {
    return <div className={styles.loading}>TV Show not found.</div>;
  }

  return (
    <main className={styles.container}>
      <Navbar />
      
      <div className={styles.backdropWrapper}>
        <img 
          src={`https://image.tmdb.org/t/p/original${movie.backdrop_path}`} 
          alt={movie.name || movie.title} 
          className={styles.backdrop}
        />
        <div className={styles.backdropOverlay}></div>
      </div>

      <div className={styles.mainContainer}>
        <div className={styles.topSection}>
          <div className={styles.posterCol}>
            <img 
              src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} 
              alt={movie.name || movie.title} 
              className={styles.poster}
            />
            <Link 
              href={`/watch/tv/${movie.id}/1/1`}
              className={styles.playBtn}
              onClick={() => {
                try {
                  const stored = localStorage.getItem('continueWatching');
                  let list = stored ? JSON.parse(stored) : [];
                  list = list.filter((m: any) => m.id !== movie.id);
                  list.unshift({ ...movie, media_type: 'tv' });
                  if (list.length > 20) list.pop();
                  localStorage.setItem('continueWatching', JSON.stringify(list));
                } catch (e) {
                  console.error("Failed to save to continue watching", e);
                }
              }}
            >
              <svg className={styles.playIcon} viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
              Watch Series
            </Link>
            <div className={styles.actions}>
              <button className={styles.actionBtn}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                Watchlist
              </button>
              <button className={styles.actionBtn} style={{flex: '0 0 auto'}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
              </button>
            </div>
          </div>

          <div className={styles.infoCol}>
            <div className={styles.badges}>
              {movie.vote_average > 0 && (
                <span className={`${styles.badge} ${styles.rating}`}>
                  {movie.vote_average.toFixed(1)}
                </span>
              )}
              {movie.genres?.map((g: any) => (
                <span key={g.id} className={styles.badge}>{g.name}</span>
              ))}
            </div>

            <h1 className={styles.title}>{movie.name || movie.title}</h1>
            <p className={styles.tagline}>{movie.overview}</p>
          </div>
        </div>

        {movie.videos?.results && (
          (() => {
            const trailer = movie.videos.results.find(
              (v: any) => v.site === "YouTube" && v.type === "Trailer"
            ) || movie.videos.results.find((v: any) => v.site === "YouTube");
            
            if (trailer) {
              return (
                <div className={styles.trailerContainer}>
                  <h2 className={styles.trailerTitle}>Trailer</h2>
                  <div className={styles.videoWrapper}>
                    <iframe
                      src={`https://www.youtube.com/embed/${trailer.key}?autoplay=0`}
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                </div>
              );
            }
            return null;
          })()
        )}

        <DetailsTabs movie={movie} />
      </div>
    </main>
  );
}
