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

test('GameEngine stacks successful drops, ends on a miss, and supports one continue', () => {
  const game = new GameEngine({ bestScore: 4 });
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

  assert.equal(game.continueRun(), true);
  assert.equal(game.state, 'playing');
  assert.equal(game.canContinue(), false);
  assert.equal(game.currentBlock.width, game.blocks.at(-1).width);

  assert.equal(game.continueRun(), false);
});
