import test from 'node:test';
import assert from 'node:assert/strict';

import { GameEngine, resolvePlacement } from '../src/game.js';

test('GameEngine increases move speed by 10 percent every 10 placed blocks', () => {
  const game = new GameEngine();
  game.startRun();

  assert.equal(game.currentBlock.speed, 24);

  game.blocks = Array.from({ length: 11 }, (_, index) => ({
    x: 50,
    y: index * game.blockHeight,
    width: game.initialBlockWidth,
    colorIndex: index
  }));
  game.spawnNextBlock();
  assert.ok(Math.abs(game.currentBlock.speed - 26.4) < 1e-9);

  game.blocks = Array.from({ length: 21 }, (_, index) => ({
    x: 50,
    y: index * game.blockHeight,
    width: game.initialBlockWidth,
    colorIndex: index
  }));
  game.spawnNextBlock();
  assert.ok(Math.abs(game.currentBlock.speed - 29.04) < 1e-9);
});

test('GameEngine caps progression speed at 10x the initial speed', () => {
  const game = new GameEngine();
  game.startRun();

  game.blocks = Array.from({ length: 500 }, (_, index) => ({
    x: 50,
    y: index * game.blockHeight,
    width: game.initialBlockWidth,
    colorIndex: index
  }));

  game.spawnNextBlock();

  assert.equal(game.currentBlock.speed, 240);
});

test('GameEngine increases moving block speed by 20 percent on each wall hit', () => {
  const game = new GameEngine();
  game.startRun();

  const maxX = game.worldWidth - game.currentBlock.width * 0.5;
  const minX = game.currentBlock.width * 0.5;

  game.currentBlock.x = maxX - 1;
  game.currentBlock.direction = 1;
  game.currentBlock.speed = 10;
  game.updateCurrentBlock(0.2);

  assert.equal(game.currentBlock.x, maxX);
  assert.equal(game.currentBlock.direction, -1);
  assert.ok(Math.abs(game.currentBlock.speed - 12) < 1e-9);

  game.currentBlock.x = minX + 1;
  game.currentBlock.direction = -1;
  game.updateCurrentBlock(0.2);

  assert.equal(game.currentBlock.x, minX);
  assert.equal(game.currentBlock.direction, 1);
  assert.ok(Math.abs(game.currentBlock.speed - 14.4) < 1e-9);
});

test('GameEngine caps wall-hit speed growth at 10x the initial speed', () => {
  const game = new GameEngine();
  game.startRun();

  const maxX = game.worldWidth - game.currentBlock.width * 0.5;
  game.currentBlock.x = maxX - 1;
  game.currentBlock.direction = 1;
  game.currentBlock.speed = 235;

  game.updateCurrentBlock(0.2);

  assert.equal(game.currentBlock.x, maxX);
  assert.equal(game.currentBlock.direction, -1);
  assert.equal(game.currentBlock.speed, 240);
});

test('GameEngine keeps the moving block exactly as narrow as the top block', () => {
  const game = new GameEngine();
  game.startRun();

  game.blocks = [
    { x: 50, y: 0, width: game.initialBlockWidth, colorIndex: 0 },
    { x: 50, y: game.blockHeight, width: 5, colorIndex: 1 }
  ];

  game.spawnNextBlock();

  assert.equal(game.currentBlock.width, 5);
});

test('GameEngine marks every 10th placeable block as golden', () => {
  const game = new GameEngine();
  game.startRun();

  game.blocks = Array.from({ length: 10 }, (_, index) => ({
    x: 50,
    y: index * game.blockHeight,
    width: game.initialBlockWidth,
    colorIndex: index
  }));

  game.spawnNextBlock();

  assert.equal(game.currentBlock.isGolden, true);

  game.blocks.push({
    x: 50,
    y: 10 * game.blockHeight,
    width: game.initialBlockWidth,
    colorIndex: 10,
    isGolden: true
  });
  game.spawnNextBlock();

  assert.equal(game.currentBlock.isGolden, false);
});

test('resolvePlacement trims the overhang and reports the cut piece', () => {
  const result = resolvePlacement(
    { x: 50, width: 40 },
    { x: 58, width: 40 },
    1.5
  );

  assert.equal(result.type, 'place');
  assert.equal(result.perfect, false);
  assert.equal(result.overlapWidth, 32);
  assert.equal(result.settledBlock.x, 54);
  assert.equal(result.cutPiece.width, 8);
  assert.equal(result.cutPiece.x, 74);
  assert.equal(result.bonus, 0);
});

test('resolvePlacement snaps a near-perfect drop into place and awards a bonus', () => {
  const result = resolvePlacement(
    { x: 50, width: 28 },
    { x: 50.8, width: 28 },
    1.5
  );

  assert.equal(result.type, 'place');
  assert.equal(result.perfect, true);
  assert.equal(result.overlapWidth, 28);
  assert.equal(result.settledBlock.x, 50);
  assert.equal(result.cutPiece, null);
  assert.equal(result.bonus, 1);
});

test('resolvePlacement returns a miss when blocks do not overlap', () => {
  const result = resolvePlacement(
    { x: 50, width: 20 },
    { x: 80, width: 20 },
    1.5
  );

  assert.deepEqual(result, { type: 'miss' });
});

test('GameEngine adds escalating streak bonuses for consecutive perfect drops', () => {
  const game = new GameEngine({ bestScore: 0, bestStreak: 0 });
  game.startRun();

  game.currentBlock.x = 50;
  let outcome = game.dropCurrent();
  assert.equal(outcome.type, 'place');
  assert.equal(game.score, 2);
  assert.equal(game.perfectStreak, 1);
  assert.equal(game.longestStreak, 1);

  game.update(0.1);
  game.currentBlock.x = 50;
  outcome = game.dropCurrent();
  assert.equal(outcome.type, 'place');
  assert.equal(game.score, 5);
  assert.equal(game.perfectStreak, 2);
  assert.equal(game.longestStreak, 2);

  game.update(0.1);
  game.currentBlock.x = 50;
  outcome = game.dropCurrent();
  assert.equal(outcome.type, 'place');
  assert.equal(game.score, 9);
  assert.equal(game.perfectStreak, 3);
  assert.equal(game.longestStreak, 3);
});

test('GameEngine triples points for a golden perfect block after streak bonuses', () => {
  const game = new GameEngine({ bestScore: 0, bestStreak: 0 });
  game.startRun();

  game.blocks = Array.from({ length: 10 }, (_, index) => ({
    x: 50,
    y: index * game.blockHeight,
    width: game.initialBlockWidth,
    colorIndex: index
  }));

  game.score = 9;
  game.perfectStreak = 2;
  game.longestStreak = 2;
  game.spawnNextBlock();

  assert.equal(game.currentBlock.isGolden, true);

  game.currentBlock.x = 50;
  const outcome = game.dropCurrent();

  assert.equal(outcome.type, 'place');
  assert.equal(outcome.perfect, true);
  assert.equal(game.score, 21);
  assert.equal(game.perfectStreak, 3);
  assert.equal(game.blocks.at(-1).isGolden, true);
});

test('GameEngine resets the active streak on a non-perfect drop but keeps the longest streak', () => {
  const game = new GameEngine({ bestScore: 0, bestStreak: 0 });
  game.startRun();

  game.currentBlock.x = 50;
  game.dropCurrent();
  game.update(0.1);
  game.currentBlock.x = 50;
  game.dropCurrent();

  game.update(0.1);
  game.currentBlock.x = 54;
  const outcome = game.dropCurrent();

  assert.equal(outcome.type, 'place');
  assert.equal(outcome.perfect, false);
  assert.equal(game.score, 6);
  assert.equal(game.perfectStreak, 0);
  assert.equal(game.longestStreak, 2);
});

test('GameEngine stacks successful drops, ends on a miss, and supports one continue', () => {
  const game = new GameEngine({ bestScore: 4, bestStreak: 3 });
  game.startRun();

  game.currentBlock.x = 50;
  let outcome = game.dropCurrent();
  assert.equal(outcome.type, 'place');
  assert.equal(game.score, 2);
  assert.equal(game.bestScore, 4);
  assert.equal(game.blocks.at(-1).width, game.initialBlockWidth);

  game.update(0.1);
  game.currentBlock.x = 95;
  outcome = game.dropCurrent();
  assert.equal(outcome.type, 'miss');
  assert.equal(game.state, 'gameover');
  assert.equal(game.canContinue(), true);
  assert.equal(game.bestScore, 4);
  assert.equal(game.bestStreak, 3);

  assert.equal(game.continueRun(), true);
  assert.equal(game.state, 'playing');
  assert.equal(game.canContinue(), false);
  assert.equal(game.currentBlock.width, game.blocks.at(-1).width);

  assert.equal(game.continueRun(), false);
});
