// MoviePlayer using ScreenScape embed with sandbox to block ads
// Auto-rotates to landscape on fullscreen (mobile)
'use client';

import React, { useEffect, useRef, useState } from 'react';
import vpStyles from './VideoPlayer/VideoPlayer.module.css';
import { SERVERS } from '../utils/servers';
import HlsPlayer from './HlsPlayer';

interface MoviePlayerProps {
  /** TMDB ID of the movie */
  movieId: string;
  /** Preferred audio language (e.g. 'eng', 'hindi'). Optional. */
  language?: string;
  title?: string;
}

function buildEmbedUrl(movieId: string, language?: string): string {
  let url = `https://screenscape.me/embed?tmdb=${movieId}&type=movie`;
  if (language) {
    url += `&lan=${language}`;
  }
  return url;
}

export default function MoviePlayer({ movieId, language, title }: MoviePlayerProps) {
  const [activeServer, setActiveServer] = useState<string>('auto-fast');
  const containerRef = useRef<HTMLDivElement>(null);

  let embedUrl = buildEmbedUrl(movieId, language);
  let sandboxAttr: string | undefined = "allow-scripts allow-same-origin allow-forms";

  if (activeServer !== 'screenscape') {
    const server = SERVERS.find(s => s.id === activeServer);
    if (server) {
      embedUrl = server.buildUrl({ tmdbId: movieId, type: 'movie' });
      sandboxAttr = undefined; // Remove strict sandbox for other servers
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      const fsElement = document.fullscreenElement;
      const isIOS = typeof window !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Mac") && "ontouchend" in document));

      if (fsElement && containerRef.current?.contains(fsElement)) {
        // Entering fullscreen — lock to landscape (only on non-iOS)
        if (!isIOS) {
          try {
            (screen.orientation as any).lock('landscape').catch(() => {});
          } catch {
            // screen.orientation.lock not available
          }
        }
      } else {
        // Exiting fullscreen — unlock orientation
        if (!isIOS) {
          try {
            screen.orientation.unlock();
          } catch {
            // Silently fail
          }
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <div className={`w-full flex flex-col items-center gap-4 ${vpStyles.embedPlayerContainer}`}>
      <div ref={containerRef} className="w-full relative flex flex-col items-center">
        {['direct', 'omss'].includes(SERVERS.find(s => s.id === activeServer)?.category || '') ? (
          <HlsPlayer 
            serverId={activeServer} 
            tmdbId={movieId} 
            title={title}
            type="movie" 
            className="w-full max-w-6xl aspect-video rounded-xl overflow-hidden shadow-2xl border-0" 
            onNextServer={() => setActiveServer('screenscape')}
            onInvalidDuration={() => setActiveServer('screenscape')}
          />
        ) : (
          <iframe
            src={embedUrl}
            allowFullScreen
            {...({ webkitallowfullscreen: "true", mozallowfullscreen: "true" } as any)}
            {...(sandboxAttr ? { sandbox: sandboxAttr } : {})}
            allow="autoplay; fullscreen; picture-in-picture"
            className={`w-full max-w-6xl aspect-video rounded-xl overflow-hidden shadow-2xl border-0 ${vpStyles.embedIframe}`}
            title="Movie Player"
          />
        )}
      </div>

      {/* Server Selection UI */}
      <div className="flex gap-4 w-full max-w-6xl justify-center flex-wrap pb-4">
        <select 
          className="bg-zinc-800 text-gray-100 p-2.5 px-4 rounded-xl border border-zinc-700 outline-none hover:bg-zinc-700 transition font-medium text-sm shadow-md cursor-pointer"
          value={['direct', 'omss'].includes(SERVERS.find(s => s.id === activeServer)?.category || '') ? activeServer : ''}
          onChange={(e) => { if (e.target.value) setActiveServer(e.target.value) }}
        >
          <option value="" disabled>Direct & Embed Options</option>
          {SERVERS.filter(s => s.category === 'direct' || s.category === 'omss').map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <select 
          className="bg-zinc-800 text-gray-100 p-2.5 px-4 rounded-xl border border-zinc-700 outline-none hover:bg-zinc-700 transition font-medium text-sm shadow-md cursor-pointer"
          value={activeServer === 'screenscape' || SERVERS.find(s => s.id === activeServer)?.category === 'iframe' ? activeServer : ''}
          onChange={(e) => { if (e.target.value) setActiveServer(e.target.value) }}
        >
          <option value="" disabled>Iframe Servers</option>
          <option value="screenscape">ScreenScape</option>
          {SERVERS.filter(s => s.category === 'iframe').map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
