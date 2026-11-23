import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { renameUrlStateKeys, type UrlStateAdapter } from './urlListState.ts';

describe('renameUrlStateKeys', () => {
  it('reads and writes under the host names, push and restore included', () => {
    const url = new Map<string, string>([['space', '7'], ['path', '/a']]);
    const writes: { mode: string; updates: Record<string, string | null> }[] = [];
    const adapter: UrlStateAdapter = {
      get: key => url.get(key) ?? null,
      replace: updates => writes.push({ mode: 'replace', updates: { ...updates } }),
      push: updates => writes.push({ mode: 'push', updates: { ...updates } }),
      restore: () => ({ space: '9', q: 'x' }),
    };
    const renamed = renameUrlStateKeys(adapter, { area: 'space', folder: 'path' });
    assert.equal(renamed.get('area'), '7');
    assert.equal(renamed.get('folder'), '/a');
    renamed.replace({ q: 'report' });
    renamed.push?.({ folder: '/b', area: null });
    assert.deepEqual(writes, [
      { mode: 'replace', updates: { q: 'report' } },
      { mode: 'push', updates: { path: '/b', space: null } },
    ]);
    assert.deepEqual(renamed.restore?.(), { area: '9', q: 'x' });
  });

  it('keeps an adapter without push without push', () => {
    const renamed = renameUrlStateKeys({ get: () => null, replace: () => undefined }, { area: 'space' });
    assert.equal(renamed.push, undefined);
  });
});
