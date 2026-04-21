function createTone(context, frequency, duration, type, gainLevel, slideTo = frequency) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const now = context.currentTime;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  oscillator.frequency.linearRampToValueAtTime(slideTo, now + duration);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(gainLevel, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
}

export function createAudioController({ enabled, onToggle }) {
  let soundEnabled = enabled;
  let context = null;

  function getContext() {
    if (!context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) {
        return null;
      }
      context = new AudioContext();
    }
    return context;
  }

  async function unlock() {
    if (!soundEnabled) {
      return;
    }
    const ctx = getContext();
    if (!ctx || ctx.state === 'running') {
      return;
    }
    await ctx.resume();
  }

  function play(kind) {
    if (!soundEnabled) {
      return;
    }

    const ctx = getContext();
    if (!ctx || ctx.state !== 'running') {
      return;
    }

    if (kind === 'perfect') {
      createTone(ctx, 540, 0.09, 'triangle', 0.05, 820);
      createTone(ctx, 760, 0.12, 'sine', 0.035, 1040);
      return;
    }

    if (kind === 'streak') {
      createTone(ctx, 620, 0.08, 'triangle', 0.045, 920);
      createTone(ctx, 860, 0.11, 'sine', 0.03, 1260);
      createTone(ctx, 1080, 0.14, 'triangle', 0.022, 1520);
      return;
    }

    if (kind === 'place') {
      createTone(ctx, 350, 0.08, 'triangle', 0.04, 420);
      return;
    }

    if (kind === 'cut') {
      createTone(ctx, 230, 0.09, 'square', 0.03, 180);
      return;
    }

    if (kind === 'continue') {
      createTone(ctx, 320, 0.1, 'triangle', 0.04, 520);
      return;
    }

    if (kind === 'miss') {
      createTone(ctx, 180, 0.22, 'sawtooth', 0.035, 120);
    }
  }

  function setEnabled(value) {
    soundEnabled = value;
    onToggle(soundEnabled);
  }

  return {
    play,
    unlock,
    isEnabled() {
      return soundEnabled;
    },
    toggle() {
      setEnabled(!soundEnabled);
      return soundEnabled;
    }
  };
}
