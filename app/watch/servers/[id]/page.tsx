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
import { RIVE_SERVERS, buildRiveServerUrl } from '../../../../utils/riveServers';
import { MonitorPlay } from 'lucide-react';

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

function DirectPlayerHubContent({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const type = (searchParams.get('type') as 'movie' | 'tv') || 'movie';
  const season = searchParams.get('season') ? parseInt(searchParams.get('season')!) : 1;
  const episode = searchParams.get('episode') ? parseInt(searchParams.get('episode')!) : 1;

  const [movie, setMovie] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [seasonEpisodes, setSeasonEpisodes] = useState<any[]>([]);

  // Pre-scanned Unified Netflix Data (Discovered in background across all direct streams)
  const [unifiedAudioTracks, setUnifiedAudioTracks] = useState<UnifiedAudioTrack[]>([]);
  const [unifiedSubtitles, setUnifiedSubtitles] = useState<UnifiedSubtitle[]>([]);
  const [isBackgroundScanning, setIsBackgroundScanning] = useState<boolean>(true);
  const [scanStatusNotice, setScanStatusNotice] = useState<string | null>('Scanning audio & subtitles in background...');

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authCode, setAuthCode] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (sessionStorage.getItem('vip_auth') === '123') {
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

  const containerRef = useRef<HTMLDivElement>(null);
  const ambientCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);
  const [hasAbsorbedClick, setHasAbsorbedClick] = useState<boolean>(false);
  const [hasLiveGlow, setHasLiveGlow] = useState<boolean>(false);
  const [isIOSDevice, setIsIOSDevice] = useState<boolean>(false);
  const canvasTaintedRef = useRef<boolean>(false);

  useEffect(() => {
    const checkIOS = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Mac") && "ontouchend" in document));
    setIsIOSDevice(checkIOS);
  }, []);

  // Real-time Canvas Ambilight Render Loop (Live video color projection outside player)
  useEffect(() => {
    let animFrameId: number;
    let lastDrawTime = 0;
    const FPS = 24; // 24 FPS for real-time video color bleed
    const frameInterval = 1000 / FPS;

    const drawFrame = () => {
      if (canvasTaintedRef.current) return;
      const video = containerRef.current?.querySelector('video');
      const canvas = ambientCanvasRef.current;
      if (!video || !canvas) return;

      // Draw whenever video has loaded any frames (playing, paused, seeking)
      if (video.readyState >= 1) {
        const ctx = canvas.getContext('2d', { willReadFrequently: false });
        if (ctx) {
          try {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            setHasLiveGlow(true);
          } catch {
            // Tainted canvas fallback on iOS/Safari cross-origin
            canvasTaintedRef.current = true;
          }
        }
      }
    };

    const renderLoop = (timestamp: number) => {
      animFrameId = requestAnimationFrame(renderLoop);

      const isIOS = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Mac") && "ontouchend" in document));
      if (isIOS) return; // Disable expensive canvas extraction on iOS to prevent WebKit Jetsam memory crashes

      if (timestamp - lastDrawTime < frameInterval) return;
      lastDrawTime = timestamp;

      const video = containerRef.current?.querySelector('video');
      if (video) {
        setIsVideoPlaying(!video.paused && !video.ended);
        drawFrame();
      }
    };

    animFrameId = requestAnimationFrame(renderLoop);

    // Attach direct listeners to active video element
    const attachVideoEvents = () => {
      const video = containerRef.current?.querySelector('video');
      if (video) {
        video.addEventListener('timeupdate', drawFrame);
        video.addEventListener('play', drawFrame);
        video.addEventListener('pause', drawFrame);
        video.addEventListener('seeked', drawFrame);
        video.addEventListener('canplay', drawFrame);
        video.addEventListener('playing', drawFrame);
      }
    };
    attachVideoEvents();
    const attachTimer = setInterval(attachVideoEvents, 1000);

    return () => {
      cancelAnimationFrame(animFrameId);
      clearInterval(attachTimer);
      const video = containerRef.current?.querySelector('video');
      if (video) {
        video.removeEventListener('timeupdate', drawFrame);
        video.removeEventListener('play', drawFrame);
        video.removeEventListener('pause', drawFrame);
        video.removeEventListener('seeked', drawFrame);
        video.removeEventListener('canplay', drawFrame);
        video.removeEventListener('playing', drawFrame);
      }
    };
  }, [currentStreamUrl]);

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
  }, [id, type, season]);

  // 🚀 Netflix-Style Background Aggregator: Scans all direct scrapers in background
  useEffect(() => {
    if (!id) return;
    
    setIsBackgroundScanning(true);
    setFetchingStream(true);
    setScanStatusNotice('Scanning audio languages & streams...');

    const aggregateUrl = `/api/direct-aggregate?id=${id}&type=${type}${type === 'tv' ? `&season=${season}&episode=${episode}` : ''}`;

    // 10s Abort controller timeout for slow mobile networks
    const controller = new AbortController();
    const fetchTimeout = setTimeout(() => controller.abort(), 10000);

    fetch(aggregateUrl, { signal: controller.signal })
      .then(res => (res.ok ? res.json() : null))
      .then(async data => {
        clearTimeout(fetchTimeout);
        if (data && data.success && data.audioLanguages && data.audioLanguages.length > 0) {
          
          setScanStatusNotice('Verifying stream integrity...');

          // Test all audio streams in parallel and extract actual languages
          const audioResults = await Promise.allSettled(
            data.audioLanguages.map(async (track: any) => {
              try {
                const ac = new AbortController();
                const tid = setTimeout(() => ac.abort(), 4000);
                // Use GET instead of HEAD to read manifest contents
                const r = await fetch(track.url, { method: 'GET', signal: ac.signal });
                clearTimeout(tid);
                
                if (!r.ok) return null;
                
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
                    let baseLabel = finalLangs.length > 1 
                      ? `Multi-Audio [${finalLangs.slice(0, 2).map(n => n.substring(0,3)).join('/')}]`
                      : finalLangs[0];

                    if (track.label.includes('[')) {
                      const bracketSuffix = track.label.substring(track.label.indexOf('['));
                      track.label = `${baseLabel} ${bracketSuffix}`;
                    } else {
                      track.label = baseLabel;
                    }

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

          // Group and sort: Hindi first, then English, then others, sorted by quality
          workingAudio.sort((a: any, b: any) => {
            const getRank = (lang: string) => {
              if (lang === 'hi' || lang.includes('hi-')) return 0;
              if (lang === 'en' || lang.includes('en-')) return 1;
              return 2;
            };
            const rankA = getRank(a.language);
            const rankB = getRank(b.language);
            if (rankA !== rankB) return rankA - rankB;
            const getQ = (q: string) => q.includes('4K') ? 0 : q.includes('1080') ? 1 : q.includes('720') ? 2 : 3;
            return getQ(a.quality) - getQ(b.quality);
          });

          // Test all subtitles in parallel
          let workingSubs: any[] = [];
          if (data.subtitles && data.subtitles.length > 0) {
             const subResults = await Promise.allSettled(
               data.subtitles.map(async (sub: any) => {
                 try {
                   const ac = new AbortController();
                   const tid = setTimeout(() => ac.abort(), 3000);
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
            setUnifiedAudioTracks(workingAudio);

            const defaultAudio = workingAudio.find((a: any) => a.language === 'hi') || workingAudio[0];
            setCurrentStreamUrl(defaultAudio.url);
            setActiveAudioLabel(defaultAudio.label);

            if (workingSubs.length > 0) {
              setUnifiedSubtitles(workingSubs);
              const defaultSub = workingSubs.find((s: any) => s.isDefault) || workingSubs[0];
              if (defaultSub && (!activeSubtitle || activeSubtitle === 'English')) {
                setActiveSubtitle(defaultSub.label);
              }
            }

            setFetchingStream(false);
            setIsBackgroundScanning(false);
            setScanStatusNotice('Streams verified and ready');
            setTimeout(() => setScanStatusNotice(null), 3000);
          } else {
            fallbackDirectFetch();
          }
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

            // Test fallback audio streams in parallel and extract languages
            setScanStatusNotice('Verifying stream integrity...');
            const audioResults = await Promise.allSettled(
              mappedTracks.map(async (track: any) => {
                try {
                  const ac = new AbortController();
                  const tid = setTimeout(() => ac.abort(), 4000);
                  const r = await fetch(track.url, { method: 'GET', signal: ac.signal });
                  clearTimeout(tid);
                  
                  if (!r.ok) return null;
                  
                  const text = await r.text();
                  if (text.includes('#EXT-X-MEDIA:TYPE=AUDIO')) {
                    const audioNames = [...text.matchAll(/#EXT-X-MEDIA:TYPE=AUDIO.*?NAME="([^"]+)"/gi)].map(m => m[1]);
                    const langCodes = [...text.matchAll(/#EXT-X-MEDIA:TYPE=AUDIO.*?LANGUAGE="([^"]+)"/gi)].map(m => m[1]);
                    
                    if (audioNames.length > 0) {
                      const uniqueNames = Array.from(new Set(audioNames));
                      // Replace "English" base label with the extracted names
                      let baseLabel = uniqueNames.length > 1 
                        ? `Multi-Audio [${uniqueNames.slice(0, 2).map(n => n.substring(0,3)).join('/')}]`
                        : uniqueNames[0];
                      
                      if (track.label.includes('[')) {
                        const bracketSuffix = track.label.substring(track.label.indexOf('['));
                        track.label = `${baseLabel} ${bracketSuffix}`;
                      } else {
                        track.label = baseLabel;
                      }

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

            workingAudio.sort((a: any, b: any) => {
              const getRank = (lang: string) => {
                if (lang === 'hi' || lang.includes('hi-')) return 0;
                if (lang === 'en' || lang.includes('en-')) return 1;
                return 2;
              };
              const rankA = getRank(a.language);
              const rankB = getRank(b.language);
              if (rankA !== rankB) return rankA - rankB;
              const getQ = (q: string) => q.includes('4K') ? 0 : q.includes('1080') ? 1 : q.includes('720') ? 2 : 3;
              return getQ(a.quality) - getQ(b.quality);
            });

            if (workingAudio.length > 0) {
              setUnifiedAudioTracks(workingAudio);
              if (!currentStreamUrl) {
                const defaultTrack = workingAudio.find((t: any) => t.language === 'hi') || workingAudio[0];
                setCurrentStreamUrl(defaultTrack.url);
                setActiveAudioLabel(defaultTrack.label);
              }
            }

            if (omssData.subtitles && Array.isArray(omssData.subtitles) && omssData.subtitles.length > 0) {
              const mappedSubs = omssData.subtitles.map((sub: any, idx: number) => ({
                id: `sub-${idx}`,
                language: sub.language || 'en',
                label: sub.label || 'English',
                url: sub.url,
                isDefault: idx === 0,
              }));

              const subResults = await Promise.allSettled(
                mappedSubs.map(async (sub: any) => {
                  try {
                    const ac = new AbortController();
                    const tid = setTimeout(() => ac.abort(), 3000);
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
  }, [id, type, season, episode]);

  // Seamless Hot-Switch of Audio Language (Preserves exact playback time!)
  const handleSelectAudioTrack = (track: UnifiedAudioTrack) => {
    const currentTime =
      playbackTimeRef.current > 0
        ? playbackTimeRef.current
        : (artRef.current?.video?.currentTime || artRef.current?.currentTime || 0);

    setPlaybackTimestamp(currentTime);
    playbackTimeRef.current = currentTime;
    setCurrentStreamUrl(track.url);
    setActiveAudioLabel(track.label);

    // If stream is already loaded with multiple HLS audio tracks, switch track instantly
    if (artRef.current?.hls?.audioTracks && artRef.current.hls.audioTracks.length > 1) {
      if (track.id.includes('en-dub') || track.url.includes('audioTrack=1')) {
        artRef.current.hls.audioTrack = 1;
      } else if (track.language === 'ja' || track.id.includes('ja-4k')) {
        artRef.current.hls.audioTrack = 0;
      }
    }

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
    return unifiedSubtitles.map(s => ({
      url: s.url,
      label: s.label,
      default: s.isDefault,
    }));
  }, [unifiedSubtitles]);

  // Format subtitles for Vidstack Direct HLS Player (iOS Fallback)
  const vidstackSubtitles: VidstackTrack[] = useMemo(() => {
    return unifiedSubtitles.map(s => ({
      src: s.url,
      label: s.label,
      language: s.language || (s.label.toLowerCase().includes('hindi') ? 'hi' : 'en'),
      kind: 'subtitles',
      default: s.isDefault,
      type: 'vtt',
    }));
  }, [unifiedSubtitles]);

  const getAspectRatioStyle = () => {
    switch (aspectRatio) {
      case '4:3': return 'aspect-[4/3] max-h-[88vh]';
      case '21:9': return 'aspect-[21/9]';
      case '16:9': return 'aspect-video';
      default: return 'aspect-[16/12] min-h-[440px] sm:min-h-[560px] md:min-h-[680px] lg:min-h-[760px]';
    }
  };

  const getVideoFlipStyle = () => {
    switch (videoFlip) {
      case 'Flip Horizontal': return 'scale-x-[-1]';
      case 'Flip Vertical': return 'scale-y-[-1]';
      default: return '';
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
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (authCode === '123') {
      sessionStorage.setItem('vip_auth', '123');
      setIsAuthenticated(true);
    } else {
      alert('Invalid VIP code');
    }
  };

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-full max-w-md bg-neutral-900 border border-white/10 rounded-2xl p-8 shadow-2xl">
          <h1 className="text-2xl font-bold mb-2">VIP Access Required</h1>
          <p className="text-neutral-400 mb-6 text-sm">Please enter the VIP code to access premium 4K servers.</p>
          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            <input 
              type="password"
              placeholder="Enter Code..."
              value={authCode}
              onChange={(e) => setAuthCode(e.target.value)}
              className="w-full bg-black border border-white/20 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-400 transition-colors text-center font-mono tracking-widest text-lg"
              autoFocus
            />
            <button 
              type="submit" 
              className="w-full bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-black font-bold py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(251,191,36,0.3)] hover:shadow-[0_0_30px_rgba(251,191,36,0.5)]"
            >
              Unlock Player
            </button>
            <button 
              type="button"
              onClick={() => router.back()}
              className="w-full bg-white/5 hover:bg-white/10 text-neutral-300 py-3 rounded-xl transition-colors mt-2"
            >
              Go Back
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center px-3 sm:px-6 md:px-8 py-10 sm:py-16 relative overflow-x-hidden selection:bg-amber-500 selection:text-black">
      {/* Cinematic Ambient Background Backdrop */}
      {backdropUrl && !isIOSDevice && (
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
      <header className="w-full max-w-[92rem] flex items-center justify-between gap-1.5 sm:gap-3 py-1 sm:py-2 px-1 mb-2 sm:mb-3">
        {/* Left: Back + Title */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <button
            onClick={() => router.push(type === 'tv' ? `/watch/tv/${id}/${season}/${episode}` : `/watch/${id}`)}
            className="p-1.5 sm:p-2 rounded-xl bg-white/[0.07] hover:bg-white/15 border border-white/10 text-neutral-300 hover:text-white transition-all cursor-pointer shadow-sm shrink-0"
            title="Return to Standard Watch Page"
          >
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="px-1.5 sm:px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] sm:text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
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
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>{scanStatusNotice}</span>
            </div>
          )}
        </div>
      </header>

      {/* Cinema Player Frame with Ambient Spill & ArtPlayer */}
      <div className="w-full max-w-[92rem] relative mb-6" style={{ isolation: 'isolate' }}>
        {/* Dynamic Ambient Glow (shades & colors subtly bleeding outside player frame in real time) */}
        {!isIOSDevice && (
          <div
            className={`absolute -inset-3 sm:-inset-5 md:-inset-7 z-0 pointer-events-none transition-opacity duration-500 select-none overflow-visible ${
              isVideoPlaying ? 'opacity-75 sm:opacity-80' : 'opacity-50 sm:opacity-55'
            }`}
          >
            {/* Real-time Video Canvas Mirror */}
            <canvas
              ref={ambientCanvasRef}
              width={48}
              height={27}
              className={`w-full h-full object-cover blur-[32px] sm:blur-[48px] md:blur-[64px] saturate-[160%] brightness-[1.1] transform scale-[1.04] sm:scale-[1.07] transition-all duration-300 ${
                hasLiveGlow ? 'opacity-100' : 'opacity-0'
              }`}
            />

            {/* Fallback Cinema Backdrop Ambient Lighting */}
            <div
              className={`absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-500 ${
                !hasLiveGlow ? 'opacity-100' : 'opacity-25'
              }`}
            >
              {backdropUrl ? (
                <img
                  src={backdropUrl}
                  alt=""
                  className="w-full h-full object-cover blur-[32px] sm:blur-[48px] md:blur-[64px] saturate-[160%] brightness-[1.1] transform scale-[1.04] sm:scale-[1.07]"
                />
              ) : (
                <div className="w-full h-full rounded-2xl md:rounded-3xl bg-gradient-to-tr from-amber-500/20 via-sky-500/20 to-purple-600/20 blur-[40px] sm:blur-[55px] transform scale-[1.04]" />
              )}
            </div>
          </div>
        )}

        {/* Player Container */}
        <div
          ref={containerRef}
          className="w-full relative rounded-2xl md:rounded-3xl overflow-hidden border border-white/10 shadow-[0_25px_70px_rgba(0,0,0,0.95)] bg-black z-10"
        >
          <div className={`w-full ${getAspectRatioStyle()} ${getVideoFlipStyle()} transition-all duration-300 relative`}>
            {fetchingStream ? (
              <div className="w-full aspect-video flex flex-col items-center justify-center bg-black gap-3">
                <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-semibold text-neutral-300">
                  Loading {activeAudioLabel}...
                </p>
              </div>
            ) : currentStreamUrl ? (
              <ArtPlayerComponent
                key={currentStreamUrl}
                url={currentStreamUrl}
                poster={backdropUrl || ''}
                subtitles={artPlayerSubtitles}
                autoPlay={true}
                initialTime={playbackTimestamp}
                audioBoost={audioBoost}
                playbackRate={getNumericPlaySpeed(playSpeed)}
                aspectRatio={aspectRatio}
                videoFlip={videoFlip}
                subtitleOffset={subtitleOffset}
                activeSubtitleUrl={artPlayerSubtitles.find(s => s.label === activeSubtitle)?.url || (activeSubtitle === 'Off' ? '' : undefined)}
                activeSubtitleLabel={activeSubtitle}
                onError={(err) => {
                  console.warn('Playback error on stream:', currentStreamUrl, err);
                  if (artRef.current?.video && (artRef.current.video.currentTime > 0 || artRef.current.video.readyState >= 1)) {
                    return; // Video/audio is actively playing, ignore transient error
                  }
                  const currentIdx = unifiedAudioTracks.findIndex(t => t.url === currentStreamUrl);
                  if (currentIdx !== -1 && currentIdx + 1 < unifiedAudioTracks.length) {
                    const nextTrack = unifiedAudioTracks[currentIdx + 1];
                    setCurrentStreamUrl(nextTrack.url);
                    setActiveAudioLabel(nextTrack.label);
                  }
                }}
                onSettingsClick={() => {
                  setIsQuickMenuOpen(prev => !prev);
                  setActiveSubmenu(null);
                }}
                getInstance={(art) => {
                  artRef.current = art;
                  art.on('video:timeupdate', () => {
                    if (art.video && art.video.currentTime > 0) {
                      playbackTimeRef.current = art.video.currentTime;
                    }
                  });
                }}
                className="w-full h-full"
              />
            ) : embedFallbackUrl ? (
              <iframe
                src={embedFallbackUrl}
                className="w-full aspect-video border-0 bg-black"
                allowFullScreen
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media; screen-wake-lock"
              />
            ) : (
              <div className="w-full aspect-video flex flex-col items-center justify-center bg-neutral-900/90 p-6 text-center gap-3">
                <p className="text-amber-400 font-bold text-base">Stream Offline</p>
                <p className="text-xs text-neutral-400 max-w-md">{errorMessage || 'Stream could not be loaded.'}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-lg transition cursor-pointer mt-2"
                >
                  Reload Stream
                </button>
              </div>
            )}
          </div>

          {/* 🌟 QUICK MENU POPUP — anchored bottom-right inside ArtPlayer's z-axis layer 🌟 */}
          {isQuickMenuOpen && (
            <div className="absolute bottom-16 sm:bottom-20 right-4 sm:right-6 z-[1000000] w-72 sm:w-80 bg-[#0c0c12]/98 border border-white/20 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.95)] backdrop-blur-2xl p-2.5 animate-in fade-in zoom-in-95 duration-150 text-neutral-200 select-none max-h-[80vh] overflow-y-auto scrollbar-thin pointer-events-auto">
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 mb-1">
                <span className="text-xs font-extrabold uppercase tracking-wider text-neutral-400">
                  PLAYER OPTIONS
                </span>
                <button
                  onClick={() => {
                    setIsQuickMenuOpen(false);
                    setActiveSubmenu(null);
                  }}
                  className="text-xs text-neutral-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-white/10 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Submenu: Audio Tracks (Netflix-style unified list) */}
              {activeSubmenu === 'audio' ? (
                <div className="p-2 space-y-1">
                  <button
                    onClick={() => setActiveSubmenu(null)}
                    className="flex items-center gap-1 text-xs text-amber-400 hover:underline mb-2 cursor-pointer font-bold"
                  >
                    ← Back to Options
                  </button>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 px-1 pb-1">
                    Select Audio Language
                  </p>
                  <div className="max-h-64 overflow-y-auto space-y-1 scrollbar-thin">
                    {unifiedAudioTracks.length > 0 ? (
                      unifiedAudioTracks.map(track => {
                        const isSelected = activeAudioLabel === track.label;
                        return (
                          <button
                            key={track.id}
                            onClick={() => handleSelectAudioTrack(track)}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer group ${
                              isSelected
                                ? 'bg-amber-500 text-black font-bold shadow-md'
                                : 'hover:bg-white/10 text-neutral-300 hover:text-white'
                            }`}
                          >
                            <span className="truncate mr-2">{track.label}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                                isSelected ? 'bg-black/20 text-black' : 'bg-white/10 text-neutral-300'
                              }`}>
                                {track.badge}
                              </span>
                              {isSelected && <Check className="w-3.5 h-3.5" />}
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-3 text-center">
                        <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-xs text-neutral-400">Scanning audio languages in background...</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : activeSubmenu === 'subtitles' ? (
                /* Submenu: Subtitles (Unified list) */
                <div className="p-2 space-y-1">
                  <button
                    onClick={() => setActiveSubmenu(null)}
                    className="flex items-center gap-1 text-xs text-amber-400 hover:underline mb-2 cursor-pointer font-bold"
                  >
                    ← Back to Options
                  </button>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 px-1 pb-1">
                    Select Subtitle
                  </p>
                  <div className="max-h-64 overflow-y-auto space-y-1 scrollbar-thin">
                    {/* Off Option */}
                    <button
                      onClick={() => handleSelectSubtitle('Off')}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
                        activeSubtitle === 'Off' ? 'bg-amber-500 text-black font-bold' : 'hover:bg-white/10 text-neutral-300 hover:text-white'
                      }`}
                    >
                      <span>Off</span>
                      {activeSubtitle === 'Off' && <Check className="w-3.5 h-3.5" />}
                    </button>

                    {unifiedSubtitles.map(sub => {
                      const isSelected = activeSubtitle === sub.label;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => handleSelectSubtitle(sub.label)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
                            isSelected ? 'bg-amber-500 text-black font-bold' : 'hover:bg-white/10 text-neutral-300 hover:text-white'
                          }`}
                        >
                          <span className="truncate">{sub.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : activeSubmenu === 'quality' ? (
                /* Submenu: Quality Selection */
                <div className="p-2 space-y-1">
                  <button
                    onClick={() => setActiveSubmenu(null)}
                    className="flex items-center gap-1 text-xs text-amber-400 hover:underline mb-2 cursor-pointer font-bold"
                  >
                    ← Back to Options
                  </button>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 px-1 pb-1">
                    Stream Resolution
                  </p>
                  {['Auto', '4K HDR', '1080P', '720P', '480P'].map(q => {
                    const isSelected = streamQuality === q;
                    return (
                      <button
                        key={q}
                        onClick={() => handleSelectQuality(q)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
                          isSelected ? 'bg-amber-500 text-black font-bold' : 'hover:bg-white/10 text-neutral-300 hover:text-white'
                        }`}
                      >
                        <span>{q === 'Auto' ? 'Auto (Best for network)' : q}</span>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </button>
                    );
                  })}
                </div>
              ) : activeSubmenu === 'speed' ? (
                /* Submenu: Play Speed */
                <div className="p-2 space-y-1">
                  <button
                    onClick={() => setActiveSubmenu(null)}
                    className="flex items-center gap-1 text-xs text-amber-400 hover:underline mb-2 cursor-pointer font-bold"
                  >
                    ← Back to Options
                  </button>
                  {['0.5x', '0.75x', 'Normal', '1.25x', '1.5x', '2x'].map(s => (
                    <button
                      key={s}
                      onClick={() => {
                        setPlaySpeed(s);
                        setActiveSubmenu(null);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
                        playSpeed === s ? 'bg-amber-500 text-black font-bold' : 'hover:bg-white/10 text-neutral-300 hover:text-white'
                      }`}
                    >
                      <span>{s}</span>
                      {playSpeed === s && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              ) : activeSubmenu === 'aspect' ? (
                /* Submenu: Aspect Ratio */
                <div className="p-2 space-y-1">
                  <button
                    onClick={() => setActiveSubmenu(null)}
                    className="flex items-center gap-1 text-xs text-amber-400 hover:underline mb-2 cursor-pointer font-bold"
                  >
                    ← Back to Options
                  </button>
                  {['Default', '16:9', '4:3', '21:9'].map(a => (
                    <button
                      key={a}
                      onClick={() => {
                        setAspectRatio(a);
                        setActiveSubmenu(null);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
                        aspectRatio === a ? 'bg-amber-500 text-black font-bold' : 'hover:bg-white/10 text-neutral-300 hover:text-white'
                      }`}
                    >
                      <span>{a}</span>
                      {aspectRatio === a && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              ) : activeSubmenu === 'flip' ? (
                /* Submenu: Video Flip */
                <div className="p-2 space-y-1">
                  <button
                    onClick={() => setActiveSubmenu(null)}
                    className="flex items-center gap-1 text-xs text-amber-400 hover:underline mb-2 cursor-pointer font-bold"
                  >
                    ← Back to Options
                  </button>
                  {['Normal', 'Flip Horizontal', 'Flip Vertical'].map(f => (
                    <button
                      key={f}
                      onClick={() => {
                        setVideoFlip(f);
                        setActiveSubmenu(null);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
                        videoFlip === f ? 'bg-amber-500 text-black font-bold' : 'hover:bg-white/10 text-neutral-300 hover:text-white'
                      }`}
                    >
                      <span>{f}</span>
                      {videoFlip === f && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              ) : (
                /* Main Quick Menu List (EXACTLY MATCHING USER SCREENSHOT + USER REQUEST) */
                <div className="divide-y divide-white/10 text-xs font-medium">
                  {/* 1. Audio Language Track Selector */}
                  <button
                    onClick={() => setActiveSubmenu('audio')}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/10 transition-colors text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Radio className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-white">Audio</span>
                    </div>
                    <div className="flex items-center gap-1 text-neutral-400 min-w-0">
                      <span className="truncate max-w-[120px] text-amber-300 font-semibold">{activeAudioLabel}</span>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                    </div>
                  </button>

                  {/* 2. Subtitle Selector */}
                  <button
                    onClick={() => setActiveSubmenu('subtitles')}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/10 transition-colors text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Subtitles className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-white">Subtitle</span>
                    </div>
                    <div className="flex items-center gap-1 text-neutral-400">
                      <span className="truncate max-w-[120px]">{activeSubtitle}</span>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                    </div>
                  </button>

                  {/* 3. Quality Selector */}
                  <button
                    onClick={() => setActiveSubmenu('quality')}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/10 transition-colors text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Layers className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-white">Quality</span>
                    </div>
                    <div className="flex items-center gap-1 text-neutral-400">
                      <span className="text-amber-300 font-semibold">{streamQuality}</span>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                    </div>
                  </button>

                  {/* 4. Play Speed */}
                  <button
                    onClick={() => setActiveSubmenu('speed')}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/10 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Play className="w-4 h-4 text-neutral-400" />
                      <span>Play Speed</span>
                    </div>
                    <div className="flex items-center gap-1 text-neutral-400">
                      <span>{playSpeed}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </button>

                  {/* 5. Aspect Ratio */}
                  <button
                    onClick={() => setActiveSubmenu('aspect')}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/10 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Maximize2 className="w-4 h-4 text-neutral-400" />
                      <span>Aspect Ratio</span>
                    </div>
                    <div className="flex items-center gap-1 text-neutral-400">
                      <span>{aspectRatio}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </button>

                  {/* 6. Video Flip */}
                  <button
                    onClick={() => setActiveSubmenu('flip')}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/10 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <RotateCw className="w-4 h-4 text-neutral-400" />
                      <span>Video Flip</span>
                    </div>
                    <div className="flex items-center gap-1 text-neutral-400">
                      <span>{videoFlip}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </button>


                  {/* 7. Subtitle Offset (Interactive Slider with Cyan Accent) */}
                  <div className="px-3 py-2.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Sliders className="w-4 h-4 text-neutral-400" />
                        <span>Subtitle Offset</span>
                      </div>
                      <span className="text-neutral-400 text-[11px] font-mono">{subtitleOffset}s</span>
                    </div>
                    <input
                      type="range"
                      min="-5"
                      max="5"
                      step="0.5"
                      value={subtitleOffset}
                      onChange={e => setSubtitleOffset(parseFloat(e.target.value))}
                      className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#00b4d8]"
                    />
                  </div>

                  {/* 8. Audio Boost (Slider with Cyan Accent) */}
                  <div className="px-3 py-2.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Volume2 className="w-4 h-4 text-neutral-400" />
                        <span>Audio Boost</span>
                      </div>
                      <span className="text-neutral-400 text-[11px] font-mono">{audioBoost}x</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      step="0.25"
                      value={audioBoost}
                      onChange={e => setAudioBoost(parseFloat(e.target.value))}
                      className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#00b4d8]"
                    />
                  </div>

                  {/* 9. Download */}
                  {currentStreamUrl && (
                    <a
                      href={currentStreamUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/10 transition-colors text-left text-neutral-200 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Download className="w-4 h-4 text-neutral-400" />
                        <span>Download</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Series Player / Episode Selector */}
      {type === 'tv' && movie?.seasons && (
        <div className="w-full max-w-[1200px] mx-auto mt-8 px-6 pb-20">
          <h2 className="text-2xl font-bold mb-6 text-white tracking-wide">Episodes</h2>
          
          {/* Season Selector */}
          <div className="flex flex-wrap gap-2 mb-8">
            {movie.seasons
              .filter((s: any) => s.season_number > 0)
              .map((s: any) => {
                const isActive = s.season_number === season;
                return (
                  <button
                    key={s.id}
                    onClick={() => router.push(`/watch/servers/${id}?type=tv&season=${s.season_number}&episode=1`)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                      isActive 
                        ? 'bg-[#00b4d8] text-white shadow-[0_0_15px_rgba(0,180,216,0.4)]' 
                        : 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    Season {s.season_number}
                  </button>
                );
            })}
          </div>

          {/* Episode Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {seasonEpisodes.map((ep: any) => {
              const isCurrent = ep.episode_number === episode;
              return (
                <button
                  key={ep.id}
                  onClick={() => router.push(`/watch/servers/${id}?type=tv&season=${season}&episode=${ep.episode_number}`)}
                  className={`relative overflow-hidden rounded-xl text-left transition-all duration-300 group border ${
                    isCurrent 
                      ? 'border-[#00b4d8] ring-2 ring-[#00b4d8]/30 shadow-[0_0_30px_rgba(0,180,216,0.15)] bg-black/60' 
                      : 'border-white/5 hover:border-white/20 bg-black/40'
                  }`}
                >
                  <div className="aspect-video relative overflow-hidden bg-neutral-900">
                    {ep.still_path ? (
                      <img 
                        src={`https://image.tmdb.org/t/p/w300${ep.still_path}`} 
                        alt={ep.name} 
                        className={`w-full h-full object-cover transition-transform duration-500 ${isCurrent ? 'scale-105' : 'group-hover:scale-105'}`}
                        loading="lazy"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-neutral-600">
                        <MonitorPlay size={32} />
                      </div>
                    )}
                    {/* Play Overlay */}
                    <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md ${isCurrent ? 'bg-[#00b4d8]/90 text-white' : 'bg-white/20 text-white'}`}>
                        {isCurrent ? <Sparkles size={20} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${isCurrent ? 'bg-[#00b4d8]/20 text-[#00b4d8]' : 'bg-white/10 text-neutral-300'}`}>
                        EP {ep.episode_number}
                      </span>
                      <span className="text-xs text-neutral-400 font-medium">
                        {ep.runtime ? `${ep.runtime}m` : ''}
                      </span>
                    </div>
                    <h3 className={`text-sm font-semibold truncate ${isCurrent ? 'text-white' : 'text-neutral-200'}`}>
                      {ep.name}
                    </h3>
                  </div>
                </button>
              );
            })}
          </div>
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
          <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm font-semibold text-neutral-300">Loading VIP Cinema Player...</p>
        </main>
      }
    >
      <DirectPlayerHubContent id={id} />
    </Suspense>
  );
}
