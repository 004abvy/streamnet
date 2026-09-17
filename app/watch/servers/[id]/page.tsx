'use client';

import React, { use, useEffect, useState, useMemo, useRef } from 'react';
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

export default function DirectPlayerHubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  const type = (searchParams.get('type') as 'movie' | 'tv') || 'movie';
  const season = searchParams.get('season') ? parseInt(searchParams.get('season')!) : 1;
  const episode = searchParams.get('episode') ? parseInt(searchParams.get('episode')!) : 1;

  const [movie, setMovie] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Pre-scanned Unified Netflix Data (Discovered in background across all direct streams)
  const [unifiedAudioTracks, setUnifiedAudioTracks] = useState<UnifiedAudioTrack[]>([]);
  const [unifiedSubtitles, setUnifiedSubtitles] = useState<UnifiedSubtitle[]>([]);
  const [isBackgroundScanning, setIsBackgroundScanning] = useState<boolean>(true);
  const [scanStatusNotice, setScanStatusNotice] = useState<string | null>('Scanning audio & subtitles in background...');

  // Current Active Playback State
  const [currentStreamUrl, setCurrentStreamUrl] = useState<string | null>(null);
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

  // Submenu states in Quick Menu: 'audio' | 'subtitles' | 'quality' | 'speed' | 'aspect' | 'flip' | null
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);

  const artRef = useRef<any>(null);
  const playbackTimeRef = useRef<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const ambientCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);
  const [hasLiveGlow, setHasLiveGlow] = useState<boolean>(false);

  // Real-time Canvas Ambilight Render Loop (Live video color projection outside player)
  useEffect(() => {
    let animFrameId: number;
    let lastDrawTime = 0;
    const FPS = 24; // 24 FPS for real-time video color bleed
    const frameInterval = 1000 / FPS;

    const drawFrame = () => {
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
            // Tainted canvas fallback
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
  }, [id, type]);

  // 🚀 Netflix-Style Background Aggregator: Scans all direct scrapers in background
  useEffect(() => {
    if (!id) return;
    setIsBackgroundScanning(true);
    setScanStatusNotice('Scanning all audio languages & subtitles...');

    const aggregateUrl = `/api/direct-aggregate?id=${id}&type=${type}${type === 'tv' ? `&season=${season}&episode=${episode}` : ''}`;

    fetch(aggregateUrl)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data && data.success) {
          if (data.audioLanguages && data.audioLanguages.length > 0) {
            setUnifiedAudioTracks(data.audioLanguages);

            // If we haven't started playing, start the default stream (Hindi preferred if available)
            if (!currentStreamUrl) {
              const defaultAudio = data.audioLanguages.find((a: any) => a.language === 'hi') || data.audioLanguages[0];
              setCurrentStreamUrl(defaultAudio.url);
              setActiveAudioLabel(defaultAudio.label);
              setFetchingStream(false);
            }
          }

          if (data.subtitles && data.subtitles.length > 0) {
            setUnifiedSubtitles(data.subtitles);
            const defaultSub = data.subtitles.find((s: any) => s.isDefault) || data.subtitles[0];
            if (defaultSub && (!activeSubtitle || activeSubtitle === 'English')) {
              setActiveSubtitle(defaultSub.label);
            }
          }

          setIsBackgroundScanning(false);
          setScanStatusNotice('All audio & subtitles ready');
          setTimeout(() => setScanStatusNotice(null), 3500);
        } else {
          // Fallback if aggregation returned no results
          fallbackDirectFetch();
        }
      })
      .catch(() => {
        fallbackDirectFetch();
      });

    const fallbackDirectFetch = async () => {
      try {
        const res = await fetch(`/api/rive-provider?provider=borealis&id=${id}${type === 'tv' ? `&season=${season}&episode=${episode}` : ''}`);
        const data = await res.json();
        if (data && data.data && data.data.sources && data.data.sources.length > 0) {
          const hindiSource = data.data.sources.find((s: any) => (s.quality || '').toLowerCase().includes('hindi')) || data.data.sources[0];
          setCurrentStreamUrl(hindiSource.url);
          setActiveAudioLabel((hindiSource.quality || '').toLowerCase().includes('hindi') ? 'Hindi [Original / Dub]' : 'English [Original]');
          setFetchingStream(false);
          setIsBackgroundScanning(false);
          setScanStatusNotice(null);
          return;
        }
        throw new Error('Stream source offline.');
      } catch (err: any) {
        setErrorMessage(err.message || 'Stream source offline.');
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

  const getAspectRatioStyle = () => {
    switch (aspectRatio) {
      case '4:3': return 'aspect-[4/3] max-h-[75vh]';
      case '21:9': return 'aspect-[21/9]';
      default: return 'aspect-video';
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

  return (
    <main className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center px-3 sm:px-6 md:px-8 py-10 sm:py-16 relative overflow-x-hidden selection:bg-amber-500 selection:text-black">
      {/* Cinematic Ambient Background Backdrop */}
      {backdropUrl && (
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
      <header className="w-full max-w-6xl flex items-center justify-between gap-1.5 sm:gap-3 py-1 sm:py-2 px-1 mb-2 sm:mb-3">
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
      <div className="w-full max-w-6xl relative mb-6" style={{ isolation: 'isolate' }}>
        {/* Dynamic Ambient Glow (shades & colors subtly bleeding outside player frame in real time) */}
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
              >
                {/* 🌟 QUICK MENU POPUP — anchored bottom-right inside ArtPlayer container so it displays in FULLSCREEN & normal mode 🌟 */}
                {isQuickMenuOpen && (
                  <div className="absolute bottom-14 right-3 z-50 w-72 sm:w-80 bg-[#0c0c12]/98 border border-white/20 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.95)] backdrop-blur-2xl p-2.5 animate-in fade-in zoom-in-95 duration-150 text-neutral-200 select-none">
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
        </ArtPlayerComponent>
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
        </div>
      </div>
    </main>
  );
}
