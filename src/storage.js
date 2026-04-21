const KEYS = {
  bestScore: 'oneTapTower.bestScore',
  bestStreak: 'oneTapTower.bestStreak',
  soundEnabled: 'oneTapTower.soundEnabled',
  removeAds: 'oneTapTower.removeAds'
};

function safeRead(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch {
    return fallback;
  }
}

function safeWrite(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    return;
  }
}

export function createStorage() {
  return {
    getBestScore() {
      return Number.parseInt(safeRead(KEYS.bestScore, '0'), 10) || 0;
    },
    setBestScore(value) {
      safeWrite(KEYS.bestScore, String(Math.max(0, value)));
    },
    getBestStreak() {
      return Number.parseInt(safeRead(KEYS.bestStreak, '0'), 10) || 0;
    },
    setBestStreak(value) {
      safeWrite(KEYS.bestStreak, String(Math.max(0, value)));
    },
    getSoundEnabled() {
      return safeRead(KEYS.soundEnabled, '1') === '1';
    },
    setSoundEnabled(value) {
      safeWrite(KEYS.soundEnabled, value ? '1' : '0');
    },
    getRemoveAds() {
      return safeRead(KEYS.removeAds, '0') === '1';
    },
    setRemoveAds(value) {
      safeWrite(KEYS.removeAds, value ? '1' : '0');
    }
  };
}
