import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { buildStorageKey, readStored, writeStored } from './storage.ts';

const globalWithWindow = globalThis as { window?: unknown };
afterEach(() => {
  delete globalWithWindow.window;
});

const memoryStorage = () => {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
    map,
  };
};

describe('readStored / writeStored', () => {
  it('reads nothing and writes nothing on the server', () => {
    assert.equal(readStored('local', 'a'), null);
    assert.doesNotThrow(() => writeStored('session', 'a', 'x'));
  });

  it('writes, reads and removes (null or empty)', () => {
    const local = memoryStorage();
    globalWithWindow.window = { localStorage: local, sessionStorage: memoryStorage() };
    writeStored('local', 'k', 'v');
    assert.equal(readStored('local', 'k'), 'v');
    assert.equal(readStored('session', 'k'), null);
    writeStored('local', 'k', '');
    assert.equal(local.map.has('k'), false);
    writeStored('local', 'k', 'v');
    writeStored('local', 'k', null);
    assert.equal(readStored('local', 'k'), null);
  });

  it('swallows a refusing storage (private mode, quota, blocked site data)', () => {
    const refusing = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {
        throw new Error('SecurityError');
      },
    };
    globalWithWindow.window = { localStorage: refusing, sessionStorage: refusing };
    assert.equal(readStored('local', 'k'), null);
    assert.doesNotThrow(() => writeStored('session', 'k', 'v'));
    assert.doesNotThrow(() => writeStored('session', 'k', null));
  });
});

describe('buildStorageKey', () => {
  it('joins prefix, area and name with dots, leaving empty parts out', () => {
    assert.equal(buildStorageKey('admin', 'list-view', 'projects'), 'admin.list-view.projects');
    assert.equal(buildStorageKey('', 'list-view', 'projects'), 'list-view.projects');
  });
});
