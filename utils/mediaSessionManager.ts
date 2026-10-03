/**
 * Media Session & Dynamic Island / Widget Cache Manager
 * 
 * Prevents video playback from polluting OS Now Playing widgets, Lock Screen widgets,
 * and Apple Dynamic Island (especially during fullscreen), and ensures all media metadata
 * and stream caches are purged when the app is closed or tab is hidden.
 */

export function clearMediaSession(): void {
  if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = 'none';
    
    const actions: MediaSessionAction[] = [
      'play',
      'pause',
      'seekbackward',
      'seekforward',
      'previoustrack',
      'nexttrack',
      'stop',
      'seekto',
      'skipad' as any,
    ];
    
    actions.forEach((action) => {
      try {
        navigator.mediaSession.setActionHandler(action, null);
      } catch (_) {}
    });
  } catch (_) {}
}

export function suppressMediaSession(): void {
  if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
  try {
    clearMediaSession();

    // Prevent player libraries (Vidstack, ArtPlayer, HTML5 Video) from populating
    // navigator.mediaSession.metadata which activates Dynamic Island and OS widgets
    const defineSuppression = (target: any) => {
      if (!target) return;
      try {
        Object.defineProperty(target, 'metadata', {
          get: () => null,
          set: (_val: any) => {
            // Intentionally suppress setting media metadata to prevent Dynamic Island
            // and widget caching of title/artwork
          },
          configurable: true,
          enumerable: true,
        });
      } catch (_) {}
    };

    if (typeof (window as any).MediaSession !== 'undefined' && (window as any).MediaSession.prototype) {
      defineSuppression((window as any).MediaSession.prototype);
    }
    defineSuppression(navigator.mediaSession);
  } catch (_) {}
}

let isInitialized = false;

export function initMediaSessionCleanup(): () => void {
  if (typeof window === 'undefined') return () => {};
  if (isInitialized) return () => {};
  isInitialized = true;

  suppressMediaSession();

  const handleCleanup = () => {
    clearMediaSession();
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      handleCleanup();
    }
  };

  const handleFullscreenChange = () => {
    // Re-enforce suppression when toggling fullscreen
    suppressMediaSession();
    clearMediaSession();
  };

  window.addEventListener('pagehide', handleCleanup);
  window.addEventListener('beforeunload', handleCleanup);
  window.addEventListener('unload', handleCleanup);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

  return () => {
    window.removeEventListener('pagehide', handleCleanup);
    window.removeEventListener('beforeunload', handleCleanup);
    window.removeEventListener('unload', handleCleanup);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    isInitialized = false;
  };
}
