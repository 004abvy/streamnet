'use client';

import { useEffect } from 'react';

export default function ScrollToTopOnRefresh() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    const resetScroll = () => {
      window.scrollTo(0, 0);
      if (document.body) document.body.scrollTop = 0;
      if (document.documentElement) document.documentElement.scrollTop = 0;
    };

    resetScroll();

    // Fire resetScroll at multiple intervals during load to override browser scroll restoration
    const timers = [
      setTimeout(resetScroll, 0),
      setTimeout(resetScroll, 50),
      setTimeout(resetScroll, 150),
      setTimeout(resetScroll, 300),
      setTimeout(resetScroll, 500),
      setTimeout(resetScroll, 1000),
    ];

    const handleBeforeUnload = () => {
      resetScroll();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
    window.addEventListener('load', resetScroll);

    return () => {
      timers.forEach((t) => clearTimeout(t));
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      window.removeEventListener('load', resetScroll);
    };
  }, []);

  return null;
}
