import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { setTranslations, translateText } from '../i18n/store.ts';
import type { TranslateFn } from '../i18n/useTranslate.ts';
import {
  axisNeedsDate,
  formatBytes,
  formatDurationMs,
  formatDurationTick,
  formatPercentNumber,
  formatRate,
  formatWindowLength,
  inWindowText,
  isProcessStillLive,
  sortMessageClasses,
  sumPoints,
  throughputWindowSeconds,
  windowHeaderText,
  workerLastErrorText,
} from './format.ts';
import { countTicks, durationTicks, niceTicks } from './ticks.ts';

const t = translateText as unknown as TranslateFn;

describe('workers formatting in the UI locale', () => {
  afterEach(() => setTranslations('en', 'FORMAL', {}));

  it('keeps the English output of durations, memory and rates', () => {
    assert.equal(formatDurationMs(850), '850 ms');
    assert.equal(formatDurationMs(4200), '4.2 s');
    assert.equal(formatDurationMs(106_000), '1 min 46 s');
    assert.equal(formatDurationMs(7_500_000), '2 h 5 min');
    assert.equal(formatDurationTick(150_000), '2.5m');
    assert.equal(formatBytes(6.5 * 1024 * 1024), '6.5 MB');
    assert.equal(formatRate(24, t), '24.0 /min');
    assert.equal(formatRate(0.4, t), '24 /h');
    assert.equal(formatPercentNumber(0.025), '2.5');
    assert.equal(formatPercentNumber(0.5), '50');
  });

  it('uses the decimal separator of the UI language', () => {
    setTranslations('de', 'FORMAL', {});
    assert.equal(formatDurationMs(4200), '4,2 s');
    assert.equal(formatBytes(6.5 * 1024 * 1024), '6,5 MB');
    assert.equal(formatRate(24, t), '24,0 /min');
    assert.equal(formatPercentNumber(0.025), '2,5');
    assert.equal(formatDurationTick(150_000), '2,5m');
  });
});

describe('workers window labels', () => {
  it('keeps the texts of the default windows and names any other', () => {
    assert.equal(windowHeaderText(300, t), 'Last 5 min');
    assert.equal(windowHeaderText(3600, t), 'Last hour');
    assert.equal(windowHeaderText(86400, t), 'Last 24 h');
    assert.equal(windowHeaderText(1800, t), 'Last 30 min');
    assert.equal(windowHeaderText(7200, t), 'Last 2 hours');
    assert.equal(formatWindowLength(14 * 86400, t), '14 days');
    assert.equal(inWindowText(3600, t), 'in the last hour');
    assert.equal(inWindowText(21600, t), 'in the last 6 hours');
  });

  it('reads the windows of a payload, shortest first', () => {
    assert.deepEqual(
      throughputWindowSeconds({ elements: [{ windowSeconds: 3600 }, { windowSeconds: 300 }, { windowSeconds: 3600 }, { windowSeconds: 0 }] }),
      [300, 3600]
    );
    assert.deepEqual(throughputWindowSeconds(undefined), []);
  });
});

describe('workers axis ticks', () => {
  it('gives counts whole-number steps (no 0.25, 0.5 or 2.5)', () => {
    assert.deepEqual(countTicks(1), [0, 1]);
    assert.deepEqual(countTicks(2), [0, 1, 2]);
    assert.deepEqual(countTicks(10), [0, 5, 10]);
    assert.ok(countTicks(37).every(Number.isInteger));
    assert.deepEqual(niceTicks(10), [0, 2.5, 5, 7.5, 10]);
  });

  it('puts duration axes on round time units', () => {
    assert.deepEqual(durationTicks(60_000), [0, 15_000, 30_000, 45_000, 60_000]);
    assert.deepEqual(durationTicks(170), [0, 50, 100, 150, 200]);
    assert.deepEqual(durationTicks(3 * 3_600_000), [0, 3_600_000, 7_200_000, 10_800_000]);
  });
});

describe('workers helpers', () => {
  it('keeps a step without any reading a gap when summing', () => {
    const summed = sumPoints([
      [
        { x: 'a', y: 1 },
        { x: 'b', y: null },
        { x: 'c', y: null },
      ],
      [
        { x: 'a', y: 2 },
        { x: 'b', y: 0 },
        { x: 'c', y: null },
      ],
    ]);
    assert.deepEqual(summed, [
      { x: 'a', y: 3 },
      { x: 'b', y: 0 },
      { x: 'c', y: null },
    ]);
  });

  it('sorts message classes by finished count', () => {
    const sorted = sortMessageClasses([
      { messageClass: 'B', handledCount: 1 },
      { messageClass: 'A', handledCount: 5 },
      { messageClass: 'C', handledCount: 1 },
    ]);
    assert.deepEqual(
      sorted.map(stat => stat.messageClass),
      ['A', 'B', 'C']
    );
  });

  it('follows an asked process against the live list', () => {
    const live = [{ processKey: 'host-1:12' }, { hostName: 'host-2', processId: 7 }];
    assert.equal(isProcessStillLive({ processKey: 'host-1:12' }, live), true);
    assert.equal(isProcessStillLive({ processKey: 'host-1:13' }, live), false);
    assert.equal(isProcessStillLive({ hostName: 'host-2', processId: 7 }, live), true);
  });

  it('writes the last error on lines of its own', () => {
    const text = workerLastErrorText({ lastErrorClass: 'App\\Failure', lastErrorMessage: 'Timeout', lastErrorAt: null }, t);
    assert.equal(text.split('\n').length, 3);
    assert.ok(text.endsWith('App\\Failure\nTimeout'));
  });

  it('dates an axis that crosses a day', () => {
    assert.equal(axisNeedsDate(0, 2 * 86_400_000), true);
    assert.equal(axisNeedsDate(Date.UTC(2026, 0, 31, 10), Date.UTC(2026, 0, 31, 10, 30)), false);
  });
});
