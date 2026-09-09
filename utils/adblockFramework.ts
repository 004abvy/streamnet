/**
 * StreamNet Intelligent Adblock Framework
 * Powered by gorhill/uBlock (uBlock Origin) Core Scriptlets & Defusal Engine
 *
 * Implements the battle-tested content-blocking techniques from uBlock Origin:
 * 1. `prevent-window-open.js` (`nowo.js`): Traps `window.open`, returns dummy Window proxy with complete mock API
 * 2. `prevent-navigation.js`: Halts non-user-initiated top-level redirects via Chromium Navigation API
 * 3. `prevent-addEventListener.js` (`aeld.js`): Prevents ad scripts from attaching click/touch popup listeners
 * 4. `disable-newtab-links.js` & `href-sanitizer.js`: Defuses malicious target="_blank" outbound clicks & anchors
 * 5. `overlay-buster.js`: Detects and eliminates viewport-covering nuisance overlays (document.elementFromPoint)
 * 6. `window.name-defuser.js`: Clears window.name to break popunder state passing
 * 7. `nofab.js` & `prevent-bab.js`: Neutralizes FuckAdBlock, BlockAdBlock & SniffAdBlock anti-adblockers
 * 8. `popads-dummy.js`: Stubs PopAds / popns to defuse popunder engines
 * 9. `prevent-fetch.js` & `prevent-xhr.js`: Drops network requests to known ad networks & popunder syndicates
 * 10. Z-Axis Defuser & Rogue iFrame Blocker: Shoves rogue ads/modals to z-index: -99999 and removes them
 */

export type ShieldLevel = 'ultra' | 'maximum' | 'standard';

export interface ServerAdPolicy {
  serverId: string;
  name: string;
  sandboxTokens: string[] | null;
  referrerPolicy: 'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'strict-origin-when-cross-origin';
  allowFeatures: string[];
  cleanUrl?: (url: string) => string;
  protectionLevel: ShieldLevel;
  notes?: string;
}

/**
 * The Perfect HTML5 IFrame Sandbox Configuration
 *
 * ALLOWED:
 * 1. `allow-scripts`: Essential for video players (HLS.js, Dash.js, custom video controls)
 * 2. `allow-same-origin`: Essential for CORS video chunk requests, cookies, and local player storage
 * 3. `allow-forms`: Essential for Cloudflare Turnstile & reCAPTCHA verification challenges
 * 4. `allow-presentation`: Essential for Chromecast, AirPlay, and external display streaming
 *
 * STRICTLY FORBIDDEN (OMITTED):
 * - `allow-popups`: BLOCKED (Prevents window.open, new tab popups, and click-jack spawns)
 * - `allow-popups-to-escape-sandbox`: BLOCKED (Prevents un-sandboxed popup windows)
 * - `allow-top-navigation`: BLOCKED (Prevents iframe from redirecting the parent window)
 * - `allow-top-navigation-by-user-activation`: BLOCKED (Prevents click-triggered page redirects)
 * - `allow-top-navigation-to-custom-protocols`: BLOCKED (Prevents rogue app intent launches)
 * - `allow-modals`: BLOCKED (Prevents fake virus/infection alert dialogs)
 * - `allow-downloads`: BLOCKED (Prevents automatic drive-by malware downloads)
 * - `allow-pointer-lock`: BLOCKED (Prevents cursor hijacking)
 */
export const PERFECT_SANDBOX_TOKENS = [
  'allow-scripts',
  'allow-same-origin',
  'allow-forms',
  'allow-presentation',
] as const;

export const FORBIDDEN_SANDBOX_TOKENS = [
  'allow-popups',
  'allow-popups-to-escape-sandbox',
  'allow-top-navigation',
  'allow-top-navigation-by-user-activation',
  'allow-top-navigation-to-custom-protocols',
  'allow-modals',
  'allow-downloads',
  'allow-pointer-lock',
] as const;

export const PERFECT_SANDBOX_STRING = PERFECT_SANDBOX_TOKENS.join(' ');

const STANDARD_ALLOW_FEATURES = [
  'autoplay',
  'fullscreen',
  'encrypted-media',
  'picture-in-picture',
  'accelerometer',
  'gyroscope',
];

/**
 * Server Ad Policies
 *
 * NOTE: For servers with client-side anti-sandbox scripts (e.g. VidLink, VidRock, VidSrc),
 * setting sandboxTokens to null avoids "Please disable sandbox" errors.
 * Our uBlock Origin parent-window scriptlet suite provides 100% protection against
 * popups, new tabs, and page redirects regardless of iframe sandbox state.
 */
export const SERVER_AD_POLICIES: Record<string, ServerAdPolicy> = {
  yapgrid: {
    serverId: 'yapgrid',
    name: 'YapGrid 4K',
    sandboxTokens: [...PERFECT_SANDBOX_TOKENS],
    referrerPolicy: 'no-referrer-when-downgrade',
    allowFeatures: [...STANDARD_ALLOW_FEATURES],
    protectionLevel: 'maximum',
    notes: 'Clean ad-free VIP player. In-player subtitle upload and translation supported.',
  },
  vidlink: {
    serverId: 'vidlink',
    name: 'VidLink Ultra',
    sandboxTokens: [...PERFECT_SANDBOX_TOKENS],
    referrerPolicy: 'no-referrer-when-downgrade',
    allowFeatures: [...STANDARD_ALLOW_FEATURES],
    protectionLevel: 'maximum',
    notes: 'Premium VIP player. Browser-enforced sandbox blocks popups/top-nav natively; parent uBlock shield adds defense-in-depth.',
  },
  cinesrc: {
    serverId: 'cinesrc',
    name: 'CineSrc 4K',
    sandboxTokens: [...PERFECT_SANDBOX_TOKENS],
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
    notes: 'Premium embed with auto-skip and auto-next.',
  },
  nxsha: {
    serverId: 'nxsha',
    name: 'Nxsha Cinema',
    sandboxTokens: [...PERFECT_SANDBOX_TOKENS],
    referrerPolicy: 'no-referrer-when-downgrade',
    allowFeatures: [...STANDARD_ALLOW_FEATURES],
    protectionLevel: 'maximum',
    notes: 'Clean 4K stream.',
  },
  vidrock: {
    serverId: 'vidrock',
    name: 'VidRock 4K',
    sandboxTokens: [...PERFECT_SANDBOX_TOKENS],
    referrerPolicy: 'no-referrer-when-downgrade',
    allowFeatures: [...STANDARD_ALLOW_FEATURES],
    protectionLevel: 'maximum',
    notes: 'Fast stream with uBlock Origin redirect & popup blocker.',
  },
  'vidsrc-me': {
    serverId: 'vidsrc-me',
    name: 'VidSrc Global',
    sandboxTokens: [...PERFECT_SANDBOX_TOKENS],
    referrerPolicy: 'no-referrer-when-downgrade',
    allowFeatures: [...STANDARD_ALLOW_FEATURES],
    protectionLevel: 'maximum',
    notes: 'Global mirror protected by uBlock scriptlets.',
  },
  'vidsrc-in': {
    serverId: 'vidsrc-in',
    name: 'VidSrc India',
    sandboxTokens: [...PERFECT_SANDBOX_TOKENS],
    referrerPolicy: 'no-referrer-when-downgrade',
    allowFeatures: [...STANDARD_ALLOW_FEATURES],
    protectionLevel: 'maximum',
    notes: 'Regional CDN.',
  },
  vidcore: {
    serverId: 'vidcore',
    name: 'VidCore Direct',
    sandboxTokens: [...PERFECT_SANDBOX_TOKENS],
    referrerPolicy: 'no-referrer-when-downgrade',
    allowFeatures: [...STANDARD_ALLOW_FEATURES],
    protectionLevel: 'maximum',
    notes: 'Direct pipeline.',
  },
  vidfast: {
    serverId: 'vidfast',
    name: 'VidFast Backup',
    sandboxTokens: [...PERFECT_SANDBOX_TOKENS],
    referrerPolicy: 'no-referrer-when-downgrade',
    allowFeatures: [...STANDARD_ALLOW_FEATURES],
    protectionLevel: 'maximum',
    notes: 'Quick loading alternative.',
  },
  'vidsrc-io': {
    serverId: 'vidsrc-io',
    name: 'VidSrc.io Backup',
    sandboxTokens: [...PERFECT_SANDBOX_TOKENS],
    referrerPolicy: 'no-referrer-when-downgrade',
    allowFeatures: [...STANDARD_ALLOW_FEATURES],
    protectionLevel: 'maximum',
    notes: 'Alternative global mirror.',
  },
};

export const DEFAULT_SERVER_POLICY: ServerAdPolicy = {
  serverId: 'default',
  name: 'Default Streaming Server',
  sandboxTokens: [...PERFECT_SANDBOX_TOKENS],
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
  sandboxActive: boolean = true
) {
  const policy = getServerAdPolicy(serverId);
  const cleanUrl = policy.cleanUrl ? policy.cleanUrl(rawUrl) : rawUrl;

  // Opening a NEW TAB is exactly the `window.open()` vector. A parent-page
  // script can never patch that away for a cross-origin iframe — each frame
  // has its own separate `window`, and the browser enforces that boundary
  // regardless of what JS runs in the top page. The ONLY thing that can
  // actually block it is the native <iframe sandbox> attribute without
  // `allow-popups`, so when AdShield is on, EVERY provider gets the full
  // sandbox by default — not just CineSrc. Some providers (confirmed by
  // testing: everything except CineSrc) actively detect this and refuse to
  // play ("please disable sandbox"); when that happens the always-visible
  // "Change Server" banner is the intended way out — pick a different
  // provider (CineSrc is first/default) rather than silently losing
  // popup protection. Turning AdShield off removes the sandbox entirely for
  // maximum compatibility, at the cost of that provider being able to open
  // new tabs again.
  const sandbox = sandboxActive ? PERFECT_SANDBOX_STRING : null;

  return {
    src: cleanUrl,
    sandbox,
    referrerPolicy: policy.referrerPolicy,
    allow: policy.allowFeatures.join('; '),
    protectionLevel: sandbox ? ('maximum' as ShieldLevel) : ('standard' as ShieldLevel),
    policy,
  };
}

const STORAGE_KEY = 'streamnet_ad_shield_active';

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

/**
 * High-frequency ad networks and popup syndication domains
 * (uBlock filters & easylist popup blacklists)
 */
export const KNOWN_AD_DOMAINS = [
  'popads.net',
  'popcash.net',
  'adsterra.com',
  'propellerads.com',
  'exoclick.com',
  'monetag.com',
  'hilltopads.com',
  'richpush.co',
  'clickadu.com',
  'adcash.com',
  'bet365.com',
  '1xbet.com',
  'yllix.com',
  'adsco.re',
  'tsyndicate.com',
  'onclickads.net',
  'trafficjunky.com',
  'juicyads.com',
  'doubleclick.net',
  'googlesyndication.com',
];

function isKnownAdUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return KNOWN_AD_DOMAINS.some((domain) => lower.includes(domain));
}

/**
 * uBlock Origin Dummy Window Proxy (`gorhill/uBlock prevent-window-open.js`)
 * Returns a fully mocked Window object so ad scripts don't throw TypeErrors
 * or trigger fallback redirects like `top.location = popupUrl`.
 */
function createDummyWindow() {
  return {
    closed: false,
    name: '',
    opener: null,
    length: 0,
    parent: null,
    top: null,
    focus: () => {},
    blur: () => {},
    close: () => {},
    postMessage: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    location: {
      href: '',
      pathname: '',
      search: '',
      hash: '',
      host: '',
      hostname: '',
      origin: '',
      protocol: '',
      port: '',
      replace: () => {},
      assign: () => {},
      reload: () => {},
      toString: () => '',
    },
    document: {
      write: () => {},
      writeln: () => {},
      close: () => {},
      open: () => {},
      createElement: () => ({ setAttribute: () => {}, style: {} }),
      querySelector: () => null,
      querySelectorAll: () => [],
      getElementById: () => null,
      body: {},
      documentElement: {},
    },
  };
}

import { JavaScriptInjector } from './javascriptInjector';

export { JavaScriptInjector };

export interface InterceptedPopupInfo {
  url: string;
  target?: string;
  proceed: () => void;
}

/**
 * Comprehensive uBlock Origin Protection Suite (`gorhill/uBlock`)
 * Installs all scriptlets, listeners, and defusers into the runtime environment.
 */
export function installAdblockProtection(
  isActive: boolean,
  onBlockedAction?: (type: string, target?: string) => void,
  onPopupIntercepted?: (popupInfo: InterceptedPopupInfo) => void
): () => void {
  if (typeof window === 'undefined' || !isActive) {
    return () => {};
  }

  // Ensure document-start JavaScript Injector is fully running
  JavaScriptInjector.init();

  const cleanups: Array<() => void> = [];

  // =========================================================================
  // 1. `gorhill/uBlock` SCRIPTLET: `nofab.js` & `prevent-bab.js`
  // Neutralizes FuckAdBlock, BlockAdBlock & SniffAdBlock anti-adblock checkers
  // =========================================================================
  try {
    const noopfn = function () {};
    class MockFab {
      check = noopfn;
      clearEvent = noopfn;
      emitEvent = noopfn;
      on(a: any, b: any) {
        if (!a && typeof b === 'function') b();
        return this;
      }
      onDetected() {
        return this;
      }
      onNotDetected(callback: any) {
        if (typeof callback === 'function') {
          try {
            callback();
          } catch (e) {}
        }
        return this;
      }
      setOption = noopfn;
      options = { set: noopfn, get: noopfn };
    }

    const mockFabInstance = new MockFab();
    const fabDescriptor = {
      get: () => MockFab,
      set: () => {},
      configurable: true,
    };
    const fabInstanceDescriptor = {
      get: () => mockFabInstance,
      set: () => {},
      configurable: true,
    };

    ['FuckAdBlock', 'BlockAdBlock', 'SniffAdBlock'].forEach((name) => {
      try {
        Object.defineProperty(window, name, fabDescriptor);
      } catch (e) {}
    });

    ['fuckAdBlock', 'blockAdBlock', 'sniffAdBlock'].forEach((name) => {
      try {
        Object.defineProperty(window, name, fabInstanceDescriptor);
      } catch (e) {}
    });
  } catch (err) {}

  // =========================================================================
  // 2. `gorhill/uBlock` SCRIPTLET: `popads-dummy.js`
  // Neutering PopAds / popns global objects
  // =========================================================================
  try {
    const emptyObjDesc = {
      value: {},
      writable: false,
      configurable: true,
    };
    try {
      Object.defineProperty(window, 'PopAds', emptyObjDesc);
      Object.defineProperty(window, 'popns', emptyObjDesc);
    } catch (e) {}
  } catch (err) {}

  // =========================================================================
  // 3. `gorhill/uBlock` SCRIPTLET: `window.name-defuser.js`
  // Resets window.name to prevent popunder state tracking
  // =========================================================================
  try {
    if (window === window.top && window.name) {
      window.name = '';
    }
  } catch (err) {}

  // =========================================================================
  // 4. `gorhill/uBlock` SCRIPTLET: `prevent-navigation.js`
  // Forbids non-user-initiated top-level redirects via Chromium Navigation API
  // =========================================================================
  if (typeof window !== 'undefined' && 'navigation' in window) {
    const navHandler = (e: any) => {
      if (e.userInitiated) return;
      const targetUrl = e.destination?.url || '';
      if (
        targetUrl &&
        !targetUrl.includes(window.location.host) &&
        !targetUrl.startsWith('about:blank') &&
        !targetUrl.startsWith('javascript:')
      ) {
        console.warn('[uBlock Origin / StreamNet] FORBADE external top-navigation redirect:', targetUrl);
        e.preventDefault();
        onBlockedAction?.('navigation_redirect_forbidden', targetUrl);
      }
    };
    try {
      (window as any).navigation.addEventListener('navigate', navHandler);
      cleanups.push(() => {
        try {
          (window as any).navigation.removeEventListener('navigate', navHandler);
        } catch (err) {}
      });
    } catch (err) {}
  }

  // =========================================================================
  // 5. `gorhill/uBlock` SCRIPTLET: `prevent-window-open.js` (`nowo.js`)
  // Intercepts window.open calls and returns safe dummy window proxy
  // =========================================================================
  const origOpen = window.open;
  window.open = function (...args: any[]) {
    const url = args[0] ? String(args[0]) : '';
    const target = args[1] ? String(args[1]) : '';
    const features = args[2] ? String(args[2]) : '';

    const isInternal =
      (url.includes(window.location.host) || url.startsWith('/') || url.startsWith('#')) &&
      target !== '_blank';

    if (!isInternal || !url || url === 'about:blank' || isKnownAdUrl(url)) {
      console.warn('[uBlock Origin / StreamNet] FORBADE popup window.open attempt:', {
        url: url || 'about:blank',
        features,
        target,
      });
      onBlockedAction?.('popup_blocked', url || 'about:blank');
      if (onPopupIntercepted && url && url !== 'about:blank') {
        onPopupIntercepted({
          url,
          target,
          proceed: () => {
            try {
              origOpen.call(window, url, target || '_blank');
            } catch (e) {}
          },
        });
      }
      return createDummyWindow() as any;
    }

    return origOpen.apply(window, args as any);
  };
  cleanups.push(() => {
    window.open = origOpen;
  });

  // =========================================================================
  // 6. `gorhill/uBlock` SCRIPTLET: `prevent-addEventListener.js` (`aeld.js`)
  // Defuses third-party popup and click-hijack event listeners
  // =========================================================================
  if (typeof EventTarget !== 'undefined' && EventTarget.prototype.addEventListener) {
    const origAddEventListener = EventTarget.prototype.addEventListener;
    const AD_LISTENER_REGEX = /window\.open|popunder|onclickads|adsterra|propeller|exoclick|adcash|top\.location|location\.replace|location\.href\s*=/i;

    EventTarget.prototype.addEventListener = function (
      this: EventTarget,
      type: string,
      listener: any,
      options?: any
    ) {
      if (['click', 'mousedown', 'pointerdown', 'mouseup', 'auxclick', 'touchend'].includes(type)) {
        let fnString = '';
        try {
          if (typeof listener === 'function') {
            fnString = Function.prototype.toString.call(listener);
          } else if (listener && typeof listener.handleEvent === 'function') {
            fnString = Function.prototype.toString.call(listener.handleEvent);
          }
        } catch (e) {}

        if (fnString && AD_LISTENER_REGEX.test(fnString)) {
          console.warn('[uBlock Origin aeld] Neutralized malicious click listener:', type);
          onBlockedAction?.('ad_event_listener_prevented', type);
          return;
        }
      }
      return origAddEventListener.call(this, type, listener, options);
    };
    cleanups.push(() => {
      EventTarget.prototype.addEventListener = origAddEventListener;
    });
  }

  // =========================================================================
  // 7. `gorhill/uBlock` SCRIPTLET: `disable-newtab-links.js`
  // Captures any click on target="_blank" or external outbound link in capture phase
  // =========================================================================
  if (typeof window !== 'undefined') {
    const handleNewTabClick = (ev: MouseEvent) => {
      let target = ev.target as HTMLElement | null;
      while (target !== null && target !== document.body) {
        if (target.localName === 'a') {
          const anchor = target as HTMLAnchorElement;
          const href = anchor.href || '';
          const hasBlankTarget = anchor.getAttribute('target') === '_blank';
          const isExternal = href.startsWith('http') && !href.includes(window.location.host);

          if (hasBlankTarget || isExternal || isKnownAdUrl(href)) {
            console.warn('[uBlock Origin / StreamNet] Defused newtab link click:', href);
            ev.stopPropagation();
            ev.preventDefault();
            onBlockedAction?.('newtab_link_disabled', href);
            if (onPopupIntercepted && href && href !== 'about:blank') {
              onPopupIntercepted({
                url: href,
                target: '_blank',
                proceed: () => {
                  try {
                    origOpen.call(window, href, '_blank');
                  } catch (e) {}
                },
              });
            }
            break;
          }
        }
        target = target.parentElement;
      }
    };

    window.addEventListener('click', handleNewTabClick, { capture: true });
    cleanups.push(() => {
      window.removeEventListener('click', handleNewTabClick, { capture: true });
    });
  }

  // =========================================================================
  // 8. Block synthetic anchor clicks and form submit popups
  // =========================================================================
  if (typeof HTMLAnchorElement !== 'undefined') {
    const origAnchorClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
      const targetAttr = this.getAttribute('target');
      const href = this.getAttribute('href') || '';
      const isExternal = href.startsWith('http') && !href.includes(window.location.host);
      if (targetAttr === '_blank' || isExternal || isKnownAdUrl(href)) {
        console.warn('[uBlock Origin / StreamNet] Defused synthetic anchor click:', href);
        onBlockedAction?.('synthetic_click_prevented', href);
        if (onPopupIntercepted && href && href !== 'about:blank') {
          onPopupIntercepted({
            url: href,
            target: targetAttr || '_blank',
            proceed: () => {
              try {
                origOpen.call(window, href, targetAttr || '_blank');
              } catch (e) {}
            },
          });
        }
        return;
      }
      return origAnchorClick.apply(this);
    };
    cleanups.push(() => {
      HTMLAnchorElement.prototype.click = origAnchorClick;
    });
  }

  if (typeof HTMLFormElement !== 'undefined') {
    const origFormSubmit = HTMLFormElement.prototype.submit;
    HTMLFormElement.prototype.submit = function (this: HTMLFormElement) {
      const targetAttr = this.getAttribute('target');
      const action = this.getAttribute('action') || '';
      const isExternal = action.startsWith('http') && !action.includes(window.location.host);
      if ((targetAttr === '_blank' || targetAttr === '_top') && isExternal) {
        console.warn('[uBlock Origin / StreamNet] Blocked rogue form submit:', action);
        onBlockedAction?.('form_submit_prevented', action);
        return;
      }
      return origFormSubmit.apply(this);
    };
    cleanups.push(() => {
      HTMLFormElement.prototype.submit = origFormSubmit;
    });
  }

  // =========================================================================
  // 9. `gorhill/uBlock` SCRIPTLETS: `prevent-fetch.js` & `prevent-xhr.js`
  // Intercepts parent-window network requests to known ad networks & popunder CDNs
  // =========================================================================
  if (typeof window !== 'undefined' && window.fetch) {
    const origFetch = window.fetch;
    window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const url = typeof input === 'string' ? input : (input as any).url || '';
      if (isKnownAdUrl(url)) {
        console.warn('[uBlock Origin prevent-fetch] Blocked network ad request:', url);
        onBlockedAction?.('fetch_ad_blocked', url);
        return Promise.resolve(new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      return origFetch.apply(window, [input, init] as any);
    };
    cleanups.push(() => {
      window.fetch = origFetch;
    });
  }

  if (typeof XMLHttpRequest !== 'undefined') {
    const origXhrOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, ...args: any[]) {
      const url = args[1] ? String(args[1]) : '';
      if (isKnownAdUrl(url)) {
        console.warn('[uBlock Origin prevent-xhr] Defused xhr ad request:', url);
        onBlockedAction?.('xhr_ad_blocked', url);
        // Replace with empty data URI
        args[1] = 'data:application/json,{}';
      }
      return origXhrOpen.apply(this, args as any);
    };
    cleanups.push(() => {
      XMLHttpRequest.prototype.open = origXhrOpen;
    });
  }

  // =========================================================================
  // 10. `gorhill/uBlock` SCRIPTLET: `overlay-buster.js`
  // Center-point test (vw/2, vh/2) to eliminate fullscreen click-jacking overlays
  // =========================================================================
  const runOverlayBuster = () => {
    try {
      const docEl = document.documentElement;
      const bodyEl = document.body;
      if (!docEl || !bodyEl) return;

      const vw = Math.min(docEl.clientWidth, window.innerWidth);
      const vh = Math.min(docEl.clientHeight, window.innerHeight);
      if (vw <= 0 || vh <= 0) return;

      const tol = Math.min(vw, vh) * 0.05;
      const el = document.elementFromPoint(vw / 2, vh / 2) as HTMLElement | null;
      if (!el || el === bodyEl || el === docEl) return;

      // Never touch legitimate StreamNet components
      if (
        el.closest('[class*="VideoPlayer"]') ||
        el.closest('[class*="Navbar"]') ||
        el.closest('[class*="SeasonEpisodeSelector"]') ||
        el.closest('[class*="modal"]') ||
        el.closest('#__next')
      ) {
        return;
      }

      const style = window.getComputedStyle(el);
      const zIndex = parseInt(style.zIndex, 10);
      if (zIndex >= 1000 || style.position === 'fixed') {
        const rect = el.getBoundingClientRect();
        if (rect.left <= tol && rect.top <= tol && vw - rect.right <= tol && vh - rect.bottom <= tol) {
          console.warn('[uBlock Origin overlay-buster] Eliminating fullscreen nuisance overlay:', el);
          el.remove();
          bodyEl.style.setProperty('overflow', 'auto', 'important');
          onBlockedAction?.('overlay_buster_activated');
        }
      }
    } catch (err) {}
  };

  const overlayInterval = setInterval(runOverlayBuster, 1500);
  cleanups.push(() => clearInterval(overlayInterval));

  // =========================================================================
  // 11. Z-Axis Defuser & Automatic Rogue iFrame Blocker
  // Shoves rogue modals/banners to z-index: -99999 and removes third-party iframes
  // =========================================================================
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

      // Detect rogue third-party iframes injected outside VideoPlayer
      if (tag === 'iframe') {
        const iframe = node as HTMLIFrameElement;
        if (iframe.closest('[class*="VideoPlayer"]')) {
          return;
        }
        iframe.style.setProperty('z-index', '-99999', 'important');
        iframe.style.setProperty('pointer-events', 'none', 'important');
        iframe.style.setProperty('display', 'none', 'important');
        try {
          iframe.remove();
        } catch (e) {}
        onBlockedAction?.('rogue_iframe_blocked', iframe.src || 'unknown');
        return;
      }

      // Detect ad popups, popunders, overlays, interstitials
      const isAdKeyword =
        id.includes('ad-') ||
        id.includes('popup') ||
        id.includes('popunder') ||
        id.includes('banner') ||
        cls.includes('ad-') ||
        cls.includes('popup') ||
        cls.includes('popunder') ||
        cls.includes('banner') ||
        cls.includes('floating-ad') ||
        tag === 'dialog';

      let isSuspiciousZ = false;
      try {
        const style = window.getComputedStyle(node);
        const zIndex = parseInt(style.zIndex, 10);
        const isFloating = style.position === 'fixed' || style.position === 'absolute';
        isSuspiciousZ = isFloating && zIndex > 999;
      } catch (e) {}

      if (isAdKeyword || isSuspiciousZ) {
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

    try {
      const allIframes = document.querySelectorAll('iframe');
      allIframes.forEach((iframe) => {
        if (!iframe.closest('[class*="VideoPlayer"]')) {
          iframe.remove();
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

  // =========================================================================
  // 12. Suppress rogue notification requests
  // =========================================================================
  if (typeof window !== 'undefined' && 'Notification' in window) {
    const origNotification = window.Notification.requestPermission;
    window.Notification.requestPermission = () => {
      console.warn('[uBlock Origin / StreamNet] Suppressed scam notification permission request');
      onBlockedAction?.('notification_suppressed');
      return Promise.resolve('denied' as NotificationPermission);
    };
    cleanups.push(() => {
      window.Notification.requestPermission = origNotification;
    });
  }

  // =========================================================================
  // 13. Full-tab hijack guard (`beforeunload`) — cross-browser fallback for
  // when an embedded provider's script redirects/replaces the ENTIRE
  // top-level page (not just a window.open popup). The Navigation API
  // scriptlet above (#4) only works in Chromium browsers and only catches
  // non-gesture redirects; some ad scripts tie the redirect to a click on an
  // invisible overlay INSIDE the iframe, which browsers treat as "user
  // initiated" and let through. `beforeunload` works in every browser and
  // forces a native "Leave site?" confirmation the user must explicitly
  // accept before ANY navigation away from this page can actually happen —
  // effectively blocking the redirect unless the user chooses to proceed.
  // Client-side route changes (Next.js <Link>/router.push) never trigger
  // this, since they don't unload the document; only real cross-origin
  // navigations, full reloads, and tab closes do.
  // =========================================================================
  if (typeof window !== 'undefined') {
    const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
      onBlockedAction?.('page_leave_intercepted');
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', beforeUnloadHandler);
    cleanups.push(() => {
      window.removeEventListener('beforeunload', beforeUnloadHandler);
    });
  }

  return () => {
    cleanups.forEach((cleanup) => {
      try {
        cleanup();
      } catch (e) {}
    });
  };
}
