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
    gameoverRank: document.querySelector('#gameover-rank'),
    scores: document.querySelector('#scores-screen'),
    scoresList: document.querySelector('#scores-list'),
    scoresEmpty: document.querySelector('#scores-empty'),
    scoresCloseButton: document.querySelector('#scores-close-button'),
    menuScoresButton: document.querySelector('#menu-scores-button'),
    gameoverScoresButton: document.querySelector('#gameover-scores-button'),
    resetScoresButton: document.querySelector('#reset-scores-button'),
    options: document.querySelector('#options-screen'),
    musicVolume: document.querySelector('#music-volume'),
    musicVolumeValue: document.querySelector('#music-volume-value'),
    effectsVolume: document.querySelector('#effects-volume'),
    effectsVolumeValue: document.querySelector('#effects-volume-value'),
    settingToggles: Array.from(document.querySelectorAll('[data-setting]')),
    muteButton: document.querySelector('#mute-button'),
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
      elements.settingToggles.forEach((toggle) => {
        toggle.addEventListener('change', () => {
          actions.onSettingChange(toggle.dataset.setting, toggle.checked);
        });
      });
      elements.muteButton.addEventListener('click', actions.onToggleMute);
      elements.menuScoresButton.addEventListener('click', actions.onOpenScores);
      elements.gameoverScoresButton.addEventListener('click', actions.onOpenScores);
      elements.scoresCloseButton.addEventListener('click', actions.onCloseScores);
      elements.scores.addEventListener('click', (event) => {
        if (event.target === elements.scores) {
          actions.onCloseScores();
        }
      });
      elements.resetScoresButton.addEventListener('click', actions.onResetScores);
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
      const muted = musicVolume <= 0 && effectsVolume <= 0;
      elements.muteButton.classList.toggle('chip--muted', muted);
      elements.muteButton.setAttribute('aria-pressed', String(muted));
      elements.muteButton.setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound');
    },

    setSettings(settings) {
      elements.settingToggles.forEach((toggle) => {
        if (toggle.dataset.setting in settings) {
          toggle.checked = Boolean(settings[toggle.dataset.setting]);
        }
      });
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

    showGameOver({ score, bestScore, longestStreak, bestStreak, canContinue, rank = 0 }) {
      elements.gameoverRank.hidden = rank === 0;
      elements.gameoverRank.textContent = rank === 1 ? 'New #1 in your top 10!' : `#${rank} of your top 10`;
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

    showScores(list, currentId = null) {
      elements.scoresList.replaceChildren(
        ...list.map((entry, index) => {
          const row = document.createElement('li');
          row.classList.toggle('scores-list__row--current', currentId != null && entry.id === currentId);
          const rank = document.createElement('span');
          rank.className = 'scores-list__rank';
          rank.textContent = `#${index + 1}`;
          const score = document.createElement('span');
          score.className = 'scores-list__score';
          score.textContent = String(entry.score);
          const meta = document.createElement('span');
          meta.className = 'scores-list__meta';
          meta.textContent = [entry.streak > 0 ? `streak x${entry.streak}` : '', entry.date ?? '']
            .filter(Boolean)
            .join(' · ');
          row.append(rank, score, meta);
          return row;
        })
      );
      elements.scoresEmpty.hidden = list.length > 0;
      elements.scores.classList.add('options-screen--active');
      elements.scores.setAttribute('aria-hidden', 'false');
    },

    hideScores() {
      elements.scores.classList.remove('options-screen--active');
      elements.scores.setAttribute('aria-hidden', 'true');
    },

    isScoresOpen() {
      return elements.scores.classList.contains('options-screen--active');
    },

    setContinueBusy(isBusy) {
      elements.continueButton.disabled = isBusy;
      elements.continueButton.textContent = isBusy ? 'Watching...' : 'Continue Once';
    },

    setRemoveAdsOwned(owned) {
      setRemoveAdsLabel(owned);
    },

    setRemoveAdsAvailable(available) {
      elements.removeAdsButton.hidden = !available;
      elements.gameoverRemoveAds.hidden = !available;
    },

    toast(message) {
      showToast(message);
    }
  };
}
