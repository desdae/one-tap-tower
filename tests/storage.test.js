import test from 'node:test';
import assert from 'node:assert/strict';

import { createStorage } from '../src/storage.js';

function createMemoryStorage(initial = {}) {
  const state = new Map(Object.entries(initial));

  return {
    getItem(key) {
      return state.has(key) ? state.get(key) : null;
    },
    setItem(key, value) {
      state.set(key, String(value));
    }
  };
}

test('storage returns default music and effects volumes', () => {
  const storage = createStorage(createMemoryStorage());

  assert.equal(storage.getMusicVolume(), 0.35);
  assert.equal(storage.getEffectsVolume(), 0.9);
});

test('storage persists clamped music and effects volumes', () => {
  const area = createMemoryStorage();
  const storage = createStorage(area);

  storage.setMusicVolume(2);
  storage.setEffectsVolume(-1);

  assert.equal(storage.getMusicVolume(), 1);
  assert.equal(storage.getEffectsVolume(), 0);
});
