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
// From the 3rd perfect in a row, each perfect widens the block back toward its starting width.
const REGROW_STREAK = 3;
const REGROW_AMOUNT = 2.5;
const PERFECT_HIT_STOP = 0.05;
const SPARK_COLORS = ['#fff4bf', '#ffd666', '#ffffff'];
const CONFETTI_COLORS = ['#f4a261', '#f6bd60', '#84a59d', '#4d908e', '#f28482', '#a9e9ff', '#fff4bf'];

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
    this.particles = [];
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
    this.hitStop = 0;
    this.runStartBest = bestScore;
    this.newBestReached = false;
  }

  startRun() {
    this.blocks.length = 0;
    this.effects.length = 0;
    this.fallingPieces.length = 0;
    this.particles.length = 0;
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
    this.hitStop = 0;
    this.runStartBest = this.bestScore;
    this.newBestReached = false;

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
      isGolden: this.currentBlock.isGolden,
      landedAt: this.elapsed
    };

    this.blocks.push(placedBlock);

    const previousStreak = this.perfectStreak;
    let pointsAwarded = 1;
    let regrew = false;

    if (result.perfect) {
      this.perfectStreak += 1;
      this.longestStreak = Math.max(this.longestStreak, this.perfectStreak);
      pointsAwarded = 1 + this.perfectStreak;
      regrew = this.perfectStreak >= REGROW_STREAK && this.regrow(placedBlock);
      this.hitStop = PERFECT_HIT_STOP;
      this.spawnParticles(placedBlock.x - placedBlock.width * 0.5, placedBlock.y + this.blockHeight, 6, SPARK_COLORS, -1);
      this.spawnParticles(placedBlock.x + placedBlock.width * 0.5, placedBlock.y + this.blockHeight, 6, SPARK_COLORS, 1);
    } else {
      this.perfectStreak = 0;
    }

    if (placedBlock.isGolden) {
      pointsAwarded *= GOLDEN_BLOCK_MULTIPLIER;
    }

    this.score += pointsAwarded;
    this.updateRecords();

    const newBest = !this.newBestReached && this.runStartBest > 0 && this.score > this.runStartBest;
    if (newBest) {
      this.newBestReached = true;
      this.spawnConfetti(placedBlock.x, placedBlock.y + this.blockHeight * 2);
    }

    if (result.cutPiece) {
      this.pushFallingPiece(
        { x: result.cutPiece.x, y: placedBlock.y, isGolden: this.currentBlock.isGolden },
        result.cutPiece.width,
        result.cutPiece.direction
      );
      const cutEdge = result.cutPiece.direction > 0
        ? placedBlock.x + placedBlock.width * 0.5
        : placedBlock.x - placedBlock.width * 0.5;
      this.spawnParticles(cutEdge, placedBlock.y + this.blockHeight * 0.5, 5, ['#ffe9c4', '#ffffff'], result.cutPiece.direction);
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
      isGolden: placedBlock.isGolden,
      regrew
    });

    if (newBest) {
      this.events.push({ type: 'newbest', score: this.score, previousBest: this.runStartBest });
    }

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

  regrow(block) {
    const width = Math.min(this.initialBlockWidth, block.width + REGROW_AMOUNT);
    if (width <= block.width) {
      return false;
    }
    block.width = width;
    block.x = clamp(block.x, width * 0.5, this.worldWidth - width * 0.5);
    return true;
  }

  spawnParticles(x, y, count, colors, direction) {
    for (let i = 0; i < count; i += 1) {
      const spread = (i / Math.max(1, count - 1)) - 0.5;
      this.particles.push({
        x,
        y,
        vx: direction * (10 + (i % 3) * 6) + spread * 8,
        vy: 18 + ((i * 7) % 5) * 5,
        size: 1.2 + (i % 2) * 0.6,
        color: colors[i % colors.length],
        age: 0,
        ttl: 0.45 + (i % 3) * 0.1,
        gravity: 70
      });
    }
  }

  spawnConfetti(x, y) {
    for (let i = 0; i < 36; i += 1) {
      const angle = (i / 36) * Math.PI * 2;
      const speed = 22 + (i % 5) * 6;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + 25,
        size: 1.6 + (i % 3) * 0.5,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        age: 0,
        ttl: 1.3 + (i % 4) * 0.15,
        gravity: 40,
        spin: (i % 2 ? 1 : -1) * (4 + (i % 3)),
        confetti: true
      });
    }
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
    this.inputCooldown = Math.max(0, this.inputCooldown - dt);
    if (this.hitStop > 0) {
      // Freeze the world for a beat on a perfect drop.
      this.hitStop = Math.max(0, this.hitStop - dt);
      return;
    }
    this.elapsed += dt;
    this.updateCurrentBlock(dt);
    this.updateFallingPieces(dt);
    this.updateParticles(dt);
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

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const particle = this.particles[i];
      particle.age += dt;
      particle.vy -= particle.gravity * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;

      if (particle.age >= particle.ttl) {
        this.particles.splice(i, 1);
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
