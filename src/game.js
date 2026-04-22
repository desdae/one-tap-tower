export const WORLD_WIDTH = 100;
export const BLOCK_HEIGHT = 8;
export const INITIAL_BLOCK_WIDTH = 44;
export const VISIBLE_ROWS = 8.5;

const BASE_SPEED = 24;
const SHAKE_DECAY = 8;
const WALL_BOUNCE_SPEED_MULTIPLIER = 1.2;
const MAX_SPEED = BASE_SPEED * 10;
const GOLDEN_BLOCK_INTERVAL = 10;
const GOLDEN_BLOCK_MULTIPLIER = 3;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function approach(current, target, delta) {
  if (current < target) {
    return Math.min(target, current + delta);
  }
  return Math.max(target, current - delta);
}

function blockEdges(block) {
  const halfWidth = block.width * 0.5;
  return {
    left: block.x - halfWidth,
    right: block.x + halfWidth
  };
}

export function resolvePlacement(previousBlock, currentBlock, perfectTolerance) {
  const previous = blockEdges(previousBlock);
  const current = blockEdges(currentBlock);
  const overlapLeft = Math.max(previous.left, current.left);
  const overlapRight = Math.min(previous.right, current.right);
  const overlapWidth = overlapRight - overlapLeft;

  if (overlapWidth <= 0) {
    return { type: 'miss' };
  }

  const offset = currentBlock.x - previousBlock.x;
  const perfect = Math.abs(offset) <= perfectTolerance;
  const settledWidth = perfect ? previousBlock.width : overlapWidth;
  const settledX = perfect ? previousBlock.x : overlapLeft + overlapWidth * 0.5;
  const cutWidth = Math.max(0, currentBlock.width - settledWidth);
  let cutPiece = null;

  if (cutWidth > 0) {
    const cutX =
      currentBlock.x > previousBlock.x
        ? settledX + settledWidth * 0.5 + cutWidth * 0.5
        : settledX - settledWidth * 0.5 - cutWidth * 0.5;

    cutPiece = {
      x: cutX,
      width: cutWidth,
      direction: currentBlock.x > previousBlock.x ? 1 : -1
    };
  }

  return {
    type: 'place',
    perfect,
    bonus: perfect ? 1 : 0,
    overlapWidth: settledWidth,
    settledBlock: {
      x: settledX,
      width: settledWidth
    },
    cutPiece
  };
}

export class GameEngine {
  constructor({ bestScore = 0, bestStreak = 0 } = {}) {
    this.worldWidth = WORLD_WIDTH;
    this.blockHeight = BLOCK_HEIGHT;
    this.initialBlockWidth = INITIAL_BLOCK_WIDTH;
    this.visibleRows = VISIBLE_ROWS;
    this.bestScore = bestScore;
    this.bestStreak = bestStreak;
    this.state = 'menu';

    this.blocks = [];
    this.effects = [];
    this.fallingPieces = [];
    this.events = [];

    this.score = 0;
    this.perfectStreak = 0;
    this.longestStreak = 0;
    this.cameraY = 0;
    this.spawnSide = -1;
    this.continueUsed = false;
    this.currentBlock = null;
    this.shake = 0;
    this.elapsed = 0;
    this.inputCooldown = 0;
  }

  startRun() {
    this.blocks.length = 0;
    this.effects.length = 0;
    this.fallingPieces.length = 0;
    this.events.length = 0;

    this.score = 0;
    this.perfectStreak = 0;
    this.longestStreak = 0;
    this.state = 'playing';
    this.cameraY = 0;
    this.shake = 0;
    this.elapsed = 0;
    this.continueUsed = false;
    this.spawnSide = -1;
    this.inputCooldown = 0;

    this.blocks.push({
      x: this.worldWidth * 0.5,
      y: 0,
      width: this.initialBlockWidth,
      colorIndex: 0
    });

    this.spawnNextBlock();
  }

  getTopBlock() {
    return this.blocks[this.blocks.length - 1];
  }

  getNextPlacedBlockNumber() {
    return this.blocks.length;
  }

  isGoldenBlockNumber(blockNumber) {
    return blockNumber > 0 && blockNumber % GOLDEN_BLOCK_INTERVAL === 0;
  }

  getSpeed() {
    const placedBlocks = Math.max(0, this.blocks.length - 1);
    const speedTier = Math.floor(placedBlocks / 10);
    return Math.min(MAX_SPEED, BASE_SPEED * 1.1 ** speedTier);
  }

  getPerfectTolerance() {
    return Math.max(1, 3 - this.blocks.length * 0.06);
  }

  spawnNextBlock() {
    const top = this.getTopBlock();
    const width = top.width;
    const startOnLeft = this.spawnSide < 0;
    const x = startOnLeft ? width * 0.5 : this.worldWidth - width * 0.5;
    const blockNumber = this.getNextPlacedBlockNumber();

    this.currentBlock = {
      x,
      y: top.y + this.blockHeight,
      width,
      direction: startOnLeft ? 1 : -1,
      speed: this.getSpeed(),
      isGolden: this.isGoldenBlockNumber(blockNumber)
    };

    this.spawnSide *= -1;
  }

  dropCurrent() {
    if (this.state !== 'playing' || !this.currentBlock) {
      return null;
    }

    if (this.inputCooldown > 0) {
      return null;
    }

    const top = this.getTopBlock();
    const result = resolvePlacement(top, this.currentBlock, this.getPerfectTolerance());

    if (result.type === 'miss') {
      this.pushFallingPiece(this.currentBlock, this.currentBlock.width, 0);
      this.currentBlock = null;
      this.state = 'gameover';
      this.shake = 1.1;
      this.inputCooldown = 0.12;
      this.perfectStreak = 0;
      this.updateRecords();
      this.events.push({ type: 'miss' });
      this.events.push({
        type: 'gameover',
        score: this.score,
        bestScore: this.bestScore,
        longestStreak: this.longestStreak,
        bestStreak: this.bestStreak
      });
      return result;
    }

    const placedBlock = {
      x: result.settledBlock.x,
      y: top.y + this.blockHeight,
      width: result.overlapWidth,
      colorIndex: this.blocks.length,
      isGolden: this.currentBlock.isGolden
    };

    this.blocks.push(placedBlock);

    const previousStreak = this.perfectStreak;
    let pointsAwarded = 1;

    if (result.perfect) {
      this.perfectStreak += 1;
      this.longestStreak = Math.max(this.longestStreak, this.perfectStreak);
      pointsAwarded = 1 + this.perfectStreak;
    } else {
      this.perfectStreak = 0;
    }

    if (placedBlock.isGolden) {
      pointsAwarded *= GOLDEN_BLOCK_MULTIPLIER;
    }

    this.score += pointsAwarded;
    this.updateRecords();

    if (result.cutPiece) {
      this.pushFallingPiece(
        { x: result.cutPiece.x, y: placedBlock.y, isGolden: this.currentBlock.isGolden },
        result.cutPiece.width,
        result.cutPiece.direction
      );
      this.shake = 0.5;
    } else {
      this.shake = 0.18;
    }

    this.effects.push({
      type: result.perfect ? 'perfect' : 'stack',
      text: placedBlock.isGolden
        ? `Golden +${pointsAwarded}`
        : result.perfect
          ? `Perfect +${pointsAwarded}`
          : `+${pointsAwarded}`,
      x: placedBlock.x,
      y: placedBlock.y + this.blockHeight * 0.4,
      age: 0,
      ttl: result.perfect ? 0.9 : 0.45,
      streak: this.perfectStreak,
      pointsAwarded,
      isGolden: placedBlock.isGolden
    });

    this.events.push({
      type: 'place',
      perfect: result.perfect,
      roughCut: Boolean(result.cutPiece),
      streak: this.perfectStreak,
      streakBroken: !result.perfect && previousStreak > 0,
      longestStreak: this.longestStreak,
      pointsAwarded,
      isGolden: placedBlock.isGolden
    });

    this.inputCooldown = 0.08;
    this.spawnNextBlock();
    return result;
  }

  canContinue() {
    return this.state === 'gameover' && !this.continueUsed;
  }

  continueRun() {
    if (!this.canContinue()) {
      return false;
    }

    this.state = 'playing';
    this.continueUsed = true;
    this.shake = 0.12;
    this.inputCooldown = 0.12;
    this.effects.push({
      type: 'continue',
      text: 'Continue',
      x: this.getTopBlock().x,
      y: this.getTopBlock().y + this.blockHeight,
      age: 0,
      ttl: 0.7
    });
    this.events.push({ type: 'continue' });
    this.spawnNextBlock();
    return true;
  }

  updateRecords() {
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
    }
    if (this.longestStreak > this.bestStreak) {
      this.bestStreak = this.longestStreak;
    }
  }

  pushFallingPiece(block, width, direction) {
    this.fallingPieces.push({
      x: block.x,
      y: block.y,
      width,
      height: this.blockHeight,
      vx: direction * 14,
      vy: 0,
      rotation: 0,
      spin: direction * 2.2,
      isGolden: Boolean(block.isGolden)
    });
  }

  update(dt) {
    this.elapsed += dt;
    this.inputCooldown = Math.max(0, this.inputCooldown - dt);
    this.updateCurrentBlock(dt);
    this.updateFallingPieces(dt);
    this.updateEffects(dt);
    this.updateCamera(dt);
    this.shake = approach(this.shake, 0, dt * SHAKE_DECAY);
  }

  updateCurrentBlock(dt) {
    if (this.state !== 'playing' || !this.currentBlock) {
      return;
    }

    const minX = this.currentBlock.width * 0.5;
    const maxX = this.worldWidth - this.currentBlock.width * 0.5;

    this.currentBlock.x += this.currentBlock.direction * this.currentBlock.speed * dt;

    if (this.currentBlock.x <= minX) {
      this.currentBlock.x = minX;
      this.currentBlock.direction = 1;
      this.currentBlock.speed = Math.min(
        MAX_SPEED,
        this.currentBlock.speed * WALL_BOUNCE_SPEED_MULTIPLIER
      );
    } else if (this.currentBlock.x >= maxX) {
      this.currentBlock.x = maxX;
      this.currentBlock.direction = -1;
      this.currentBlock.speed = Math.min(
        MAX_SPEED,
        this.currentBlock.speed * WALL_BOUNCE_SPEED_MULTIPLIER
      );
    }
  }

  updateFallingPieces(dt) {
    for (let i = this.fallingPieces.length - 1; i >= 0; i -= 1) {
      const piece = this.fallingPieces[i];
      piece.vy -= 90 * dt;
      piece.x += piece.vx * dt;
      piece.y += piece.vy * dt;
      piece.rotation += piece.spin * dt;

      if (piece.y < this.cameraY - 28) {
        this.fallingPieces.splice(i, 1);
      }
    }
  }

  updateEffects(dt) {
    for (let i = this.effects.length - 1; i >= 0; i -= 1) {
      const effect = this.effects[i];
      effect.age += dt;
      effect.y += dt * 4;

      if (effect.age >= effect.ttl) {
        this.effects.splice(i, 1);
      }
    }
  }

  updateCamera(dt) {
    const top = this.getTopBlock();
    if (!top) {
      this.cameraY = 0;
      return;
    }

    const target = Math.max(0, top.y - this.visibleRows * this.blockHeight);
    const smoothing = 1 - Math.exp(-dt * 8);
    this.cameraY += (target - this.cameraY) * smoothing;
  }

  consumeEvents() {
    return this.events.splice(0, this.events.length);
  }
}
