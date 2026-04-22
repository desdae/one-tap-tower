function setHidden(element, hidden) {
  element.classList.toggle('screen--active', !hidden);
}

function formatVolume(value) {
  return `${Math.round(value * 100)}%`;
}

function sliderValueToVolume(input) {
  return Number.parseInt(input.value, 10) / 100;
}

export function createUI() {
  const elements = {
    score: document.querySelector('#score-value'),
    best: document.querySelector('#best-value'),
    streakMetric: document.querySelector('#streak-metric'),
    streak: document.querySelector('#streak-value'),
    toast: document.querySelector('#toast'),
    menu: document.querySelector('#menu-screen'),
    menuBest: document.querySelector('#menu-best'),
    menuStreak: document.querySelector('#menu-streak'),
    gameover: document.querySelector('#gameover-screen'),
    gameoverScore: document.querySelector('#gameover-score'),
    gameoverBest: document.querySelector('#gameover-best'),
    gameoverStreak: document.querySelector('#gameover-streak'),
    gameoverBestStreak: document.querySelector('#gameover-best-streak'),
    options: document.querySelector('#options-screen'),
    musicVolume: document.querySelector('#music-volume'),
    musicVolumeValue: document.querySelector('#music-volume-value'),
    effectsVolume: document.querySelector('#effects-volume'),
    effectsVolumeValue: document.querySelector('#effects-volume-value'),
    playButton: document.querySelector('#play-button'),
    restartButton: document.querySelector('#restart-button'),
    continueButton: document.querySelector('#continue-button'),
    settingsButton: document.querySelector('#settings-button'),
    optionsCloseButton: document.querySelector('#options-close-button'),
    removeAdsButton: document.querySelector('#remove-ads-button'),
    gameoverRemoveAds: document.querySelector('#gameover-remove-ads')
  };

  let toastTimer = 0;

  function setRemoveAdsLabel(owned) {
    const label = owned ? 'Ads Removed' : 'Remove Ads';
    elements.removeAdsButton.textContent = label;
    elements.gameoverRemoveAds.textContent = label;
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add('toast--active');

    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      elements.toast.classList.remove('toast--active');
    }, 1200);
  }

  function setSliderValue(input, label, value) {
    const clamped = Math.max(0, Math.min(1, value));
    input.value = String(Math.round(clamped * 100));
    label.textContent = formatVolume(clamped);
  }

  return {
    bind(actions) {
      elements.playButton.addEventListener('click', actions.onPlay);
      elements.restartButton.addEventListener('click', actions.onRestart);
      elements.continueButton.addEventListener('click', actions.onContinue);
      elements.settingsButton.addEventListener('click', actions.onOpenOptions);
      elements.optionsCloseButton.addEventListener('click', actions.onCloseOptions);
      elements.options.addEventListener('click', (event) => {
        if (event.target === elements.options) {
          actions.onCloseOptions();
        }
      });
      elements.musicVolume.addEventListener('input', () => {
        actions.onMusicVolumeChange(sliderValueToVolume(elements.musicVolume));
      });
      elements.effectsVolume.addEventListener('input', () => {
        actions.onEffectsVolumeChange(sliderValueToVolume(elements.effectsVolume));
      });
      elements.effectsVolume.addEventListener('change', actions.onPreviewEffects);
      elements.removeAdsButton.addEventListener('click', actions.onRemoveAds);
      elements.gameoverRemoveAds.addEventListener('click', actions.onRemoveAds);
    },

    setHud({ score, bestScore, streak }) {
      elements.score.textContent = String(score);
      elements.best.textContent = String(bestScore);
      elements.streak.textContent = `x${streak}`;
      elements.streakMetric.classList.toggle('hud__metric--hidden', streak < 2);
    },

    setAudioLevels({ musicVolume, effectsVolume }) {
      setSliderValue(elements.musicVolume, elements.musicVolumeValue, musicVolume);
      setSliderValue(elements.effectsVolume, elements.effectsVolumeValue, effectsVolume);
    },

    showMenu(bestScore, bestStreak) {
      setHidden(elements.menu, false);
      setHidden(elements.gameover, true);
      elements.menuBest.textContent = `Best score: ${bestScore}`;
      elements.menuStreak.textContent = `Best streak: ${bestStreak}`;
    },

    showGameplay() {
      setHidden(elements.menu, true);
      setHidden(elements.gameover, true);
    },

    showGameOver({ score, bestScore, longestStreak, bestStreak, canContinue }) {
      elements.gameoverScore.textContent = `Score: ${score}`;
      elements.gameoverBest.textContent = `Best score: ${bestScore}`;
      elements.gameoverStreak.textContent = `Longest streak: ${longestStreak}`;
      elements.gameoverBestStreak.textContent = `Best streak: ${bestStreak}`;
      elements.continueButton.hidden = !canContinue;
      setHidden(elements.menu, true);
      setHidden(elements.gameover, false);
    },

    showOptions() {
      elements.options.classList.add('options-screen--active');
      elements.options.setAttribute('aria-hidden', 'false');
    },

    hideOptions() {
      elements.options.classList.remove('options-screen--active');
      elements.options.setAttribute('aria-hidden', 'true');
    },

    isOptionsOpen() {
      return elements.options.classList.contains('options-screen--active');
    },

    setContinueBusy(isBusy) {
      elements.continueButton.disabled = isBusy;
      elements.continueButton.textContent = isBusy ? 'Watching...' : 'Continue Once';
    },

    setRemoveAdsOwned(owned) {
      setRemoveAdsLabel(owned);
    },

    toast(message) {
      showToast(message);
    }
  };
}
