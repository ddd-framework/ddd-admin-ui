import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildEntityListState, sameEntityListState } from './listState.ts';

const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
const getRowKey = (item: { id: number }) => String(item.id);

describe('buildEntityListState', () => {
  it('reports rows, selection, columns, non-empty filters and sort', () => {
    assert.deepEqual(
      buildEntityListState({
        view: 'table',
        items,
        getRowKey,
        isItemSelected: item => item.id === 2,
        columnIds: ['id', 'name'],
        activeFilters: { q: 'abc', status: '', owner: null, tag: '  ' },
        sort: { key: 'name', direction: 'desc' },
      }),
      {
        view: 'table',
        rowKeys: ['1', '2', '3'],
        selectedRowKeys: ['2'],
        columnIds: ['id', 'name'],
        filters: { q: 'abc' },
        sort: { key: 'name', direction: 'desc' },
        isLoading: false,
        hasError: false,
      }
    );
  });

  it('shows no rows while loading or on an error', () => {
    assert.deepEqual(buildEntityListState({ view: 'grid', items, getRowKey, isLoading: true }).rowKeys, []);
    assert.deepEqual(buildEntityListState({ view: 'grid', items, getRowKey, hasError: true }).rowKeys, []);
  });

  it('compares by value', () => {
    const state = buildEntityListState({ view: 'grid', items, getRowKey });
    assert.equal(sameEntityListState(null, state), false);
    assert.equal(sameEntityListState(buildEntityListState({ view: 'grid', items, getRowKey }), state), true);
    assert.equal(sameEntityListState(buildEntityListState({ view: 'grid', items: items.slice(1), getRowKey }), state), false);
  });
});
