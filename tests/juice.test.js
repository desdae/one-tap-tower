import test from 'node:test';
import assert from 'node:assert/strict';

import { streakSemitones } from '../src/audio.js';
import { GameEngine } from '../src/game.js';
import { createHaptics } from '../src/haptics.js';

function dropPerfect(game) {
  game.update(0.1);
  game.currentBlock.x = game.getTopBlock().x;
  return game.dropCurrent();
}

function dropOffset(game, offset) {
  game.update(0.1);
  game.currentBlock.x = game.getTopBlock().x + offset;
  return game.dropCurrent();
}

test('perfect streaks of 3 or more regrow the block toward its starting width', () => {
  const game = new GameEngine();
  game.startRun();

  // Trim the tower to 34 wide: offset 10 from a 44-wide block keeps 34.
  dropOffset(game, 10);
  assert.equal(game.getTopBlock().width, 34);

  dropPerfect(game);
  dropPerfect(game);
  assert.equal(game.getTopBlock().width, 34);

  dropPerfect(game);
  assert.equal(game.perfectStreak, 3);
  assert.equal(game.getTopBlock().width, 36.5);
  assert.equal(game.currentBlock.width, 36.5);
  const placeEvents = game.consumeEvents().filter((event) => event.type === 'place');
  assert.equal(placeEvents.at(-1).regrew, true);
});

test('regrowing never exceeds the starting width or leaves the play area', () => {
  const game = new GameEngine();
  game.startRun();
  const block = { x: 99, width: 43 };

  assert.equal(game.regrow(block), true);
  assert.equal(block.width, game.initialBlockWidth);
  assert.equal(block.x, game.worldWidth - game.initialBlockWidth * 0.5);
  assert.equal(game.regrow(block), false);
});

test('a perfect drop briefly freezes the world', () => {
  const game = new GameEngine();
  game.startRun();
  game.currentBlock.x = 50;
  game.dropCurrent();

  const x = game.currentBlock.x;
  game.update(0.03);
  assert.equal(game.currentBlock.x, x);
  game.update(0.03);
  game.update(0.03);
  assert.notEqual(game.currentBlock.x, x);
});

test('passing the previous best mid-run fires one newbest event with confetti', () => {
  const game = new GameEngine({ bestScore: 3 });
  game.startRun();

  dropOffset(game, 5); // +1
  dropOffset(game, 5); // +1
  dropOffset(game, 5); // +1, ties the best
  assert.equal(game.consumeEvents().some((event) => event.type === 'newbest'), false);

  dropOffset(game, 5); // 4 > 3
  const events = game.consumeEvents();
  const newBest = events.find((event) => event.type === 'newbest');
  assert.deepEqual(newBest, { type: 'newbest', score: 4, previousBest: 3 });
  assert.ok(game.particles.some((particle) => particle.confetti));

  dropOffset(game, 5);
  assert.equal(game.consumeEvents().some((event) => event.type === 'newbest'), false);
});

test('the first ever run does not celebrate a new best', () => {
  const game = new GameEngine({ bestScore: 0 });
  game.startRun();
  dropOffset(game, 5);
  assert.equal(game.consumeEvents().some((event) => event.type === 'newbest'), false);
});

test('streak notes climb a pentatonic scale and stop rising after two octaves', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map(streakSemitones), [0, 2, 4, 7, 9, 12, 14]);
  assert.equal(streakSemitones(11), 24);
  assert.equal(streakSemitones(40), 24);
});

test('haptics use the native plugin on Android and navigator.vibrate in the browser', async () => {
  const calls = [];
  const plugin = {
    impact: (options) => calls.push(['impact', options.style]),
    notification: (options) => calls.push(['notification', options.type])
  };
  const native = createHaptics({ platform: { isNative: true }, haptics: plugin, nav: {} });
  native.place();
  native.perfect(1);
  native.perfect(3);
  native.miss();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(calls, [
    ['impact', 'LIGHT'],
    ['impact', 'HEAVY'],
    ['notification', 'SUCCESS'],
    ['notification', 'ERROR']
  ]);

  const patterns = [];
  const browser = createHaptics({ platform: { isNative: false }, haptics: plugin, nav: { vibrate: (p) => patterns.push(p) } });
  browser.cut();
  browser.miss();
  assert.deepEqual(patterns, [20, [40, 30, 60]]);
});
