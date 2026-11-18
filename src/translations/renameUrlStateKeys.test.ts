import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { renameUrlStateKeys } from './appTranslationsList.ts';

describe('renameUrlStateKeys restore (0.3.4)', () => {
  it('never restores a host parameter under a renamed key as the list filter', () => {
    const adapter = renameUrlStateKeys(
      { get: () => null, replace: () => {}, restore: () => ({ id: 'host-42', keyId: '7', key: 'title', sort: 'key:asc' }) },
      { id: 'keyId' }
    );
    assert.deepEqual(adapter.restore?.(), { id: '7', key: 'title', sort: 'key:asc' });
  });

  it('restores unrenamed keys as saved', () => {
    const adapter = renameUrlStateKeys({ get: () => null, replace: () => {}, restore: () => ({ key: 'a', translation: 'b' }) }, {});
    assert.deepEqual(adapter.restore?.(), { key: 'a', translation: 'b' });
  });
});
