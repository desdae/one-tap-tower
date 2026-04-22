import { BackgroundRenderer } from './background.js';

const BLOCK_COLORS = ['#f4a261', '#f6bd60', '#84a59d', '#4d908e', '#577590', '#f28482'];

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width * 0.25, height * 0.4);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawBlock(ctx, x, y, width, height, fill) {
  ctx.save();
  ctx.shadowColor = 'rgba(15, 22, 33, 0.18)';
  ctx.shadowBlur = Math.max(8, height * 0.25);
  ctx.shadowOffsetY = Math.max(3, height * 0.12);
  roundedRect(ctx, x, y, width, height, Math.max(4, height * 0.15));
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(x + 4, y + 4, Math.max(0, width - 8), Math.max(2, height * 0.16));
  ctx.restore();
}

export class Renderer {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.game = game;
    this.background = new BackgroundRenderer();
    this.pixelRatio = 1;
    this.width = 0;
    this.height = 0;
    this.scale = 1;
  }

  resize(width, height, pixelRatio = window.devicePixelRatio || 1) {
    this.pixelRatio = Math.min(pixelRatio, 2);
    this.width = width;
    this.height = height;

    this.canvas.width = Math.floor(width * this.pixelRatio);
    this.canvas.height = Math.floor(height * this.pixelRatio);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    this.background.resize(width, height);
    this.scale = Math.min(
      (width - 28) / (this.game.worldWidth + 6),
      (height - 176) / ((this.game.visibleRows + 2.8) * this.game.blockHeight)
    );
  }

  worldToScreenX(x, shakeX) {
    const centered = (this.width - this.game.worldWidth * this.scale) * 0.5;
    return centered + x * this.scale + shakeX;
  }

  worldToScreenY(y, shakeY) {
    const bottomPadding = 88;
    return (
      this.height -
      bottomPadding -
      (y - this.game.cameraY) * this.scale -
      this.game.blockHeight * this.scale +
      shakeY
    );
  }

  render() {
    const { ctx } = this;
    const shakeX = Math.sin(this.game.elapsed * 48) * this.game.shake * 6;
    const shakeY = Math.cos(this.game.elapsed * 34) * this.game.shake * 3;

    ctx.clearRect(0, 0, this.width, this.height);
    this.background.render(ctx, this.game.elapsed);

    this.drawShadowGround(shakeY);
    this.drawBlocks(shakeX, shakeY);
    this.drawCurrentBlock(shakeX, shakeY);
    this.drawStreakAura(shakeX, shakeY);
    this.drawStreakBanner();
    this.drawEffects(shakeX, shakeY);
  }

  drawShadowGround(shakeY) {
    const { ctx } = this;
    ctx.save();
    ctx.fillStyle = 'rgba(33, 24, 12, 0.16)';
    ctx.fillRect(0, this.height - 84 + shakeY, this.width, 84);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(0, this.height - 84 + shakeY, this.width, 1);
    ctx.restore();
  }

  drawBlocks(shakeX, shakeY) {
    const { ctx } = this;
    const height = this.game.blockHeight * this.scale;

    for (let i = 0; i < this.game.blocks.length; i += 1) {
      const block = this.game.blocks[i];
      const x = this.worldToScreenX(block.x - block.width * 0.5, shakeX);
      const y = this.worldToScreenY(block.y, shakeY);
      const width = block.width * this.scale;
      const color = BLOCK_COLORS[block.colorIndex % BLOCK_COLORS.length];
      drawBlock(ctx, x, y, width, height, color);
    }

    for (let i = 0; i < this.game.fallingPieces.length; i += 1) {
      const piece = this.game.fallingPieces[i];
      const width = piece.width * this.scale;
      const x = this.worldToScreenX(piece.x, shakeX);
      const y = this.worldToScreenY(piece.y, shakeY);

      ctx.save();
      ctx.translate(x, y + height * 0.5);
      ctx.rotate(piece.rotation);
      drawBlock(
        ctx,
        -width * 0.5,
        -height * 0.5,
        width,
        height,
        'rgba(255, 235, 188, 0.92)'
      );
      ctx.restore();
    }
  }

  drawCurrentBlock(shakeX, shakeY) {
    if (!this.game.currentBlock || this.game.state !== 'playing') {
      return;
    }

    const { ctx } = this;
    const block = this.game.currentBlock;
    const x = this.worldToScreenX(block.x - block.width * 0.5, shakeX);
    const y = this.worldToScreenY(block.y, shakeY);

    if (this.game.perfectStreak > 0) {
      const streakGlow = Math.min(1, this.game.perfectStreak / 6);
      ctx.save();
      ctx.fillStyle = `rgba(255, 238, 170, ${(0.08 + streakGlow * 0.12).toFixed(3)})`;
      ctx.shadowColor = 'rgba(255, 224, 130, 0.42)';
      ctx.shadowBlur = 16 + streakGlow * 24;
      roundedRect(
        ctx,
        x - 3,
        y - 3,
        block.width * this.scale + 6,
        this.game.blockHeight * this.scale + 6,
        this.game.blockHeight * this.scale * 0.28
      );
      ctx.fill();
      ctx.restore();
    }

    drawBlock(
      ctx,
      x,
      y,
      block.width * this.scale,
      this.game.blockHeight * this.scale,
      '#f7f7fb'
    );
  }

  drawStreakAura(shakeX, shakeY) {
    if (this.game.perfectStreak < 2) {
      return;
    }

    const { ctx } = this;
    const top = this.game.getTopBlock();
    const streakPower = Math.min(1, this.game.perfectStreak / 7);
    const centerX = this.worldToScreenX(top.x, shakeX);
    const centerY = this.worldToScreenY(top.y, shakeY) + this.game.blockHeight * this.scale * 0.45;
    const baseRadius = Math.max(20, top.width * this.scale * 0.9);

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = `rgba(255, 226, 156, ${(0.12 + streakPower * 0.16).toFixed(3)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, baseRadius + Math.sin(this.game.elapsed * 5) * 2, 0, Math.PI * 2);
    ctx.stroke();

    if (this.game.perfectStreak >= 4) {
      ctx.strokeStyle = `rgba(170, 232, 255, ${(0.08 + streakPower * 0.12).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius + 12 + Math.cos(this.game.elapsed * 4.2) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawStreakBanner() {
    if (this.game.perfectStreak < 2) {
      return;
    }

    const { ctx } = this;
    const streakPower = Math.min(1, this.game.perfectStreak / 7);
    const centerX = this.width * 0.5;
    const y = 126;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = `700 ${18 + Math.round(streakPower * 6)}px system-ui, sans-serif`;
    ctx.fillStyle = `rgba(255, 247, 213, ${(0.74 + streakPower * 0.18).toFixed(3)})`;
    ctx.shadowColor = 'rgba(255, 208, 122, 0.38)';
    ctx.shadowBlur = 18;
    ctx.fillText(`STREAK x${this.game.perfectStreak}`, centerX, y);

    ctx.shadowBlur = 0;
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(209, 235, 255, 0.78)';
    ctx.fillText(`Next perfect +${this.game.perfectStreak + 2}`, centerX, y + 18);
    ctx.restore();
  }

  drawEffects(shakeX, shakeY) {
    const { ctx } = this;
    ctx.save();
    ctx.textAlign = 'center';

    for (let i = 0; i < this.game.effects.length; i += 1) {
      const effect = this.game.effects[i];
      const alpha = 1 - effect.age / effect.ttl;
      const x = this.worldToScreenX(effect.x, shakeX);
      const y = this.worldToScreenY(effect.y, shakeY) - 12;
      ctx.globalAlpha = Math.max(0, alpha);

      if (effect.type === 'perfect') {
        const burst = Math.min(1, (effect.streak || 1) / 6);
        const radius = 12 + (effect.streak || 1) * 5 + effect.age * 20;
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.strokeStyle = `rgba(255, 228, 162, ${(alpha * (0.32 + burst * 0.22)).toFixed(3)})`;
        ctx.lineWidth = 2 + burst * 1.5;
        ctx.beginPath();
        ctx.arc(x, y + 10, radius, 0, Math.PI * 2);
        ctx.stroke();

        if ((effect.streak || 1) >= 3) {
          ctx.strokeStyle = `rgba(169, 233, 255, ${(alpha * (0.16 + burst * 0.18)).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(x, y + 10, radius + 10, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();

        ctx.font = `700 ${18 + Math.min(10, (effect.streak || 1) * 2)}px system-ui, sans-serif`;
        ctx.fillStyle = (effect.streak || 1) >= 4 ? '#e8fbff' : '#fff0a6';
      } else {
        ctx.font = '700 16px system-ui, sans-serif';
        ctx.fillStyle = '#ffffff';
      }

      ctx.fillText(effect.text, x, y);
    }

    ctx.restore();
  }
}
