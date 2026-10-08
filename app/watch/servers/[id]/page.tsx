'use client';

import React, { use, useEffect, useState, useMemo, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Sliders,
  Play,
  Maximize2,
  Volume2,
  Download,
  Subtitles,
  RotateCw,
  Sparkles,
  Layers,
  ChevronRight,
  Check,
  Radio,
  Share2
} from 'lucide-react';
import ArtPlayerComponent, { ArtPlayerSubtitle } from '../../../../components/ArtPlayer/ArtPlayerComponent';
import VidstackPlayer, { VidstackTrack } from '../../../../components/VidstackPlayer';
import SeasonEpisodeSelector from '../../../../components/SeasonEpisodeSelector/SeasonEpisodeSelector';
import { RIVE_SERVERS, buildRiveServerUrl } from '../../../../utils/riveServers';
import { getSavedProgress, updateWatchProgress, isUpcomingMedia, getFormattedReleaseDate } from '../../../../utils/userStorage';
import { MonitorPlay, Calendar } from 'lucide-react';

export interface UnifiedAudioTrack {
  id: string;
  language: string;
  label: string;
  badge: string;
  url: string;
  quality: string;
  isDefault?: boolean;
}

export interface UnifiedSubtitle {
  id: string;
  language: string;
  label: string;
  url: string;
  isDefault?: boolean;
}

const isEnglishSub = (sub: any) => {
  const label = (sub?.label || '').toLowerCase();
  const lang = (sub?.language || '').toLowerCase();
  return (
    lang === 'en' ||
    lang.startsWith('en-') ||
    lang === 'eng' ||
    label.includes('english') ||
    label.includes('eng')
  );
};

export function cleanAndDeduplicateAudioTracks(
  tracks: UnifiedAudioTrack[],
  isAnimeMode: boolean,
): UnifiedAudioTrack[] {
  const langNames: Record<string, string> = {
    hi: 'Hindi',
    en: 'English',
    ja: 'Japanese',
    ta: 'Tamil',
    te: 'Telugu',
    fr: 'French',
    es: 'Spanish',
    ru: 'Russian',
    de: 'German',
    it: 'Italian',
    ko: 'Korean',
    zh: 'Chinese',
    pt: 'Portuguese',
    ar: 'Arabic',
  };

  const getCleanLangName = (track: UnifiedAudioTrack): string => {
    const raw = (track.label || '').trim();
    const langCode = (track.language || '').toLowerCase().substring(0, 2);

    if (track.language === 'ja' || raw.toLowerCase().includes('japanese')) return 'Japanese';
    if (track.language === 'en-dub' || raw.toLowerCase().includes('english dub') || raw.toLowerCase().includes('eng dub')) return 'English [Dub]';
    if (raw.toLowerCase().includes('hindi')) return 'Hindi';
    if (raw.toLowerCase().includes('tamil')) return 'Tamil';
    if (raw.toLowerCase().includes('telugu')) return 'Telugu';
    if (raw.toLowerCase().includes('french')) return 'French';
    if (raw.toLowerCase().includes('spanish')) return 'Spanish';
    if (raw.toLowerCase().includes('russian')) return 'Russian';
    if (raw.toLowerCase().includes('german')) return 'German';
    if (raw.toLowerCase().includes('italian')) return 'Italian';
    if (raw.toLowerCase().includes('korean')) return 'Korean';
    if (raw.toLowerCase().includes('chinese')) return 'Chinese';
    if (raw.toLowerCase().includes('english')) return 'English';

    // Remove noise, bracketed items, and quality labels
    let cleaned = raw
      .replace(/\[.*?\]/g, '')
      .replace(/\b(4K|2160p|1080p|720p|480p|HD|Full HD|Ultra HD|HDR|Direct Server \d+|Multi-Audio|Direct Citadel|Citadel|Server \d+)\b/gi, '')
      .trim();

    if (cleaned && cleaned.length >= 2) return cleaned;
    return langNames[langCode] || 'English';
  };

  const getCleanQualityBadge = (track: UnifiedAudioTrack): string => {
    const combined = `${track.badge || ''} ${track.quality || ''} ${track.label || ''}`.toUpperCase();
    if (combined.includes('4K') || combined.includes('2160')) return '4K HDR';
    if (combined.includes('1080')) return '1080p';
    if (combined.includes('720')) return '720p';
    if (combined.includes('480')) return '480p';
    return '1080p';
  };

  const qualityScore = (badge: string): number => {
    if (badge.includes('4K')) return 4;
    if (badge.includes('1080')) return 3;
    if (badge.includes('720')) return 2;
    return 1;
  };

  const mapped = tracks.map((t) => {
    const cleanLang = getCleanLangName(t);
    const cleanBadge = getCleanQualityBadge(t);
    return {
      ...t,
      label: cleanLang,
      badge: cleanBadge,
    };
  });

  // Deduplicate by clean label: keep highest quality stream per language
  const deduplicated = new Map<string, UnifiedAudioTrack>();
  for (const t of mapped) {
    const key = t.label.toLowerCase();
    const existing = deduplicated.get(key);
    if (!existing || qualityScore(t.badge) > qualityScore(existing.badge)) {
      deduplicated.set(key, t);
    }
  }

  const result = Array.from(deduplicated.values());

  // Sort logically:
  result.sort((a, b) => {
    const getRank = (lang: string) => {
      const l = lang.toLowerCase();
      if (isAnimeMode) {
        if (l.includes('japan')) return 0;
        if (l.includes('dub')) return 1;
        if (l.includes('eng')) return 2;
        if (l.includes('hin')) return 3;
        return 4;
      }
      if (l.includes('hin')) return 0;
      if (l.includes('eng')) return 1;
      if (l.includes('tam')) return 2;
      if (l.includes('tel')) return 3;
      if (l.includes('fre')) return 4;
      if (l.includes('spa')) return 5;
      return 6;
    };
    const rankDiff = getRank(a.label) - getRank(b.label);
    if (rankDiff !== 0) return rankDiff;
    return qualityScore(b.badge) - qualityScore(a.badge);
  });

  return result;
}

function DirectPlayerHubContent({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const type = (searchParams.get('type') as 'movie' | 'tv') || 'movie';
  const season = searchParams.get('season') ? parseInt(searchParams.get('season')!) : 1;
  const episode = searchParams.get('episode') ? parseInt(searchParams.get('episode')!) : 1;

  const [movie, setMovie] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [seasonEpisodes, setSeasonEpisodes] = useState<any[]>([]);

  const isAnime = useMemo(() => {
    if (!movie) return false;
    const origLang = (movie.original_language || '').toLowerCase();
    const genres = (movie.genres || []).map((g: any) => (typeof g === 'string' ? g : g.name));
    const originCountry = movie.origin_country || [];
    return (
      origLang === 'ja' ||
      (genres.includes('Animation') && (origLang === 'ja' || originCountry.includes('JP')))
    );
  }, [movie]);

  // Pre-scanned Unified Netflix Data (Discovered in background across all direct streams)
  const [unifiedAudioTracks, setUnifiedAudioTracks] = useState<UnifiedAudioTrack[]>([]);
  const [unifiedSubtitles, setUnifiedSubtitles] = useState<UnifiedSubtitle[]>([]);
  const [isBackgroundScanning, setIsBackgroundScanning] = useState<boolean>(true);
  const [scanStatusNotice, setScanStatusNotice] = useState<string | null>('Scanning audio & subtitles in background...');

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authCode, setAuthCode] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (
        sessionStorage.getItem('vip_auth') === '123' ||
        localStorage.getItem('vip_auth') === '123'
      ) {
        setIsAuthenticated(true);
      }
    }
  }, []);

  // Current Active Playback State
  const [currentStreamUrl, setCurrentStreamUrl] = useState<string | null>(null);
  const [embedFallbackUrl, setEmbedFallbackUrl] = useState<string | null>(null);
  const [activeAudioLabel, setActiveAudioLabel] = useState<string>('Hindi [Original / Dub]');
  const [activeSubtitle, setActiveSubtitle] = useState<string>('English');
  const [playbackTimestamp, setPlaybackTimestamp] = useState<number>(0);
  const [fetchingStream, setFetchingStream] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quick Menu State (Matching reference: media_1789676909185.png)
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState<boolean>(false);
  const [playSpeed, setPlaySpeed] = useState<string>('Normal');
  const [aspectRatio, setAspectRatio] = useState<string>('Default');
  const [videoFlip, setVideoFlip] = useState<string>('Normal');
  const [subtitleOffset, setSubtitleOffset] = useState<number>(0);
  const [audioBoost, setAudioBoost] = useState<number>(1);
  const [streamQuality, setStreamQuality] = useState<string>('Auto');
  const [activeServerName, setActiveServerName] = useState<string>('Direct Stream');

  // Submenu states in Quick Menu: 'audio' | 'subtitles' | 'quality' | 'speed' | 'aspect' | 'flip' | 'servers' | null
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);

  const artRef = useRef<any>(null);
  const playbackTimeRef = useRef<number>(0);
  const lastErrorSwitchRef = useRef<number>(0);
  const errorCountRef = useRef<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const ambientCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);
  const [hasAbsorbedClick, setHasAbsorbedClick] = useState<boolean>(false);
  const [hasLiveGlow, setHasLiveGlow] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(false);
  const canvasTaintedRef = useRef<boolean>(false);

  useEffect(() => {
    setMounted(true);
    const checkMobile =
      typeof navigator !== 'undefined' &&
      (/Android|iPhone|iPad|iPod|Mobile|Silk|BlackBerry/i.test(navigator.userAgent) ||
        (navigator.userAgent.includes('Mac') && 'ontouchend' in document));
    setIsMobileDevice(checkMobile);
  }, []);

  // Real-time Canvas Ambilight Render Loop (Disabled on mobile to prevent crashes & reloads)
  useEffect(() => {
    if (isMobileDevice) return;

    let animFrameId: number;
    let lastDrawTime = 0;
    const FPS = 20;
    const frameInterval = 1000 / FPS;

    const drawFrame = () => {
      if (canvasTaintedRef.current) return;
      const video = containerRef.current?.querySelector('video');
      const canvas = ambientCanvasRef.current;
      if (!video || !canvas) return;

      if (video.readyState >= 1) {
        const ctx = canvas.getContext('2d', { willReadFrequently: false });
        if (ctx) {
          try {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            setHasLiveGlow(true);
          } catch {
            canvasTaintedRef.current = true;
          }
        }
      }
    };

    const renderLoop = (timestamp: number) => {
      animFrameId = requestAnimationFrame(renderLoop);
      if (timestamp - lastDrawTime < frameInterval) return;
      lastDrawTime = timestamp;

      const video = containerRef.current?.querySelector('video');
      if (video) {
        const isPlaying = !video.paused && !video.ended;
        setIsVideoPlaying(isPlaying);
        if (isPlaying && video.readyState >= 2) {
          drawFrame();
        }
      }
    };

    animFrameId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [currentStreamUrl, isMobileDevice]);

  useEffect(() => {
    setHasAbsorbedClick(false);
  }, [currentStreamUrl]);

  // Fetch TMDB metadata
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const endpoint = type === 'tv' ? `/api/tv/${id}` : `/api/movies/${id}`;

    fetch(endpoint)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data && !data.error) {
          setMovie(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));

    if (type === 'tv') {
      fetch(`/api/tv/${id}/season/${season}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.episodes) {
            setSeasonEpisodes(data.episodes);
          }
        });
    }

    // Restore exact playback timestamp from saved history
    const savedTime = getSavedProgress(id, type, season, episode);
    if (savedTime > 1) {
      setPlaybackTimestamp(savedTime);
      playbackTimeRef.current = savedTime;
    }
  }, [id, type, season, episode]);

  // 🚀 Netflix-Style Background Aggregator: Scans all direct scrapers in background
  useEffect(() => {
    if (!id) return;
    
    setIsBackgroundScanning(true);
    setFetchingStream(true);
    setScanStatusNotice('Scanning audio languages & streams...');

    const aggregateUrl = `/api/direct-aggregate?id=${id}&type=${type}${type === 'tv' ? `&season=${season}&episode=${episode}` : ''}`;

    // 25s Abort controller timeout for slow streams
    const controller = new AbortController();
    const fetchTimeout = setTimeout(() => controller.abort(), 25000);

    fetch(aggregateUrl, { signal: controller.signal })
      .then(res => (res.ok ? res.json() : null))
      .then(async data => {
        clearTimeout(fetchTimeout);
        if (data && data.success && data.audioLanguages && data.audioLanguages.length > 0) {
          // Instant Playback: mount stream immediately in <1 second
          const cleanInitial = cleanAndDeduplicateAudioTracks(data.audioLanguages, data.isAnime || isAnime);
          setUnifiedAudioTracks(cleanInitial);
          const defaultAudio = (data.isAnime || isAnime)
            ? (cleanInitial.find((a: any) => a.language === 'ja' || a.label.toLowerCase().includes('japan')) ||
               cleanInitial.find((a: any) => a.language === 'en-dub' || a.label.toLowerCase().includes('dub')) ||
               cleanInitial[0])
            : (cleanInitial.find((a: any) => a.label.toLowerCase().includes('hindi') || a.language === 'hi') ||
               cleanInitial.find((a: any) => a.language === 'en' || a.label.toLowerCase().includes('english')) ||
               cleanInitial[0]);
          const initialUrl = defaultAudio?.url || data.defaultStreamUrl;
          const initialLabel = defaultAudio?.label || data.defaultAudioLabel || 'Audio';
          setCurrentStreamUrl(initialUrl);
          setActiveAudioLabel(initialLabel);
          setFetchingStream(false);
          setIsBackgroundScanning(false);
          setScanStatusNotice('Verifying stream integrity...');

          // Test all audio streams in parallel and extract actual languages in the background
          const audioResults = await Promise.allSettled(
            data.audioLanguages.map(async (track: any) => {
              try {
                // If it's already an identified anime track or direct MP4 stream, preserve it directly
                if (track.id?.startsWith('anime-') || track.language === 'ja' || track.language === 'en-dub' || track.url.toLowerCase().includes('.mp4')) {
                  return track;
                }
                const ac = new AbortController();
                const tid = setTimeout(() => ac.abort(), 10000);
                // Use GET instead of HEAD to read manifest contents
                const r = await fetch(track.url, { method: 'GET', signal: ac.signal });
                clearTimeout(tid);
                
                if (!r.ok) return null;
                
                const contentType = r.headers.get('content-type') || '';
                if (contentType.includes('text/html')) return null;
                
                const text = await r.text();
                
                if (text.includes('#EXT-X-MEDIA:TYPE=AUDIO')) {
                  const audioNames = [...text.matchAll(/#EXT-X-MEDIA:TYPE=AUDIO.*?NAME="([^"]+)"/gi)].map(m => m[1]);
                  const langCodes = [...text.matchAll(/#EXT-X-MEDIA:TYPE=AUDIO.*?LANGUAGE="([^"]+)"/gi)].map(m => m[1]);
                  
                  const isValidLangName = (n: string) => {
                    const low = n.toLowerCase();
                    return !low.includes('audio') && !low.includes('track') && !low.includes('und') && low.length > 1 && low !== 'unknown';
                  };

                  const codeToLang = (code: string) => {
                    const c = code.toLowerCase();
                    if (c.startsWith('hi')) return 'Hindi';
                    if (c.startsWith('en')) return 'English';
                    if (c.startsWith('ru')) return 'Russian';
                    if (c.startsWith('ta')) return 'Tamil';
                    if (c.startsWith('te')) return 'Telugu';
                    if (c.startsWith('fr')) return 'French';
                    if (c.startsWith('it')) return 'Italian';
                    if (c.startsWith('es')) return 'Spanish';
                    if (c.startsWith('ja') || c.startsWith('jp')) return 'Japanese';
                    if (c.startsWith('de')) return 'German';
                    if (c.startsWith('ko')) return 'Korean';
                    if (c.startsWith('zh')) return 'Chinese';
                    return null;
                  };

                  const validNames = audioNames.filter(isValidLangName).map(n => {
                    if (n.length === 2) return codeToLang(n) || n;
                    return n;
                  });

                  const validFromCodes = langCodes.map(codeToLang).filter(Boolean) as string[];

                  let finalLangs = Array.from(new Set([...validNames, ...validFromCodes]));

                  if (finalLangs.length > 0) {
                    let baseLabel = finalLangs[0];

                    track.label = baseLabel;

                    const firstLang = finalLangs[0].toLowerCase();
                    if (firstLang.includes('hin')) track.language = 'hi';
                    else if (firstLang.includes('eng')) track.language = 'en';
                    else if (firstLang.includes('rus')) track.language = 'ru';
                    else if (firstLang.includes('tam')) track.language = 'ta';
                    else if (firstLang.includes('tel')) track.language = 'te';
                    else if (firstLang.includes('fre') || firstLang.includes('fra')) track.language = 'fr';
                    else if (firstLang.includes('ita')) track.language = 'it';
                    else if (firstLang.includes('spa')) track.language = 'es';
                    else track.language = firstLang.substring(0,2);
                  }
                }
                
                return track;
              } catch {
                return null;
              }
            })
          );
          
          const workingAudio = audioResults
            .filter((r) => r.status === 'fulfilled' && r.value !== null)
            .map((r: any) => r.value);

          // Test all subtitles in parallel (for anime, strictly keep only English subtitles)
          let workingSubs: any[] = [];
          if (data.subtitles && data.subtitles.length > 0) {
             const rawSubs = (data.isAnime || isAnime)
               ? data.subtitles.filter(isEnglishSub)
               : data.subtitles;
             const proxiedSubtitles = rawSubs.map((sub: any) => {
               if (sub.url && !sub.url.startsWith(window.location.origin) && !sub.url.startsWith('/')) {
                 return { ...sub, url: `/api/subtitle/proxy?url=${encodeURIComponent(sub.url)}` };
               }
               return sub;
             });
             const subResults = await Promise.allSettled(
               proxiedSubtitles.map(async (sub: any) => {
                 try {
                   const ac = new AbortController();
                   const tid = setTimeout(() => ac.abort(), 4000);
                   const r = await fetch(sub.url, { method: 'GET', signal: ac.signal });
                   clearTimeout(tid);
                   return r.ok ? sub : null;
                 } catch {
                   return null;
                 }
               })
             );
             workingSubs = subResults
               .filter((r) => r.status === 'fulfilled' && r.value !== null)
               .map((r: any) => r.value);
          }

          if (workingAudio.length > 0) {
            const cleaned = cleanAndDeduplicateAudioTracks(workingAudio, data.isAnime || isAnime);
            setUnifiedAudioTracks(cleaned);
            if (workingSubs.length > 0) {
              setUnifiedSubtitles(workingSubs);
              const defaultSub = workingSubs.find((s: any) => s.isDefault) || workingSubs[0];
              if (defaultSub && (!activeSubtitle || activeSubtitle === 'English')) {
                setActiveSubtitle(defaultSub.label);
              }
            }
          }
          setScanStatusNotice(null);
        } else {
          fallbackDirectFetch();
        }
      })
      .catch(() => {
        clearTimeout(fetchTimeout);
        fallbackDirectFetch();
      });

    const fallbackDirectFetch = async () => {
      try {
        const omssUrl =
          type === 'tv'
            ? `/api/direct/tv/${id}/${season}/${episode}`
            : `/api/direct/movie/${id}`;

        const omssRes = await fetch(omssUrl);
        if (omssRes.ok) {
          const omssData = await omssRes.json();
          if (omssData && omssData.sources && omssData.sources.length > 0) {
            const mappedTracks: UnifiedAudioTrack[] = omssData.sources.map((s: any, idx: number) => ({
              id: s.id || `omss-${idx}`,
              language: (s.quality || '').toLowerCase().includes('hindi') ? 'hi' : 'en',
              label: s.name || `Direct Server ${idx + 1}`,
              badge: s.quality || '1080p HD',
              url: s.url,
              quality: s.quality || '1080p',
              isDefault: idx === 0,
            }));

            // Instant Playback for Fallback sources
            const cleanFallback = cleanAndDeduplicateAudioTracks(mappedTracks, isAnime);
            setUnifiedAudioTracks(cleanFallback);
            setCurrentStreamUrl(cleanFallback[0]?.url || mappedTracks[0].url);
            setActiveAudioLabel(cleanFallback[0]?.label || mappedTracks[0].label);
            setFetchingStream(false);
            setIsBackgroundScanning(false);

            // Test fallback audio streams in parallel and extract languages
            setScanStatusNotice('Verifying stream integrity...');
            const audioResults = await Promise.allSettled(
              mappedTracks.map(async (track: any) => {
                try {
                  const ac = new AbortController();
                  const tid = setTimeout(() => ac.abort(), 20000);
                  const r = await fetch(track.url, { method: 'GET', signal: ac.signal });
                  clearTimeout(tid);
                  
                  if (!r.ok) return null;
                  
                  const contentType = r.headers.get('content-type') || '';
                  if (contentType.includes('text/html')) return null;
                  
                  const text = await r.text();
                  if (text.includes('#EXT-X-MEDIA:TYPE=AUDIO')) {
                    const audioNames = [...text.matchAll(/#EXT-X-MEDIA:TYPE=AUDIO.*?NAME="([^"]+)"/gi)].map(m => m[1]);
                    const langCodes = [...text.matchAll(/#EXT-X-MEDIA:TYPE=AUDIO.*?LANGUAGE="([^"]+)"/gi)].map(m => m[1]);
                    
                    if (audioNames.length > 0) {
                      const uniqueNames = Array.from(new Set(audioNames));
                      let baseLabel = uniqueNames[0];

                      track.label = baseLabel;

                      const firstLang = (uniqueNames[0] || langCodes[0] || '').toLowerCase();
                      if (firstLang.includes('hin') || firstLang === 'hi') track.language = 'hi';
                      else if (firstLang.includes('eng') || firstLang === 'en') track.language = 'en';
                      else if (firstLang.includes('rus') || firstLang === 'ru') track.language = 'ru';
                      else if (firstLang.includes('tam') || firstLang === 'ta') track.language = 'ta';
                      else if (firstLang.includes('tel') || firstLang === 'te') track.language = 'te';
                      else if (firstLang.includes('fre') || firstLang.includes('fra') || firstLang === 'fr') track.language = 'fr';
                      else if (firstLang.includes('ita') || firstLang === 'it') track.language = 'it';
                      else if (firstLang.includes('spa') || firstLang === 'es') track.language = 'es';
                      else track.language = firstLang.substring(0,2);
                    }
                  }
                  
                  return track;
                } catch {
                  return null;
                }
              })
            );
            
            const workingAudio = audioResults
              .filter((r) => r.status === 'fulfilled' && r.value !== null)
              .map((r: any) => r.value);

            if (workingAudio.length > 0) {
              const cleaned = cleanAndDeduplicateAudioTracks(workingAudio, isAnime);
              setUnifiedAudioTracks(cleaned);
              if (!currentStreamUrl && cleaned.length > 0) {
                const defaultTrack = cleaned.find((t: any) => t.language === 'en' || t.label.toLowerCase().includes('english')) || cleaned[0];
                setCurrentStreamUrl(defaultTrack.url);
                setActiveAudioLabel(defaultTrack.label);
              }
            } else {
              throw new Error("All fallback direct streams failed the integrity check.");
            }

            if (omssData.subtitles && Array.isArray(omssData.subtitles) && omssData.subtitles.length > 0) {
              const rawOmssSubs = isAnime
                ? omssData.subtitles.filter(isEnglishSub)
                : omssData.subtitles;
              const mappedSubs = rawOmssSubs.map((sub: any, idx: number) => {
                let subUrl = sub.url;
                if (subUrl && !subUrl.startsWith(window.location.origin) && !subUrl.startsWith('/')) {
                  subUrl = `/api/subtitle/proxy?url=${encodeURIComponent(subUrl)}`;
                }
                return {
                  id: `sub-${idx}`,
                  language: sub.language || 'en',
                  label: sub.label || 'English',
                  url: subUrl,
                  isDefault: idx === 0,
                };
              });

              const subResults = await Promise.allSettled(
                mappedSubs.map(async (sub: any) => {
                  try {
                    const ac = new AbortController();
                    const tid = setTimeout(() => ac.abort(), 20000);
                    const r = await fetch(sub.url, { method: 'GET', signal: ac.signal });
                    clearTimeout(tid);
                    return r.ok ? sub : null;
                  } catch {
                    return null;
                  }
                })
              );
              const workingSubs = subResults
                .filter((r) => r.status === 'fulfilled' && r.value !== null)
                .map((r: any) => r.value);

              if (workingSubs.length > 0) {
                setUnifiedSubtitles(workingSubs);
              }
            }

            setFetchingStream(false);
            setIsBackgroundScanning(false);
            setScanStatusNotice(null);
            return;
          }
        }

        const screenscapeUrl = type === 'tv'
          ? `https://screenscape.me/embed?tmdb=${id}&type=tv&s=${season}&e=${episode}`
          : `https://screenscape.me/embed?tmdb=${id}&type=movie`;
        setEmbedFallbackUrl(screenscapeUrl);
        setFetchingStream(false);
        setIsBackgroundScanning(false);
        setScanStatusNotice(null);
      } catch (err: any) {
        const screenscapeUrl = type === 'tv'
          ? `https://screenscape.me/embed?tmdb=${id}&type=tv&s=${season}&e=${episode}`
          : `https://screenscape.me/embed?tmdb=${id}&type=movie`;
        setEmbedFallbackUrl(screenscapeUrl);
        setFetchingStream(false);
        setIsBackgroundScanning(false);
        setScanStatusNotice(null);
      }
    };

    return () => {
      controller.abort();
    };
  }, [id, type, season, episode]);

  // Seamless Hot-Switch of Audio Language (Preserves exact playback time!)
  const handleSelectAudioTrack = (track: UnifiedAudioTrack) => {
    const currentTime =
      playbackTimeRef.current > 0
        ? playbackTimeRef.current
        : (artRef.current?.video?.currentTime || artRef.current?.currentTime || 0);

    setPlaybackTimestamp(currentTime);
    playbackTimeRef.current = currentTime;

    // Fast-path: Only switch in-place if it is the exact same underlying manifest with multiple audio tracks
    const isSameManifest = currentStreamUrl && (
      currentStreamUrl.split('&lang=')[0].split('&forceTrack=')[0] === 
      track.url.split('&lang=')[0].split('&forceTrack=')[0]
    );

    if (isSameManifest && artRef.current?.hls?.audioTracks && artRef.current.hls.audioTracks.length > 1) {
      const targetLang = track.language.toLowerCase();
      let targetIdx = -1;
      if (targetLang === 'ja' || targetLang.includes('ja')) {
        targetIdx = artRef.current.hls.audioTracks.findIndex((t: any) =>
          t.name?.toLowerCase().includes('jp') || t.name?.toLowerCase().includes('ja') || t.language?.toLowerCase().includes('ja')
        );
      } else if (targetLang.includes('dub') || targetLang.startsWith('en')) {
        targetIdx = artRef.current.hls.audioTracks.findIndex((t: any) =>
          t.name?.toLowerCase().includes('en') || t.name?.toLowerCase().includes('dub') || t.language?.toLowerCase().includes('en')
        );
      } else if (targetLang.includes('hi')) {
        targetIdx = artRef.current.hls.audioTracks.findIndex((t: any) =>
          t.name?.toLowerCase().includes('hin') || t.language?.toLowerCase().includes('hi')
        );
      }

      if (targetIdx === -1 && track.url.includes('forceTrack=')) {
        const m = track.url.match(/forceTrack=(\d+)/);
        if (m) targetIdx = parseInt(m[1], 10);
      }

      if (targetIdx >= 0 && targetIdx < artRef.current.hls.audioTracks.length) {
        artRef.current.hls.audioTrack = targetIdx;
        setActiveAudioLabel(track.label);
        setActiveSubmenu(null);
        return;
      }
    }

    setCurrentStreamUrl(track.url);
    setActiveAudioLabel(track.label);

    if (track.badge) {
      if (track.badge.includes('4K') || track.badge.includes('2160')) setStreamQuality('4K HDR');
      else if (track.badge.includes('1080')) setStreamQuality('1080P');
      else if (track.badge.includes('720')) setStreamQuality('720P');
      else if (track.badge.includes('480')) setStreamQuality('480P');
    }
    setActiveSubmenu(null);
  };

  // Switch Subtitle
  const handleSelectSubtitle = (subLabel: string) => {
    setActiveSubtitle(subLabel);
    if (subLabel === 'Off') {
      if (artRef.current?.subtitle) {
        artRef.current.subtitle.show = false;
      }
    } else {
      const targetSub = unifiedSubtitles.find(s => s.label === subLabel);
      if (targetSub && artRef.current?.subtitle) {
        artRef.current.subtitle.switch(targetSub.url, { name: targetSub.label });
        artRef.current.subtitle.show = true;
      }
    }
    setActiveSubmenu(null);
  };

  // Switch Quality
  const handleSelectQuality = (q: string) => {
    setStreamQuality(q);
    if (artRef.current?.hls) {
      const hls = artRef.current.hls;
      if (q === 'Auto') {
        hls.currentLevel = -1;
      } else if (hls.levels && hls.levels.length > 0) {
        const targetHeight = q.includes('4K') ? 2160 : q.includes('1080') ? 1080 : q.includes('720') ? 720 : 480;
        let bestIdx = -1;
        let minDiff = 99999;
        hls.levels.forEach((lvl: any, idx: number) => {
          const diff = Math.abs((lvl.height || 720) - targetHeight);
          if (diff < minDiff) {
            minDiff = diff;
            bestIdx = idx;
          }
        });
        if (bestIdx !== -1) {
          hls.currentLevel = bestIdx;
        }
      }
    }

    // Also check if there's a direct stream matching this quality for the current language
    if (q !== 'Auto' && unifiedAudioTracks.length > 0) {
      const isHindi = activeAudioLabel.toLowerCase().includes('hindi');
      const targetSnippet = q.includes('4K') ? '4K' : q.includes('1080') ? '1080' : q.includes('720') ? '720' : '480';
      const matchingTrack = unifiedAudioTracks.find(t => {
        const matchLang = isHindi ? t.language === 'hi' : (t.language.startsWith('en') || t.language === 'en-4k');
        return matchLang && t.badge.includes(targetSnippet);
      });
      if (matchingTrack && matchingTrack.url !== currentStreamUrl) {
        const currentTime =
          playbackTimeRef.current > 0
            ? playbackTimeRef.current
            : (artRef.current?.video?.currentTime || artRef.current?.currentTime || 0);

        setPlaybackTimestamp(currentTime);
        playbackTimeRef.current = currentTime;
        setCurrentStreamUrl(matchingTrack.url);
        setActiveAudioLabel(matchingTrack.label);
      }
    }

    setActiveSubmenu(null);
  };

  const backdropUrl = movie?.backdrop_path
    ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
    : null;

  const title = movie?.title || movie?.name || (type === 'tv' ? `TV Show (S${season} E${episode})` : 'Movie Stream');
  const releaseYear = (movie?.release_date || movie?.first_air_date || '').substring(0, 4);

  // Format subtitles for ArtPlayer
  const artPlayerSubtitles: ArtPlayerSubtitle[] = useMemo(() => {
    const subs = isAnime ? unifiedSubtitles.filter(isEnglishSub) : unifiedSubtitles;
    return subs.map(s => ({
      url: s.url,
      label: s.label,
      default: s.isDefault,
    }));
  }, [unifiedSubtitles, isAnime]);

  // Format subtitles for Vidstack Direct HLS Player (iOS Fallback)
  const vidstackSubtitles: VidstackTrack[] = useMemo(() => {
    const subs = isAnime ? unifiedSubtitles.filter(isEnglishSub) : unifiedSubtitles;
    return subs.map(s => ({
      src: s.url,
      label: s.label,
      language: s.language || (s.label.toLowerCase().includes('hindi') ? 'hi' : 'en'),
      kind: 'subtitles',
      default: s.isDefault,
      type: 'vtt',
    }));
  }, [unifiedSubtitles, isAnime]);

  const customPlayerSettings = useMemo(() => {
    const settings: any[] = [];
    if (unifiedAudioTracks.length > 0) {
      settings.push({
        name: "audio-language-menu",
        html: "Audio Language",
        width: 230,
        tooltip: activeAudioLabel || "Audio",
        selector: unifiedAudioTracks.map(track => {
          const isSelected =
            activeAudioLabel === track.label ||
            activeAudioLabel?.toLowerCase() === track.label.toLowerCase();

          return {
            default: isSelected,
            html: `<div style="display:flex; justify-content:space-between; align-items:center; width:100%; gap:8px">
              <span style="font-weight:500; font-size:13px">${track.label}</span>
              <span style="font-size:10px; font-weight:600; padding:1px 6px; border-radius:4px; background:rgba(255,255,255,0.08); color:#f59e0b">${track.badge}</span>
            </div>`,
            value: track.id,
            track: track,
          };
        }),
        onSelect: function (item: any) {
          handleSelectAudioTrack(item.track);
          return item.track.label;
        },
      });
    }
    return settings;
  }, [unifiedAudioTracks, activeAudioLabel]);


  const getAspectRatioStyle = () => {
    switch (aspectRatio) {
      case '4:3': return 'aspect-[4/3] max-h-[88vh]';
      case '21:9': return 'aspect-[21/9]';
      case '16:9': return 'aspect-video';
      default: return 'aspect-video';
    }
  };

  const getNumericPlaySpeed = (speedStr: string): number => {
    switch (speedStr) {
      case '0.5x': return 0.5;
      case '0.75x': return 0.75;
      case '1.25x': return 1.25;
      case '1.5x': return 1.5;
      case '2x': return 2.0;
      default: return 1.0;
    }
  };  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (authCode.trim() === '123') {
      sessionStorage.setItem('vip_auth', '123');
      localStorage.setItem('vip_auth', '123');
      setAuthError(null);
      setIsAuthenticated(true);
    } else {
      setAuthError('Invalid VIP Passkey. Please enter 123.');
    }
  };

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-3 sm:p-6 text-center relative overflow-hidden">
        {/* Cinematic Background Glow */}
        {mounted && backdropUrl && (
          <div className="fixed inset-0 w-full h-full -z-10 overflow-hidden pointer-events-none">
            <img
              src={backdropUrl}
              alt=""
              className="w-full h-full object-cover blur-[100px] opacity-20 scale-110"
            />
            <div className="absolute inset-0 bg-neutral-950/85" />
          </div>
        )}

        <div className="w-full max-w-[340px] sm:max-w-md bg-[#1F1C2C]/90 border border-[#928DAB]/30 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-[0_0_50px_rgba(31,28,44,0.6)] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#928DAB]/20 border border-[#928DAB]/40 flex items-center justify-center text-[#d1cfe2] mx-auto mb-3 sm:mb-4 shadow-[0_0_20px_rgba(146,141,171,0.3)]">
            <Sparkles className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>

          <h1 className="text-xl sm:text-2xl font-black mb-1.5 text-white tracking-tight">VIP Access Required</h1>
          <p className="text-neutral-400 mb-5 text-xs sm:text-sm">
            Enter <span className="text-white font-bold font-mono px-1.5 py-0.5 bg-[#928DAB]/25 rounded border border-[#928DAB]/30">123</span> to access premium 4K VIP servers.
          </p>
          <form onSubmit={handleAuth} className="flex flex-col gap-3 sm:gap-4">
            <input 
              type="text" 
              placeholder="Enter 123"
              value={authCode}
              onChange={(e) => {
                setAuthCode(e.target.value);
                setAuthError(null);
              }}
              className="w-full bg-black/80 border border-white/20 rounded-xl px-4 py-2.5 sm:py-3 text-white outline-none focus:border-[#928DAB] transition-colors text-center font-mono tracking-widest text-base sm:text-lg placeholder:tracking-normal placeholder:text-neutral-500 shadow-inner"
              autoFocus
            />

            {authError && (
              <p className="text-xs text-red-400 font-semibold animate-shake">{authError}</p>
            )}

            <button 
              type="submit" 
              className="btn-grad w-full py-2.5 sm:py-3 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider active:scale-95"
            >
              Unlock Player
            </button>
            <button 
              type="button" 
              onClick={() => router.back()}
              className="w-full bg-white/5 hover:bg-white/10 text-neutral-300 py-2.5 sm:py-3 rounded-xl transition-colors text-xs sm:text-sm font-semibold cursor-pointer active:scale-95"
            >
              Go Back
            </button>
          </form>
        </div>
      </main>
    );
  }

  if (movie && isUpcomingMedia(movie)) {
    const trailer = movie?.videos?.results?.find(
      (v: any) => v.site === "YouTube" && v.type === "Trailer"
    ) || movie?.videos?.results?.find((v: any) => v.site === "YouTube");

    return (
      <main className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden">
        {mounted && backdropUrl && (
          <div className="fixed inset-0 w-full h-full -z-10 overflow-hidden pointer-events-none">
            <img
              src={backdropUrl}
              alt=""
              className="w-full h-full object-cover blur-[90px] opacity-25 scale-110"
            />
            <div className="absolute inset-0 bg-neutral-950/85" />
          </div>
        )}
        <div className="w-full max-w-4xl bg-[#1F1C2C]/90 border border-[#928DAB]/30 rounded-3xl p-6 md:p-10 shadow-[0_0_50px_rgba(31,28,44,0.6)] backdrop-blur-xl flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 flex flex-col gap-4 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-[#1F1C2C] to-[#928DAB] border border-[#928DAB]/40 text-white text-xs font-bold uppercase tracking-wider w-fit">
              <Calendar size={14} /> VIP Premiere Notice
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">{title}</h1>
            <p className="text-neutral-300 text-sm leading-relaxed line-clamp-3">
              {movie?.overview || 'This title is scheduled for an upcoming release. VIP 4K streams will become active automatically on release day.'}
            </p>
            <div className="text-[#d1cfe2] text-sm font-semibold flex items-center gap-2">
              <span>Expected Date:</span>
              <span className="text-white bg-white/10 px-2.5 py-0.5 rounded-md border border-white/15">
                {getFormattedReleaseDate(movie)}
              </span>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.push(type === 'tv' ? `/tv/${id}` : `/movie/${id}`)}
                className="btn-grad px-5 py-2.5 rounded-xl font-bold text-sm transition-all"
              >
                Back to Details
              </button>
            </div>
          </div>
          {trailer && (
            <div className="w-full md:w-[380px] aspect-video rounded-2xl overflow-hidden border border-white/15 shadow-2xl bg-black flex-shrink-0">
              <iframe
                src={`https://www.youtube.com/embed/${trailer.key}`}
                title="Trailer"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white flex flex-col items-center px-3 sm:px-6 md:px-8 pt-20 md:pt-24 pb-16 relative overflow-x-hidden selection:bg-[#428475] selection:text-[#FFF4E1]">
      {/* Cinematic Ambient Background Backdrop */}
      {mounted && backdropUrl && (
        <div className="fixed inset-0 w-full h-full -z-10 overflow-hidden pointer-events-none">
          <img
            src={backdropUrl}
            alt=""
            className="w-full h-full object-cover blur-[100px] opacity-25 scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/70 via-neutral-950/90 to-neutral-950" />
        </div>
      )}

      {/* Top Responsive Header Bar */}
      <header className="w-full max-w-[92rem] flex items-center justify-between gap-2 sm:gap-3 py-1 sm:py-2 px-1 mb-3 sm:mb-4">
        {/* Left: Back + Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={() => router.push(type === 'tv' ? `/watch/tv/${id}/${season}/${episode}` : `/watch/${id}`)}
            className="p-1.5 sm:p-2 rounded-xl bg-white/[0.07] hover:bg-white/15 border border-white/10 text-neutral-300 hover:text-white transition-all cursor-pointer shadow-sm shrink-0 active:scale-95"
            title="Return to Standard Watch Page"
          >
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="px-1.5 sm:px-2 py-0.5 rounded-md bg-[#428475]/30 text-[#89D7B7] border border-[#89D7B7]/40 text-[9px] sm:text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-2 h-2 sm:w-2.5 sm:h-2.5" /> VIP Cinema
              </span>
              {releaseYear && (
                <span className="text-[10px] sm:text-xs text-neutral-400 font-semibold">{releaseYear}</span>
              )}
            </div>
            <h1 className="text-xs sm:text-base md:text-xl font-black text-white tracking-tight truncate drop-shadow-md">
              {title}
            </h1>
          </div>
        </div>

        {/* Right: Background status + Quick Menu Button */}
        <div className="flex items-center gap-2 shrink-0">
          {scanStatusNotice && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-white/[0.06] border border-white/10 text-[10px] sm:text-[11px] font-medium text-neutral-300 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-[#89D7B7]" />
              <span>{scanStatusNotice}</span>
            </div>
          )}
        </div>
      </header>

      {/* Cinema Player Frame with Ambient Spill & ArtPlayer */}
      <div className="w-full max-w-[92rem] relative mb-6" style={{ isolation: 'isolate' }}>
        {/* Dynamic Ambient Glow */}
        {mounted && (
          <div
            className={`absolute -inset-3 sm:-inset-5 md:-inset-7 z-0 pointer-events-none transition-opacity duration-500 select-none overflow-visible ${
              isVideoPlaying ? 'opacity-75 sm:opacity-80' : 'opacity-50 sm:opacity-55'
            }`}
          >
            {/* Real-time Video Canvas Mirror (Only on desktop) */}
            {!isMobileDevice && (
              <canvas
                ref={ambientCanvasRef}
                width={48}
                height={27}
                className={`w-full h-full object-cover blur-[32px] sm:blur-[48px] md:blur-[64px] saturate-[160%] brightness-[1.1] transform scale-[1.04] sm:scale-[1.07] transition-all duration-300 ${
                  hasLiveGlow ? 'opacity-100' : 'opacity-0'
                }`}
              />
            )}

            {/* Fallback Cinema Backdrop Ambient Lighting */}
            <div
              className={`absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-500 ${
                !hasLiveGlow || isMobileDevice ? 'opacity-100' : 'opacity-25'
              }`}
            >
              {backdropUrl ? (
                <img
                  src={backdropUrl}
                  alt=""
                  className="w-full h-full object-cover blur-[32px] sm:blur-[48px] md:blur-[64px] saturate-[160%] brightness-[1.1] transform scale-[1.04] sm:scale-[1.07]"
                />
              ) : (
                <div className="w-full h-full rounded-2xl md:rounded-3xl bg-gradient-to-tr from-violet-600/20 via-indigo-500/20 to-purple-600/20 blur-[40px] sm:blur-[55px] transform scale-[1.04]" />
              )}
            </div>
          </div>
        )}

        {/* Player Container */}
        <div
          ref={containerRef}
          className="w-full relative rounded-2xl md:rounded-3xl overflow-hidden border border-white/10 shadow-[0_25px_70px_rgba(0,0,0,0.95)] bg-black z-10"
        >
          <div className={`w-full ${getAspectRatioStyle()} transition-all duration-300 relative`}>
            {fetchingStream ? (
              <div className="w-full aspect-video flex flex-col items-center justify-center bg-black gap-3">
                <div className="w-10 h-10 border-4 border-[#89D7B7] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-semibold text-neutral-300">
                  Loading {activeAudioLabel}...
                </p>
              </div>
            ) : currentStreamUrl ? (
              <ArtPlayerComponent
                url={currentStreamUrl}
                poster={backdropUrl || ''}
                subtitles={artPlayerSubtitles}
                autoPlay={true}
                initialTime={playbackTimestamp}
                audioBoost={audioBoost}
                playbackRate={getNumericPlaySpeed(playSpeed)}
                aspectRatio={aspectRatio}
                subtitleOffset={subtitleOffset}
                activeSubtitleUrl={artPlayerSubtitles.find(s => s.label === activeSubtitle)?.url || (activeSubtitle === 'Off' ? '' : undefined)}
                activeSubtitleLabel={activeSubtitle}
                onError={(err) => {
                  console.warn('Playback error on stream:', currentStreamUrl, err);
                  if (artRef.current?.video && (artRef.current.video.currentTime > 0 || artRef.current.video.readyState >= 1 || artRef.current.video.seeking)) {
                    return; // Video/audio is actively playing or seeking, ignore transient error
                  }
                  // Do not automatically cycle streams on transient startup errors
                  if (artRef.current?.notice) {
                    artRef.current.notice.show = 'Stream buffering issue. Please choose an audio track or server.';
                  }
                }}
                customSettings={customPlayerSettings}
                getInstance={(art) => {
                  artRef.current = art;
                  art.on('video:timeupdate', () => {
                    if (art.video && art.video.currentTime > 0) {
                      playbackTimeRef.current = art.video.currentTime;
                      updateWatchProgress({
                        id,
                        title: title || movie?.name || movie?.title || 'VIP Cinema Stream',
                        media_type: type,
                        season,
                        episode,
                        currentTime: art.video.currentTime,
                        duration: art.video.duration || 0,
                        playerType: 'vip',
                        audioType: activeAudioLabel,
                        poster_path: movie?.poster_path,
                        backdrop_path: movie?.backdrop_path,
                      });
                    }
                  });
                }}
                className="w-full h-full"
              />
            ) : embedFallbackUrl ? (
              <iframe
                src={embedFallbackUrl}
                className="w-full aspect-video border-0 bg-black"
                sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
                allowFullScreen
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media; screen-wake-lock"
              />
            ) : (
              <div className="w-full aspect-video flex flex-col items-center justify-center bg-neutral-900/90 p-6 text-center gap-3">
                <p className="text-[#d1cfe2] font-bold text-base">Stream Offline</p>
                <p className="text-xs text-neutral-400 max-w-md">{errorMessage || 'Stream could not be loaded.'}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="btn-grad px-4 py-2 font-bold text-xs rounded-lg transition"
                >
                  Reload Stream
                </button>
              </div>
            )}
          </div>


        </div>
      </div>

      {/* Series Player / Episode Selector */}
      {type === 'tv' && movie?.seasons && (
        <div className="w-full max-w-[1200px] mx-auto mt-4 px-3 sm:px-6 pb-20">
          <SeasonEpisodeSelector
            tvId={id}
            seasons={movie.seasons || []}
            currentSeason={season}
            currentEpisode={episode}
            onEpisodeSelect={(newSeason, newEpisode) => {
              router.push(`/watch/servers/${id}?type=tv&season=${newSeason}&episode=${newEpisode}`);
            }}
          />
        </div>
      )}
    </main>
  );
}

export default function DirectPlayerHubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-10 h-10 border-4 border-[#89D7B7] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm font-semibold text-neutral-300">Loading VIP Cinema Player...</p>
        </main>
      }
    >
      <DirectPlayerHubContent id={id} />
    </Suspense>
  );
}
