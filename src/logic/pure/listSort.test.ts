import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatListSort, nextListSort, parseListSort } from './listSort.ts';

describe('nextListSort', () => {
  it('cycles not sorted → ascending → descending → not sorted', () => {
    const ascending = nextListSort(null, 'name');
    assert.deepEqual(ascending, { key: 'name', direction: 'asc' });
    const descending = nextListSort(ascending, 'name');
    assert.deepEqual(descending, { key: 'name', direction: 'desc' });
    assert.equal(nextListSort(descending, 'name'), null);
    assert.deepEqual(nextListSort(undefined, 'name'), { key: 'name', direction: 'asc' });
  });

  it('starts another column ascending', () => {
    assert.deepEqual(nextListSort({ key: 'name', direction: 'desc' }, 'created'), { key: 'created', direction: 'asc' });
  });
});

describe('parseListSort / formatListSort', () => {
  it('round-trips key:direction', () => {
    assert.equal(formatListSort({ key: 'createdTime', direction: 'desc' }), 'createdTime:desc');
    assert.deepEqual(parseListSort('createdTime:desc'), { key: 'createdTime', direction: 'desc' });
    assert.deepEqual(parseListSort('changeHistory.createdTime:asc'), { key: 'changeHistory.createdTime', direction: 'asc' });
    assert.deepEqual(parseListSort('a:b:asc'), { key: 'a:b', direction: 'asc' });
  });

  it('formats no sort as an empty text', () => {
    assert.equal(formatListSort(null), '');
    assert.equal(formatListSort(undefined), '');
  });

  it('reads anything else as no sort', () => {
    for (const text of [null, undefined, '', 'name', ':asc', 'name:', 'name:up', 'name:ASC']) {
      assert.equal(parseListSort(text), null, String(text));
    }
  });

  it('accepts only the allowed keys when given', () => {
    assert.deepEqual(parseListSort('name:asc', ['name', 'id']), { key: 'name', direction: 'asc' });
    assert.equal(parseListSort('secret:asc', ['name', 'id']), null);
  });
});
