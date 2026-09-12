'use client';

import React, { useEffect, useRef, useState } from 'react';
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
  // Optional props that page components may pass
  title?: string;
  backdropPath?: string;
  imdbId?: string;
}

export default function VideoPlayer({ tmdbId, type, season, episode, language, imdbId, title, backdropPath }: VideoPlayerProps) {
  const [activeServer, setActiveServer] = useState<string>('auto-fast');
  const [showOptions, setShowOptions] = useState<boolean>(false);
  const [showEmbedDropdown, setShowEmbedDropdown] = useState<boolean>(false);
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(false);
  const [autoFallbackNotice, setAutoFallbackNotice] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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
      setAutoFallbackNotice('Loaded ScreenScape Hindi Dubbed player.');
    }
  };

  const handleSelectEnglishLanguage = () => {
    setSelectedLanguage('en');
    if (activeServer !== 'auto-fast') {
      changeServer('auto-fast');
      setAutoFallbackNotice(null);
    }
  };

  // Enabled iframe servers: ScreenScape at top, VidKing second
  const enabledEmbedServers = SERVERS.filter(s => s.category === 'iframe' && s.enabled !== false);

  const currentServerObj = SERVERS.find(s => s.id === activeServer);
  const isDirectMode = currentServerObj?.category === 'omss' || currentServerObj?.category === 'direct' || activeServer === 'auto-fast';

  let embedUrl = '';
  let sandboxAttr: string | undefined = undefined;

  if (!isDirectMode && currentServerObj) {
    embedUrl = currentServerObj.buildUrl({ tmdbId, type, season, episode, imdbId, language: selectedLanguage });
    if (activeServer === 'screenscape') {
      sandboxAttr = 'allow-scripts allow-same-origin allow-forms';
    }
  }

  // Handle outside clicks to close popups
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowOptions(false);
        setShowEmbedDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const fsElement = document.fullscreenElement;
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

  const handleSelectDirect = () => {
    changeServer('auto-fast');
    setShowEmbedDropdown(false);
    setShowOptions(false);
    setAutoFallbackNotice(null);
  };

  const handleSelectEmbedServer = (serverId: string) => {
    changeServer(serverId);
    setShowEmbedDropdown(false);
    setShowOptions(false);
    setAutoFallbackNotice(null);
  };

  // Auto-fallback if direct stream has fake/invalid duration (<60s)
  const handleInvalidDuration = (durationSec: number) => {
    console.warn(`Direct stream duration (${durationSec}s) is invalid for ${title}. Auto-switching to ScreenScape embed.`);
    changeServer('screenscape');
    setAutoFallbackNotice(`Direct stream was invalid (${Math.round(durationSec)}s). Auto-switched to ScreenScape Embed.`);
  };

  const backdropUrl = backdropPath
    ? (backdropPath.startsWith('http') ? backdropPath : `https://image.tmdb.org/t/p/w1280${backdropPath}`)
    : null;

  return (
    <div className={`relative w-full flex flex-col items-center gap-4 ${vpStyles.embedPlayerContainer}`}>
      {/* Ambient Partial Hero Backdrop */}
      {backdropUrl && (
        <div className="absolute -top-12 inset-x-0 h-96 -z-10 overflow-hidden opacity-30 pointer-events-none rounded-3xl">
          <img
            src={backdropUrl}
            alt=""
            className="w-full h-full object-cover blur-2xl scale-110 transform transition-opacity duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--background)]/80 to-[var(--background)]" />
        </div>
      )}

      {/* Header Info & Audio Language Selection Bar */}
      <div className="w-full max-w-6xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-white/10 text-white text-[11px] font-bold tracking-wider uppercase border border-white/15">
              {type === 'tv' ? `TV • S${season} E${episode}` : 'Movie'}
            </span>
            <span className="text-xs text-neutral-400 font-medium">Now Playing</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight drop-shadow-md">
            {title || (type === 'tv' ? `Episode Stream (S${season} E${episode})` : 'Movie Stream')}
          </h1>
        </div>

        {/* Audio Language Switcher Bar */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-900/90 border border-white/15 rounded-2xl backdrop-blur-xl shadow-xl">
          <span className="text-xs text-neutral-400 font-bold uppercase tracking-wider mr-1 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
            <span>Audio:</span>
          </span>

          <button
            onClick={handleSelectEnglishLanguage}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
              selectedLanguage === 'en'
                ? 'bg-white text-black shadow-md'
                : 'bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10'
            }`}
          >
            <span>English / Default</span>
          </button>

          <button
            onClick={handleSelectHindiLanguage}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
              selectedLanguage === 'hi'
                ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.6)]'
                : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}
          >
            <span>🇮🇳</span>
            <span>Hindi Dubbed</span>
          </button>
        </div>
      </div>

      {/* Auto-Fallback Toast Notice */}
      {autoFallbackNotice && (
        <div className="w-full max-w-6xl flex items-center justify-between gap-3 px-4 py-2.5 bg-neutral-900/90 border border-white/20 rounded-xl text-neutral-200 text-xs font-semibold backdrop-blur-md shadow-xl animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{autoFallbackNotice}</span>
          </div>
          <button
            onClick={() => setAutoFallbackNotice(null)}
            className="p-1 hover:bg-white/10 text-neutral-400 hover:text-white rounded-lg transition cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Dismissable Notice Banner Above Player */}
      {!bannerDismissed && !autoFallbackNotice && (
        <div className="w-full max-w-6xl flex items-center justify-between gap-3 px-4 py-2.5 bg-neutral-900/80 border border-white/15 rounded-xl text-neutral-300 text-xs font-medium backdrop-blur-md shadow-lg transition-all animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-neutral-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>If direct server does not work, switch to embed.</span>
          </div>
          <button
            onClick={() => setBannerDismissed(true)}
            className="p-1 hover:bg-white/10 text-neutral-400 hover:text-white rounded-lg transition cursor-pointer"
            aria-label="Dismiss notice"
            title="Dismiss notice"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Video Container */}
      <div ref={containerRef} className="w-full max-w-6xl relative flex flex-col items-center rounded-xl overflow-hidden shadow-2xl">
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
            allow="autoplay; fullscreen; picture-in-picture"
            className={`w-full aspect-video border-0 ${vpStyles.embedIframe}`}
            title="Video Player"
          />
        )}
      </div>

      {/* Glassmorphism Server Selection Controls BELOW Player */}
      <div className="relative z-30 flex flex-col items-center w-full max-w-6xl pb-4" ref={menuRef}>
        {/* Single Main Server Trigger Button */}
        <button
          onClick={() => {
            setShowOptions(!showOptions);
            setShowEmbedDropdown(false);
          }}
          className="group relative inline-flex items-center gap-3 px-6 py-3 bg-neutral-900/90 hover:bg-neutral-800/90 border border-white/15 hover:border-white/30 rounded-2xl shadow-xl backdrop-blur-xl transition-all duration-300 cursor-pointer"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          <span className="text-sm font-semibold text-neutral-200 group-hover:text-white transition">
            Server Mode: <strong className="text-white font-extrabold ml-1">{isDirectMode ? 'Direct Stream' : currentServerObj?.name || 'Embed'}</strong>
          </span>
          <svg
            className={`w-4 h-4 text-neutral-400 group-hover:text-white transition-transform duration-300 ${showOptions ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Revealed Mode Options (Direct / Embed) */}
        {showOptions && (
          <div className="mt-3 flex flex-col items-center gap-3 p-3 bg-neutral-950/95 border border-white/15 rounded-2xl shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2">
              {/* Direct Button: Immediately switches to Direct HLS, closes dropdown */}
              <button
                onClick={handleSelectDirect}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs tracking-wide uppercase transition-all duration-200 cursor-pointer ${
                  isDirectMode
                    ? 'bg-white text-black shadow-md'
                    : 'bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Direct</span>
              </button>

              {/* Embed Button: Reveals dropdown to select embed servers */}
              <button
                onClick={() => {
                  setShowEmbedDropdown(!showEmbedDropdown);
                  if (isDirectMode) {
                    changeServer('screenscape'); // Default to top embed server (ScreenScape)
                  }
                }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs tracking-wide uppercase transition-all duration-200 cursor-pointer ${
                  !isDirectMode
                    ? 'bg-white text-black shadow-md'
                    : 'bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                <span>Embed</span>
                <svg
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${showEmbedDropdown ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Sleek Glassmorphism Dropdown for Embed Servers */}
            {showEmbedDropdown && (
              <div className="w-full min-w-[200px] flex flex-col gap-1 p-1.5 bg-neutral-900/95 border border-white/15 rounded-xl shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400 border-b border-white/10">
                  Select Embed Server
                </div>
                {enabledEmbedServers.map(server => (
                  <button
                    key={server.id}
                    onClick={() => handleSelectEmbedServer(server.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                      activeServer === server.id
                        ? 'bg-white/15 text-white border border-white/20'
                        : 'text-neutral-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span>{server.name}</span>
                    {activeServer === server.id && (
                      <svg className="w-3.5 h-3.5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
