/**
 * StreamNet Dedicated Adblock Framework
 *
 * Provides granular, server-specific ad, popup, and redirect blocking
 * policies for streaming embed providers (iframes).
 *
 * Each server has a dedicated policy specifying:
 * - Specific HTML5 sandbox permissions (dropping allow-popups, allow-top-navigation, etc.)
 * - Strict referrer policy to block ad network tracking/injection
 * - Restricted feature permissions
 * - Embed URL cleanup & parameter optimization
 */

export interface ServerAdPolicy {
  serverId: string;
  name: string;
  sandboxTokens: string[];
  referrerPolicy: 'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'strict-origin-when-cross-origin';
  allowFeatures: string[];
  cleanUrl?: (url: string) => string;
  protectionLevel: 'maximum' | 'high' | 'standard';
  notes?: string;
}

// Standard security baseline: blocks popups, new tabs, top redirects, modals, downloads
const BASELINE_SANDBOX_TOKENS = [
  'allow-scripts',
  'allow-same-origin',
  'allow-forms',
  'allow-presentation',
];

const BASELINE_ALLOW_FEATURES = [
  'autoplay',
  'fullscreen',
  'encrypted-media',
  'picture-in-picture',
  'accelerometer',
  'gyroscope',
];

export const SERVER_AD_POLICIES: Record<string, ServerAdPolicy> = {
  nxsha: {
    serverId: 'nxsha',
    name: 'Nxsha 4K',
    sandboxTokens: [...BASELINE_SANDBOX_TOKENS],
    referrerPolicy: 'no-referrer',
    allowFeatures: [...BASELINE_ALLOW_FEATURES],
    protectionLevel: 'maximum',
    notes: 'Clean provider. Full sandbox blocking prevents any background tracking or popups.',
  },
  cinesrc: {
    serverId: 'cinesrc',
    name: 'CineSrc',
    sandboxTokens: [...BASELINE_SANDBOX_TOKENS],
    referrerPolicy: 'no-referrer-when-downgrade',
    allowFeatures: [...BASELINE_ALLOW_FEATURES],
    protectionLevel: 'maximum',
    cleanUrl: (url: string) => {
      // Ensure autoskip and clean color query params
      if (!url.includes('autoskip=')) {
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}autoskip=true`;
      }
      return url;
    },
    notes: 'Premium embed. Sandboxed with postMessage series auto-next support.',
  },
  vidrock: {
    serverId: 'vidrock',
    name: 'VidRock',
    sandboxTokens: [...BASELINE_SANDBOX_TOKENS],
    referrerPolicy: 'no-referrer',
    allowFeatures: [...BASELINE_ALLOW_FEATURES],
    protectionLevel: 'maximum',
    notes: 'Russian mirror. Aggressive popunder scripts on click; sandbox drops all popups.',
  },
  'vidsrc-in': {
    serverId: 'vidsrc-in',
    name: 'VidSrc.in',
    sandboxTokens: [...BASELINE_SANDBOX_TOKENS],
    referrerPolicy: 'no-referrer',
    allowFeatures: [...BASELINE_ALLOW_FEATURES],
    protectionLevel: 'maximum',
    notes: 'Indian mirror. Contains clickjack overlay; sandbox prevents popup spawning.',
  },
  vidcore: {
    serverId: 'vidcore',
    name: 'VidCore',
    sandboxTokens: [...BASELINE_SANDBOX_TOKENS],
    referrerPolicy: 'no-referrer',
    allowFeatures: [...BASELINE_ALLOW_FEATURES],
    protectionLevel: 'maximum',
    notes: 'Fast stream. Sandboxed against redirect injection.',
  },
  vsembed: {
    serverId: 'vsembed',
    name: 'VSEmbed',
    sandboxTokens: [...BASELINE_SANDBOX_TOKENS],
    referrerPolicy: 'no-referrer',
    allowFeatures: [...BASELINE_ALLOW_FEATURES],
    protectionLevel: 'maximum',
    notes: 'High ad frequency. Strict sandbox neutralizes touch-triggered popups.',
  },
  'vidsrc-me': {
    serverId: 'vidsrc-me',
    name: 'VidSrc',
    sandboxTokens: [...BASELINE_SANDBOX_TOKENS],
    referrerPolicy: 'no-referrer',
    allowFeatures: [...BASELINE_ALLOW_FEATURES],
    protectionLevel: 'maximum',
    notes: 'Common vidsrc mirror. Triggers 2-3 popunders on first touches; blocked by sandbox.',
  },
  vidfast: {
    serverId: 'vidfast',
    name: 'VidFast',
    sandboxTokens: [...BASELINE_SANDBOX_TOKENS],
    referrerPolicy: 'no-referrer',
    allowFeatures: [...BASELINE_ALLOW_FEATURES],
    protectionLevel: 'maximum',
    notes: 'Lightweight embed with click popups; blocked by sandbox.',
  },
  'vidsrc-io': {
    serverId: 'vidsrc-io',
    name: 'VidSrc.io',
    sandboxTokens: [...BASELINE_SANDBOX_TOKENS],
    referrerPolicy: 'no-referrer',
    allowFeatures: [...BASELINE_ALLOW_FEATURES],
    protectionLevel: 'maximum',
    notes: 'Original vidsrc domain. Spawns ad tabs on pause/seek; blocked by sandbox.',
  },
  superembed: {
    serverId: 'superembed',
    name: 'SuperEmbed',
    sandboxTokens: [...BASELINE_SANDBOX_TOKENS],
    referrerPolicy: 'no-referrer',
    allowFeatures: [...BASELINE_ALLOW_FEATURES],
    protectionLevel: 'maximum',
    notes: 'multiembed.mov network. Extremely aggressive popup ads; strict sandbox drops them.',
  },
  twoembed: {
    serverId: 'twoembed',
    name: '2Embed',
    sandboxTokens: [...BASELINE_SANDBOX_TOKENS],
    referrerPolicy: 'no-referrer',
    allowFeatures: [...BASELINE_ALLOW_FEATURES],
    protectionLevel: 'maximum',
    notes: '2embed.cc network. Spawns popups on every touch; strict sandbox neutralizes all.',
  },
};

/**
 * Fallback policy for any unregistered or dynamically added server
 */
export const DEFAULT_SERVER_POLICY: ServerAdPolicy = {
  serverId: 'default',
  name: 'Default Streaming Server',
  sandboxTokens: [...BASELINE_SANDBOX_TOKENS],
  referrerPolicy: 'no-referrer',
  allowFeatures: [...BASELINE_ALLOW_FEATURES],
  protectionLevel: 'maximum',
};

/**
 * Retrieve the specific ad policy for a given server ID
 */
export function getServerAdPolicy(serverId: string): ServerAdPolicy {
  return SERVER_AD_POLICIES[serverId] || DEFAULT_SERVER_POLICY;
}

/**
 * Resolve the optimal iframe attributes based on server ID and shield state
 */
export function resolveServerIframeAttributes(
  serverId: string,
  rawUrl: string,
  shieldEnabled: boolean = true
) {
  const policy = getServerAdPolicy(serverId);
  const cleanUrl = policy.cleanUrl ? policy.cleanUrl(rawUrl) : rawUrl;

  return {
    src: cleanUrl,
    sandbox: shieldEnabled ? policy.sandboxTokens.join(' ') : undefined,
    referrerPolicy: policy.referrerPolicy,
    allow: policy.allowFeatures.join('; '),
    protectionLevel: policy.protectionLevel,
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
 * Runtime protection against malicious scripts attempting to trigger popups,
 * redirects, or steal window focus.
 */
export function installAdblockProtection(isActive: boolean): () => void {
  if (typeof window === 'undefined' || !isActive) {
    return () => {};
  }

  const originalOpen = window.open;

  // Intercept and drop any window.open popup requests made from parent context
  window.open = function (...args: any[]) {
    console.warn('[StreamNet Adblock Framework] Blocked rogue window.open popup attempt:', args[0]);
    return null;
  };

  return () => {
    window.open = originalOpen;
  };
}
