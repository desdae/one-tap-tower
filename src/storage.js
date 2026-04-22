const KEYS = {
  bestScore: 'oneTapTower.bestScore',
  bestStreak: 'oneTapTower.bestStreak',
  soundEnabled: 'oneTapTower.soundEnabled',
  musicVolume: 'oneTapTower.musicVolume',
  effectsVolume: 'oneTapTower.effectsVolume',
  removeAds: 'oneTapTower.removeAds'
};

const DEFAULT_MUSIC_VOLUME = 0.35;
const DEFAULT_EFFECTS_VOLUME = 0.9;

function clampVolume(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(0, Math.min(1, parsed));
}

function safeRead(storageArea, key, fallback) {
  try {
    const value = storageArea?.getItem(key);
    return value === null || value === undefined ? fallback : value;
  } catch {
    return fallback;
  }
}

function safeWrite(storageArea, key, value) {
  try {
    storageArea?.setItem(key, value);
  } catch {
    return;
  }
}

function getLegacyMuted(storageArea) {
  return safeRead(storageArea, KEYS.soundEnabled, '1') === '0';
}

function getStoredVolume(storageArea, key, fallback) {
  const raw = safeRead(storageArea, key, null);
  if (raw === null) {
    return getLegacyMuted(storageArea) ? 0 : fallback;
  }
  return clampVolume(raw, fallback);
}

export function createStorage(storageArea = globalThis.window?.localStorage) {
  return {
    getBestScore() {
      return Number.parseInt(safeRead(storageArea, KEYS.bestScore, '0'), 10) || 0;
    },
    setBestScore(value) {
      safeWrite(storageArea, KEYS.bestScore, String(Math.max(0, value)));
    },
    getBestStreak() {
      return Number.parseInt(safeRead(storageArea, KEYS.bestStreak, '0'), 10) || 0;
    },
    setBestStreak(value) {
      safeWrite(storageArea, KEYS.bestStreak, String(Math.max(0, value)));
    },
    getMusicVolume() {
      return getStoredVolume(storageArea, KEYS.musicVolume, DEFAULT_MUSIC_VOLUME);
    },
    setMusicVolume(value) {
      safeWrite(storageArea, KEYS.musicVolume, String(clampVolume(value, DEFAULT_MUSIC_VOLUME)));
    },
    getEffectsVolume() {
      return getStoredVolume(storageArea, KEYS.effectsVolume, DEFAULT_EFFECTS_VOLUME);
    },
    setEffectsVolume(value) {
      safeWrite(
        storageArea,
        KEYS.effectsVolume,
        String(clampVolume(value, DEFAULT_EFFECTS_VOLUME))
      );
    },
    getRemoveAds() {
      return safeRead(storageArea, KEYS.removeAds, '0') === '1';
    },
    setRemoveAds(value) {
      safeWrite(storageArea, KEYS.removeAds, value ? '1' : '0');
    }
  };
}
