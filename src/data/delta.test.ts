import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { deltaDirectionOf, deltaToneOf, relativeChange, resolveDelta } from './delta.ts';

describe('delta', () => {
  it('reads the direction, zero and epsilon as flat', () => {
    assert.equal(deltaDirectionOf(3), 'up');
    assert.equal(deltaDirectionOf(-0.5), 'down');
    assert.equal(deltaDirectionOf(0), 'flat');
    assert.equal(deltaDirectionOf(0.004, 0.005), 'flat');
  });

  it('tones by preference, neutral at zero and without a preference', () => {
    assert.equal(deltaToneOf('up'), 'positive');
    assert.equal(deltaToneOf('down'), 'negative');
    assert.equal(deltaToneOf('up', 'lower'), 'negative');
    assert.equal(deltaToneOf('down', 'lower'), 'positive');
    assert.equal(deltaToneOf('flat', 'lower'), 'neutral');
    assert.equal(deltaToneOf('up', 'none'), 'neutral');
  });

  it('writes a signed text, percent from a fraction, no sign at zero', () => {
    assert.equal(resolveDelta(12).text, '+12');
    assert.equal(resolveDelta(-3.5).text, '-3.5');
    assert.equal(resolveDelta(0).text, '0');
    assert.match(resolveDelta(0.125, { format: 'percent' }).text, /^\+12\.5\s?%$/);
    assert.match(resolveDelta(-4, { format: { style: 'currency', currency: 'EUR' } }).text, /-.*4\.00/);
    assert.deepEqual(
      { ...resolveDelta(-2, { preference: 'lower' }), text: undefined },
      { direction: 'down', tone: 'positive', text: undefined }
    );
  });

  it('computes a relative change, null without a base', () => {
    assert.equal(relativeChange(125, 100), 0.25);
    assert.equal(relativeChange(50, -100), 1.5);
    assert.equal(relativeChange(5, 0), null);
    assert.equal(relativeChange(5, null), null);
    assert.equal(relativeChange(5, undefined), null);
  });
});
