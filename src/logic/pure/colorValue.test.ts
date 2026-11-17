import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatHexColor, normalizeColorValue, parseHexColor } from './colorValue.ts';

describe('colour values', () => {
  it('reads short and long hex, with or without #', () => {
    assert.deepEqual(parseHexColor('#abc'), { r: 170, g: 187, b: 204, a: 1 });
    assert.deepEqual(parseHexColor('AABBCC'), { r: 170, g: 187, b: 204, a: 1 });
    assert.deepEqual(parseHexColor('#aabbcc80'), { r: 170, g: 187, b: 204, a: 0.502 });
    assert.equal(parseHexColor('rgb(1,2,3)'), null);
    assert.equal(parseHexColor('#abcde'), null);
  });

  it('writes the explicit format', () => {
    assert.equal(formatHexColor({ r: 170, g: 187, b: 204, a: 0.5 }, 'hex'), '#aabbcc');
    assert.equal(formatHexColor({ r: 170, g: 187, b: 204, a: 0.5 }, 'hex-alpha'), '#aabbcc80');
    assert.equal(formatHexColor({ r: 170, g: 187, b: 204, a: 1 }, 'hex-alpha', 'upper'), '#AABBCC');
  });

  it('normalises typed text, refuses what the format cannot hold', () => {
    assert.equal(normalizeColorValue('  ', 'hex'), null);
    assert.equal(normalizeColorValue('ABC', 'hex'), '#aabbcc');
    assert.equal(normalizeColorValue('#aabbcc80', 'hex'), undefined);
    assert.equal(normalizeColorValue('#aabbcc80', 'hex-alpha', 'upper'), '#AABBCC80');
    assert.equal(normalizeColorValue('#aabbccff', 'hex-alpha'), '#aabbcc');
    assert.equal(normalizeColorValue('red', 'hex'), undefined);
  });
});
