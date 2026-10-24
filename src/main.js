import './styles.css';

import { createAudioController } from './audio.js';
import { GameEngine } from './game.js';
import { createHaptics } from './haptics.js';
import { createMonetization } from './monetization.js';
import { createPlatform } from './platform.js';
import { Renderer } from './renderer.js';
import { createStorage } from './storage.js';
import { createUI } from './ui.js';

const storage = createStorage();
const platform = createPlatform();
const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const game = new GameEngine({
  bestScore: storage.getBestScore(),
  bestStreak: storage.getBestStreak(),
  reducedEffects: storage.getReducedEffects(prefersReducedMotion)
});
const renderer = new Renderer(document.querySelector('#game-canvas'), game);
renderer.screenShake = storage.getScreenShake();
renderer.comboPopups = storage.getComboPopups();
const ui = createUI();
let audio;
audio = createAudioController({
  musicVolume: storage.getMusicVolume(),
  effectsVolume: storage.getEffectsVolume(),
  onMusicVolumeChange(value) {
    storage.setMusicVolume(value);
    ui.setAudioLevels({
      musicVolume: value,
      effectsVolume: audio.getEffectsVolume()
    });
  },
  onEffectsVolumeChange(value) {
    storage.setEffectsVolume(value);
    ui.setAudioLevels({
      musicVolume: audio.getMusicVolume(),
      effectsVolume: value
    });
  }
});
const monetization = createMonetization({ platform, storage });
const haptics = createHaptics({ platform, enabled: storage.getVibration() });

let lastFrame = performance.now();

function resize() {
  renderer.resize(window.innerWidth, window.innerHeight);
}

function syncHud() {
  ui.setHud({
    score: game.score,
    bestScore: game.bestScore,
    streak: game.perfectStreak
  });
}

function persistRecords() {
  storage.setBestScore(game.bestScore);
  storage.setBestStreak(game.bestStreak);
}

function beginRun() {
  ui.hideOptions();
  game.startRun();
  persistRecords();
  syncHud();
  ui.showGameplay();
}

function handleGameplayTap() {
  if (game.state !== 'playing') {
    return;
  }

  audio.unlock();
  const result = game.dropCurrent();
  if (result) {
    persistRecords();
    syncHud();
  }
}

function comboToast(message) {
  if (renderer.comboPopups) {
    ui.toast(message);
  }
}

function processEvents() {
  const events = game.consumeEvents();

  for (let i = 0; i < events.length; i += 1) {
    const event = events[i];

    if (event.type === 'place') {
      if (event.perfect) {
        audio.play(event.streak >= 3 ? 'streak' : 'perfect', { streak: event.streak });
        haptics.perfect(event.streak);
        if (event.regrew) {
          comboToast(`Growing x${event.streak}`);
        } else if (event.streak >= 5) {
          comboToast(`Legendary x${event.streak}`);
        } else if (event.streak >= 3) {
          comboToast(`Amazing x${event.streak}`);
        } else {
          comboToast('Perfect');
        }
      } else {
        audio.play(event.roughCut ? 'cut' : 'place');
        if (event.roughCut) {
          haptics.cut();
        } else {
          haptics.place();
        }
        if (event.streakBroken) {
          comboToast(`Streak banked x${event.longestStreak}`);
        }
      }
    } else if (event.type === 'newbest') {
      audio.play('best');
      ui.toast('New best!');
    } else if (event.type === 'miss') {
      audio.play('miss');
      haptics.miss();
    } else if (event.type === 'continue') {
      audio.play('continue');
      ui.toast('Second chance');
    } else if (event.type === 'gameover') {
      ui.showGameOver({
        score: event.score,
        bestScore: event.bestScore,
        longestStreak: event.longestStreak,
        bestStreak: event.bestStreak,
        canContinue: monetization.canOfferContinue(game)
      });
    }
  }
}

function tick(now) {
  const dt = Math.min(0.033, (now - lastFrame) / 1000 || 0);
  lastFrame = now;

  game.update(dt);
  processEvents();
  renderer.render();

  requestAnimationFrame(tick);
}

ui.bind({
  onPlay() {
    audio.unlock();
    beginRun();
  },
  onRestart() {
    audio.unlock();
    beginRun();
  },
  onOpenOptions() {
    audio.unlock();
    ui.showOptions();
  },
  onCloseOptions() {
    ui.hideOptions();
  },
  onMusicVolumeChange(value) {
    audio.unlock();
    audio.setMusicVolume(value);
  },
  onEffectsVolumeChange(value) {
    audio.unlock();
    audio.setEffectsVolume(value);
  },
  onPreviewEffects() {
    audio.play('place');
  },
  onSettingChange(name, enabled) {
    if (name === 'vibration') {
      haptics.setEnabled(enabled);
      storage.setVibration(enabled);
      // A short buzz confirms vibration is back on.
      haptics.perfect(1);
    } else if (name === 'screenShake') {
      renderer.screenShake = enabled;
      storage.setScreenShake(enabled);
    } else if (name === 'comboPopups') {
      renderer.comboPopups = enabled;
      storage.setComboPopups(enabled);
    } else if (name === 'reducedEffects') {
      game.reducedEffects = enabled;
      storage.setReducedEffects(enabled);
    }
  },
  onToggleMute() {
    audio.unlock();
    const musicVolume = audio.getMusicVolume();
    const effectsVolume = audio.getEffectsVolume();
    if (musicVolume <= 0 && effectsVolume <= 0) {
      const restored = storage.getVolumesBeforeMute();
      audio.setMusicVolume(restored.musicVolume);
      audio.setEffectsVolume(restored.effectsVolume);
      return;
    }
    storage.setVolumesBeforeMute({ musicVolume, effectsVolume });
    audio.setMusicVolume(0);
    audio.setEffectsVolume(0);
  },
  async onContinue() {
    ui.setContinueBusy(true);
    const rewarded = await monetization.showRewardedContinue();
    ui.setContinueBusy(false);

    if (!rewarded) {
      ui.toast('Continue unavailable');
      return;
    }

    if (game.continueRun()) {
      ui.hideOptions();
      ui.showGameplay();
      persistRecords();
      syncHud();
    }
  },
  async onRemoveAds() {
    const result = await monetization.purchaseRemoveAds();
    ui.setRemoveAdsOwned(monetization.hasRemoveAds());

    if (result.success && result.simulated) {
      ui.toast('Stub purchase complete');
      return;
    }

    ui.toast('Play Billing TODO');
  }
});

document.querySelector('#game-canvas').addEventListener('pointerdown', (event) => {
  if (event.pointerType !== 'mouse' || event.button === 0) {
    handleGameplayTap();
  }
});

window.addEventListener('keydown', (event) => {
  if (ui.isOptionsOpen()) {
    if (event.code === 'Escape') {
      event.preventDefault();
      ui.hideOptions();
    }
    // Let Space and Enter work the focused switch or button, but never drop a block.
    const onControl = event.target instanceof Element && event.target.closest('input, button');
    if ((event.code === 'Space' || event.code === 'Enter') && !onControl) {
      event.preventDefault();
    }
    return;
  }

  if (event.code === 'Space' || event.code === 'Enter') {
    event.preventDefault();
    if (game.state === 'menu') {
      audio.unlock();
      beginRun();
      return;
    }
    if (game.state === 'playing') {
      handleGameplayTap();
    }
  }
});

platform.bindLifecycle({
  onPause() {
    lastFrame = performance.now();
    audio.handlePause();
  },
  onResume() {
    lastFrame = performance.now();
    audio.handleResume();
  }
});

ui.setAudioLevels({
  musicVolume: audio.getMusicVolume(),
  effectsVolume: audio.getEffectsVolume()
});
ui.setSettings({
  vibration: haptics.isEnabled(),
  screenShake: renderer.screenShake,
  comboPopups: renderer.comboPopups,
  reducedEffects: game.reducedEffects
});
ui.setRemoveAdsOwned(monetization.hasRemoveAds());
ui.setRemoveAdsAvailable(monetization.canOfferRemoveAds());
// Set by vite.config.js at build time: version name, build number, commit and build time.
document.querySelector('#app-version').textContent = `Version ${typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev build'}`;
ui.showMenu(game.bestScore, game.bestStreak);
syncHud();
resize();
window.addEventListener('resize', resize);
requestAnimationFrame(tick);
