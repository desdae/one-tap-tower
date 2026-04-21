function setHidden(element, hidden) {
  element.classList.toggle('screen--active', !hidden);
}

export function createUI() {
  const elements = {
    score: document.querySelector('#score-value'),
    best: document.querySelector('#best-value'),
    toast: document.querySelector('#toast'),
    menu: document.querySelector('#menu-screen'),
    menuBest: document.querySelector('#menu-best'),
    gameover: document.querySelector('#gameover-screen'),
    gameoverScore: document.querySelector('#gameover-score'),
    gameoverBest: document.querySelector('#gameover-best'),
    playButton: document.querySelector('#play-button'),
    restartButton: document.querySelector('#restart-button'),
    continueButton: document.querySelector('#continue-button'),
    soundToggle: document.querySelector('#sound-toggle'),
    menuSoundButton: document.querySelector('#menu-sound-button'),
    removeAdsButton: document.querySelector('#remove-ads-button'),
    gameoverRemoveAds: document.querySelector('#gameover-remove-ads')
  };

  let toastTimer = 0;

  function setSoundLabel(enabled) {
    const label = enabled ? 'Sound On' : 'Sound Off';
    elements.soundToggle.textContent = label;
    elements.menuSoundButton.textContent = label;
  }

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

  return {
    bind(actions) {
      elements.playButton.addEventListener('click', actions.onPlay);
      elements.restartButton.addEventListener('click', actions.onRestart);
      elements.continueButton.addEventListener('click', actions.onContinue);
      elements.soundToggle.addEventListener('click', actions.onToggleSound);
      elements.menuSoundButton.addEventListener('click', actions.onToggleSound);
      elements.removeAdsButton.addEventListener('click', actions.onRemoveAds);
      elements.gameoverRemoveAds.addEventListener('click', actions.onRemoveAds);
    },

    setHud({ score, bestScore }) {
      elements.score.textContent = String(score);
      elements.best.textContent = String(bestScore);
    },

    showMenu(bestScore) {
      setHidden(elements.menu, false);
      setHidden(elements.gameover, true);
      elements.menuBest.textContent = `Best score: ${bestScore}`;
    },

    showGameplay() {
      setHidden(elements.menu, true);
      setHidden(elements.gameover, true);
    },

    showGameOver({ score, bestScore, canContinue }) {
      elements.gameoverScore.textContent = `Score: ${score}`;
      elements.gameoverBest.textContent = `Best score: ${bestScore}`;
      elements.continueButton.hidden = !canContinue;
      setHidden(elements.menu, true);
      setHidden(elements.gameover, false);
    },

    setContinueBusy(isBusy) {
      elements.continueButton.disabled = isBusy;
      elements.continueButton.textContent = isBusy ? 'Watching…' : 'Continue Once';
    },

    setSoundEnabled(enabled) {
      setSoundLabel(enabled);
    },

    setRemoveAdsOwned(owned) {
      setRemoveAdsLabel(owned);
    },

    toast(message) {
      showToast(message);
    }
  };
}
