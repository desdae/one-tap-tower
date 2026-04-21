import './styles.css';

import { createAudioController } from './audio.js';
import { GameEngine } from './game.js';
import { createMonetization } from './monetization.js';
import { createPlatform } from './platform.js';
import { Renderer } from './renderer.js';
import { createStorage } from './storage.js';
import { createUI } from './ui.js';

const storage = createStorage();
const platform = createPlatform();
const game = new GameEngine({
  bestScore: storage.getBestScore(),
  bestStreak: storage.getBestStreak()
});
const renderer = new Renderer(document.querySelector('#game-canvas'), game);
const ui = createUI();
const audio = createAudioController({
  enabled: storage.getSoundEnabled(),
  onToggle(enabled) {
    storage.setSoundEnabled(enabled);
    ui.setSoundEnabled(enabled);
  }
});
const monetization = createMonetization({ platform, storage });

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

function processEvents() {
  const events = game.consumeEvents();

  for (let i = 0; i < events.length; i += 1) {
    const event = events[i];

    if (event.type === 'place') {
      if (event.perfect) {
        audio.play(event.streak >= 3 ? 'streak' : 'perfect');
        if (event.streak >= 5) {
          ui.toast(`Legendary x${event.streak}`);
        } else if (event.streak >= 3) {
          ui.toast(`Amazing x${event.streak}`);
        } else {
          ui.toast('Perfect');
        }
      } else {
        audio.play(event.roughCut ? 'cut' : 'place');
        if (event.streakBroken) {
          ui.toast(`Streak banked x${event.longestStreak}`);
        }
      }
    } else if (event.type === 'miss') {
      audio.play('miss');
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
  async onContinue() {
    ui.setContinueBusy(true);
    const rewarded = await monetization.showRewardedContinue();
    ui.setContinueBusy(false);

    if (!rewarded) {
      ui.toast('Continue unavailable');
      return;
    }

    if (game.continueRun()) {
      ui.showGameplay();
      persistRecords();
      syncHud();
    }
  },
  onToggleSound() {
    const enabled = audio.toggle();
    if (enabled) {
      audio.unlock();
      audio.play('place');
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
  },
  onResume() {
    lastFrame = performance.now();
  }
});

ui.setSoundEnabled(audio.isEnabled());
ui.setRemoveAdsOwned(monetization.hasRemoveAds());
ui.showMenu(game.bestScore, game.bestStreak);
syncHud();
resize();
window.addEventListener('resize', resize);
requestAnimationFrame(tick);
