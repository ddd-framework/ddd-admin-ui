import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { keysBetween } from './useRowSelection.ts';

describe('keysBetween', () => {
  const keys = ['a', 'b', 'c', 'd', 'e'];

  it('takes the keys from the anchor to the clicked one, inclusive, in list order', () => {
    assert.deepEqual(keysBetween(keys, 'b', 'd'), ['b', 'c', 'd']);
    assert.deepEqual(keysBetween(keys, 'd', 'b'), ['b', 'c', 'd']);
    assert.deepEqual(keysBetween(keys, 'c', 'c'), ['c']);
  });

  it('selects nothing when a key is not loaded', () => {
    assert.deepEqual(keysBetween(keys, 'x', 'b'), []);
    assert.deepEqual(keysBetween(keys, 'b', 'x'), []);
  });
});
