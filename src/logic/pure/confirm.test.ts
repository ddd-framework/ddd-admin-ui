import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

import { confirmWithoutProvider } from './confirm.ts';

describe('confirmWithoutProvider', () => {
  it('answers false and warns once outside production', async () => {
    const warn = mock.method(console, 'warn', () => {});
    try {
      assert.equal(await confirmWithoutProvider({ title: 'Delete?' }), false);
      assert.equal(await confirmWithoutProvider({ title: 'Delete again?' }), false);
      assert.equal(warn.mock.callCount(), 1);
      assert.match(String(warn.mock.calls[0]?.arguments[0]), /no AdminUiProvider/);
    } finally {
      warn.mock.restore();
    }
  });
});
