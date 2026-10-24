import test from 'node:test';
import assert from 'node:assert/strict';

import { GameEngine } from '../src/game.js';
import { insertScore, liveRank, normalizeTopScores } from '../src/leaderboard.js';
import { createStorage } from '../src/storage.js';

function memoryArea(initial = {}) {
  const state = new Map(Object.entries(initial));
  return {
    getItem: (key) => (state.has(key) ? state.get(key) : null),
    setItem: (key, value) => state.set(key, String(value))
  };
}

test('runs are ranked highest first, ties keep the older run ahead, and the list stops at 10', () => {
  let list = [];
  const ranks = [];
  for (const [i, score] of [5, 9, 7, 9].entries()) {
    const result = insertScore(list, { id: `r${i}`, score, streak: 1, date: '2026-10-24' });
    list = result.list;
    ranks.push(result.rank);
  }
  assert.deepEqual(ranks, [1, 1, 2, 2]);
  assert.deepEqual(list.map((e) => e.id), ['r1', 'r3', 'r2', 'r0']);

  for (let i = 0; i < 10; i += 1) {
    list = insertScore(list, { id: `x${i}`, score: 20 + i }).list;
  }
  assert.equal(list.length, 10);
  assert.equal(list.at(-1).score, 20);
  assert.equal(insertScore(list, { id: 'low', score: 3 }).rank, 0);
  assert.equal(insertScore(list, { id: 'zero', score: 0 }).rank, 0);
});

test('a continued run replaces its own earlier entry', () => {
  let { list } = insertScore([], { id: 'a', score: 4 });
  list = insertScore(list, { id: 'run', score: 3 }).list;
  const result = insertScore(list, { id: 'run', score: 8 });
  assert.equal(result.rank, 1);
  assert.deepEqual(result.list.map((e) => [e.id, e.score]), [['run', 8], ['a', 4]]);
});

test('an existing best score becomes #1 of the new list', () => {
  const storage = createStorage(memoryArea({ 'oneTapTower.bestScore': '42', 'oneTapTower.bestStreak': '6' }));
  assert.deepEqual(storage.getTopScores(), [{ id: null, score: 42, streak: 6, date: null }]);
  assert.deepEqual(normalizeTopScores('junk'), []);

  storage.setTopScores([{ id: 'b', score: 10, streak: 2, date: '2026-10-24' }, { id: 'a', score: 50, streak: 3, date: null }]);
  assert.deepEqual(storage.getTopScores().map((e) => e.score), [50, 10]);
  storage.resetScores();
  assert.deepEqual(storage.getTopScores(), []);
  assert.equal(storage.getBestScore(), 0);
});

test('liveRank places the score among the starting top scores', () => {
  assert.equal(liveRank([30, 20, 10], 5), 0);
  assert.equal(liveRank([30, 20, 10], 10), 0);
  assert.equal(liveRank([30, 20, 10], 11), 3);
  assert.equal(liveRank([30, 20, 10], 25), 2);
  assert.equal(liveRank([30, 20, 10], 31), 1);
});

function dropOffset(game, offset) {
  game.update(0.1);
  game.currentBlock.x = game.getTopBlock().x + offset;
  game.dropCurrent();
  return game.consumeEvents();
}

test('passing the #3 and #2 scores pops up once each, then #1 is the new best', () => {
  const game = new GameEngine({ bestScore: 6, topScores: [6, 4, 2] });
  game.startRun();
  const ranks = [];
  const bests = [];
  for (let i = 0; i < 8; i += 1) {
    const events = dropOffset(game, 3); // +1 point per drop, never perfect
    events.filter((e) => e.type === 'toprank').forEach((e) => ranks.push([game.score, e.rank]));
    events.filter((e) => e.type === 'newbest').forEach(() => bests.push(game.score));
  }
  assert.deepEqual(ranks, [[3, 3], [5, 2]]);
  assert.deepEqual(bests, [7]);
});

test('no rank pop-ups until three scores exist', () => {
  const game = new GameEngine({ bestScore: 5, topScores: [5, 2] });
  game.startRun();
  const events = [];
  for (let i = 0; i < 4; i += 1) {
    events.push(...dropOffset(game, 3));
  }
  assert.equal(events.some((e) => e.type === 'toprank'), false);
});
