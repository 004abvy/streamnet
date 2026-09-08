import { ProviderAdapter } from './providers/types';

/**
 * StreamNet Embed Security Policy
 *
 * Enforces hardware-level browser confinement by explicitly allowing
 * ONLY what video playback strictly requires, and strictly omitting
 * all popup, new-tab, and top-navigation permissions.
 */

export const STRICT_SANDBOX_TOKENS = 'allow-scripts allow-same-origin allow-forms allow-presentation';

export const STRICT_ALLOW_POLICY = 'autoplay; encrypted-media; fullscreen; picture-in-picture';

export const STRICT_REFERRER_POLICY: 'no-referrer-when-downgrade' = 'no-referrer-when-downgrade';

export interface EmbedSecurityAttributes {
  sandbox: string | null;
  allow: string;
  referrerPolicy: 'no-referrer-when-downgrade';
  isSandboxed: boolean;
}

/**
 * Resolves security attributes for a specific provider
 */
export function resolveEmbedSecurity(
  provider: ProviderAdapter,
  sandboxPreference: boolean = true
): EmbedSecurityAttributes {
  // If sandbox is preferred AND the provider is sandbox-compatible
  const shouldApplySandbox = sandboxPreference && provider.capabilities.sandboxCompatible;

  return {
    sandbox: shouldApplySandbox ? STRICT_SANDBOX_TOKENS : null,
    allow: STRICT_ALLOW_POLICY,
    referrerPolicy: STRICT_REFERRER_POLICY,
    isSandboxed: shouldApplySandbox,
  };
}
