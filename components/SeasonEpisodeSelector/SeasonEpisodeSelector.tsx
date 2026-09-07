'use client';

import { useState, useEffect, useMemo } from 'react';
import styles from './SeasonEpisodeSelector.module.css';

interface Episode {
  episode_number: number;
  name: string;
  overview?: string;
  still_path?: string;
  air_date?: string;
  vote_average?: number;
  runtime?: number;
}

interface Season {
  season_number: number;
  name: string;
  episode_count: number;
  poster_path?: string;
}

interface SeasonEpisodeSelectorProps {
  tvId: string;
  seasons: Season[];
  currentSeason?: number;
  currentEpisode?: number;
  onEpisodeSelect: (seasonNumber: number, episodeNumber: number) => void;
}

export default function SeasonEpisodeSelector({
  tvId,
  seasons = [],
  currentSeason = 1,
  currentEpisode = 1,
  onEpisodeSelect,
}: SeasonEpisodeSelectorProps) {
  const displaySeasons = useMemo(() => {
    if (!seasons || seasons.length === 0) return [];
    const valid = seasons.filter(s => s.season_number > 0 && s.episode_count > 0);
    return valid.length > 0 ? valid : seasons;
  }, [seasons]);

  const [selectedSeason, setSelectedSeason] = useState<number>(
    currentSeason || (displaySeasons[0]?.season_number ?? 1)
  );
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentSeason && currentSeason !== selectedSeason) {
      setSelectedSeason(currentSeason);
    }
  }, [currentSeason]);

  useEffect(() => {
    if (!tvId || !selectedSeason) return;

    let isMounted = true;
    setLoading(true);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';

    fetch(`${backendUrl}/api/tv/${tvId}/season/${selectedSeason}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!isMounted) return;
        if (data && data.episodes && data.episodes.length > 0) {
          setEpisodes(data.episodes.map((episode: Episode) => ({
            ...episode,
            overview: episode.overview?.trim() || 'No episode description available.'
          })));
        } else {
          const matchedSeason = displaySeasons.find(s => s.season_number === selectedSeason);
          const count = matchedSeason?.episode_count || 10;
          const fallbackEps: Episode[] = Array.from({ length: count }, (_, i) => ({
            episode_number: i + 1,
            name: `Episode ${i + 1}`,
            overview: 'No overview available for this episode.',
          }));
          setEpisodes(fallbackEps);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn("Error fetching season details:", err);
        const matchedSeason = displaySeasons.find(s => s.season_number === selectedSeason);
        const count = matchedSeason?.episode_count || 10;
        const fallbackEps: Episode[] = Array.from({ length: count }, (_, i) => ({
          episode_number: i + 1,
          name: `Episode ${i + 1}`,
          overview: 'No overview available for this episode.',
        }));
        setEpisodes(fallbackEps);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [tvId, selectedSeason]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitleGroup}>
          <h3 className={styles.title}>Episodes</h3>
        </div>

        <div className={styles.seasonDropdownWrapper}>
          <select
            id="seasonSelect"
            className={styles.seasonSelect}
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(Number(e.target.value))}
          >
            {displaySeasons.map((s) => (
              <option key={s.season_number} value={s.season_number}>
                {s.name || `Season ${s.season_number}`} ({s.episode_count} Episodes)
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading episodes...</div>
      ) : (
        <div className={styles.episodeGrid}>
          {episodes.map((ep) => {
            const isCurrent = selectedSeason === currentSeason && ep.episode_number === currentEpisode;
            const description = ep.overview?.trim() || 'No episode description available.';
            const stillUrl = ep.still_path
              ? `https://image.tmdb.org/t/p/w300${ep.still_path}`
              : '/fallback-backdrop.jpg';

            return (
              <div
                key={ep.episode_number}
                className={`${styles.episodeCard} ${isCurrent ? styles.activeEpisodeCard : ''}`}
                onClick={() => onEpisodeSelect(selectedSeason, ep.episode_number)}
              >
                <div className={styles.thumbnailWrapper}>
                  <img
                    src={stillUrl}
                    alt={ep.name}
                    className={styles.thumbnail}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=500&auto=format&fit=crop';
                    }}
                  />
                  <div className={styles.thumbnailGradient}></div>
                  <div className={styles.epBadge}>
                    E{ep.episode_number}
                  </div>
                  <div className={styles.playOverlay}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                  {isCurrent && (
                    <div className={styles.nowPlayingBadge}>NOW PLAYING</div>
                  )}
                </div>

                <div className={styles.episodeInfo}>
                  <div className={styles.episodeTitleRow}>
                    <h4 className={styles.episodeTitle}>
                      {ep.episode_number}. {ep.name}
                    </h4>
                  </div>
                  <p className={styles.episodeOverview}>{description}</p>
                </div>

                <svg className={styles.downloadIcon} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 3v12" />
                  <path d="m7 10 5 5 5-5" />
                  <path d="M5 21h14" />
                </svg>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
