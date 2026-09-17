'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Film, Globe, Sparkles } from 'lucide-react';
import vpStyles from './VideoPlayer.module.css';
import { SERVERS } from '../../utils/servers';
import HlsPlayer from '../HlsPlayer';

interface VideoPlayerProps {
  /** TMDB ID of the movie or TV show */
  tmdbId: string;
  /** Media type */
  type: 'movie' | 'tv';
  /** Season number (required for TV) */
  season?: number;
  /** Episode number (required for TV) */
  episode?: number;
  /** Preferred audio language (e.g. 'eng', 'hindi'). Optional. */
  language?: string;
  // Optional metadata props
  title?: string;
  backdropPath?: string;
  imdbId?: string;
  voteAverage?: number;
  releaseDate?: string;
  backHref?: string;
}

export default function VideoPlayer({
  tmdbId,
  type,
  season,
  episode,
  language,
  imdbId,
  title,
  backdropPath,
  voteAverage,
  releaseDate,
  backHref,
}: VideoPlayerProps) {
  const router = useRouter();
  const [activeServer, setActiveServer] = useState<string>('auto-fast');
  const [autoFallbackNotice, setAutoFallbackNotice] = useState<string | null>(null);
  const [passkeyCode, setPasskeyCode] = useState<string>('');

  const containerRef = useRef<HTMLDivElement>(null);
  const ambientCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [hasLiveGlow, setHasLiveGlow] = useState<boolean>(false);

  const storageKey = `streamnet_server_${tmdbId}`;

  // Restore server choice for this movie from localStorage on refresh/mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedServer = localStorage.getItem(storageKey);
      if (savedServer && SERVERS.some(s => s.id === savedServer && s.enabled !== false)) {
        setActiveServer(savedServer);
      }
    }
  }, [tmdbId, storageKey]);

  const changeServer = (serverId: string) => {
    setActiveServer(serverId);
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, serverId);
    }
  };

  const [selectedLanguage, setSelectedLanguage] = useState<string>(language || 'en');

  const handleSelectHindiLanguage = () => {
    setSelectedLanguage('hi');
    if (activeServer !== 'screenscape') {
      changeServer('screenscape');
      setAutoFallbackNotice('Switched to ScreenScape Hindi Dubbed player.');
    }
  };

  const handleSelectEnglishLanguage = () => {
    setSelectedLanguage('en');
    if (activeServer !== 'auto-fast') {
      changeServer('auto-fast');
      setAutoFallbackNotice(null);
    }
  };

  const currentServerObj = SERVERS.find(s => s.id === activeServer);
  const isDirectMode = currentServerObj?.category === 'omss' || currentServerObj?.category === 'direct' || activeServer === 'auto-fast';

  let embedUrl = '';
  let sandboxAttr: string | undefined = undefined;

  if (!isDirectMode && currentServerObj) {
    embedUrl = currentServerObj.buildUrl({ tmdbId, type, season, episode, imdbId, language: selectedLanguage });
    sandboxAttr = 'allow-scripts allow-same-origin allow-forms allow-presentation';
  }

  // Auto-dismiss notification after 5s
  useEffect(() => {
    if (autoFallbackNotice) {
      const t = setTimeout(() => setAutoFallbackNotice(null), 5000);
      return () => clearTimeout(t);
    }
  }, [autoFallbackNotice]);

  // Handle fullscreen landscape lock & state
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fsElement = document.fullscreenElement;
      setIsFullscreen(Boolean(fsElement));
      const isIOS = typeof window !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Mac") && "ontouchend" in document));
      
      if (fsElement && containerRef.current?.contains(fsElement)) {
        if (!isIOS) {
          try {
            (screen.orientation as any).lock('landscape').catch(() => {});
          } catch {}
        }
      } else {
        if (!isIOS) {
          try {
            screen.orientation.unlock();
          } catch {}
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

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
  }, [activeServer]);

  const handleSelectDirect = () => {
    changeServer('auto-fast');
    setAutoFallbackNotice(null);
  };

  const handleSelectEmbedServer = (serverId: string) => {
    changeServer(serverId);
    setAutoFallbackNotice(null);
  };

  // Auto-fallback if direct stream has invalid duration
  const handleInvalidDuration = (durationSec: number) => {
    console.warn(`Direct stream duration (${durationSec}s) is invalid for ${title}. Auto-switching to ScreenScape embed.`);
    changeServer('screenscape');
    setAutoFallbackNotice(`Direct stream was unavailable. Auto-switched to ScreenScape Embed.`);
  };

  const backdropUrl = backdropPath
    ? (backdropPath.startsWith('http') ? backdropPath : `https://image.tmdb.org/t/p/original${backdropPath}`)
    : null;

  return (
    <div className={`relative w-full flex flex-col items-center gap-3 ${vpStyles.embedPlayerContainer}`}>
      {/* Full-Bleed Ambient Hero Backdrop (matches Hero Page & About Screen) */}
      {backdropUrl && (
        <div className="fixed inset-0 w-full h-full -z-10 overflow-hidden pointer-events-none">
          <img
            src={backdropUrl}
            alt=""
            className="w-full h-full object-cover blur-[90px] opacity-25 scale-110 transform transition-opacity duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/60 via-neutral-950/85 to-neutral-950" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.04),_transparent_75%)]" />
        </div>
      )}

      {/* Sleek Minimal Responsive Header Bar */}
      <div className="w-full max-w-6xl flex items-center justify-between gap-1.5 sm:gap-3 px-1 py-1">
        {/* Left: Badge & Title */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg bg-white/[0.1] text-white font-black text-[10px] sm:text-xs md:text-sm tracking-wider uppercase border border-white/15 shadow-sm shrink-0">
            {type === 'tv' ? `S${season} E${episode}` : 'Movie'}
          </span>
          <h1 className="text-xs sm:text-base md:text-xl lg:text-2xl font-black text-white tracking-tight truncate drop-shadow-md">
            {title || (type === 'tv' ? `Episode S${season} E${episode}` : 'Movie Stream')}
          </h1>
        </div>

        {/* Right: Audio Language Switcher (English / Hindi) */}
        <div className="flex items-center gap-0.5 sm:gap-1 bg-white/[0.06] p-0.5 sm:p-1 rounded-full border border-white/10 backdrop-blur-xl shrink-0 shadow-lg">
          <button
            onClick={handleSelectEnglishLanguage}
            className={`px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs md:text-sm font-bold transition-all cursor-pointer ${
              selectedLanguage === 'en'
                ? 'bg-white text-black shadow-[0_2px_10px_rgba(255,255,255,0.25)]'
                : 'text-neutral-400 hover:text-white'
            }`}
            title="English / Default Audio"
          >
            English
          </button>
          <button
            onClick={handleSelectHindiLanguage}
            className={`px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs md:text-sm font-bold transition-all cursor-pointer ${
              selectedLanguage === 'hi'
                ? 'bg-amber-500 text-black shadow-[0_2px_12px_rgba(245,158,11,0.5)]'
                : 'text-amber-300/80 hover:text-amber-300'
            }`}
            title="Hindi Dubbed Audio"
          >
            Hindi
          </button>
        </div>
      </div>

      {/* Auto-Fallback Subtle Toast */}
      {autoFallbackNotice && (
        <div className="w-full max-w-6xl flex items-center justify-between gap-3 px-3.5 py-2 bg-neutral-900/80 border border-emerald-500/30 rounded-xl text-neutral-200 text-xs font-medium backdrop-blur-xl shadow-lg animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{autoFallbackNotice}</span>
          </div>
          <button
            onClick={() => setAutoFallbackNotice(null)}
            className="p-1 hover:bg-white/10 text-neutral-400 hover:text-white rounded-md transition cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Video Container Frame with Refined Ambient Cinema Glow (All 3 Players) */}
      <div className="w-full max-w-6xl relative" style={{ isolation: 'isolate' }}>
        {/* Dynamic Ambient Glow (lessened & elegant, shades subtly bleeding outside player frame) */}
        {!isFullscreen && (
          <div
            className={`absolute -inset-3 sm:-inset-5 md:-inset-7 z-0 pointer-events-none transition-opacity duration-500 select-none overflow-visible ${
              isDirectMode
                ? isVideoPlaying
                  ? 'opacity-70 sm:opacity-75'
                  : 'opacity-45 sm:opacity-50'
                : 'opacity-60 sm:opacity-65'
            }`}
          >
            {/* Direct 4K Server: Real-time Video Canvas Mirror */}
            {isDirectMode && (
              <canvas
                ref={ambientCanvasRef}
                width={48}
                height={27}
                className={`w-full h-full object-cover blur-[32px] sm:blur-[48px] md:blur-[64px] saturate-[160%] brightness-[1.1] transform scale-[1.04] sm:scale-[1.07] transition-all duration-300 ${
                  hasLiveGlow ? 'opacity-100' : 'opacity-0'
                }`}
              />
            )}

            {/* ScreenScape, Rive, and Direct Base Layer: Cinema Backdrop Ambient Lighting */}
            <div
              className={`absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-500 ${
                !isDirectMode || !hasLiveGlow ? 'opacity-100' : 'opacity-25'
              } ${!isDirectMode ? vpStyles.ambientEmbedGlow : ''}`}
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

        {/* Video Container (Cinema OLED Floating Frame) */}
        <div
          ref={containerRef}
          className="w-full relative rounded-2xl md:rounded-3xl overflow-hidden border border-white/10 shadow-[0_25px_70px_rgba(0,0,0,0.85)] bg-black z-10"
        >
          {isDirectMode ? (
            <div className="w-full aspect-video">
              <HlsPlayer
                key={activeServer}
                serverId={activeServer}
                tmdbId={tmdbId}
                type={type}
                season={season}
                episode={episode}
                imdbId={imdbId}
                title={title}
                preferredLanguage={selectedLanguage}
                className="w-full h-full border-0"
                onNextServer={() => changeServer('screenscape')}
                onInvalidDuration={handleInvalidDuration}
              />
            </div>
          ) : (
            <iframe
              src={embedUrl}
              allowFullScreen
              {...({ webkitallowfullscreen: "true", mozallowfullscreen: "true" } as any)}
              {...(sandboxAttr ? { sandbox: sandboxAttr } : {})}
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer"
              className={`w-full aspect-video border-0 ${vpStyles.embedIframe}`}
              title="Video Player"
            />
          )}
        </div>
      </div>

      {/* Sleek Responsive Floating Server Capsule */}
      <div className="relative z-30 flex items-center justify-center w-full max-w-6xl pt-2 pb-4 px-1">
        <div className="inline-flex items-center gap-0.5 sm:gap-1.5 p-1 sm:p-1.5 bg-[#121218]/80 hover:bg-[#121218]/95 border border-white/15 hover:border-white/25 rounded-full backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.2)] transition-all duration-300 max-w-full overflow-x-auto scrollbar-none">
          <span className="hidden xs:inline-block text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest text-neutral-400 pl-2 sm:pl-3 pr-1 select-none shrink-0">
            Server
          </span>
          <div className="hidden xs:block w-px h-3.5 bg-white/15 mx-0.5 shrink-0" />

          {/* Direct Stream */}
          <button
            onClick={handleSelectDirect}
            className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all duration-200 cursor-pointer shrink-0 ${
              isDirectMode
                ? 'bg-white text-neutral-950 shadow-[0_2px_12px_rgba(255,255,255,0.3)] scale-[1.02]'
                : 'text-neutral-400 hover:text-white hover:bg-white/[0.08]'
            }`}
            title="Direct Stream 4K"
          >
            <Zap className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isDirectMode ? 'text-amber-500 fill-amber-500' : 'text-neutral-400'}`} strokeWidth={2.5} />
            <span>Direct</span>
            <span className={`text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0.2 rounded font-black tracking-wider uppercase ${
              isDirectMode ? 'bg-neutral-950/10 text-neutral-900' : 'bg-white/10 text-neutral-400'
            }`}>
              4K
            </span>
          </button>

          {/* ScreenScape */}
          <button
            onClick={() => handleSelectEmbedServer('screenscape')}
            className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all duration-200 cursor-pointer shrink-0 ${
              activeServer === 'screenscape'
                ? 'bg-white text-neutral-950 shadow-[0_2px_12px_rgba(255,255,255,0.3)] scale-[1.02]'
                : 'text-neutral-400 hover:text-white hover:bg-white/[0.08]'
            }`}
            title="ScreenScape Server"
          >
            <Film className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${activeServer === 'screenscape' ? 'text-neutral-950' : 'text-neutral-400'}`} strokeWidth={2.2} />
            <span>ScreenScape</span>
          </button>

          {/* RiveStream */}
          <button
            onClick={() => handleSelectEmbedServer('rivestream')}
            className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all duration-200 cursor-pointer shrink-0 ${
              activeServer === 'rivestream'
                ? 'bg-white text-neutral-950 shadow-[0_2px_12px_rgba(255,255,255,0.3)] scale-[1.02]'
                : 'text-neutral-400 hover:text-white hover:bg-white/[0.08]'
            }`}
            title="Rive Server"
          >
            <Globe className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${activeServer === 'rivestream' ? 'text-neutral-950' : 'text-neutral-400'}`} strokeWidth={2.2} />
            <span>Rive</span>
          </button>

          {/* Secret 123 Passkey Enter Field to Unlock VIP Multi-Server Hub */}
          <div className="w-px h-3.5 bg-white/15 mx-0.5 shrink-0" />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (passkeyCode.trim() === '123') {
                const targetUrl = type === 'tv'
                  ? `/watch/servers/${tmdbId}?type=tv&season=${season || 1}&episode=${episode || 1}`
                  : `/watch/servers/${tmdbId}`;
                router.push(targetUrl);
              }
            }}
            className="flex items-center gap-1 pl-0.5 pr-1 shrink-0"
          >
            <input
              type="text"
              placeholder="123"
              value={passkeyCode}
              onChange={(e) => {
                const val = e.target.value;
                setPasskeyCode(val);
                if (val.trim() === '123') {
                  const targetUrl = type === 'tv'
                    ? `/watch/servers/${tmdbId}?type=tv&season=${season || 1}&episode=${episode || 1}`
                    : `/watch/servers/${tmdbId}`;
                  router.push(targetUrl);
                }
              }}
              className="w-11 sm:w-16 px-1.5 sm:px-2 py-0.5 sm:py-1 text-center bg-white/[0.06] hover:bg-white/[0.1] focus:bg-amber-500/20 border border-white/15 focus:border-amber-400 rounded-full text-[11px] sm:text-xs font-mono font-bold text-amber-300 placeholder:text-neutral-500 focus:outline-none transition-all cursor-text shadow-inner"
              title="Enter 123 to open the VIP Server Hub"
            />
          </form>
        </div>
      </div>
    </div>
  );
}
