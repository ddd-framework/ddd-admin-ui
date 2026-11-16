import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { narrowWriteAccess, WRITE_ACCESS_ALLOWED } from './writeAccess.ts';

describe('narrowWriteAccess', () => {
  it('no provider allows writes', () => {
    assert.deepEqual(WRITE_ACCESS_ALLOWED, { allowed: true });
  });

  it('an inner provider narrows an allowed parent, with its reason', () => {
    assert.deepEqual(narrowWriteAccess(WRITE_ACCESS_ALLOWED, { allowed: false, reason: 'Read-only' }), {
      allowed: false,
      reason: 'Read-only',
    });
    assert.deepEqual(narrowWriteAccess(WRITE_ACCESS_ALLOWED, { allowed: false }), { allowed: false });
  });

  it('an inner provider can never widen: the outer denial and its reason stay', () => {
    const denied = { allowed: false, reason: 'Archived' };
    assert.equal(narrowWriteAccess(denied, { allowed: true }), denied);
    assert.equal(narrowWriteAccess(denied, { allowed: false, reason: 'Other' }), denied);
  });

  it('allowed below allowed stays allowed', () => {
    assert.equal(narrowWriteAccess(WRITE_ACCESS_ALLOWED, { allowed: true }), WRITE_ACCESS_ALLOWED);
    assert.deepEqual(narrowWriteAccess({ allowed: true }, { allowed: true, reason: 'x' }), { allowed: true });
  });
});
