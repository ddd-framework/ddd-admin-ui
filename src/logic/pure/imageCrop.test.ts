import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  chooseImageOutputType,
  cropHandleAt,
  cropRatioOf,
  fitImageSize,
  initialCrop,
  moveCrop,
  planImageNormalization,
  resizeCrop,
  roundCrop,
  zoomCrop,
} from './imageCrop.ts';

const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} ≈ ${expected}`);
const inside = (crop: { x: number; y: number; width: number; height: number }, width: number, height: number) => {
  assert.ok(crop.x >= -1e-9 && crop.y >= -1e-9, 'starts inside');
  assert.ok(crop.x + crop.width <= width + 1e-9 && crop.y + crop.height <= height + 1e-9, 'ends inside');
};

describe('initialCrop', () => {
  it('takes the whole image for a free ratio', () => {
    assert.deepEqual(initialCrop(800, 600, null), { x: 0, y: 0, width: 800, height: 600 });
  });
  it('centres the largest crop of the ratio (landscape image, square crop)', () => {
    assert.deepEqual(initialCrop(800, 600, 1), { x: 100, y: 0, width: 600, height: 600 });
  });
  it('centres the largest crop of the ratio (portrait image, 16:9 crop)', () => {
    const crop = initialCrop(600, 800, 16 / 9);
    close(crop.width, 600);
    close(crop.height, 337.5);
    close(crop.y, (800 - 337.5) / 2);
  });
  it('a round option forces a square', () => {
    assert.equal(cropRatioOf({ ratio: 16 / 9, round: true }), 1);
    assert.equal(cropRatioOf({ ratio: null }), null);
    assert.equal(cropRatioOf(undefined), null);
  });
});

describe('moveCrop', () => {
  it('stays inside the image', () => {
    assert.deepEqual(moveCrop({ x: 100, y: 0, width: 600, height: 600 }, 500, -50, 800, 600), { x: 200, y: 0, width: 600, height: 600 });
    assert.deepEqual(moveCrop({ x: 100, y: 0, width: 600, height: 600 }, -500, 0, 800, 600), { x: 0, y: 0, width: 600, height: 600 });
  });
});

describe('resizeCrop', () => {
  const image = { imageWidth: 800, imageHeight: 600 };
  it('free: a corner follows the pointer, the opposite corner stays', () => {
    const next = resizeCrop({ x: 100, y: 100, width: 200, height: 200 }, 'se', 50, 20, { ...image, ratio: null });
    assert.deepEqual(next, { x: 100, y: 100, width: 250, height: 220 });
    const west = resizeCrop({ x: 100, y: 100, width: 200, height: 200 }, 'w', -500, 0, { ...image, ratio: null });
    assert.deepEqual(west, { x: 0, y: 100, width: 300, height: 200 });
  });
  it('free: never below minSize', () => {
    const next = resizeCrop({ x: 100, y: 100, width: 200, height: 200 }, 'e', -400, 0, { ...image, ratio: null, minSize: 20 });
    assert.equal(next.width, 20);
  });
  it('ratio: a corner keeps the ratio and the image bounds', () => {
    const next = resizeCrop({ x: 100, y: 100, width: 200, height: 100 }, 'se', 1000, 0, { ...image, ratio: 2 });
    close(next.width / next.height, 2);
    inside(next, 800, 600);
    assert.equal(next.x, 100);
    assert.equal(next.y, 100);
    close(next.width, 700);
  });
  it('ratio: a north-west corner anchors the south-east corner', () => {
    const next = resizeCrop({ x: 300, y: 300, width: 200, height: 200 }, 'nw', -100, -50, { ...image, ratio: 1 });
    close(next.x + next.width, 500);
    close(next.y + next.height, 500);
    close(next.width, 300);
  });
  it('ratio: an edge grows the other axis around the centre and stays inside', () => {
    const next = resizeCrop({ x: 300, y: 250, width: 200, height: 100 }, 'e', 400, 0, { ...image, ratio: 2 });
    close(next.width / next.height, 2);
    inside(next, 800, 600);
    assert.equal(next.x, 300);
    close(next.y + next.height / 2, 300);
  });
});

describe('zoomCrop', () => {
  const options = { imageWidth: 800, imageHeight: 600, ratio: 1 };
  it('zooms in around the centre', () => {
    const next = zoomCrop({ x: 100, y: 0, width: 600, height: 600 }, 2, options);
    assert.deepEqual(next, { x: 250, y: 150, width: 300, height: 300 });
  });
  it('zooming out stops at the image', () => {
    const next = zoomCrop({ x: 250, y: 150, width: 300, height: 300 }, 0.1, options);
    assert.deepEqual(next, { x: 100, y: 0, width: 600, height: 600 });
  });
  it('zooming in stops at minSize', () => {
    const next = zoomCrop({ x: 100, y: 0, width: 600, height: 600 }, 1000, { ...options, minSize: 50 });
    assert.equal(next.width, 50);
    assert.equal(next.height, 50);
  });
});

describe('roundCrop and fitImageSize', () => {
  it('whole pixels inside the image', () => {
    assert.deepEqual(roundCrop({ x: -0.4, y: 10.6, width: 900.2, height: 0.2 }, 800, 600), { x: 0, y: 11, width: 800, height: 1 });
  });
  it('never upscales, keeps the ratio', () => {
    assert.deepEqual(fitImageSize(400, 300, { maxWidth: 2000 }), { width: 400, height: 300 });
    assert.deepEqual(fitImageSize(4000, 3000, { maxWidth: 2000, maxHeight: 2000 }), { width: 2000, height: 1500 });
    assert.deepEqual(fitImageSize(4000, 3000, { maxPixels: 1_200_000 }), { width: 1264, height: 948 });
  });
});

describe('chooseImageOutputType', () => {
  it('keeps alpha: PNG stays PNG, WebP stays WebP, a round crop of a JPEG becomes PNG', () => {
    assert.equal(chooseImageOutputType('image/png'), 'image/png');
    assert.equal(chooseImageOutputType('image/webp'), 'image/webp');
    assert.equal(chooseImageOutputType('image/gif'), 'image/png');
    assert.equal(chooseImageOutputType('image/jpeg'), 'image/jpeg');
    assert.equal(chooseImageOutputType('image/jpeg', { round: true }), 'image/png');
  });
  it('a requested type wins (JPEG from an alpha source only when asked)', () => {
    assert.equal(chooseImageOutputType('image/png', { requested: 'image/jpeg' }), 'image/jpeg');
  });
});

describe('planImageNormalization', () => {
  it('crops, fits and picks the type; JPEG gets a background, PNG none', () => {
    const plan = planImageNormalization(4000, 3000, 'image/jpeg', { crop: { x: 500, y: 0, width: 3000, height: 3000 }, maxWidth: 1000 });
    assert.deepEqual(plan, {
      source: { x: 500, y: 0, width: 3000, height: 3000 },
      width: 1000,
      height: 1000,
      type: 'image/jpeg',
      quality: 0.9,
      round: false,
      background: '#ffffff',
    });
    const round = planImageNormalization(400, 400, 'image/jpeg', { round: true });
    assert.equal(round.type, 'image/png');
    assert.equal(round.background, null);
    assert.equal(round.round, true);
  });
});

describe('cropHandleAt', () => {
  const crop = { x: 100, y: 100, width: 200, height: 100 };
  it('corners, edges, inside, outside', () => {
    assert.equal(cropHandleAt(101, 99, crop, 5), 'nw');
    assert.equal(cropHandleAt(300, 200, crop, 5), 'se');
    assert.equal(cropHandleAt(200, 102, crop, 5), 'n');
    assert.equal(cropHandleAt(298, 150, crop, 5), 'e');
    assert.equal(cropHandleAt(200, 150, crop, 5), 'move');
    assert.equal(cropHandleAt(50, 150, crop, 5), null);
  });
});
