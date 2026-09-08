import { ProviderAdapter, ServerSessionStats } from './providers/types';

const STORAGE_KEY = 'streamnet_server_stats_v1';
const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_BREAKER_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function getStoredStats(): Record<string, ServerSessionStats> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveStoredStats(stats: Record<string, ServerSessionStats>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch (e) {}
}

export function getServerStats(serverId: string): ServerSessionStats {
  const all = getStoredStats();
  return (
    all[serverId] || {
      successCount: 0,
      failureCount: 0,
      consecutiveFailures: 0,
      disabledUntil: 0,
      avgLoadTimeMs: 0,
      lastUpdated: Date.now(),
    }
  );
}

export function isServerCircuitTripped(serverId: string): boolean {
  const stats = getServerStats(serverId);
  return Date.now() < stats.disabledUntil;
}

export function recordServerSuccess(serverId: string, loadTimeMs: number): void {
  const all = getStoredStats();
  const current = all[serverId] || {
    successCount: 0,
    failureCount: 0,
    consecutiveFailures: 0,
    disabledUntil: 0,
    avgLoadTimeMs: loadTimeMs,
    lastUpdated: Date.now(),
  };

  current.successCount += 1;
  current.consecutiveFailures = 0;
  current.disabledUntil = 0;
  // Exponential moving average for load time
  current.avgLoadTimeMs = current.avgLoadTimeMs > 0
    ? Math.round(current.avgLoadTimeMs * 0.7 + loadTimeMs * 0.3)
    : loadTimeMs;
  current.lastUpdated = Date.now();

  all[serverId] = current;
  saveStoredStats(all);
}

export function recordServerFailure(serverId: string): void {
  const all = getStoredStats();
  const current = all[serverId] || {
    successCount: 0,
    failureCount: 0,
    consecutiveFailures: 0,
    disabledUntil: 0,
    avgLoadTimeMs: 0,
    lastUpdated: Date.now(),
  };

  current.failureCount += 1;
  current.consecutiveFailures += 1;
  if (current.consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
    current.disabledUntil = Date.now() + CIRCUIT_BREAKER_DURATION_MS;
    console.warn(`[StreamNet Circuit Breaker] Server ${serverId} tripped circuit breaker! Disabled for 15 minutes.`);
  }
  current.lastUpdated = Date.now();

  all[serverId] = current;
  saveStoredStats(all);
}

/**
 * Calculates weighted score for a provider:
 * Score = (BaseReliability * 0.40) + (Sandbox * 0.25) + (Autoplay * 0.15) + (RecentSuccess * 0.20) - Penalty
 */
export function calculateServerScore(provider: ProviderAdapter): number {
  const stats = getServerStats(provider.id);
  const isTripped = isServerCircuitTripped(provider.id);

  if (isTripped) {
    return 0; // Temporarily disabled by circuit breaker
  }

  const { capabilities } = provider;
  const baseReliabilityComponent = capabilities.baseReliability * 0.4;
  const sandboxComponent = capabilities.sandboxCompatible ? 25 : 0;
  const autoplayComponent = capabilities.autoplay ? 15 : 0;

  const totalAttempts = stats.successCount + stats.failureCount;
  const successRate = totalAttempts > 0 ? (stats.successCount / totalAttempts) * 100 : 95;
  const successComponent = successRate * 0.2;

  const failurePenalty = stats.consecutiveFailures * 15;
  const popupRiskPenalty = capabilities.popupRisk === 'high' ? 25 : capabilities.popupRisk === 'medium' ? 10 : 0;

  const totalScore = Math.max(
    5,
    Math.round(baseReliabilityComponent + sandboxComponent + autoplayComponent + successComponent - failurePenalty - popupRiskPenalty)
  );

  return totalScore;
}

export interface RankedProvider {
  provider: ProviderAdapter;
  score: number;
  isCircuitTripped: boolean;
  consecutiveFailures: number;
}

export function getRankedProviders(providers: ProviderAdapter[]): RankedProvider[] {
  return providers
    .map((p) => {
      const stats = getServerStats(p.id);
      return {
        provider: p,
        score: calculateServerScore(p),
        isCircuitTripped: isServerCircuitTripped(p.id),
        consecutiveFailures: stats.consecutiveFailures,
      };
    })
    .sort((a, b) => {
      if (a.isCircuitTripped && !b.isCircuitTripped) return 1;
      if (!a.isCircuitTripped && b.isCircuitTripped) return -1;
      return b.score - a.score;
    });
}

export function getBestAvailableProvider(
  providers: ProviderAdapter[],
  preferredId?: string,
  excludeIds: string[] = []
): ProviderAdapter {
  const available = providers.filter((p) => !excludeIds.includes(p.id));
  if (available.length === 0) return providers[0];

  // If user has a preferred server and its circuit is not tripped
  if (preferredId && preferredId !== 'auto') {
    const preferred = available.find((p) => p.id === preferredId);
    if (preferred && !isServerCircuitTripped(preferred.id)) {
      return preferred;
    }
  }

  const ranked = getRankedProviders(available);
  return ranked[0]?.provider || available[0];
}
