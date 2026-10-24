const bgMusicUrl = new URL('../snd/bg_music.mp3', import.meta.url).href;
const DEFAULT_MUSIC_VOLUME = 0.35;
const DEFAULT_EFFECTS_VOLUME = 0.9;

function clampVolume(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(0, Math.min(1, parsed));
}

function createTone(context, output, frequency, duration, type, gainLevel, slideTo = frequency) {
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
  gain.connect(output);

  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
}

function createMusicElement(src) {
  if (typeof Audio === 'undefined') {
    return null;
  }

  return new Audio(src);
}

const PENTATONIC = [0, 2, 4, 7, 9];

export function streakSemitones(streak) {
  const step = Math.max(0, Math.min(10, Math.floor(streak) - 1));
  return Math.floor(step / PENTATONIC.length) * 12 + PENTATONIC[step % PENTATONIC.length];
}

export function createAudioController({
  musicVolume = DEFAULT_MUSIC_VOLUME,
  effectsVolume = DEFAULT_EFFECTS_VOLUME,
  onMusicVolumeChange = () => {},
  onEffectsVolumeChange = () => {},
  audioWindow = globalThis.window,
  createMusic = createMusicElement
}) {
  let currentMusicVolume = clampVolume(musicVolume, DEFAULT_MUSIC_VOLUME);
  let currentEffectsVolume = clampVolume(effectsVolume, DEFAULT_EFFECTS_VOLUME);
  let context = null;
  let effectsOutput = null;
  let unlocked = false;
  let pausedByLifecycle = false;
  const music = createMusic(bgMusicUrl);

  if (music) {
    music.loop = true;
    music.preload = 'auto';
    music.volume = currentMusicVolume;
  }

  function getContext() {
    if (!context) {
      const AudioContext = audioWindow?.AudioContext || audioWindow?.webkitAudioContext;
      if (!AudioContext) {
        return null;
      }
      context = new AudioContext();
    }
    return context;
  }

  function getEffectsOutput() {
    const ctx = getContext();
    if (!ctx) {
      return null;
    }

    if (!effectsOutput) {
      effectsOutput = ctx.createGain();
      effectsOutput.gain.value = currentEffectsVolume;
      effectsOutput.connect(ctx.destination);
    }

    return effectsOutput;
  }

  function syncMusicPlayback() {
    if (!music) {
      return;
    }

    music.volume = currentMusicVolume;

    if (!unlocked || pausedByLifecycle || currentMusicVolume <= 0) {
      music.pause();
      return;
    }

    const playResult = music.play();
    if (playResult && typeof playResult.catch === 'function') {
      playResult.catch(() => {});
    }
  }

  async function unlock() {
    unlocked = true;
    const ctx = getContext();
    if (ctx && ctx.state !== 'running') {
      await ctx.resume();
    }
    syncMusicPlayback();
  }

  function play(kind, { streak = 1 } = {}) {
    const ctx = getContext();
    const output = getEffectsOutput();

    if (!ctx || !output || ctx.state !== 'running' || currentEffectsVolume <= 0) {
      return;
    }

    output.gain.value = currentEffectsVolume;

    if (kind === 'perfect' || kind === 'streak') {
      // Each perfect in a row climbs one step of a major pentatonic scale.
      const ratio = 2 ** (streakSemitones(streak) / 12);
      createTone(ctx, output, 540 * ratio, 0.09, 'triangle', 0.05, 820 * ratio);
      createTone(ctx, output, 760 * ratio, 0.12, 'sine', 0.035, 1040 * ratio);
      if (kind === 'streak') {
        createTone(ctx, output, 1080 * ratio, 0.14, 'triangle', 0.022, 1520 * ratio);
      }
      return;
    }

    if (kind === 'best') {
      createTone(ctx, output, 523, 0.1, 'triangle', 0.045, 523);
      createTone(ctx, output, 659, 0.14, 'triangle', 0.04, 659);
      createTone(ctx, output, 784, 0.2, 'triangle', 0.035, 1046);
      return;
    }

    if (kind === 'toprank') {
      createTone(ctx, output, 440, 0.09, 'triangle', 0.04, 440);
      createTone(ctx, output, 587, 0.16, 'triangle', 0.035, 880);
      return;
    }

    if (kind === 'place') {
      createTone(ctx, output, 350, 0.08, 'triangle', 0.04, 420);
      return;
    }

    if (kind === 'cut') {
      createTone(ctx, output, 230, 0.09, 'square', 0.03, 180);
      return;
    }

    if (kind === 'continue') {
      createTone(ctx, output, 320, 0.1, 'triangle', 0.04, 520);
      return;
    }

    if (kind === 'miss') {
      createTone(ctx, output, 180, 0.22, 'sawtooth', 0.035, 120);
    }
  }

  function setMusicVolume(value) {
    currentMusicVolume = clampVolume(value, DEFAULT_MUSIC_VOLUME);
    syncMusicPlayback();
    onMusicVolumeChange(currentMusicVolume);
  }

  function setEffectsVolume(value) {
    currentEffectsVolume = clampVolume(value, DEFAULT_EFFECTS_VOLUME);
    if (effectsOutput) {
      effectsOutput.gain.value = currentEffectsVolume;
    }
    onEffectsVolumeChange(currentEffectsVolume);
  }

  return {
    play,
    unlock,
    getMusicVolume() {
      return currentMusicVolume;
    },
    setMusicVolume,
    getEffectsVolume() {
      return currentEffectsVolume;
    },
    setEffectsVolume,
    handlePause() {
      pausedByLifecycle = true;
      if (music) {
        music.pause();
      }
    },
    handleResume() {
      pausedByLifecycle = false;
      syncMusicPlayback();
    }
  };
}
