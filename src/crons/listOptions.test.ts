import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getUiLocale } from '../i18n/format.ts';
import { translateText } from '../i18n/store.ts';
import {
  estimateCronServerOffsetMs,
  formatCronDateTime,
  isLegacyCronName,
  lockedCronCommandReason,
  matchesCronStatusFilter,
  normalizeCronName,
  sortCrons,
  toCronStatusFilter,
} from './format.ts';

const t = translateText;

describe('crons list options (0.3.3)', () => {
  it('sorts the worst status first, then by name; `name` keeps the order', () => {
    const crons = [
      { name: 'b-ok', status: 'OK' },
      { name: 'a-paused', status: 'PAUSED' },
      { name: 'z-failing', status: 'FAILING' },
      { name: 'c-missing', status: 'MISSING_COMMAND' },
      { name: 'a-failing', status: 'FAILING' },
      { name: 'odd', status: 'SOMETHING_NEW' },
    ];
    assert.deepEqual(
      sortCrons(crons, 'severity').map(cron => cron.name),
      ['c-missing', 'a-failing', 'z-failing', 'b-ok', 'a-paused', 'odd']
    );
    assert.deepEqual(sortCrons(crons, 'name'), crons);
    assert.notEqual(sortCrons(crons, 'name'), crons);
  });

  it('filters by one status or by the statuses that need attention', () => {
    assert.equal(matchesCronStatusFilter({ status: 'OVERDUE' }, 'ATTENTION'), true);
    assert.equal(matchesCronStatusFilter({ status: 'PAUSED' }, 'ATTENTION'), false);
    assert.equal(matchesCronStatusFilter({ status: 'PAUSED' }, 'PAUSED'), true);
    assert.equal(matchesCronStatusFilter({ status: 'OK' }, 'ALL'), true);
    assert.equal(toCronStatusFilter('FAILING'), 'FAILING');
    assert.equal(toCronStatusFilter('nonsense'), 'ALL');
    assert.equal(toCronStatusFilter(''), 'ALL');
  });

  it('compares names of either spelling', () => {
    assert.equal(normalizeCronName('Nightly_Cleanup'), 'nightly-cleanup');
    assert.equal(normalizeCronName('nightlyCleanup'), 'nightly-cleanup');
    assert.equal(normalizeCronName(' send.reminders:daily '), 'send-reminders-daily');
    assert.equal(normalizeCronName('send-reminders'), 'send-reminders');
    assert.equal(isLegacyCronName('Nightly_Cleanup'), true);
    assert.equal(isLegacyCronName('nightly-cleanup'), false);
  });

  it('estimates the server offset to 15 minutes and converts times to the viewer zone', () => {
    const browserNow = Date.UTC(2026, 0, 31, 9, 0, 7);
    assert.equal(estimateCronServerOffsetMs('2026-01-31 10:00:00', browserNow), 3_600_000);
    assert.equal(estimateCronServerOffsetMs('2026-01-31 09:00:02', browserNow), 0);
    assert.equal(estimateCronServerOffsetMs('2026-01-31 14:30:05', browserNow), 5.5 * 3_600_000);
    assert.equal(estimateCronServerOffsetMs(null, browserNow), null);
    // server wall clock 10:00 on UTC+1 is 09:00 UTC; the formatter shows it in the process zone
    const expected = new Intl.DateTimeFormat(getUiLocale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(
      new Date(Date.UTC(2026, 0, 31, 9, 0, 0))
    );
    assert.equal(formatCronDateTime('2026-01-31 10:00:00', { viewerOffsetMs: 3_600_000 }), expected);
    assert.equal(formatCronDateTime('2026-01-31 10:00:00'), formatCronDateTime('2026-01-31 10:00:00', { viewerOffsetMs: null }));
  });

  it('keeps a stored command that cannot be picked, with the reason', () => {
    const stored = { commandName: 'app:legacy', commandSchedulable: false, commandExists: true };
    assert.match(lockedCronCommandReason(stored, null, t) ?? '', /cannot be scheduled/);
    assert.match(lockedCronCommandReason({ commandName: 'app:gone', commandExists: false }, ['app:other'], t) ?? '', /does not have/);
    assert.match(lockedCronCommandReason({ commandName: 'app:hidden' }, ['app:other'], t) ?? '', /cannot be scheduled/);
    assert.equal(lockedCronCommandReason({ commandName: 'app:ok', commandSchedulable: true }, ['app:ok'], t), null);
    assert.equal(lockedCronCommandReason(undefined, null, t), null);
  });
});
