import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createElement } from 'react';
// biome-ignore lint/style/noRestrictedImports: a test renders on the server to prove the hydration snapshot; tests are not shipped
import { renderToString } from 'react-dom/server';

import type { UrlStateAdapter } from '../pure/urlListState.ts';
import { useHydrated } from './useHydrated.ts';
import { initialListValues, useUrlListState } from './useUrlListState.ts';

const KEYS = ['q', 'status'] as const;

/** An adapter with an empty URL and a saved state of this list. */
const adapterWithSavedState = (): UrlStateAdapter & { restoreCalls: number } => {
  const adapter = {
    restoreCalls: 0,
    get: () => null,
    replace: () => {},
    restore: () => {
      adapter.restoreCalls += 1;
      return { q: 'saved', status: 'RUNNING' };
    },
  };
  return adapter;
};

const HydratedProbe = () => createElement('span', null, String(useHydrated()));

const ListProbe = ({ adapter }: { adapter: UrlStateAdapter }) => {
  const list = useUrlListState(KEYS, { adapter });
  return createElement('span', null, `${list.values.q}|${list.values.status}`);
};

describe('useHydrated', () => {
  it('is false in a server render (and so in the hydration render that must match it)', () => {
    assert.equal(renderToString(createElement(HydratedProbe)), '<span>false</span>');
  });
});

describe('useUrlListState restore', () => {
  it('does not read the saved state in a server render', () => {
    const adapter = adapterWithSavedState();
    assert.equal(renderToString(createElement(ListProbe, { adapter })), '<span>|</span>');
    assert.equal(adapter.restoreCalls, 0);
  });

  it('restores in the first values of a client-only mount', () => {
    const adapter = adapterWithSavedState();
    assert.deepEqual(initialListValues(KEYS, adapter, true), { q: 'saved', status: 'RUNNING' });
    assert.equal(adapter.restoreCalls, 1);
  });

  it('never restores over parameters the URL carries', () => {
    const adapter = { ...adapterWithSavedState(), get: (key: string) => (key === 'q' ? 'from-url' : null) };
    assert.deepEqual(initialListValues(KEYS, adapter, true), { q: 'from-url', status: '' });
  });

  it('takes a key present but empty in the URL as the explicit state, not the saved one', () => {
    const adapter = { ...adapterWithSavedState(), get: (key: string) => (key === 'status' ? '' : null) };
    assert.deepEqual(initialListValues(KEYS, adapter, true), { q: '', status: '' });
    assert.equal(adapter.restoreCalls, 0);
  });
});
