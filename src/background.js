const cityBackgroundUrl = new URL('../img/bg_city.webp', import.meta.url).href;

export const BACKGROUND_TUNING = {
  sunX: 0.22,
  sunY: 0.18,
  sunRadius: 0.18,
  hazeOpacity: 0.3,
  cloudSpeed: 0.0036,
  particleSpeed: 0.008,
  shimmerSpeed: 0.0016,
  skylineDrift: 0.012,
  layerCount: 3
};

function createRng(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function lerp(min, max, t) {
  return min + (max - min) * t;
}

function createCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(width));
  canvas.height = Math.max(1, Math.floor(height));
  return canvas;
}

export function computeCoverRect(sourceWidth, sourceHeight, destWidth, destHeight) {
  const sourceRatio = sourceWidth / sourceHeight;
  const destRatio = destWidth / destHeight;

  if (sourceRatio > destRatio) {
    const cropWidth = sourceHeight * destRatio;
    const sourceX = (sourceWidth - cropWidth) * 0.5;
    return {
      sourceX,
      sourceY: 0,
      sourceWidth: cropWidth,
      sourceHeight,
      destX: 0,
      destY: 0,
      destWidth,
      destHeight
    };
  }

  const cropHeight = sourceWidth / destRatio;
  const sourceY = (sourceHeight - cropHeight) * 0.5;
  return {
    sourceX: 0,
    sourceY,
    sourceWidth: sourceWidth,
    sourceHeight: cropHeight,
    destX: 0,
    destY: 0,
    destWidth,
    destHeight
  };
}

export function generateSkylineBuildings({
  seed,
  width,
  horizonY,
  minWidth,
  maxWidth,
  minHeight,
  maxHeight
}) {
  const random = createRng(seed);
  const buildings = [];
  let x = 0;

  while (x < width) {
    const buildingWidth = Math.min(width - x, Math.round(lerp(minWidth, maxWidth, random())));
    const height = Math.round(lerp(minHeight, maxHeight, random()));
    const roof = random();
    const inset = Math.round(buildingWidth * lerp(0.06, 0.18, random()));

    buildings.push({
      x,
      width: buildingWidth,
      height,
      y: horizonY - height,
      roofType: roof > 0.84 ? 'spire' : roof > 0.68 ? 'step' : 'flat',
      inset,
      windowSeed: Math.floor(random() * 10000)
    });

    x += buildingWidth;
  }

  if (buildings.length > 0) {
    buildings[0].x = 0;
  }

  return buildings;
}

function drawBuildingShape(ctx, building, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.rect(building.x, building.y, building.width, building.height);

  if (building.roofType === 'spire') {
    ctx.moveTo(building.x + building.width * 0.5, building.y - building.height * 0.16);
    ctx.lineTo(building.x + building.width * 0.36, building.y);
    ctx.lineTo(building.x + building.width * 0.64, building.y);
  } else if (building.roofType === 'step') {
    const inset = building.inset;
    ctx.moveTo(building.x + inset, building.y);
    ctx.lineTo(building.x + inset, building.y - building.height * 0.12);
    ctx.lineTo(building.x + building.width - inset, building.y - building.height * 0.12);
    ctx.lineTo(building.x + building.width - inset, building.y);
  }

  ctx.fill();
}

function paintWindows(ctx, buildings, palette, shimmerAmount) {
  for (let i = 0; i < buildings.length; i += 1) {
    const building = buildings[i];
    if (building.width < 14 || building.height < 28) {
      continue;
    }

    const random = createRng(building.windowSeed);
    const cols = Math.max(1, Math.floor(building.width / 8));
    const rows = Math.max(2, Math.floor(building.height / 12));
    const cellWidth = building.width / (cols + 1);
    const cellHeight = building.height / (rows + 1);

    for (let col = 1; col <= cols; col += 1) {
      for (let row = 1; row <= rows; row += 1) {
        const lit = random() > 0.72;
        if (!lit) {
          continue;
        }

        const pulse = 0.32 + random() * 0.4 + shimmerAmount * (0.25 + random() * 0.2);
        ctx.fillStyle = `rgba(${palette.windowRgb}, ${pulse.toFixed(3)})`;
        ctx.fillRect(
          building.x + col * cellWidth - 1.2,
          building.y + row * cellHeight,
          Math.max(1.6, cellWidth * 0.28),
          Math.max(2.4, cellHeight * 0.24)
        );
      }
    }
  }
}

function buildClouds(seed) {
  const random = createRng(seed);
  const clouds = [];

  for (let i = 0; i < 5; i += 1) {
    clouds.push({
      x: random(),
      y: lerp(0.12, 0.38, random()),
      width: lerp(0.12, 0.22, random()),
      height: lerp(0.04, 0.08, random()),
      alpha: lerp(0.045, 0.085, random()),
      speed: lerp(0.75, 1.25, random())
    });
  }

  return clouds;
}

function buildParticles(seed) {
  const random = createRng(seed);
  const particles = [];

  for (let i = 0; i < 14; i += 1) {
    particles.push({
      x: random(),
      y: lerp(0.14, 0.82, random()),
      radius: lerp(0.8, 2.2, random()),
      alpha: lerp(0.04, 0.12, random()),
      drift: lerp(0.6, 1.35, random()),
      bob: lerp(0.4, 1.2, random()),
      phase: random() * Math.PI * 2
    });
  }

  return particles;
}

const LAYER_CONFIGS = [
  {
    seed: 11,
    minWidth: 18,
    maxWidth: 42,
    minHeight: 24,
    maxHeight: 86,
    horizonRatio: 0.67,
    drift: 0.36,
    color: '#3d618d',
    overlay: 'rgba(178, 211, 242, 0.08)',
    windowRgb: '255, 222, 172',
    windowAlpha: 0.16,
    hasWindows: false
  },
  {
    seed: 29,
    minWidth: 20,
    maxWidth: 50,
    minHeight: 34,
    maxHeight: 128,
    horizonRatio: 0.77,
    drift: 0.62,
    color: '#284b72',
    overlay: 'rgba(146, 194, 227, 0.08)',
    windowRgb: '255, 212, 148',
    windowAlpha: 0.24,
    hasWindows: true
  },
  {
    seed: 51,
    minWidth: 24,
    maxWidth: 56,
    minHeight: 42,
    maxHeight: 156,
    horizonRatio: 0.86,
    drift: 1,
    color: '#1d3754',
    overlay: 'rgba(118, 177, 212, 0.06)',
    windowRgb: '255, 196, 130',
    windowAlpha: 0.28,
    hasWindows: true
  }
];

export class BackgroundRenderer {
  constructor() {
    this.width = 0;
    this.height = 0;
    this.clouds = buildClouds(91);
    this.particles = buildParticles(133);
    this.coverRect = null;
    this.image = null;
    this.imageLoaded = false;

    if (typeof Image !== 'undefined') {
      this.image = new Image();
      this.image.decoding = 'async';
      this.image.onload = () => {
        this.imageLoaded = true;
        this.updateCoverRect();
      };
      this.image.src = cityBackgroundUrl;
    }
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.updateCoverRect();
  }

  updateCoverRect() {
    if (!this.imageLoaded || !this.image || !this.width || !this.height) {
      this.coverRect = null;
      return;
    }

    this.coverRect = computeCoverRect(
      this.image.naturalWidth,
      this.image.naturalHeight,
      this.width,
      this.height
    );
  }

  render(ctx, elapsed) {
    this.drawSky(ctx);
    this.drawSun(ctx);
    this.drawClouds(ctx, elapsed);
    this.drawParticles(ctx, elapsed);
    this.drawHaze(ctx, elapsed);
  }

  drawSky(ctx) {
    if (this.imageLoaded && this.image && this.coverRect) {
      const cover = this.coverRect;
      ctx.drawImage(
        this.image,
        cover.sourceX,
        cover.sourceY,
        cover.sourceWidth,
        cover.sourceHeight,
        cover.destX,
        cover.destY,
        cover.destWidth,
        cover.destHeight
      );

      const tint = ctx.createLinearGradient(0, 0, 0, this.height);
      tint.addColorStop(0, 'rgba(8, 19, 38, 0.2)');
      tint.addColorStop(0.46, 'rgba(17, 54, 92, 0.08)');
      tint.addColorStop(1, 'rgba(9, 23, 43, 0.18)');
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, this.width, this.height);
      return;
    }

    const fallback = ctx.createLinearGradient(0, 0, 0, this.height);
    fallback.addColorStop(0, '#0d2747');
    fallback.addColorStop(0.3, '#153b67');
    fallback.addColorStop(0.64, '#2b6691');
    fallback.addColorStop(1, '#7fb0c6');
    ctx.fillStyle = fallback;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  drawSun(ctx) {
    const sunX = this.width * 0.16;
    const sunY = this.height * 0.2;
    const radius = this.width * 0.13;
    const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, radius * 1.8);
    glow.addColorStop(0, 'rgba(255, 230, 176, 0.16)');
    glow.addColorStop(0.24, 'rgba(255, 221, 170, 0.1)');
    glow.addColorStop(0.58, 'rgba(153, 204, 255, 0.05)');
    glow.addColorStop(1, 'rgba(17, 40, 68, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  drawClouds(ctx, elapsed) {
    for (let i = 0; i < this.clouds.length; i += 1) {
      const cloud = this.clouds[i];
      const travel = (cloud.x + elapsed * BACKGROUND_TUNING.cloudSpeed * cloud.speed) % 1.2;
      const x = (travel - 0.1) * this.width;
      const y = cloud.y * this.height + Math.sin(elapsed * 0.12 + i) * 5;
      const width = cloud.width * this.width;
      const height = cloud.height * this.height;

      ctx.save();
      ctx.globalAlpha = cloud.alpha * 0.7;
      ctx.fillStyle = '#dcecff';
      ctx.beginPath();
      ctx.ellipse(x, y, width * 0.35, height * 0.52, 0, 0, Math.PI * 2);
      ctx.ellipse(x + width * 0.24, y - height * 0.1, width * 0.28, height * 0.42, 0, 0, Math.PI * 2);
      ctx.ellipse(x - width * 0.2, y + height * 0.04, width * 0.24, height * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawParticles(ctx, elapsed) {
    for (let i = 0; i < this.particles.length; i += 1) {
      const particle = this.particles[i];
      const drift = (particle.x + elapsed * BACKGROUND_TUNING.particleSpeed * particle.drift) % 1.1;
      const x = (drift - 0.05) * this.width;
      const y =
        particle.y * this.height +
        Math.sin(elapsed * 0.45 * particle.bob + particle.phase) * (this.height * 0.01);

      ctx.globalAlpha = particle.alpha;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, particle.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  drawHaze(ctx, elapsed) {
    const horizon = this.height * 0.74;
    const haze = ctx.createLinearGradient(0, horizon, 0, this.height);
    haze.addColorStop(0, `rgba(201, 230, 240, ${BACKGROUND_TUNING.hazeOpacity * 0.2})`);
    haze.addColorStop(0.4, `rgba(126, 186, 212, ${BACKGROUND_TUNING.hazeOpacity * 0.72})`);
    haze.addColorStop(1, 'rgba(18, 35, 54, 0.28)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, horizon, this.width, this.height - horizon);

    const pulse = 0.03 * (0.5 + 0.5 * Math.sin(elapsed * 0.08));
    ctx.fillStyle = `rgba(232, 247, 255, ${(0.06 + pulse * 0.5).toFixed(3)})`;
    ctx.fillRect(0, this.height * 0.76, this.width, this.height * 0.1);

    const vignette = ctx.createLinearGradient(0, 0, 0, this.height);
    vignette.addColorStop(0, 'rgba(4, 10, 20, 0.06)');
    vignette.addColorStop(0.65, 'rgba(4, 10, 20, 0)');
    vignette.addColorStop(1, 'rgba(4, 10, 20, 0.18)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, this.width, this.height);
  }
}
