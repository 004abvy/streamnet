'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Calendar, Clock } from 'lucide-react';
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

function getEpisodeReleaseStatus(airDate?: string): { isReleased: boolean; diffDays: number | null } {
  if (!airDate) return { isReleased: false, diffDays: null };
  const parts = airDate.split('-').map(Number);
  if (parts.length !== 3) return { isReleased: false, diffDays: null };
  const [year, month, day] = parts;
  const airDateMidnight = new Date(year, month - 1, day, 0, 0, 0);
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const diffMs = airDateMidnight.getTime() - todayMidnight.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return { isReleased: diffDays <= 0, diffDays };
}

function formatAirDate(airDate: string): string {
  try {
    const parts = airDate.split('-').map(Number);
    if (parts.length !== 3) return airDate;
    const [year, month, day] = parts;
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return airDate;
  }
}

function getCountdownText(airDate: string): string {
  try {
    const { diffDays } = getEpisodeReleaseStatus(airDate);
    if (diffDays === null) return 'Coming Soon';
    if (diffDays <= 0) return 'Premieres Today';
    if (diffDays === 1) return 'Premieres Tomorrow';
    if (diffDays < 7) return `Airs in ${diffDays} days`;
    if (diffDays < 14) return `Airs in 1 week (${diffDays} days)`;
    if (diffDays < 30) {
      const weeks = Math.round(diffDays / 7);
      return `Airs in ${weeks} weeks (${diffDays} days)`;
    }
    const months = Math.round(diffDays / 30);
    return `Airs in ${months} mo (${diffDays} days)`;
  } catch {
    return 'Coming Soon';
  }
}

export default function SeasonEpisodeSelector({
  tvId,
  seasons = [],
  currentSeason = 1,
  currentEpisode = 1,
  onEpisodeSelect,
}: SeasonEpisodeSelectorProps) {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const displaySeasons = useMemo(() => {
    if (!seasons || seasons.length === 0) {
      return [{ season_number: currentSeason || 1, name: `Season ${currentSeason || 1}`, episode_count: episodes.length || 0 }];
    }
    const valid = seasons.filter(s => s.season_number > 0 && (s.episode_count > 0 || (s.name && !s.name.toLowerCase().includes('special'))));
    return valid.length > 0 ? valid : seasons.filter(s => s.season_number > 0);
  }, [seasons, currentSeason, episodes.length]);

  const [selectedSeason, setSelectedSeason] = useState<number>(
    currentSeason || (displaySeasons[0]?.season_number ?? 1)
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (currentSeason && currentSeason !== selectedSeason) {
      setSelectedSeason(currentSeason);
    }
  }, [currentSeason]);

  const seasonCache = useRef<Map<number, Episode[]>>(new Map());

  useEffect(() => {
    if (!tvId || !selectedSeason) return;

    if (seasonCache.current.has(selectedSeason)) {
      setEpisodes(seasonCache.current.get(selectedSeason)!);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    fetch(`/api/tv/${tvId}/season/${selectedSeason}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!isMounted) return;
        let loadedEpisodes: Episode[] = [];
        if (data && data.episodes && data.episodes.length > 0) {
          loadedEpisodes = data.episodes.map((episode: Episode) => ({
            ...episode,
            overview: episode.overview?.trim() || 'No episode description available.'
          }));
        } else {
          const matchedSeason = displaySeasons.find(s => s.season_number === selectedSeason);
          const count = matchedSeason?.episode_count || 10;
          loadedEpisodes = Array.from({ length: count }, (_, i) => ({
            episode_number: i + 1,
            name: `Episode ${i + 1}`,
            overview: 'No overview available for this episode.',
          }));
        }
        seasonCache.current.set(selectedSeason, loadedEpisodes);
        setEpisodes(loadedEpisodes);
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
        seasonCache.current.set(selectedSeason, fallbackEps);
        setEpisodes(fallbackEps);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [tvId, selectedSeason, displaySeasons]);

  useEffect(() => {
    setSearchQuery('');
  }, [selectedSeason]);

  // Separate released episodes from unreleased upcoming episodes
  const { releasedEpisodes, unreleasedEpisodes, nextEpisode } = useMemo(() => {
    if (!episodes || episodes.length === 0) {
      return { releasedEpisodes: [], unreleasedEpisodes: [], nextEpisode: null };
    }

    const hasAnyAirDate = episodes.some(ep => Boolean(ep.air_date));
    if (!hasAnyAirDate) {
      return { releasedEpisodes: episodes, unreleasedEpisodes: [], nextEpisode: null };
    }

    const released: Episode[] = [];
    const unreleased: Episode[] = [];

    for (const ep of episodes) {
      if (ep.air_date) {
        const status = getEpisodeReleaseStatus(ep.air_date);
        if (status.isReleased) {
          released.push(ep);
        } else {
          unreleased.push(ep);
        }
      } else {
        if (unreleased.length > 0 || (released.length > 0 && ep.episode_number > released[released.length - 1].episode_number)) {
          unreleased.push(ep);
        } else {
          released.push(ep);
        }
      }
    }

    return {
      releasedEpisodes: released,
      unreleasedEpisodes: unreleased,
      nextEpisode: unreleased.length > 0 ? unreleased[0] : null
    };
  }, [episodes]);

  const filteredAndSortedEpisodes = useMemo(() => {
    let result = [...releasedEpisodes];
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(ep => 
        ep.name.toLowerCase().includes(q) || 
        ep.episode_number.toString().includes(q)
      );
    }
    result.sort((a, b) => {
      if (sortOrder === 'asc') return a.episode_number - b.episode_number;
      return b.episode_number - a.episode_number;
    });
    return result;
  }, [releasedEpisodes, searchQuery, sortOrder]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitleGroup}>
          <h3 className={styles.title}>Episodes</h3>
        </div>

        <div className={styles.seasonDropdownWrapper} ref={dropdownRef}>
          <button 
            className={styles.seasonSelectBtn} 
            onClick={() => setIsOpen(!isOpen)}
          >
            {displaySeasons.find(s => s.season_number === selectedSeason)?.name || `Season ${selectedSeason}`} 
            <span className={styles.episodeCountSpan}>
              {releasedEpisodes.length} Released{unreleasedEpisodes.length > 0 ? ` • ${unreleasedEpisodes.length} Upcoming` : ''}
            </span>
            <svg className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </button>

          {isOpen && (
            <div className={styles.dropdownMenuList}>
              {displaySeasons.map((s) => (
                <div 
                  key={s.season_number} 
                  className={`${styles.dropdownMenuItem} ${selectedSeason === s.season_number ? styles.dropdownMenuItemActive : ''}`}
                  onClick={() => {
                    setSelectedSeason(s.season_number);
                    setIsOpen(false);
                  }}
                >
                  {s.name || `Season ${s.season_number}`} <span className={styles.dropdownEpisodeCount}>({s.episode_count} Episodes)</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={styles.filtersRow}>
        <div className={styles.searchBox}>
          <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input 
            type="text" 
            placeholder="Search episodes..." 
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <button 
          className={styles.sortBtn}
          onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/>
          </svg>
          {sortOrder === 'asc' ? 'Oldest First' : 'Newest First'}
        </button>
      </div>

      {/* Next Upcoming Episode Spotlight Card */}
      {!loading && nextEpisode && !searchQuery.trim() && (
        <div className={styles.nextEpisodeCard}>
          <div className={styles.nextEpisodeThumbnailWrapper}>
            {nextEpisode.still_path ? (
              <img
                src={`https://image.tmdb.org/t/p/w780${nextEpisode.still_path}`}
                alt={nextEpisode.name || `Episode ${nextEpisode.episode_number}`}
                className={styles.nextEpisodeThumbnail}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=500&auto=format&fit=crop';
                }}
              />
            ) : (
              <div className={styles.nextEpisodePlaceholder}>
                <Clock size={28} />
                <span className={styles.placeholderEpText}>EPISODE {nextEpisode.episode_number}</span>
              </div>
            )}
            <div className={styles.nextEpisodeGradient} />
            <div className={styles.nextEpisodeStatusBadge}>
              <span className={styles.pulseDot} />
              COMING SOON
            </div>
          </div>

          <div className={styles.nextEpisodeInfo}>
            <div className={styles.nextEpisodeHeaderRow}>
              <div className={styles.nextEpisodePill}>
                <Clock size={13} />
                <span>Next Episode • Ep {nextEpisode.episode_number}</span>
              </div>
              {nextEpisode.air_date && (
                <div className={styles.countdownPill}>
                  <Calendar size={13} />
                  <span>{getCountdownText(nextEpisode.air_date)}</span>
                </div>
              )}
            </div>

            <h4 className={styles.nextEpisodeTitle}>
              {nextEpisode.episode_number}. {nextEpisode.name || `Episode ${nextEpisode.episode_number}`}
            </h4>

            {nextEpisode.air_date && (
              <div className={styles.nextEpisodeAirDate}>
                <span>Expected release:</span>
                <strong>{formatAirDate(nextEpisode.air_date)}</strong>
                <span className={styles.airTimeEstimate}>
                  <Clock size={12} /> Broadcast Schedule
                </span>
              </div>
            )}

            <p className={styles.nextEpisodeOverview}>
              {nextEpisode.overview && nextEpisode.overview.trim() !== ''
                ? nextEpisode.overview
                : 'Official episode synopsis and video stream will be unlocked upon broadcast release.'}
            </p>

            {unreleasedEpisodes.length > 1 && (
              <div className={styles.moreUnreleasedNotice}>
                <span>+{unreleasedEpisodes.length - 1} more scheduled episode{unreleasedEpisodes.length - 1 > 1 ? 's' : ''} coming later this season</span>
              </div>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className={styles.episodeGrid} aria-label="Loading episodes">
          {[...Array(6)].map((_, i) => (
            <div key={`skel-ep-${i}`} className={styles.skeletonEpisodeCard}>
              <div className={styles.skeletonThumbnailWrapper}>
                <div className={styles.skeletonShimmer} />
                <div className={styles.skeletonPlayIcon} />
                <div className={styles.skeletonEpisodeNumberBadge} />
              </div>
              <div className={styles.skeletonEpisodeInfo}>
                <div className={styles.skeletonEpisodeTitle} />
                <div className={styles.skeletonEpisodeDescLine} style={{ width: '100%' }} />
                <div className={styles.skeletonEpisodeDescLine} style={{ width: '75%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.episodeGrid}>
          {filteredAndSortedEpisodes.length === 0 ? (
            <div className={styles.noEpisodesFound}>
              {searchQuery.trim() !== ''
                ? `No episodes found matching "${searchQuery}"`
                : unreleasedEpisodes.length > 0
                  ? `No episodes have aired for Season ${selectedSeason} yet. Check the upcoming schedule above!`
                  : 'No episodes available for this season.'}
            </div>
          ) : (
            filteredAndSortedEpisodes.map((ep) => {
              const isCurrent = selectedSeason === currentSeason && ep.episode_number === currentEpisode;
              const description = ep.overview?.trim() || 'No episode description available.';
              const stillUrl = ep.still_path
                ? `https://image.tmdb.org/t/p/w780${ep.still_path}`
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
            })
          )}
        </div>
      )}
    </div>
  );
}
