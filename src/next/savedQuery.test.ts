import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { savedQueryOf } from './searchParamsWriter.ts';

describe('saved list query (0.3.4)', () => {
  it('keeps only the list keys when they are named', () => {
    assert.equal(savedQueryOf('q=abc&edit=5&status=on&debug=1', ['q', 'status']), 'q=abc&status=on');
    assert.equal(savedQueryOf('edit=5', new Set(['q'])), '');
  });

  it('keeps the whole query without keys', () => {
    assert.equal(savedQueryOf('q=abc&edit=5', null), 'q=abc&edit=5');
    assert.equal(savedQueryOf('q=abc&edit=5', undefined), 'q=abc&edit=5');
  });
});
