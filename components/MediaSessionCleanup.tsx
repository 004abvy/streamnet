'use client';

import { useEffect } from 'react';
import { initMediaSessionCleanup, clearMediaSession, suppressMediaSession } from '../utils/mediaSessionManager';

export default function MediaSessionCleanup() {
  useEffect(() => {
    // Suppress MediaSession immediately on client mount
    suppressMediaSession();
    clearMediaSession();

    // Register full lifecycle cleanup listeners (pagehide, beforeunload, visibilitychange, fullscreen)
    const cleanup = initMediaSessionCleanup();

    return () => {
      clearMediaSession();
      cleanup();
    };
  }, []);

  return null;
}
