import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { GameEngine } from '../src/game.js';
import { createHaptics } from '../src/haptics.js';
import { createStorage } from '../src/storage.js';

function memoryArea() {
  const state = new Map();
  return {
    getItem: (key) => (state.has(key) ? state.get(key) : null),
    setItem: (key, value) => state.set(key, String(value))
  };
}

test('feel settings default to on, except reduced effects which follows the phone', () => {
  const storage = createStorage(memoryArea());
  assert.equal(storage.getVibration(), true);
  assert.equal(storage.getScreenShake(), true);
  assert.equal(storage.getComboPopups(), true);
  assert.equal(storage.getReducedEffects(false), false);
  assert.equal(storage.getReducedEffects(true), true);
});

test('feel settings round-trip, and a saved choice beats the phone default', () => {
  const storage = createStorage(memoryArea());
  storage.setVibration(false);
  storage.setScreenShake(false);
  storage.setComboPopups(false);
  storage.setReducedEffects(false);
  assert.equal(storage.getVibration(), false);
  assert.equal(storage.getScreenShake(), false);
  assert.equal(storage.getComboPopups(), false);
  assert.equal(storage.getReducedEffects(true), false);
});

test('mute remembers the slider levels and never restores to silence', () => {
  const storage = createStorage(memoryArea());
  assert.deepEqual(storage.getVolumesBeforeMute(), { musicVolume: 0.35, effectsVolume: 0.9 });
  storage.setVolumesBeforeMute({ musicVolume: 0.2, effectsVolume: 0 });
  assert.deepEqual(storage.getVolumesBeforeMute(), { musicVolume: 0.2, effectsVolume: 0 });
  storage.setVolumesBeforeMute({ musicVolume: 0, effectsVolume: 0 });
  assert.deepEqual(storage.getVolumesBeforeMute(), { musicVolume: 0.35, effectsVolume: 0.9 });
});

test('disabled haptics do not vibrate until switched back on', () => {
  const patterns = [];
  const haptics = createHaptics({ platform: { isNative: false }, nav: { vibrate: (p) => patterns.push(p) }, enabled: false });
  haptics.place();
  haptics.miss();
  assert.deepEqual(patterns, []);
  haptics.setEnabled(true);
  haptics.place();
  assert.deepEqual(patterns, [12]);
});

test('reduced effects skip the freeze-frame and particles but score the same', () => {
  const play = (reducedEffects) => {
    const game = new GameEngine({ bestScore: 1, reducedEffects });
    game.startRun();
    for (let i = 0; i < 3; i += 1) {
      game.update(0.1);
      game.currentBlock.x = game.getTopBlock().x;
      game.dropCurrent();
    }
    return game;
  };
  const full = play(false);
  const reduced = play(true);
  assert.ok(full.particles.length > 0);
  assert.ok(full.hitStop > 0);
  assert.equal(reduced.particles.length, 0);
  assert.equal(reduced.hitStop, 0);
  assert.equal(reduced.score, full.score);
  assert.equal(reduced.getTopBlock().width, full.getTopBlock().width);
});

test('options list every feel toggle and the top bar has a mute button', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const setting of ['vibration', 'screenShake', 'comboPopups', 'reducedEffects']) {
    assert.ok(html.includes(`data-setting="${setting}"`), setting);
  }
  assert.ok(html.includes('id="mute-button"'));
});
