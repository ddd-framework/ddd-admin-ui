import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  addCalendarDays,
  DEFAULT_DATE_RANGE_PRESETS,
  dateRangePresetOf,
  localToday,
  resolveDateRangePreset,
} from './dateRangePresets.ts';
import { toDateInputValue } from './dateInput.ts';

describe('date range presets', () => {
  it('moves calendar days across months, years and leap days', () => {
    assert.equal(addCalendarDays('2026-03-01', -1), '2026-02-28');
    assert.equal(addCalendarDays('2024-03-01', -1), '2024-02-29');
    assert.equal(addCalendarDays('2026-01-01', -30), '2025-12-02');
    assert.equal(addCalendarDays('2026-10-25', 1), '2026-10-26'); // clocks change that night in Europe
    assert.equal(addCalendarDays('nope', 1), '');
  });

  it('resolves to the values typed dates give', () => {
    assert.deepEqual(resolveDateRangePreset('today', DEFAULT_DATE_RANGE_PRESETS, '2026-11-17'), { from: '2026-11-17', to: '2026-11-17' });
    assert.deepEqual(resolveDateRangePreset('last7', DEFAULT_DATE_RANGE_PRESETS, '2026-11-17'), { from: '2026-11-11', to: '2026-11-17' });
    assert.deepEqual(resolveDateRangePreset('last30', DEFAULT_DATE_RANGE_PRESETS, '2026-11-17'), { from: '2026-10-19', to: '2026-11-17' });
    assert.deepEqual(resolveDateRangePreset('all', DEFAULT_DATE_RANGE_PRESETS, '2026-11-17'), { from: '', to: '' });
    assert.equal(resolveDateRangePreset('custom', DEFAULT_DATE_RANGE_PRESETS, '2026-11-17'), null);
  });

  it('finds the preset of a stored range, custom otherwise', () => {
    const today = '2026-11-17';
    assert.equal(dateRangePresetOf({ from: '', to: '' }, DEFAULT_DATE_RANGE_PRESETS, today), 'all');
    assert.equal(dateRangePresetOf({ from: '2026-11-11', to: '2026-11-17' }, DEFAULT_DATE_RANGE_PRESETS, today), 'last7');
    assert.equal(dateRangePresetOf({ from: '2026-11-10', to: '2026-11-17' }, DEFAULT_DATE_RANGE_PRESETS, today), 'custom');
    assert.equal(dateRangePresetOf({ from: '2026-11-11', to: '' }, DEFAULT_DATE_RANGE_PRESETS, today), 'custom');
  });

  it('takes today from the local clock', () => {
    const now = new Date(2026, 10, 17, 0, 30);
    assert.equal(localToday(now), toDateInputValue(now, 'local'));
    assert.equal(localToday(now), '2026-11-17');
  });
});
