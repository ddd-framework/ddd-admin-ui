import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { translateText } from '../i18n/store.ts';
import {
  changedCronFields,
  composeCronCommandLine,
  cronNextRunState,
  describeCronSchedule,
  EMPTY_CRON_FORM,
  formatCronDuration,
  isCronName,
  isRunnerStalled,
  parseCronTime,
  runNowBlockedReason,
  toCronCreateBody,
} from './format.ts';
import { cronRunResultOf, toCronRunResultFilter, toCronStatus } from './status.ts';

const t = translateText;

describe('crons helpers', () => {
  it('reads the common schedules as sentences, anything else as custom', () => {
    assert.equal(describeCronSchedule('* * * * *', t), 'Every minute');
    assert.equal(describeCronSchedule('*/5 * * * *', t), 'Every 5 minutes');
    assert.equal(describeCronSchedule('*/7 * * * *', t), 'Custom schedule');
    assert.equal(describeCronSchedule('15 * * * *', t), 'Hourly at :15');
    assert.equal(describeCronSchedule('0 */6 * * *', t), 'Every 6 hours');
    assert.equal(describeCronSchedule('0 3 * * *', t), 'Daily at 03:00');
    assert.equal(describeCronSchedule('30 6 * * 1', t), 'Weekly on Monday at 06:30');
    assert.equal(describeCronSchedule('0 4 1 * *', t), 'Monthly on day 1 at 04:00');
    assert.equal(describeCronSchedule('0 4 1 1 *', t), 'Custom schedule');
    assert.equal(describeCronSchedule('nonsense', t), 'Custom schedule');
  });

  it('counts the next run down against the server clock, never for a paused Cron', () => {
    const serverNow = parseCronTime('2026-01-31 10:00:00');
    assert.equal(serverNow, Date.UTC(2026, 0, 31, 10, 0, 0));
    const cron = { status: 'OK', isActive: true, nextExecutionScheduledAt: '2026-01-31 10:03:20' };
    assert.deepEqual(cronNextRunState(cron, serverNow), { kind: 'due', atMs: Date.UTC(2026, 0, 31, 10, 3, 20), inMs: 200_000 });
    assert.equal(cronNextRunState({ ...cron, nextExecutionScheduledAt: '2026-01-31 09:54:00' }, serverNow).kind, 'due');
    assert.equal((cronNextRunState({ ...cron, nextExecutionScheduledAt: '2026-01-31 09:54:00' }, serverNow) as { inMs: number }).inMs, -360_000);
    assert.deepEqual(cronNextRunState({ ...cron, isActive: false, status: 'PAUSED' }, serverNow), { kind: 'paused' });
    assert.deepEqual(cronNextRunState({ ...cron, status: 'MISSING_COMMAND' }, serverNow), { kind: 'missingCommand' });
    assert.deepEqual(cronNextRunState({ ...cron, status: 'RUNNING' }, serverNow), { kind: 'running' });
    assert.deepEqual(cronNextRunState(cron, null), { kind: 'unknown' });
    assert.equal(parseCronTime('not a time'), null);
  });

  it('formats durations in whole seconds', () => {
    assert.equal(formatCronDuration(null), '—');
    assert.equal(formatCronDuration(400), '< 1 s');
    assert.equal(formatCronDuration(12_400), '12 s');
    assert.equal(formatCronDuration(125_000), '2 min 5 s');
    assert.equal(formatCronDuration(3_900_000), '1 h 5 min');
  });

  it('sends only the changed fields of an edit; cleared arguments are an empty string', () => {
    const baseline = { name: 'send-reminders', description: 'Sends the reminders of the day', schedule: '0 6 * * *', commandName: 'app:reminders:send', arguments: '--limit=500', isActive: true };
    assert.deepEqual(changedCronFields(baseline, { ...baseline }), {});
    assert.deepEqual(changedCronFields(baseline, { ...baseline, schedule: ' 0 7 * * * ' }), { schedule: '0 7 * * *' });
    assert.deepEqual(changedCronFields(baseline, { ...baseline, arguments: '', isActive: false }), { arguments: '', isActive: false });
    assert.deepEqual(toCronCreateBody({ ...EMPTY_CRON_FORM, name: ' a-b ', arguments: '  ' }).arguments, null);
    assert.equal(composeCronCommandLine('app:x', '  --a   --b '), 'app:x --a --b');
  });

  it('checks names, the runner and the run now rule', () => {
    assert.equal(isCronName('send-reminders'), true);
    assert.equal(isCronName('Send_Reminders'), false);
    assert.equal(isCronName('a--b'), false);
    assert.equal(isRunnerStalled({ activeCount: 3, overdueCount: 3 }), true);
    assert.equal(isRunnerStalled({ activeCount: 3, overdueCount: 1 }), false);
    assert.equal(runNowBlockedReason({ status: 'OK', isActive: true }, t), null);
    assert.match(runNowBlockedReason({ status: 'PAUSED', isActive: false }, t) ?? '', /Switch it on/);
    assert.match(runNowBlockedReason({ status: 'RUNNING', isActive: true }, t) ?? '', /running/);
    assert.match(runNowBlockedReason({ status: 'MISSING_COMMAND', isActive: true }, t) ?? '', /command/);
  });

  it('maps statuses and run results', () => {
    assert.equal(toCronStatus('OVERDUE'), 'OVERDUE');
    assert.equal(toCronStatus('NEW'), null);
    assert.equal(cronRunResultOf({ state: 'RUNNING', executionState: null }), 'RUNNING');
    assert.equal(cronRunResultOf({ state: 'ENDED', executionState: 'FAILED' }), 'FAILED');
    assert.equal(toCronRunResultFilter('FAILED'), 'FAILED');
    assert.equal(toCronRunResultFilter('nope'), 'ALL');
  });
});
