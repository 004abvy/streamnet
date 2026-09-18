'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DetailsTabs from '../../../components/DetailsTabs/DetailsTabs';
import Footer from '../../../components/Footer/Footer';
import { saveWatchlist, saveContinueWatching } from '../../../utils/userStorage';
import styles from './movieDetails.module.css';
import { Play, Bookmark } from 'lucide-react';

export default function MovieDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [movie, setMovie] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const router = useRouter();

  const handleVipAccess = () => {
    const code = window.prompt('Enter VIP Access Code:');
    if (code === '123') {
      router.push(`/watch/servers/${movie.id}`);
    } else if (code !== null) {
      alert('Invalid code!');
    }
  };

  useEffect(() => {
    if (!id) return;

    fetch(`/api/movies/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && !data.error) {
          setMovie(data);
        } else {
          setMovie(null);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Failed to fetch movie details:", err);
        setMovie(null);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (!movie?.id) return;
    try {
      const saved = JSON.parse(localStorage.getItem('saved_items') || '[]');
      setIsSaved(Array.isArray(saved) && saved.some((item: any) => item.id === movie.id));
    } catch (e) {
      console.error(e);
    }
  }, [movie]);

  const toggleWatchlist = () => {
    if (!movie?.id) return;
    try {
      const saved = JSON.parse(localStorage.getItem('saved_items') || '[]');
      let updated = [];
      if (isSaved) {
        updated = saved.filter((item: any) => item.id !== movie.id);
      } else {
        updated = [...saved.filter((item: any) => item.id !== movie.id), movie];
      }
      setIsSaved(!isSaved);
      saveWatchlist(updated);
    } catch (e) {
      console.error("Failed to toggle watchlist", e);
    }
  };

  const handlePlayNow = () => {
    if (!movie) return;
    try {
      const stored = localStorage.getItem('continueWatching');
      let list = stored ? JSON.parse(stored) : [];
      list = list.filter((m: any) => m.id !== movie.id);
      list.unshift(movie);
      if (list.length > 20) list.pop();
      saveContinueWatching(list);
    } catch (e) {
      console.error("Failed to save to continue watching", e);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading movie details...</div>;
  }

  if (!movie || !movie.id) {
    return <div className={styles.loading}>Movie not found.</div>;
  }

  const displayTitle = movie.title || movie.name || 'Untitled';
  const directorName = movie.credits?.crew?.find((c: any) => c.job === 'Director')?.name || 'N/A';
  const composerName = movie.credits?.crew?.find((c: any) => c.job === 'Original Music Composer' || c.job === 'Music')?.name || 'Original Score';
  const genreNames = movie.genres?.map((g: any) => g.name).join(', ') || 'N/A';
  const topCast = movie.credits?.cast?.slice(0, 4) || [];

  let formattedDate = 'N/A';
  if (movie.release_date) {
    try {
      const d = new Date(movie.release_date);
      formattedDate = d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      formattedDate = movie.release_date;
    }
  }

  const trailer = movie.videos?.results?.find(
    (v: any) => v.site === "YouTube" && v.type === "Trailer"
  ) || movie.videos?.results?.find((v: any) => v.site === "YouTube");

  return (
    <main className={styles.container}>
      {/* Full-Bleed Background Backdrop */}
      <div className={styles.heroBackground}>
        <img
          src={`https://image.tmdb.org/t/p/original${movie.backdrop_path || movie.poster_path}`}
          alt={displayTitle}
          className={styles.heroImg}
        />
        <div className={styles.heroOverlay} />
      </div>

      {/* Hero Editorial Grid Container */}
      <div className={styles.editorialGrid}>
        {/* Left Column: Title, Synopsis, Play & Wishlist Buttons, Actors */}
        <div className={styles.leftCol}>
          <h1 className={styles.editorialTitle}>{displayTitle}</h1>
          <p className={styles.editorialOverview}>{movie.overview}</p>

          {/* Action Buttons: Play Now & Wishlist */}
          <div className={styles.editorialActions}>
            <Link
              href={`/watch/${movie.id}`}
              className={styles.playNowBtn}
              onClick={handlePlayNow}
            >
              <Play size={18} fill="currentColor" /> Play Now
            </Link>
            <button
              type="button"
              className={`${styles.wishlistBtn} ${isSaved ? styles.savedWishlist : ''}`}
              onClick={toggleWatchlist}
            >
              <Bookmark size={18} fill={isSaved ? 'currentColor' : 'none'} />
              {isSaved ? 'In Wishlist ✓' : 'Wishlist'}
            </button>
            <button
              type="button"
              className={styles.playNowBtn}
              style={{ background: 'linear-gradient(45deg, #FFD700, #FFA500)' }}
              onClick={handleVipAccess}
            >
              VIP Server
            </button>
          </div>

          {/* Bottom Left: Top Cast / Actors */}
          {topCast.length > 0 && (
            <div className={styles.actorsSection}>
              <span className={styles.actorsSectionHeader}>01 ACTORS</span>
              <div className={styles.actorsList}>
                {topCast.map((actor: any) => (
                  <div key={actor.id} className={styles.actorBadge}>
                    {actor.profile_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`}
                        alt={actor.name}
                        className={styles.actorAvatar}
                      />
                    ) : (
                      <div className={styles.actorAvatar} style={{ background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {actor.name.charAt(0)}
                      </div>
                    )}
                    <div className={styles.actorMeta}>
                      <span className={styles.actorName}>{actor.name}</span>
                      <span className={styles.characterName}>{actor.character}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Premiere, Director, Music By, Genre, & Trailer Box */}
        <div className={styles.rightCol}>
          <div className={styles.metaGroup}>
            <span className={styles.metaLabel}>PREMIERE</span>
            <span className={styles.metaValue}>{formattedDate}</span>
          </div>

          <div className={styles.metaGroup}>
            <span className={styles.metaLabel}>DIRECTOR</span>
            <span className={styles.metaValue}>{directorName}</span>
          </div>

          <div className={styles.metaGroup}>
            <span className={styles.metaLabel}>MUSIC BY</span>
            <span className={styles.metaValue}>{composerName}</span>
          </div>

          <div className={styles.metaGroup}>
            <span className={styles.metaLabel}>GENRE</span>
            <span className={styles.metaValue}>{genreNames}</span>
          </div>

          {/* Bottom Right - Watch Trailer Box */}
          {trailer && (
            <div className={styles.trailerBox} onClick={() => setShowTrailerModal(true)}>
              <img
                src={`https://img.youtube.com/vi/${trailer.key}/hqdefault.jpg`}
                alt="Watch Trailer"
                className={styles.trailerImg}
              />
              <div className={styles.trailerOverlay}>
                <div className={styles.playCircle}>
                  <Play size={18} fill="currentColor" />
                </div>
                <span className={styles.trailerLabel}>WATCH TRAILER</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal for Watching Trailer */}
      {showTrailerModal && trailer && (
        <div className={styles.trailerModal} onClick={() => setShowTrailerModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.closeModalBtn}
              onClick={() => setShowTrailerModal(false)}
            >
              ✕
            </button>
            <iframe
              src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1`}
              title="Trailer"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className={styles.modalIframe}
            />
          </div>
        </div>
      )}

      {/* Scroll Down Details: Tabs, Similar Movies */}
      <div className={styles.scrollDetailsSection}>
        <DetailsTabs movie={movie} />
      </div>

      <Footer />
    </main>
  );
}
