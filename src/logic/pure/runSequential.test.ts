import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { bulkOutcomeCounts, bulkSummaryText, runSequential, skipSequential, summarizeSkipReasons } from './runSequential.ts';

const LABELS = { progress: 'Deleting', done: 'Deleted', noun: 'track' };

describe('runSequential with skipped keys', () => {
  it('counts succeeded, failed and skipped, in order, one at a time', async () => {
    const seen: number[] = [];
    let running = 0;
    const outcome = await runSequential([1, 2, 3, 4, 5], async key => {
      running += 1;
      assert.equal(running, 1);
      seen.push(key);
      await Promise.resolve();
      running -= 1;
      if (key === 2) throw new Error('boom');
      if (key === 4) return skipSequential('already-active');
      if (key === 5) return skipSequential();
      return undefined;
    });
    assert.deepEqual(seen, [1, 2, 3, 4, 5]);
    assert.deepEqual(outcome.succeeded, [1, 3]);
    assert.equal(outcome.failed.length, 1);
    assert.deepEqual(outcome.skipped, [{ key: 4, reason: 'already-active' }, { key: 5 }]);
    assert.deepEqual(bulkOutcomeCounts(outcome), { succeeded: 2, failed: 1, skipped: 2, total: 5 });
  });

  it('writes the summary line per case', () => {
    assert.equal(bulkSummaryText({ succeeded: 5, failed: 0, skipped: 0 }, LABELS), 'Deleted 5 tracks');
    assert.equal(bulkSummaryText({ succeeded: 3, failed: 2, skipped: 0 }, LABELS), 'Deleted 3 of 5 tracks · 2 failed');
    assert.equal(bulkSummaryText({ succeeded: 3, failed: 0, skipped: 2 }, LABELS), 'Deleted 3 of 5 tracks · 2 skipped');
    assert.equal(bulkSummaryText({ succeeded: 2, failed: 1, skipped: 2 }, LABELS), 'Deleted 2 of 5 tracks · 1 failed · 2 skipped');
    assert.equal(bulkSummaryText({ succeeded: 1, failed: 0, skipped: 1 }, LABELS, '1 already active'), 'Deleted 1 of 2 tracks · 1 already active');
  });

  it('groups skip reasons and keeps unknown ones as a count', () => {
    const labels = { 'already-active': (count: number) => `${count} already active` };
    assert.equal(summarizeSkipReasons([]), '');
    assert.equal(
      summarizeSkipReasons([{ reason: 'already-active' }, { reason: 'already-active' }, { reason: 'new-code' }, {}], labels),
      '2 already active, 2 skipped'
    );
  });
});
