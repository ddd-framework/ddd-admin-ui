import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import { setTranslations } from '../../src/i18n/store.ts';
import { describeRequestError } from '../../src/logic/pure/errors.ts';
import { formatDate, formatDateTime, formatUiNumber } from '../../src/logic/pure/format.ts';
import { notify, setNotificationAdapter, type NotificationAdapter } from '../../src/logic/pure/notify.ts';
import { defineStatusMap, statusDefinitionOf } from '../../src/logic/pure/statusMap.ts';

afterEach(() => {
  setTranslations('en', 'FORMAL', {});
  setNotificationAdapter(null);
});

describe('formats', () => {
  const moment = '2026-03-04T10:05:00Z';

  it('use the language of the translation store (one store across modules)', () => {
    assert.equal(formatDate(moment, { timeZone: 'UTC' }), '03/04/2026');
    setTranslations('de', 'FORMAL', {});
    assert.equal(formatDate(moment, { timeZone: 'UTC' }), '04.03.2026');
    assert.equal(formatDateTime(moment, { timeZone: 'UTC' }), '04.03.2026, 10:05');
    assert.equal(formatUiNumber(1234.5), '1.234,5');
  });

  it('take an explicit locale over the store', () => {
    setTranslations('de', 'FORMAL', {});
    assert.equal(formatDate(moment, { locale: 'en-GB', timeZone: 'UTC' }), '04/03/2026');
  });

  it('answer an empty string for an invalid date', () => {
    assert.equal(formatDate('not a date'), '');
  });
});

describe('status maps', () => {
  it('define labels and tones and fall back to the raw value', () => {
    const statuses = defineStatusMap({ ACTIVE: { label: 'Active', tone: 'success' } });
    assert.deepEqual(statusDefinitionOf(statuses, 'ACTIVE'), { label: 'Active', tone: 'success' });
    assert.deepEqual(statusDefinitionOf(statuses, 'UNKNOWN'), { label: 'UNKNOWN', tone: 'neutral' });
    assert.ok(Object.isFrozen(statuses));
  });
});

describe('notify', () => {
  it('forwards to the registered adapter', () => {
    const calls: string[] = [];
    const adapter: NotificationAdapter = {
      success: (message) => (calls.push(`success:${message}`), 1),
      info: (message) => (calls.push(`info:${message}`), 2),
      error: (message) => (calls.push(`error:${message}`), 3),
      loading: (message, options) => (calls.push(`loading:${message}`), options?.id ?? 4),
      dismiss: (id) => {
        calls.push(`dismiss:${String(id)}`);
      },
    };
    setNotificationAdapter(adapter);
    assert.equal(notify.success('Saved'), 1);
    assert.equal(notify.loading('Saving', { id: 'save' }), 'save');
    notify.dismiss('save');
    assert.deepEqual(calls, ['success:Saved', 'loading:Saving', 'dismiss:save']);
  });

  it('is a no-op that warns once without an adapter', () => {
    const warn = mock.method(console, 'warn', () => {});
    try {
      assert.equal(notify.error('Failed', { id: 7 }), 7);
      notify.info('Again');
      assert.ok(warn.mock.callCount() <= 1);
    } finally {
      warn.mock.restore();
    }
  });
});

describe('describeRequestError', () => {
  it('uses the backend message, else the translated fallback', () => {
    assert.equal(describeRequestError({ status: 400, data: { error: 'Name is taken' } }), 'Name is taken');
    setTranslations('de', 'FORMAL', { 'The request failed': 'Die Anfrage ist fehlgeschlagen' });
    assert.equal(describeRequestError(undefined), 'Die Anfrage ist fehlgeschlagen');
  });
});
