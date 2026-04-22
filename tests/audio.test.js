import test from 'node:test';
import assert from 'node:assert/strict';

import { createAudioController } from '../src/audio.js';

function createFakeContext() {
  return {
    state: 'suspended',
    currentTime: 0,
    destination: {},
    resumeCalls: 0,
    gainNodes: [],
    resume() {
      this.resumeCalls += 1;
      this.state = 'running';
      return Promise.resolve();
    },
    createOscillator() {
      return {
        type: 'sine',
        frequency: {
          setValueAtTime() {},
          linearRampToValueAtTime() {}
        },
        connect() {},
        start() {},
        stop() {}
      };
    },
    createGain() {
      const gainNode = {
        gain: {
          value: 0,
          setValueAtTime() {},
          exponentialRampToValueAtTime() {}
        },
        connect() {}
      };
      this.gainNodes.push(gainNode);
      return gainNode;
    }
  };
}

function createFakeMusic() {
  return {
    paused: true,
    currentTime: 0,
    loop: false,
    preload: '',
    volume: 1,
    playCalls: 0,
    pauseCalls: 0,
    play() {
      this.playCalls += 1;
      this.paused = false;
      return Promise.resolve();
    },
    pause() {
      this.pauseCalls += 1;
      this.paused = true;
    }
  };
}

test('audio controller applies separate music and effects volumes', async () => {
  const context = createFakeContext();
  const music = createFakeMusic();
  const musicChanges = [];
  const effectsChanges = [];

  const audio = createAudioController({
    musicVolume: 0.25,
    effectsVolume: 0.8,
    onMusicVolumeChange(value) {
      musicChanges.push(value);
    },
    onEffectsVolumeChange(value) {
      effectsChanges.push(value);
    },
    audioWindow: {
      AudioContext: function AudioContext() {
        return context;
      }
    },
    createMusic() {
      return music;
    }
  });

  assert.equal(audio.getMusicVolume(), 0.25);
  assert.equal(audio.getEffectsVolume(), 0.8);
  assert.equal(music.volume, 0.25);

  await audio.unlock();
  audio.play('place');

  assert.equal(context.resumeCalls, 1);
  assert.equal(music.playCalls, 1);
  assert.equal(context.gainNodes[0].gain.value, 0.8);

  audio.setMusicVolume(0.6);
  audio.setEffectsVolume(0.15);
  audio.play('perfect');

  assert.deepEqual(musicChanges, [0.6]);
  assert.deepEqual(effectsChanges, [0.15]);
  assert.equal(audio.getMusicVolume(), 0.6);
  assert.equal(audio.getEffectsVolume(), 0.15);
  assert.equal(music.volume, 0.6);
  assert.equal(context.gainNodes[0].gain.value, 0.15);
});

test('audio controller pauses music on app pause and resumes with current volume', async () => {
  const context = createFakeContext();
  const music = createFakeMusic();

  const audio = createAudioController({
    musicVolume: 0.35,
    effectsVolume: 0.9,
    onMusicVolumeChange() {},
    onEffectsVolumeChange() {},
    audioWindow: {
      AudioContext: function AudioContext() {
        return context;
      }
    },
    createMusic() {
      return music;
    }
  });

  await audio.unlock();
  audio.handlePause();

  assert.equal(music.pauseCalls, 1);
  assert.equal(music.paused, true);

  audio.setMusicVolume(0.5);
  audio.handleResume();

  assert.equal(music.volume, 0.5);
  assert.equal(music.playCalls, 2);
  assert.equal(music.paused, false);
});
