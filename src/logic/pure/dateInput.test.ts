// The local clock of these tests is Europe/Berlin (CET / CEST): set before any Date is built.
process.env.TZ = 'Europe/Berlin';

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { fromDateInputValue, fromDateTimeInputValue, toDateInputValue, toDateTimeInputValue } from './dateInput.ts';

const utc = (text: string) => new Date(text);

describe('date input values in UTC', () => {
  it('round-trips days and wall-clock times around midnight', () => {
    for (const iso of ['2026-03-04T00:00:00Z', '2026-03-04T23:59:00Z', '2026-12-31T23:30:00Z', '2027-01-01T00:00:00Z']) {
      const date = utc(iso);
      assert.equal(fromDateTimeInputValue(toDateTimeInputValue(date, 'utc'), 'utc')?.toISOString(), date.toISOString(), iso);
    }
    assert.equal(toDateInputValue(utc('2026-03-04T23:59:00Z'), 'utc'), '2026-03-04');
    assert.equal(fromDateInputValue('2026-03-04', 'utc')?.toISOString(), '2026-03-04T00:00:00.000Z');
    assert.equal(toDateTimeInputValue(utc('2026-03-04T10:05:30Z'), 'utc'), '2026-03-04T10:05:30');
    assert.equal(toDateTimeInputValue(utc('2026-03-04T10:05:00Z'), 'utc'), '2026-03-04T10:05');
  });

  it('is independent of the local zone', () => {
    // 23:30 UTC is already the next day in Berlin
    assert.equal(toDateInputValue(utc('2026-03-04T23:30:00Z'), 'utc'), '2026-03-04');
    assert.equal(toDateInputValue(utc('2026-03-04T23:30:00Z'), 'local'), '2026-03-05');
  });
});

describe('date input values in Europe/Berlin (local)', () => {
  it('round-trips around midnight', () => {
    for (const iso of ['2026-03-03T23:00:00Z', '2026-03-04T22:59:00Z', '2026-07-01T21:59:00Z', '2026-07-01T22:00:00Z']) {
      const date = utc(iso);
      assert.equal(fromDateTimeInputValue(toDateTimeInputValue(date, 'local'), 'local')?.toISOString(), date.toISOString(), iso);
    }
    assert.equal(toDateTimeInputValue(utc('2026-03-03T23:00:00Z'), 'local'), '2026-03-04T00:00');
    assert.equal(fromDateInputValue('2026-03-04', 'local')?.toISOString(), '2026-03-03T23:00:00.000Z');
    assert.equal(fromDateInputValue('2026-07-01', 'local')?.toISOString(), '2026-06-30T22:00:00.000Z');
  });

  it('round-trips the days of both clock changes', () => {
    for (const day of ['2026-03-29', '2026-10-25', '2026-03-28', '2026-10-26']) {
      assert.equal(toDateInputValue(fromDateInputValue(day, 'local'), 'local'), day, day);
    }
  });

  it('round-trips every existing time around the spring change (clocks go 02:00 → 03:00)', () => {
    for (const iso of ['2026-03-29T00:59:00Z', '2026-03-29T01:00:00Z', '2026-03-29T01:30:00Z']) {
      const date = utc(iso);
      assert.equal(fromDateTimeInputValue(toDateTimeInputValue(date, 'local'), 'local')?.toISOString(), date.toISOString(), iso);
    }
    assert.equal(toDateTimeInputValue(utc('2026-03-29T00:59:00Z'), 'local'), '2026-03-29T01:59');
    assert.equal(toDateTimeInputValue(utc('2026-03-29T01:00:00Z'), 'local'), '2026-03-29T03:00');
    // 02:30 does not exist that night: the platform moves it an hour on
    assert.equal(fromDateTimeInputValue('2026-03-29T02:30', 'local')?.toISOString(), '2026-03-29T01:30:00.000Z');
  });

  it('round-trips around the autumn change (02:00–03:00 happens twice); a repeated time reads as its first occurrence', () => {
    for (const iso of ['2026-10-24T23:59:00Z', '2026-10-25T00:30:00Z', '2026-10-25T02:00:00Z']) {
      const date = utc(iso);
      assert.equal(fromDateTimeInputValue(toDateTimeInputValue(date, 'local'), 'local')?.toISOString(), date.toISOString(), iso);
    }
    // 00:30Z (02:30 CEST) and 01:30Z (02:30 CET) show the same wall-clock value
    assert.equal(toDateTimeInputValue(utc('2026-10-25T00:30:00Z'), 'local'), '2026-10-25T02:30');
    assert.equal(toDateTimeInputValue(utc('2026-10-25T01:30:00Z'), 'local'), '2026-10-25T02:30');
    assert.equal(fromDateTimeInputValue('2026-10-25T02:30', 'local')?.toISOString(), '2026-10-25T00:30:00.000Z');
  });
});

describe('empty and invalid input', () => {
  it('gives an empty input value for no date or an invalid one', () => {
    for (const zone of ['local', 'utc'] as const) {
      assert.equal(toDateInputValue(null, zone), '');
      assert.equal(toDateInputValue(undefined, zone), '');
      assert.equal(toDateInputValue(new Date('nope'), zone), '');
      assert.equal(toDateTimeInputValue(new Date(Number.NaN), zone), '');
    }
  });

  it('reads empty, malformed and impossible values as null', () => {
    for (const zone of ['local', 'utc'] as const) {
      for (const value of [null, undefined, '', '  ', '2026-3-4', '04.03.2026', '2026-02-30', '2026-13-01', '2026-00-10']) {
        assert.equal(fromDateInputValue(value, zone), null, `${zone} ${String(value)}`);
      }
      for (const value of ['', '2026-03-04', '2026-03-04T24:00', '2026-03-04T10:60', '2026-02-29T10:00', '2026-03-04 10:00']) {
        assert.equal(fromDateTimeInputValue(value, zone), null, `${zone} ${value}`);
      }
    }
    assert.equal(fromDateInputValue('2028-02-29', 'utc')?.toISOString(), '2028-02-29T00:00:00.000Z');
    assert.equal(fromDateTimeInputValue('2026-03-04T10:05:30.250', 'utc')?.toISOString(), '2026-03-04T10:05:30.000Z');
  });

  it('keeps years below 100 as they are (no 19xx mapping)', () => {
    assert.equal(fromDateInputValue('0050-01-01', 'utc')?.toISOString(), '0050-01-01T00:00:00.000Z');
    assert.equal(toDateInputValue(fromDateInputValue('0050-01-01', 'local'), 'local'), '0050-01-01');
  });
});
