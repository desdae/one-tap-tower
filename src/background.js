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
    this.layers = [];
    this.clouds = buildClouds(91);
    this.particles = buildParticles(133);
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.layers = LAYER_CONFIGS.slice(0, BACKGROUND_TUNING.layerCount).map((config, index) =>
      this.createLayer(config, index)
    );
  }

  createLayer(config, index) {
    const layerWidth = Math.max(this.width + 180, Math.round(this.width * (1.3 + index * 0.08)));
    const layerHeight = this.height;
    const horizonY = Math.round(this.height * config.horizonRatio);
    const buildings = generateSkylineBuildings({
      seed: config.seed,
      width: layerWidth,
      horizonY,
      minWidth: config.minWidth,
      maxWidth: config.maxWidth,
      minHeight: config.minHeight,
      maxHeight: config.maxHeight
    });
    const canvas = createCanvas(layerWidth, layerHeight);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = config.overlay;
    ctx.fillRect(0, horizonY - 40, layerWidth, layerHeight - horizonY + 40);

    for (let i = 0; i < buildings.length; i += 1) {
      drawBuildingShape(ctx, buildings[i], config.color);
    }

    if (config.hasWindows) {
      paintWindows(ctx, buildings, config, 0);
    }

    return {
      ...config,
      buildings,
      canvas,
      horizonY
    };
  }

  render(ctx, elapsed) {
    this.drawSky(ctx);
    this.drawSun(ctx);
    this.drawClouds(ctx, elapsed);
    this.drawParticles(ctx, elapsed);
    this.drawLayers(ctx, elapsed);
    this.drawHaze(ctx, elapsed);
  }

  drawSky(ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#0d2747');
    gradient.addColorStop(0.3, '#153b67');
    gradient.addColorStop(0.64, '#2b6691');
    gradient.addColorStop(1, '#7fb0c6');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  drawSun(ctx) {
    const sunX = this.width * BACKGROUND_TUNING.sunX;
    const sunY = this.height * BACKGROUND_TUNING.sunY;
    const radius = this.width * BACKGROUND_TUNING.sunRadius;
    const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, radius * 1.8);
    glow.addColorStop(0, 'rgba(255, 225, 168, 0.24)');
    glow.addColorStop(0.24, 'rgba(255, 213, 155, 0.16)');
    glow.addColorStop(0.58, 'rgba(153, 204, 255, 0.08)');
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
      ctx.globalAlpha = cloud.alpha;
      ctx.fillStyle = '#f4fbff';
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

  drawLayers(ctx, elapsed) {
    for (let i = 0; i < this.layers.length; i += 1) {
      const layer = this.layers[i];

      if (layer.hasWindows) {
        const shimmer = 0.5 + 0.5 * Math.sin(elapsed * BACKGROUND_TUNING.shimmerSpeed * 1000 + i * 1.7);
        const layerCtx = layer.canvas.getContext('2d');
        layerCtx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
        layerCtx.fillStyle = layer.overlay;
        layerCtx.fillRect(0, layer.horizonY - 40, layer.canvas.width, layer.canvas.height - layer.horizonY + 40);
        for (let buildingIndex = 0; buildingIndex < layer.buildings.length; buildingIndex += 1) {
          drawBuildingShape(layerCtx, layer.buildings[buildingIndex], layer.color);
        }
        paintWindows(layerCtx, layer.buildings, layer, shimmer * layer.windowAlpha);
      }

      const offset = (elapsed * BACKGROUND_TUNING.skylineDrift * layer.drift) % layer.canvas.width;
      const drawX = -offset;
      ctx.globalAlpha = i === this.layers.length - 1 ? 0.98 : 0.84 - i * 0.06;
      ctx.drawImage(layer.canvas, drawX, 0);
      ctx.drawImage(layer.canvas, drawX + layer.canvas.width, 0);
    }

    ctx.globalAlpha = 1;
  }

  drawHaze(ctx, elapsed) {
    const horizon = this.height * 0.72;
    const haze = ctx.createLinearGradient(0, horizon, 0, this.height);
    haze.addColorStop(0, `rgba(188, 221, 228, ${BACKGROUND_TUNING.hazeOpacity * 0.18})`);
    haze.addColorStop(0.4, `rgba(125, 186, 206, ${BACKGROUND_TUNING.hazeOpacity})`);
    haze.addColorStop(1, 'rgba(18, 35, 54, 0.24)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, horizon, this.width, this.height - horizon);

    const pulse = 0.03 * (0.5 + 0.5 * Math.sin(elapsed * 0.08));
    ctx.fillStyle = `rgba(255, 233, 194, ${(0.07 + pulse).toFixed(3)})`;
    ctx.fillRect(0, this.height * 0.78, this.width, this.height * 0.08);

    const vignette = ctx.createLinearGradient(0, 0, 0, this.height);
    vignette.addColorStop(0, 'rgba(4, 10, 20, 0.04)');
    vignette.addColorStop(0.65, 'rgba(4, 10, 20, 0)');
    vignette.addColorStop(1, 'rgba(4, 10, 20, 0.18)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, this.width, this.height);
  }
}
