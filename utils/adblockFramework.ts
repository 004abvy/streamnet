/**
 * StreamNet Intelligent Adblock Framework
 *
 * Provides granular, server-specific ad and popup blocking.
 *
 * Differentiates and defuses popups using:
 * 1. Z-Axis Overlay Defusal (shoves rogue in-page popups, banners, and modals behind on Z-axis: z-index: -99999)
 * 2. Window Size & Dimensions Inspection (width=, height=, top=, left=)
 * 3. Stripped Browser Chrome (menubar=no, toolbar=no, status=no, popup=yes)
 * 4. Blank Popunders (about:blank triggers)
 * 5. External Targets vs Internal App Navigation
 * 6. Iframe Sandboxing (omits allow-popups and allow-top-navigation, keeping allow-scripts & allow-same-origin)
 */

export type ShieldLevel = 'ultra' | 'maximum' | 'standard';

export interface ServerAdPolicy {
  serverId: string;
  name: string;
  sandboxTokens: string[];
  referrerPolicy: 'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'strict-origin-when-cross-origin';
  allowFeatures: string[];
  cleanUrl?: (url: string) => string;
  protectionLevel: ShieldLevel;
  notes?: string;
}

/**
 * Standard stream-safe sandbox baseline:
 * - 'allow-scripts': Runs player JS.
 * - 'allow-same-origin': Required for HLS blobs, decryptors, and CDN requests.
 * - 'allow-forms': Required for Cloudflare Turnstile verification.
 * - 'allow-presentation': Fullscreen and AirPlay.
 * 
 * STRICTLY OMITTED (The Popups & Redirects):
 * - NO 'allow-popups': Browser drops all window.open() popup attempts.
 * - NO 'allow-popups-to-escape-sandbox': Cannot escape sandboxing.
 * - NO 'allow-top-navigation': Cannot hijack or redirect StreamNet away.
 * - NO 'allow-top-navigation-by-user-activation': Cannot redirect on tap/click.
 */
const MAXIMUM_SANDBOX_TOKENS = [
  'allow-scripts',
  'allow-same-origin',
  'allow-forms',
  'allow-presentation',
];

const ULTRA_SANDBOX_TOKENS = [
  'allow-scripts',
  'allow-presentation',
];

const STANDARD_ALLOW_FEATURES = [
  'autoplay',
  'fullscreen',
  'encrypted-media',
  'picture-in-picture',
  'accelerometer',
  'gyroscope',
];

export const SERVER_AD_POLICIES: Record<string, ServerAdPolicy> = {
  vidlink: {
    serverId: 'vidlink',
    name: 'VidLink Ultra',
    sandboxTokens: [...MAXIMUM_SANDBOX_TOKENS],
    referrerPolicy: 'no-referrer-when-downgrade',
    allowFeatures: [...STANDARD_ALLOW_FEATURES],
    protectionLevel: 'maximum',
    notes: 'Premium VIP player. Zero popups, multi-language audio and subtitles.',
  },
  cinesrc: {
    serverId: 'cinesrc',
    name: 'CineSrc 4K',
    sandboxTokens: [...MAXIMUM_SANDBOX_TOKENS],
    referrerPolicy: 'no-referrer-when-downgrade',
    allowFeatures: [...STANDARD_ALLOW_FEATURES],
    protectionLevel: 'maximum',
    cleanUrl: (url: string) => {
      if (!url.includes('autoskip=')) {
        const sep = url.includes('?') ? '&' : '?';
        return `${url}${sep}autoskip=true`;
      }
      return url;
    },
    notes: 'Premium embed. Sandboxed with auto-next and ad-skip parameters.',
  },
  nxsha: {
    serverId: 'nxsha',
    name: 'Nxsha Cinema',
    sandboxTokens: [...MAXIMUM_SANDBOX_TOKENS],
    referrerPolicy: 'no-referrer-when-downgrade',
    allowFeatures: [...STANDARD_ALLOW_FEATURES],
    protectionLevel: 'maximum',
    notes: 'Clean stream. Sandboxed against popups while preserving CDN streams.',
  },
  vidrock: {
    serverId: 'vidrock',
    name: 'VidRock 4K',
    sandboxTokens: [...MAXIMUM_SANDBOX_TOKENS],
    referrerPolicy: 'no-referrer-when-downgrade',
    allowFeatures: [...STANDARD_ALLOW_FEATURES],
    protectionLevel: 'maximum',
    notes: 'Fast stream. Sandboxed against popups on click.',
  },
  'vidsrc-me': {
    serverId: 'vidsrc-me',
    name: 'VidSrc Global',
    sandboxTokens: [...MAXIMUM_SANDBOX_TOKENS],
    referrerPolicy: 'no-referrer-when-downgrade',
    allowFeatures: [...STANDARD_ALLOW_FEATURES],
    protectionLevel: 'maximum',
    notes: 'Strict sandbox drops all popunder attempts.',
  },
  'vidsrc-in': {
    serverId: 'vidsrc-in',
    name: 'VidSrc India',
    sandboxTokens: [...MAXIMUM_SANDBOX_TOKENS],
    referrerPolicy: 'no-referrer-when-downgrade',
    allowFeatures: [...STANDARD_ALLOW_FEATURES],
    protectionLevel: 'maximum',
    notes: 'Sandbox neutralizes popups while allowing video stream buffers.',
  },
  vidcore: {
    serverId: 'vidcore',
    name: 'VidCore Direct',
    sandboxTokens: [...MAXIMUM_SANDBOX_TOKENS],
    referrerPolicy: 'no-referrer-when-downgrade',
    allowFeatures: [...STANDARD_ALLOW_FEATURES],
    protectionLevel: 'maximum',
    notes: 'Fast stream with hardened playback permissions.',
  },
  vidfast: {
    serverId: 'vidfast',
    name: 'VidFast Backup',
    sandboxTokens: [...MAXIMUM_SANDBOX_TOKENS],
    referrerPolicy: 'no-referrer-when-downgrade',
    allowFeatures: [...STANDARD_ALLOW_FEATURES],
    protectionLevel: 'maximum',
    notes: 'Lightweight embed with click popups defused.',
  },
  'vidsrc-io': {
    serverId: 'vidsrc-io',
    name: 'VidSrc.io Backup',
    sandboxTokens: [...MAXIMUM_SANDBOX_TOKENS],
    referrerPolicy: 'no-referrer-when-downgrade',
    allowFeatures: [...STANDARD_ALLOW_FEATURES],
    protectionLevel: 'maximum',
    notes: 'Pause/seek popup traps neutralized.',
  },
};

export const DEFAULT_SERVER_POLICY: ServerAdPolicy = {
  serverId: 'default',
  name: 'Default Streaming Server',
  sandboxTokens: [...MAXIMUM_SANDBOX_TOKENS],
  referrerPolicy: 'no-referrer-when-downgrade',
  allowFeatures: [...STANDARD_ALLOW_FEATURES],
  protectionLevel: 'maximum',
};

export function getServerAdPolicy(serverId: string): ServerAdPolicy {
  return SERVER_AD_POLICIES[serverId] || DEFAULT_SERVER_POLICY;
}

export function resolveServerIframeAttributes(
  serverId: string,
  rawUrl: string,
  shieldEnabled: boolean = true,
  ultraMode: boolean = false
) {
  const policy = getServerAdPolicy(serverId);
  const cleanUrl = policy.cleanUrl ? policy.cleanUrl(rawUrl) : rawUrl;

  let sandboxTokens = policy.sandboxTokens;
  if (ultraMode) {
    sandboxTokens = ULTRA_SANDBOX_TOKENS;
  }

  // Guarantee sandbox is ALWAYS present to block popups
  return {
    src: cleanUrl,
    sandbox: shieldEnabled ? sandboxTokens.join(' ') : MAXIMUM_SANDBOX_TOKENS.join(' '),
    referrerPolicy: policy.referrerPolicy,
    allow: policy.allowFeatures.join('; '),
    protectionLevel: ultraMode ? ('ultra' as ShieldLevel) : policy.protectionLevel,
    policy,
  };
}

const STORAGE_KEY = 'streamnet_ad_shield_active';
const ULTRA_STORAGE_KEY = 'streamnet_ad_shield_ultra';

export function getAdShieldPreference(): boolean {
  if (typeof window === 'undefined') return true;
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === null ? true : saved === 'true';
}

export function setAdShieldPreference(enabled: boolean): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  }
}

export function getUltraShieldPreference(): boolean {
  if (typeof window === 'undefined') return false;
  const saved = localStorage.getItem(ULTRA_STORAGE_KEY);
  return saved === 'true';
}

export function setUltraShieldPreference(enabled: boolean): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(ULTRA_STORAGE_KEY, String(enabled));
  }
}

/**
 * Intelligent runtime popup interceptor.
 * - Differentiates popups using size, dimensions, features, and target inspection.
 * - Employs a Z-Axis Defuser (MutationObserver) to instantly push rogue in-page popups/banners behind everything.
 */
export function installAdblockProtection(
  isActive: boolean,
  onBlockedAction?: (type: string, target?: string) => void
): () => void {
  if (typeof window === 'undefined' || !isActive) {
    return () => {};
  }

  const cleanups: Array<() => void> = [];

  // 1. Differentiate window.open calls using size, features, and URL
  const origOpen = window.open;
  window.open = function (...args: any[]) {
    const url = args[0] ? String(args[0]) : '';
    const target = args[1] ? String(args[1]) : '';
    const features = args[2] ? String(args[2]) : '';

    // Differentiate: detect popup sizing, coordinates, and stripped window features
    const hasPopupDimensions = /width\s*=\s*\d+|height\s*=\s*\d+|left\s*=\s*-?\d+|top\s*=\s*-?\d+/i.test(features);
    const hasStrippedUI = /menubar\s*=\s*(0|no)|toolbar\s*=\s*(0|no)|status\s*=\s*(0|no)|popup\s*=\s*(1|yes)/i.test(features);
    const isBlank = !url || url === 'about:blank';
    const isExternal = url.startsWith('http') && !url.includes(window.location.host);

    if (hasPopupDimensions || hasStrippedUI || isBlank || (target === '_blank' && isExternal)) {
      console.warn('[StreamNet Popup Shield] Neutralized popup by signature:', { url: url || 'about:blank', features, target });
      onBlockedAction?.('popup_blocked', url || 'about:blank');
      return null;
    }

    return origOpen.apply(window, args as any);
  };
  cleanups.push(() => {
    window.open = origOpen;
  });

  // 2. Block synthetic clicks on external target="_blank" anchors
  if (typeof HTMLAnchorElement !== 'undefined') {
    const origAnchorClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
      const targetAttr = this.getAttribute('target');
      const href = this.getAttribute('href') || '';
      const isExternal = href.startsWith('http') && !href.includes(window.location.host);
      if (targetAttr === '_blank' && isExternal) {
        console.warn('[StreamNet Popup Shield] Blocked external anchor popup:', href);
        onBlockedAction?.('synthetic_click', href);
        return;
      }
      return origAnchorClick.apply(this);
    };
    cleanups.push(() => {
      HTMLAnchorElement.prototype.click = origAnchorClick;
    });
  }

  // 3. Block form submit popups (<form target="_blank" action="...">)
  if (typeof HTMLFormElement !== 'undefined') {
    const origFormSubmit = HTMLFormElement.prototype.submit;
    HTMLFormElement.prototype.submit = function (this: HTMLFormElement) {
      const targetAttr = this.getAttribute('target');
      const action = this.getAttribute('action') || '';
      const isExternal = action.startsWith('http') && !action.includes(window.location.host);
      if ((targetAttr === '_blank' || targetAttr === '_top') && isExternal) {
        console.warn('[StreamNet Popup Shield] Blocked form popup submit:', action);
        onBlockedAction?.('form_submit', action);
        return;
      }
      return origFormSubmit.apply(this);
    };
    cleanups.push(() => {
      HTMLFormElement.prototype.submit = origFormSubmit;
    });
  }

  // 4. Block scam notification permission popups
  if (typeof window !== 'undefined' && 'Notification' in window) {
    const origNotification = window.Notification.requestPermission;
    window.Notification.requestPermission = () => {
      console.warn('[StreamNet Shield] Suppressed rogue notification request');
      onBlockedAction?.('notification_suppressed');
      return Promise.resolve('denied' as NotificationPermission);
    };
    cleanups.push(() => {
      window.Notification.requestPermission = origNotification;
    });
  }

  // 5. Intercept transparent click-jacking overlays
  if (typeof window !== 'undefined') {
    const handleClickCapture = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (
        target.closest('[class*="VideoPlayer"]') ||
        target.closest('[class*="Navbar"]') ||
        target.closest('[class*="Selector"]') ||
        target.closest('button') ||
        target.closest('a')
      ) {
        return;
      }
      try {
        const style = window.getComputedStyle(target);
        if (
          (style.position === 'fixed' || style.position === 'absolute') &&
          parseInt(style.zIndex, 10) > 100
        ) {
          const isTransparent =
            style.opacity === '0' ||
            style.backgroundColor === 'transparent' ||
            style.backgroundColor === 'rgba(0, 0, 0, 0)';
          if (isTransparent) {
            e.stopPropagation();
            e.preventDefault();
            target.style.setProperty('display', 'none', 'important');
            target.style.setProperty('pointer-events', 'none', 'important');
            try {
              target.remove();
            } catch (err) {}
            console.warn('[StreamNet Shield] Neutralized clickjack overlay');
            onBlockedAction?.('clickjack_neutralized');
          }
        }
      } catch (err) {}
    };

    window.addEventListener('click', handleClickCapture, true);
    cleanups.push(() => {
      window.removeEventListener('click', handleClickCapture, true);
    });
  }

  // 6. Z-Axis Defuser: Intercept and force rogue in-page popups/overlays to z-index: -99999
  if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
    const defuseElement = (node: Node) => {
      if (!(node instanceof HTMLElement)) return;

      // Never touch legitimate StreamNet components
      if (
        node.closest('[class*="VideoPlayer"]') ||
        node.closest('[class*="Navbar"]') ||
        node.closest('[class*="SeasonEpisodeSelector"]') ||
        node.closest('[class*="DetailsTabs"]') ||
        node.closest('#__next') ||
        node.tagName === 'NEXT-ROUTE-ANNOUNCER'
      ) {
        return;
      }

      const id = (node.id || '').toLowerCase();
      const cls = (node.className && typeof node.className === 'string' ? node.className : '').toLowerCase();
      const tag = node.tagName.toLowerCase();

      // Detect ad popups, popunders, overlays, interstitials
      const isAdKeyword =
        id.includes('ad-') || id.includes('popup') || id.includes('popunder') || id.includes('banner') ||
        cls.includes('ad-') || cls.includes('popup') || cls.includes('popunder') || cls.includes('banner') || cls.includes('floating-ad') ||
        tag === 'dialog';

      // 7. Automatic iFrame Ad Blocker: Restrict or eliminate rogue iframes
      if (tag === 'iframe') {
        const iframe = node as HTMLIFrameElement;
        if (!iframe.closest('[class*="VideoPlayer"]')) {
          // Third-party ad iframe injected outside our player
          iframe.style.setProperty('z-index', '-99999', 'important');
          iframe.style.setProperty('pointer-events', 'none', 'important');
          iframe.style.setProperty('display', 'none', 'important');
          try {
            iframe.remove();
          } catch (e) {}
          onBlockedAction?.('rogue_iframe_blocked', iframe.src || 'unknown');
          return;
        } else if (!iframe.hasAttribute('sandbox')) {
          iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-presentation');
          onBlockedAction?.('iframe_sandboxed', iframe.src || 'player');
        }
      }

      let isSuspiciousZ = false;
      try {
        const style = window.getComputedStyle(node);
        const zIndex = parseInt(style.zIndex, 10);
        const isFloating = style.position === 'fixed' || style.position === 'absolute';
        isSuspiciousZ = isFloating && zIndex > 999;
      } catch (e) {}

      if (isAdKeyword || isSuspiciousZ) {
        console.warn('[StreamNet Z-Axis Defuser] Pushed in-page popup behind on Z-axis:', node);
        node.style.setProperty('z-index', '-99999', 'important');
        node.style.setProperty('pointer-events', 'none', 'important');
        node.style.setProperty('opacity', '0', 'important');
        node.style.setProperty('display', 'none', 'important');
        node.style.setProperty('visibility', 'hidden', 'important');
        try {
          node.remove();
        } catch (e) {}
        onBlockedAction?.('z_axis_defused', tag);
      }
    };

    // Initial sweep of existing DOM elements & iframes (native iFrame Ad Blocker)
    try {
      const allSuspicious = document.querySelectorAll('[class*="popup"], [id*="popup"], [class*="popunder"], [id*="popunder"], [class*="ad-"]');
      allSuspicious.forEach((el) => defuseElement(el));

      const allIframes = document.querySelectorAll('iframe');
      allIframes.forEach((iframe) => {
        if (!iframe.closest('[class*="VideoPlayer"]')) {
          iframe.remove();
        } else if (!iframe.hasAttribute('sandbox')) {
          iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-presentation');
        }
      });
    } catch (e) {}

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        m.addedNodes.forEach((node) => defuseElement(node));
      });
    });

    const targetContainer = document.body || document.documentElement;
    if (targetContainer) {
      observer.observe(targetContainer, { childList: true, subtree: true });
      cleanups.push(() => {
        observer.disconnect();
      });
    }
  }

  return () => {
    cleanups.forEach((cleanup) => {
      try {
        cleanup();
      } catch (e) {}
    });
  };
}
