import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { displacementMean, displacementPixels, displacementScaleOf, NEUTRAL_DISPLACEMENT_CENTER, SHADER_MOTION } from './shader.ts';

describe('displacement field', () => {
  it('measures the channel mean of RGBA bytes', () => {
    assert.deepEqual(displacementMean(new Uint8Array([255, 0, 9, 9, 0, 255, 9, 9])), [0.5, 0.5]);
    assert.deepEqual(displacementMean(new Uint8Array([255, 51, 0, 0])), [1, 0.2]);
    assert.deepEqual(displacementMean(new Uint8Array([])), [0.5, 0.5]);
  });
  it('shows why a zero-mean option is needed: a coarse lattice is far off centre', () => {
    const [red, green] = displacementMean(displacementPixels(128, 2));
    // at the default strength 2.2 the blobs move by (mean - 0.5) * 2.2 of the viewport
    assert.ok(Math.abs(red - 0.5) * SHADER_MOTION.displaceScale > 0.4);
    assert.ok(Math.abs(green - 0.5) * SHADER_MOTION.displaceScale > 0.25);
    // centred on its own mean, the field moves nothing on average
    const pixels = displacementPixels(128, 2);
    const center = displacementMean(pixels);
    let offset = 0;
    for (let index = 0; index < pixels.length; index += 4) offset += (pixels[index] ?? 0) / 255 - center[0];
    assert.ok(Math.abs(offset / (pixels.length / 4)) < 1e-9);
  });
  it('keeps the neutral centre and the default strength by default, per axis when asked', () => {
    assert.deepEqual(NEUTRAL_DISPLACEMENT_CENTER, [0.5, 0.5]);
    assert.deepEqual(displacementScaleOf(undefined), [SHADER_MOTION.displaceScale, SHADER_MOTION.displaceScale]);
    assert.deepEqual(displacementScaleOf({ displacementScale: 1 }), [1, 1]);
    assert.deepEqual(displacementScaleOf({ displacementScale: [0.4, 1.2] }), [0.4, 1.2]);
  });
});
