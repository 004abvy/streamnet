'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import DetailsTabs from '../../../components/DetailsTabs/DetailsTabs';
import Footer from '../../../components/Footer/Footer';
import Playeranime from '../../../components/Playeranime';
import { saveWatchlist, saveContinueWatching, getResumeHref, updateWatchProgress, isUpcomingMedia, getFormattedReleaseDate } from '../../../utils/userStorage';
import { getPosterGradient, getVibrantColor } from '../../../utils/colorHelper';
import styles from '../../movie/[id]/movieDetails.module.css';
import { Play, Bookmark, Calendar } from 'lucide-react';

export default function TVDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [movie, setMovie] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [showAnimePlayer, setShowAnimePlayer] = useState(false);
  const [savedResume, setSavedResume] = useState<any>(null);
  const [posterColor, setPosterColor] = useState<string>('#eab308');
  const [posterGradient, setPosterGradient] = useState<string>('linear-gradient(135deg, #ffffff, #eab308)');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('playAnime') === 'true') {
      setShowAnimePlayer(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!id) return;
    try {
      const stored = localStorage.getItem('continueWatching');
      if (stored) {
        const list = JSON.parse(stored);
        const match = Array.isArray(list) && list.find((m: any) => String(m.id) === String(id));
        if (match) setSavedResume(match);
      }
    } catch {}
  }, [id]);

  useEffect(() => {
    if (!id) return;

    fetch(`/api/tv/${id}`)
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
        console.warn("Failed to fetch TV details:", err);
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

    const imgUrl = movie.poster_path
      ? `https://image.tmdb.org/t/p/w300${movie.poster_path}`
      : movie.backdrop_path
        ? `https://image.tmdb.org/t/p/w300${movie.backdrop_path}`
        : null;

    if (imgUrl) {
      getVibrantColor(imgUrl).then(setPosterColor).catch(() => {});
      getPosterGradient(imgUrl).then(setPosterGradient).catch(() => {});
    }
  }, [movie]);

  const toggleWatchlist = () => {
    if (!movie?.id) return;
    try {
      const saved = JSON.parse(localStorage.getItem('saved_items') || '[]');
      const itemToSave = { ...movie, media_type: 'tv' };
      let updated = [];
      if (isSaved) {
        updated = saved.filter((item: any) => item.id !== movie.id);
      } else {
        updated = [...saved.filter((item: any) => item.id !== movie.id), itemToSave];
      }
      setIsSaved(!isSaved);
      saveWatchlist(updated);
    } catch (e) {
      console.error("Failed to toggle watchlist", e);
    }
  };

  const isAnime = movie?.genres?.some((g: any) => g.id === 16 || g.name === 'Animation') && (movie?.original_language === 'ja' || movie?.origin_country?.includes('JP'));

  const resumeSeason = savedResume?.season || savedResume?.last_season || 1;
  const resumeEpisode = savedResume?.episode || savedResume?.last_episode || 1;

  const handlePlayNow = (e: any) => {
    if (!movie) return;
    try {
      const stored = localStorage.getItem('continueWatching');
      let list = stored ? JSON.parse(stored) : [];
      list = list.filter((m: any) => m.id !== movie.id);
      list.unshift({
        ...movie,
        ...savedResume,
        media_type: 'tv',
        season: resumeSeason,
        episode: resumeEpisode,
        last_season: resumeSeason,
        last_episode: resumeEpisode,
      });
      if (list.length > 20) list.pop();
      saveContinueWatching(list);
    } catch (e) {
      console.error("Failed to save to continue watching", e);
    }
    
    if (isAnime) {
      e.preventDefault();
      setShowAnimePlayer(true);
      return;
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading series details...</div>;
  }

  if (!movie || !movie.id) {
    return <div className={styles.loading}>Series not found.</div>;
  }

  const displayTitle = movie.name || movie.title || 'Untitled Series';
  const directorName = movie.created_by?.map((c: any) => c.name).join(', ') || movie.credits?.crew?.find((c: any) => c.job === 'Executive Producer' || c.job === 'Director')?.name || 'N/A';
  const composerName = movie.credits?.crew?.find((c: any) => c.job === 'Original Music Composer' || c.job === 'Music')?.name || 'Original Score';
  const genreNames = movie.genres?.map((g: any) => g.name).join(', ') || 'N/A';
  const topCast = movie.credits?.cast?.slice(0, 4) || [];

  let formattedDate = 'N/A';
  if (movie.first_air_date || movie.release_date) {
    try {
      const d = new Date(movie.first_air_date || movie.release_date);
      formattedDate = d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      formattedDate = movie.first_air_date || movie.release_date;
    }
  }

  const trailer = movie.videos?.results?.find(
    (v: any) => v.site === "YouTube" && v.type === "Trailer"
  ) || movie.videos?.results?.find((v: any) => v.site === "YouTube");

  const standardPlayHref = savedResume
    ? getResumeHref({ ...movie, ...savedResume, playerType: 'standard', media_type: 'tv' })
    : `/watch/tv/${movie.id}/${resumeSeason}/${resumeEpisode}`;

  const vipPlayHref = `/watch/servers/${movie.id}?type=tv&season=${resumeSeason}&episode=${resumeEpisode}`;

  return (
    <main className={styles.container}>
      {showAnimePlayer && (
        <Playeranime 
          animeTitle={displayTitle} 
          tmdbId={movie.id}
          type="tv"
          posterPath={movie.poster_path}
          backdropPath={movie.backdrop_path}
          onClose={() => setShowAnimePlayer(false)} 
        />
      )}
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
          <h1 className={styles.editorialTitle}>
            {displayTitle}
            {isUpcomingMedia(movie) && (
              <span
                className={styles.camBadge}
                style={{
                  backgroundImage: posterGradient,
                  border: 'none',
                  color: '#000000',
                  fontWeight: 800,
                  boxShadow: `0 0 14px ${posterColor}88`
                }}
              >
                UPCOMING
              </span>
            )}
          </h1>
          <p className={styles.editorialOverview}>{movie.overview}</p>

          {/* Action Buttons: Play Now & Wishlist */}
          <div className={styles.editorialActions}>
            {isUpcomingMedia(movie) ? (
              <>
                <button
                  type="button"
                  className={styles.playNowBtn}
                  style={{
                    backgroundColor: posterColor,
                    border: 'none',
                    color: '#000000',
                    fontWeight: 700,
                    boxShadow: `0 0 20px ${posterColor}66`,
                    cursor: trailer ? 'pointer' : 'default',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onClick={() => {
                    if (trailer) setShowTrailerModal(true);
                  }}
                >
                  <Calendar size={18} /> Premiering {getFormattedReleaseDate(movie)}
                </button>
                {trailer && (
                  <button
                    type="button"
                    className={styles.playNowBtn}
                    onClick={() => setShowTrailerModal(true)}
                  >
                    <Play size={18} fill="currentColor" /> Watch Trailer
                  </button>
                )}
              </>
            ) : (
              <>
                <Link
                  href={standardPlayHref}
                  className={styles.playNowBtn}
                  onClick={handlePlayNow}
                >
                  <Play size={18} fill="currentColor" /> {savedResume ? `Resume S${resumeSeason} E${resumeEpisode}` : 'Play Now'}
                </Link>
                {!isAnime && (
                  <Link
                    href={vipPlayHref}
                    className={`${styles.playNowBtn} btn-grad`}
                    style={{
                      backgroundImage: 'linear-gradient(to right, #1F1C2C 0%, #928DAB 51%, #1F1C2C 100%)',
                      backgroundSize: '200% auto',
                      color: '#ffffff',
                      fontWeight: 800,
                      border: '1px solid rgba(146, 141, 171, 0.5)',
                      boxShadow: '0 0 20px rgba(146, 141, 171, 0.45)'
                    }}
                    onClick={handlePlayNow}
                  >
                    VIP Server
                  </Link>
                )}
              </>
            )}
            <button
              type="button"
              className={`${styles.wishlistBtn} ${isSaved ? styles.savedWishlist : ''}`}
              onClick={toggleWatchlist}
            >
              <Bookmark size={18} fill={isSaved ? 'currentColor' : 'none'} />
              {isSaved ? 'In Wishlist ✓' : 'Wishlist'}
            </button>
          </div>

          {isUpcomingMedia(movie) && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              marginTop: '12px',
              borderRadius: '10px',
              backgroundColor: 'rgba(31, 28, 44, 0.7)',
              border: '1px solid rgba(146, 141, 171, 0.35)',
              color: '#d1cfe2',
              fontSize: '0.85rem'
            }}>
              <Calendar size={15} style={{ flexShrink: 0 }} />
              <span>This series is upcoming and has not premiered yet. Streaming links will activate upon official broadcast.</span>
            </div>
          )}

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
            <span className={styles.metaLabel}>CREATOR / DIRECTOR</span>
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

      {/* Scroll Down Details: Tabs, Episodes, Similar Series */}
      <div className={styles.scrollDetailsSection}>
        <DetailsTabs movie={movie} />
      </div>

      <Footer />
    </main>
  );
}
