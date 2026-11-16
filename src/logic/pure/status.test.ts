import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { defineStatusMap } from './status.ts';

describe('defineStatusMap', () => {
  it('returns the map itself without options', () => {
    const map = { ACTIVE: { label: 'Active', tone: 'success' as const } };
    assert.equal(defineStatusMap(map), map);
    assert.equal(defineStatusMap(map, {}), map);
  });

  it("gives every definition the map's context; a definition's own context wins", () => {
    const map = defineStatusMap(
      {
        FAILED: { label: 'Failed', tone: 'danger' },
        OPEN: { label: 'Open', tone: 'warning', context: 'review-status' },
      },
      { context: 'import-status' }
    );
    assert.deepEqual(map, {
      FAILED: { label: 'Failed', tone: 'danger', context: 'import-status' },
      OPEN: { label: 'Open', tone: 'warning', context: 'review-status' },
    });
  });
});
