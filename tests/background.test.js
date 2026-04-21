import test from 'node:test';
import assert from 'node:assert/strict';

import { generateSkylineBuildings } from '../src/background.js';

test('generateSkylineBuildings is deterministic for the same seed and bounds', () => {
  const options = {
    seed: 17,
    width: 360,
    horizonY: 260,
    minWidth: 18,
    maxWidth: 42,
    minHeight: 26,
    maxHeight: 92
  };

  const first = generateSkylineBuildings(options);
  const second = generateSkylineBuildings(options);

  assert.deepEqual(second, first);
});

test('generateSkylineBuildings covers the skyline width with varied buildings', () => {
  const buildings = generateSkylineBuildings({
    seed: 5,
    width: 300,
    horizonY: 240,
    minWidth: 16,
    maxWidth: 28,
    minHeight: 20,
    maxHeight: 70
  });

  assert.ok(buildings.length >= 8);
  assert.equal(buildings[0].x, 0);
  assert.ok(buildings.at(-1).x + buildings.at(-1).width >= 300);
  assert.ok(buildings.some((building) => building.height !== buildings[0].height));
});
