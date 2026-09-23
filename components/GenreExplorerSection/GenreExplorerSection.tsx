'use client';

import { useState, useEffect, CSSProperties } from 'react';
import styles from './GenreExplorerSection.module.css';
import AccordionGallery from '../reactbits/AccordianGallery';

interface Genre {
  id: number;
  tvId?: number;
  name: string;
  fontFamily: string;
  labelStyle?: CSSProperties;
  moviePoster: string;
  tvPoster: string;
}

const TMDB_IMG = 'https://image.tmdb.org/t/p/original';

const INITIAL_GENRES: Genre[] = [
  {
    id: 28,
    tvId: 10759,
    name: 'Action',
    fontFamily: "'Bebas Neue', 'Impact', sans-serif",
    labelStyle: {
      fontStyle: 'italic',
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color: '#ffffff',
      fontSize: 'clamp(1.3rem, 2.2vw, 2.5rem)',
      textShadow: 'none'
    },
    moviePoster: `https://image.tmdb.org/t/p/original/d5NXSklXo0qyIYkgV94XAgMIckC.jpg`,
    tvPoster: `https://image.tmdb.org/t/p/original/2OMB0ynKlyIenMJWI2Dy9IWT4c.jpg`
  },
  {
    id: 35,
    tvId: 35,
    name: 'Comedy',
    fontFamily: "'Fredoka', 'Comic Sans MS', cursive, sans-serif",
    labelStyle: {
      letterSpacing: '0.04em',
      color: '#ffffff',
      fontSize: 'clamp(1.3rem, 2.2vw, 2.5rem)',
      textShadow: 'none'
    },
    moviePoster: `https://image.tmdb.org/t/p/original/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg`,
    tvPoster: `https://image.tmdb.org/t/p/original/hGhWE5hufwMsqMzELbK7p47DFeu.jpg`
  },
  {
    id: 27,
    tvId: 53,
    name: 'Horror',
    fontFamily: "'Creepster', 'Garamond', serif",
    labelStyle: {
      letterSpacing: '0.08em',
      color: '#ffffff',
      fontSize: 'clamp(1.4rem, 2.4vw, 2.8rem)',
      textShadow: 'none'
    },
    moviePoster: `https://image.tmdb.org/t/p/original/w2PJ63AQ8oXKfVhvJIedtJ2jJSR.jpg`,
    tvPoster: `https://image.tmdb.org/t/p/original/uKvVjHNqB5VmOrdxqAt2V7JMr8P.jpg`
  },
  {
    id: 878,
    tvId: 10765,
    name: 'Sci-Fi',
    fontFamily: "'Orbitron', 'Audiowide', sans-serif",
    labelStyle: {
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: '#ffffff',
      fontSize: 'clamp(1.3rem, 2.2vw, 2.5rem)',
      textShadow: 'none'
    },
    moviePoster: `https://image.tmdb.org/t/p/original/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg`,
    tvPoster: `https://image.tmdb.org/t/p/original/49WJfeN0moxb9IPfGn8AIqMGskD.jpg`
  },
  {
    id: 10749,
    tvId: 10749,
    name: 'Romance',
    fontFamily: "'Great Vibes', 'Dancing Script', cursive, serif",
    labelStyle: {
      fontSize: 'clamp(1.8rem, 3.2vw, 3.5rem)',
      fontWeight: 'normal',
      color: '#ffffff',
      textShadow: 'none'
    },
    moviePoster: `https://image.tmdb.org/t/p/original/rzdPqYx7Um4FUZeD8wpXqjAUcEm.jpg`,
    tvPoster: `https://image.tmdb.org/t/p/original/9PFonQ921jhuTMqq2esxIRnegeP.jpg`
  }
];

export default function GenreExplorerSection() {
  const [contentType, setContentType] = useState<'movie' | 'tv'>('movie');
  const [genres, setGenres] = useState<Genre[]>(INITIAL_GENRES);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchLatestPosters = async () => {
      try {
        const updatedGenres = INITIAL_GENRES.map(g => ({ ...g }));
        const usedMoviePaths = new Set<string>(
          INITIAL_GENRES.map(g => g.moviePoster.replace(TMDB_IMG, ''))
        );
        const usedTvPaths = new Set<string>(
          INITIAL_GENRES.map(g => g.tvPoster.replace(TMDB_IMG, ''))
        );

        // Fetch all-time top popular/rated movies and TV shows concurrently
        const moviePromises = INITIAL_GENRES.map(genre => fetch(`/api/discover?type=movie&genreId=${genre.id}&sortBy=vote_count.desc`).then(res => res.json()).catch(() => null));
        const tvPromises = INITIAL_GENRES.map(genre => fetch(`/api/discover?type=tv&genreId=${genre.tvId || genre.id}&sortBy=vote_count.desc`).then(res => res.json()).catch(() => null));

        const [movieResults, tvResults] = await Promise.all([
          Promise.all(moviePromises),
          Promise.all(tvPromises)
        ]);

        for (let i = 0; i < updatedGenres.length; i++) {
          const genre = updatedGenres[i];
          
          // Process Movie
          const movieData = movieResults[i];
          if (movieData?.results?.length > 0) {
            const uniqueMovie = movieData.results.find((m: any) => {
              const path = m.backdrop_path || m.poster_path;
              return path && !usedMoviePaths.has(path);
            });
            if (uniqueMovie) {
              const path = uniqueMovie.backdrop_path || uniqueMovie.poster_path;
              usedMoviePaths.add(path);
              genre.moviePoster = `${TMDB_IMG}${path}`;
            }
          }

          // Process TV
          const tvData = tvResults[i];
          if (tvData?.results?.length > 0) {
            const uniqueTv = tvData.results.find((t: any) => {
              const path = t.backdrop_path || t.poster_path;
              return path && !usedTvPaths.has(path);
            });
            if (uniqueTv) {
              const path = uniqueTv.backdrop_path || uniqueTv.poster_path;
              usedTvPaths.add(path);
              genre.tvPoster = `${TMDB_IMG}${path}`;
            }
          }
        }

        if (isMounted) {
          setGenres(updatedGenres);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error fetching latest genre posters:', err);
        if (isMounted) setIsLoading(false);
      }
    };
    
    fetchLatestPosters();
    return () => { isMounted = false; };
  }, []);

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        {/* Header Row */}
        <div className={styles.headerRow}>
          <div className={styles.headerText}>
            <h2 className={styles.title}>Genres</h2>
          </div>

          {/* Movies / TV Shows Toggle Pill */}
          <div className={styles.typeToggleContainer}>
            <button
              className={`${styles.typeBtn} ${contentType === 'movie' ? styles.activeTypeBtn : ''}`}
              onClick={() => setContentType('movie')}
            >
              Movies
            </button>
            <button
              className={`${styles.typeBtn} ${contentType === 'tv' ? styles.activeTypeBtn : ''}`}
              onClick={() => setContentType('tv')}
            >
              TV Shows
            </button>
          </div>
        </div>

        <div className={styles.contentSection}>
          {isLoading ? (
            <div style={{ display: 'flex', height: 460, gap: 12 }}>
              {INITIAL_GENRES.map((_, i) => (
                <div key={i} style={{ flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '24px' }} className={styles.pulse} />
              ))}
            </div>
          ) : (
            <AccordionGallery
              items={genres.map(genre => {
              const genreId = contentType === 'tv' ? (genre.tvId || genre.id) : genre.id;
              const route = contentType === 'tv' ? `/tv?genre=${genreId}` : `/movies?genre=${genreId}`;
              return {
                image: contentType === 'tv' ? genre.tvPoster : genre.moviePoster,
                label: genre.name,
                fontFamily: genre.fontFamily,
                labelStyle: genre.labelStyle,
                link: route,
                alt: genre.name,
              };
            })}
            height={460}
            expandRatio={0.58}
            gap={12}
            orientation="horizontal"
            trigger="hover"
            showLabels={true}
            grayscale={false}
          />
          )}
        </div>
      </div>
    </section>
  );
}
