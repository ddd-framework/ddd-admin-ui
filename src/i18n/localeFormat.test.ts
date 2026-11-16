import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { dateTimeFormatFor, numberFormatFor, relativeTimeFormatFor, toIntlLocale } from './localeFormat.ts';

const MONDAY_2026_11_02 = new Date(Date.UTC(2026, 10, 2, 12, 0, 0));

describe('toIntlLocale', () => {
  it('prints English as en-GB and keeps other languages', () => {
    assert.equal(toIntlLocale('en'), 'en-GB');
    assert.equal(toIntlLocale(''), 'en-GB');
    assert.equal(toIntlLocale(null), 'en-GB');
    assert.equal(toIntlLocale('de'), 'de');
  });

  it('falls back to en-GB for an invalid tag', () => {
    assert.equal(toIntlLocale('not a locale!'), 'en-GB');
  });
});

describe('locale formatters', () => {
  it('names weekdays and months in the UI language', () => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', timeZone: 'UTC' };
    assert.match(dateTimeFormatFor(toIntlLocale('de'), options).format(MONDAY_2026_11_02), /Montag/);
    assert.match(dateTimeFormatFor(toIntlLocale('de'), options).format(MONDAY_2026_11_02), /November/);
    assert.match(dateTimeFormatFor(toIntlLocale('en'), options).format(MONDAY_2026_11_02), /Monday/);
  });

  it('groups numbers by the UI language', () => {
    const options = { minimumFractionDigits: 1, maximumFractionDigits: 1 };
    assert.equal(numberFormatFor('de', options).format(1234.5), '1.234,5');
    assert.equal(numberFormatFor('en-GB', options).format(1234.5), '1,234.5');
  });

  it('caches one formatter per locale and options, a switch yields another', () => {
    assert.equal(numberFormatFor('de', {}), numberFormatFor('de', {}));
    assert.notEqual(numberFormatFor('de', {}), numberFormatFor('en-GB', {}));
  });

  it('formats relative times in the UI language', () => {
    assert.equal(relativeTimeFormatFor('de', { numeric: 'auto' }).format(-1, 'day'), 'gestern');
    assert.equal(relativeTimeFormatFor('en-GB', { numeric: 'auto' }).format(-1, 'day'), 'yesterday');
  });
});
