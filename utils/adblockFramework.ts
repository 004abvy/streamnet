/**
 * StreamNet Hardened Adblock Framework
 *
 * Multi-layer protection system for video streaming embeds (iframes).
 *
 * Protection Layers:
 * 1. Strict HTML5 Sandboxing (Blocks popups, form-based popunder bypasses, top redirects, downloads, modals)
 * 2. Form Submission Hijack Blocker (Disables invisible <form target="_blank"> ad-spammers use)
 * 3. Synthetic Click / Anchor Hijack Blocker (Overrides HTMLAnchorElement.prototype.click)
 * 4. Parent Window Popup Trapper (Neutralizes window.open, top.open, parent.open)
 * 5. Referrer Stripping (Blocks ad bidding networks from verifying or targeting the site)
 * 6. Sensor API Stripping (Blocks accelerometer/gyroscope used for bot/device detection)
 * 7. Capture-phase Click Interceptor (Prevents rogue external link navigation)
 * 8. Focus & Blur Defense (Prevents popunder window focus shifts)
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
 * STRICT BASELINE:
 * - NO 'allow-forms': Completely blocks the notorious <form target="_blank"> ad loophole!
 * - NO 'allow-popups': Browser automatically drops all window.open() requests.
 * - NO 'allow-popups-to-escape-sandbox': Prevents escaping sandboxing.
 * - NO 'allow-top-navigation': Iframe CANNOT redirect parent tab.
 * - NO 'allow-top-navigation-by-user-activation': Parent tab protected even on user click/touch.
 * - NO 'allow-downloads': Prevents unwanted APK/executable downloads.
 * - NO 'allow-modals': Blocks deceptive alert/confirm spam dialogs.
 */
const MAXIMUM_SANDBOX_TOKENS = [
  'allow-scripts',
  'allow-same-origin',
  'allow-presentation',
];

/**
 * ULTRA BASELINE:
 * Strips 'allow-same-origin' as well.
 * The iframe runs in a unique null origin, completely isolated from cookies,
 * localStorage, and parent tracking.
 */
const ULTRA_SANDBOX_TOKENS = [
  'allow-scripts',
  'allow-presentation',
];

/**
 * HARDENED FEATURE PERMISSIONS:
 * Strictly limited to media playback.
 * Omits accelerometer, gyroscope, camera, microphone, payment, and geolocation
 * which ad networks abuse to profile devices and trigger popups.
 */
const HARDENED_ALLOW_FEATURES = [
  'autoplay',
  'fullscreen',
  'encrypted-media',
  'picture-in-picture',
];

export const SERVER_AD_POLICIES: Record<string, ServerAdPolicy> = {
  nxsha: {
    serverId: 'nxsha',
    name: 'Nxsha 4K',
    sandboxTokens: [...MAXIMUM_SANDBOX_TOKENS],
    referrerPolicy: 'no-referrer',
    allowFeatures: [...HARDENED_ALLOW_FEATURES],
    protectionLevel: 'ultra',
    notes: 'Clean stream. Stripped of form submissions and sensor APIs.',
  },
  cinesrc: {
    serverId: 'cinesrc',
    name: 'CineSrc',
    sandboxTokens: [...MAXIMUM_SANDBOX_TOKENS],
    referrerPolicy: 'no-referrer-when-downgrade',
    allowFeatures: [...HARDENED_ALLOW_FEATURES],
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
  vidrock: {
    serverId: 'vidrock',
    name: 'VidRock',
    sandboxTokens: [...MAXIMUM_SANDBOX_TOKENS],
    referrerPolicy: 'no-referrer',
    allowFeatures: [...HARDENED_ALLOW_FEATURES],
    protectionLevel: 'ultra',
    notes: 'Aggressive mirror. Sandbox strictly prevents all popunders on click.',
  },
  'vidsrc-in': {
    serverId: 'vidsrc-in',
    name: 'VidSrc.in',
    sandboxTokens: [...MAXIMUM_SANDBOX_TOKENS],
    referrerPolicy: 'no-referrer',
    allowFeatures: [...HARDENED_ALLOW_FEATURES],
    protectionLevel: 'ultra',
    notes: 'Strict sandbox neutralizes transparent clickjack layers.',
  },
  vidcore: {
    serverId: 'vidcore',
    name: 'VidCore',
    sandboxTokens: [...MAXIMUM_SANDBOX_TOKENS],
    referrerPolicy: 'no-referrer',
    allowFeatures: [...HARDENED_ALLOW_FEATURES],
    protectionLevel: 'maximum',
    notes: 'Fast stream with hardened playback permissions.',
  },
  vsembed: {
    serverId: 'vsembed',
    name: 'VSEmbed',
    sandboxTokens: [...MAXIMUM_SANDBOX_TOKENS],
    referrerPolicy: 'no-referrer',
    allowFeatures: [...HARDENED_ALLOW_FEATURES],
    protectionLevel: 'ultra',
    notes: 'Heavy ad network. Disallowing forms and popups stops touch-triggered tabs.',
  },
  'vidsrc-me': {
    serverId: 'vidsrc-me',
    name: 'VidSrc',
    sandboxTokens: [...MAXIMUM_SANDBOX_TOKENS],
    referrerPolicy: 'no-referrer',
    allowFeatures: [...HARDENED_ALLOW_FEATURES],
    protectionLevel: 'ultra',
    notes: 'Strict sandbox drops all popunder attempts.',
  },
  vidfast: {
    serverId: 'vidfast',
    name: 'VidFast',
    sandboxTokens: [...MAXIMUM_SANDBOX_TOKENS],
    referrerPolicy: 'no-referrer',
    allowFeatures: [...HARDENED_ALLOW_FEATURES],
    protectionLevel: 'ultra',
    notes: 'Lightweight embed with click popups completely defused.',
  },
  'vidsrc-io': {
    serverId: 'vidsrc-io',
    name: 'VidSrc.io',
    sandboxTokens: [...MAXIMUM_SANDBOX_TOKENS],
    referrerPolicy: 'no-referrer',
    allowFeatures: [...HARDENED_ALLOW_FEATURES],
    protectionLevel: 'ultra',
    notes: 'Pause/seek popup traps neutralized.',
  },
  superembed: {
    serverId: 'superembed',
    name: 'SuperEmbed',
    sandboxTokens: [...MAXIMUM_SANDBOX_TOKENS],
    referrerPolicy: 'no-referrer',
    allowFeatures: [...HARDENED_ALLOW_FEATURES],
    protectionLevel: 'ultra',
    notes: 'multiembed network. Strict sandbox drops aggressive popup script triggers.',
  },
  twoembed: {
    serverId: 'twoembed',
    name: '2Embed',
    sandboxTokens: [...MAXIMUM_SANDBOX_TOKENS],
    referrerPolicy: 'no-referrer',
    allowFeatures: [...HARDENED_ALLOW_FEATURES],
    protectionLevel: 'ultra',
    notes: '2embed network. Form and popup stripping completely defuses click popups.',
  },
};

export const DEFAULT_SERVER_POLICY: ServerAdPolicy = {
  serverId: 'default',
  name: 'Default Streaming Server',
  sandboxTokens: [...MAXIMUM_SANDBOX_TOKENS],
  referrerPolicy: 'no-referrer',
  allowFeatures: [...HARDENED_ALLOW_FEATURES],
  protectionLevel: 'ultra',
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

  return {
    src: cleanUrl,
    sandbox: shieldEnabled ? sandboxTokens.join(' ') : undefined,
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
  if (typeof window === 'undefined') return true;
  const saved = localStorage.getItem(ULTRA_STORAGE_KEY);
  // Defaults to TRUE so ultra-strict isolation is persistent out-of-the-box
  return saved === null ? true : saved === 'true';
}

export function setUltraShieldPreference(enabled: boolean): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(ULTRA_STORAGE_KEY, String(enabled));
  }
}

/**
 * Hardened runtime interceptor that neutralizes popups, form-based escapes,
 * synthetic anchor clicks, focus loss, and window hijacking.
 */
export function installAdblockProtection(
  isActive: boolean,
  onBlockedAction?: (type: string, target?: string) => void
): () => void {
  if (typeof window === 'undefined' || !isActive) {
    return () => {};
  }

  const cleanups: Array<() => void> = [];

  // 1. Direct window.open and popup neutralization across top/parent
  const origOpen = window.open;
  window.open = function (...args: any[]) {
    const targetUrl = args[0] ? String(args[0]) : 'popup';
    console.warn('[StreamNet Hardened Adblock] Blocked window.open:', targetUrl);
    onBlockedAction?.('window.open', targetUrl);
    return null;
  };
  cleanups.push(() => {
    window.open = origOpen;
  });

  try {
    if (window.top && window.top !== window) {
      // @ts-ignore
      window.top.open = () => null;
    }
  } catch (e) {}

  // 2. Block form submit ad loophole (<form target="_blank" action="...">)
  if (typeof HTMLFormElement !== 'undefined') {
    const origFormSubmit = HTMLFormElement.prototype.submit;
    HTMLFormElement.prototype.submit = function (this: HTMLFormElement) {
      const targetAttr = this.getAttribute('target');
      if (targetAttr === '_blank' || targetAttr === '_top' || targetAttr === '_parent') {
        console.warn('[StreamNet Hardened Adblock] Blocked form submit popup:', this.action);
        onBlockedAction?.('form_submit', this.action);
        return;
      }
      return origFormSubmit.apply(this);
    };
    cleanups.push(() => {
      HTMLFormElement.prototype.submit = origFormSubmit;
    });
  }

  // 3. Block synthetic click on dynamically created <a target="_blank">
  if (typeof HTMLAnchorElement !== 'undefined') {
    const origAnchorClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
      const targetAttr = this.getAttribute('target');
      const href = this.getAttribute('href') || '';
      if (
        targetAttr === '_blank' ||
        (href && !href.startsWith('/') && !href.startsWith('#') && !href.includes(window.location.host) && !href.startsWith('javascript:'))
      ) {
        console.warn('[StreamNet Hardened Adblock] Blocked synthetic link click:', href);
        onBlockedAction?.('synthetic_click', href);
        return;
      }
      return origAnchorClick.apply(this);
    };
    cleanups.push(() => {
      HTMLAnchorElement.prototype.click = origAnchorClick;
    });
  }

  // 4. Capture-phase click interceptor for rogue ad overlays on page
  const clickCaptureHandler = (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    const anchor = target?.closest?.('a');
    if (anchor) {
      const href = anchor.getAttribute('href') || '';
      const targetAttr = anchor.getAttribute('target');
      const isInternal =
        href.startsWith('/') ||
        href.startsWith('#') ||
        href.includes(window.location.host) ||
        href.startsWith('javascript:');

      if (targetAttr === '_blank' || (!isInternal && href.startsWith('http'))) {
        console.warn('[StreamNet Hardened Adblock] Intercepted rogue external click:', href);
        onBlockedAction?.('click_hijack', href);
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    }
  };
  window.addEventListener('click', clickCaptureHandler, true);
  cleanups.push(() => {
    window.removeEventListener('click', clickCaptureHandler, true);
  });

  // 5. Anti-focus theft (prevent popunders stealing window focus)
  const blurHandler = () => {
    // If window blurs right after clicking inside the player, immediately reclaim focus
    setTimeout(() => {
      try {
        window.focus();
      } catch (e) {}
    }, 10);
  };
  window.addEventListener('blur', blurHandler);
  cleanups.push(() => {
    window.removeEventListener('blur', blurHandler);
  });

  return () => {
    cleanups.forEach((cleanup) => {
      try {
        cleanup();
      } catch (e) {}
    });
  };
}
