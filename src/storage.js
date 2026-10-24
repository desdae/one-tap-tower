const KEYS = {
  bestScore: 'oneTapTower.bestScore',
  bestStreak: 'oneTapTower.bestStreak',
  soundEnabled: 'oneTapTower.soundEnabled',
  musicVolume: 'oneTapTower.musicVolume',
  effectsVolume: 'oneTapTower.effectsVolume',
  vibration: 'oneTapTower.vibration',
  screenShake: 'oneTapTower.screenShake',
  reducedEffects: 'oneTapTower.reducedEffects',
  comboPopups: 'oneTapTower.comboPopups',
  volumesBeforeMute: 'oneTapTower.volumesBeforeMute',
  removeAds: 'oneTapTower.removeAds',
  topScores: 'oneTapTower.topScores'
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

import { normalizeTopScores } from './leaderboard.js';

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
    getVibration() {
      return safeRead(storageArea, KEYS.vibration, '1') !== '0';
    },
    setVibration(enabled) {
      safeWrite(storageArea, KEYS.vibration, enabled ? '1' : '0');
    },
    getScreenShake() {
      return safeRead(storageArea, KEYS.screenShake, '1') !== '0';
    },
    setScreenShake(enabled) {
      safeWrite(storageArea, KEYS.screenShake, enabled ? '1' : '0');
    },
    // Until the player picks, follow the phone's "remove animations" setting.
    getReducedEffects(systemDefault = false) {
      const raw = safeRead(storageArea, KEYS.reducedEffects, null);
      return raw === null ? Boolean(systemDefault) : raw === '1';
    },
    setReducedEffects(enabled) {
      safeWrite(storageArea, KEYS.reducedEffects, enabled ? '1' : '0');
    },
    getComboPopups() {
      return safeRead(storageArea, KEYS.comboPopups, '1') !== '0';
    },
    setComboPopups(enabled) {
      safeWrite(storageArea, KEYS.comboPopups, enabled ? '1' : '0');
    },
    getVolumesBeforeMute() {
      const raw = safeRead(storageArea, KEYS.volumesBeforeMute, null);
      const [music, effects] = raw === null ? [] : String(raw).split(',');
      const restored = {
        musicVolume: music ? clampVolume(music, DEFAULT_MUSIC_VOLUME) : DEFAULT_MUSIC_VOLUME,
        effectsVolume: effects ? clampVolume(effects, DEFAULT_EFFECTS_VOLUME) : DEFAULT_EFFECTS_VOLUME
      };
      // Unmuting to silence would look broken, so fall back to the defaults.
      return restored.musicVolume + restored.effectsVolume > 0
        ? restored
        : { musicVolume: DEFAULT_MUSIC_VOLUME, effectsVolume: DEFAULT_EFFECTS_VOLUME };
    },
    setVolumesBeforeMute({ musicVolume, effectsVolume }) {
      safeWrite(storageArea, KEYS.volumesBeforeMute, `${musicVolume},${effectsVolume}`);
    },
    getTopScores() {
      let raw = [];
      try {
        raw = JSON.parse(safeRead(storageArea, KEYS.topScores, '[]'));
      } catch {
        raw = [];
      }
      return normalizeTopScores(raw, {
        bestScore: this.getBestScore(),
        bestStreak: this.getBestStreak()
      });
    },
    setTopScores(list) {
      safeWrite(storageArea, KEYS.topScores, JSON.stringify(list));
    },
    resetScores() {
      safeWrite(storageArea, KEYS.topScores, '[]');
      safeWrite(storageArea, KEYS.bestScore, '0');
      safeWrite(storageArea, KEYS.bestStreak, '0');
    },
    getRemoveAds() {
      return safeRead(storageArea, KEYS.removeAds, '0') === '1';
    },
    setRemoveAds(value) {
      safeWrite(storageArea, KEYS.removeAds, value ? '1' : '0');
    }
  };
}
