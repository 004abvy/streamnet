export interface PlayerPreferences {
  autoplay: boolean;
  autoNext: boolean;
  skipIntro: boolean;
  preferredServer: string;
  useSafestServerFirst: boolean;
  sandboxActive: boolean;
}

const STORAGE_KEY = 'streamnet_player_preferences_v1';

const DEFAULT_PREFERENCES: PlayerPreferences = {
  autoplay: true,
  autoNext: true,
  skipIntro: true,
  preferredServer: 'auto',
  useSafestServerFirst: true,
  sandboxActive: true,
};

export function getPlayerPreferences(): PlayerPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch (e) {
    return DEFAULT_PREFERENCES;
  }
}

export function updatePlayerPreferences(updates: Partial<PlayerPreferences>): PlayerPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const current = getPlayerPreferences();
    const updated = { ...current, ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    return DEFAULT_PREFERENCES;
  }
}
