import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { classifyApplyFailure, driftedTableNames, isBulkApplicableDiff, isSchemaWritesDisabledMessage } from './diff.ts';
import type { DBTableDiff } from './types.ts';

const diff = (overrides: Partial<DBTableDiff>): DBTableDiff => ({ sqlTableName: 'Orders', diffSignature: 'a', ...overrides }) as DBTableDiff;

describe('schema diff apply guards (0.3.3)', () => {
  it('tells the schema-write refusal from another 403', () => {
    const failure = (error: string) => classifyApplyFailure({ status: 403, data: { error } }, 'failed');
    const refusal = failure("Schema writes are disabled on this process: it shares another stage's database.");
    assert.equal(refusal.kind, 'forbidden');
    assert.equal(refusal.schemaWritesDisabled, true);
    const accessHook = failure('Partner accounts may not change the schema');
    assert.equal(accessHook.kind, 'forbidden');
    assert.equal(accessHook.schemaWritesDisabled, false);
    assert.equal(accessHook.message, 'Partner accounts may not change the schema');
    // an application that rewords the message passes its own test
    const reworded = classifyApplyFailure({ status: 403, data: { error: 'Read-only stage' } }, 'failed', message => message === 'Read-only stage');
    assert.equal(reworded.schemaWritesDisabled, true);
    assert.equal(classifyApplyFailure({ status: 400, data: { error: 'refused' } }, 'failed').schemaWritesDisabled, false);
    assert.equal(isSchemaWritesDisabledMessage('schema writes are disabled'), true);
  });

  it('sends only signed, unblocked diffs in a bulk apply', () => {
    assert.equal(isBulkApplicableDiff(diff({})), true);
    assert.equal(isBulkApplicableDiff(diff({ diffSignature: null })), false);
    assert.equal(isBulkApplicableDiff(diff({ directApplyBlocked: true })), false);
    assert.equal(isBulkApplicableDiff(diff({ sqlTableName: '' })), false);
  });

  it('marks the tables whose diff changed between two loads', () => {
    const before = [diff({ sqlTableName: 'Orders', diffSignature: 'a' }), diff({ sqlTableName: 'Accounts', diffSignature: 'b' })];
    const after = [
      diff({ sqlTableName: 'Orders', diffSignature: 'a2' }),
      diff({ sqlTableName: 'Accounts', diffSignature: 'b' }),
      diff({ sqlTableName: 'Invoices', diffSignature: 'c' }),
    ];
    assert.deepEqual(driftedTableNames(before, after), ['Orders']);
    assert.deepEqual(driftedTableNames([], after), []);
  });
});
