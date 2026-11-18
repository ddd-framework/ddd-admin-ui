import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getUiLocale } from '../i18n/format.ts';
import { translateText } from '../i18n/store.ts';
import {
  compareCronsBySeverity,
  cronLastFailureAt,
  cronLastRunAt,
  estimateCronServerOffsetMs,
  formatCronDateTime,
  isLegacyCronName,
  lockedCronCommandReason,
  matchesCronStatusFilter,
  normalizeCronName,
  resolveCronPollingInterval,
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

describe('crons severity order and polling (0.3.7)', () => {
  it('breaks a status tie by the most recent failure, then the most recent run, then by name', () => {
    const crons = [
      { name: 'a-old-failure', status: 'FAILING', lastExecution: { id: 1, cronId: 1, startedAt: '2026-11-17 08:00:00', executionState: 'FAILED' } },
      {
        name: 'b-new-failure',
        status: 'FAILING',
        lastExecution: { id: 2, cronId: 2, startedAt: '2026-11-18 07:00:00', executionState: 'SUCCESSFUL' },
        recentExecutions: { elements: [{ id: 3, cronId: 2, startedAt: '2026-11-18 06:00:00', executionState: 'FAILED' }] },
      },
      { name: 'c-ok-recent', status: 'OK', lastExecutionStartedAt: '2026-11-18 09:00:00' },
      { name: 'd-ok-never', status: 'OK' },
      { name: 'e-ok-older', status: 'OK', lastExecutionStartedAt: '2026-11-18 05:00:00' },
    ];
    assert.deepEqual(
      sortCrons(crons, 'severity').map(cron => cron.name),
      ['b-new-failure', 'a-old-failure', 'c-ok-recent', 'e-ok-older', 'd-ok-never']
    );
    assert.equal(cronLastFailureAt(crons[1]!), '2026-11-18 06:00:00');
    assert.equal(cronLastRunAt(crons[0]!), '2026-11-17 08:00:00');
  });

  it('takes a host comparator with the package comparator to fall back on', () => {
    const crons = [
      { name: 'a', status: 'FAILING' },
      { name: 'b', status: 'OK' },
      { name: 'pinned', status: 'OK' },
    ];
    const pinnedFirst = (left: { name: string }, right: { name: string }, compare: (l: never, r: never) => number) =>
      Number(right.name === 'pinned') - Number(left.name === 'pinned') || compare(left as never, right as never);
    assert.deepEqual(sortCrons(crons, 'severity', pinnedFirst).map(cron => cron.name), ['pinned', 'a', 'b']);
    assert.deepEqual(sortCrons(crons, 'name', pinnedFirst).map(cron => cron.name), ['a', 'b', 'pinned']);
    assert.equal(compareCronsBySeverity(crons[0]!, crons[1]!) < 0, true);
  });

  it('resolves a polling interval from a number or a function of the Cron', () => {
    const running = { id: 1, name: 'x', schedule: '* * * * *', isActive: true, status: 'RUNNING' };
    const idle = { ...running, status: 'OK' };
    const interval = (cron: { status: string }) => (cron.status === 'RUNNING' ? 2000 : 30000);
    assert.equal(resolveCronPollingInterval(5000, undefined), 5000);
    assert.equal(resolveCronPollingInterval(undefined, running), 0);
    assert.equal(resolveCronPollingInterval(interval, running), 2000);
    assert.equal(resolveCronPollingInterval(interval, idle), 30000);
    assert.equal(resolveCronPollingInterval(interval, undefined), 0);
    assert.equal(resolveCronPollingInterval(() => -1, running), 0);
    assert.equal(resolveCronPollingInterval(() => Number.NaN, running), 0);
    assert.equal(resolveCronPollingInterval(1500.7, undefined), 1500);
  });
});
