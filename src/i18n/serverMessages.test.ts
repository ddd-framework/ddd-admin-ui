import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { translateDddErrorBody, translateDddRequestError, translateServerMessage } from './serverMessages.ts';
import { setTranslations } from './store.ts';

const GERMAN = {
  'Campaign not found': 'Kampagne nicht gefunden',
  'A folder named "%name%" exists already here': 'Hier gibt es schon einen Ordner namens „%name%“',
  'Request contains invalid data': 'Die Anfrage enthält ungültige Daten',
  'This value should not be null.': 'Dieser Wert darf nicht leer sein.',
  '{count, plural, one {This value is too long. It should have # character or less.} other {This value is too long. It should have # characters or less.}}':
    '{count, plural, one {Der Wert ist zu lang: höchstens # Zeichen.} other {Der Wert ist zu lang: höchstens # Zeichen.}}',
  '%entity% not found or current authenticated Account is not authorized to access it':
    '%entity% nicht gefunden oder du darfst nicht darauf zugreifen',
};

describe('translateServerMessage', () => {
  afterEach(() => setTranslations('en', 'FORMAL', {}));

  it('translates a static message by its English text', () => {
    setTranslations('de', 'INFORMAL', GERMAN);
    assert.equal(translateServerMessage('Campaign not found'), 'Kampagne nicht gefunden');
  });

  it('keeps an unknown message as the server sent it', () => {
    setTranslations('de', 'INFORMAL', GERMAN);
    assert.equal(translateServerMessage('Something only the server knows'), 'Something only the server knows');
  });

  it('translates a template and fills its values', () => {
    setTranslations('de', 'INFORMAL', GERMAN);
    assert.equal(
      translateServerMessage('A folder named "Flyer" exists already here', 'A folder named "%name%" exists already here', { name: 'Flyer' }),
      'Hier gibt es schon einen Ordner namens „Flyer“'
    );
  });

  it('fills an untranslated template in English', () => {
    assert.equal(
      translateServerMessage('ignored', 'At most %count% files per request', { count: 50 }),
      'At most 50 files per request'
    );
  });

  it('recognises framework messages without a template', () => {
    setTranslations('de', 'INFORMAL', GERMAN);
    assert.equal(
      translateServerMessage('Campaign not found or current authenticated Account is not authorized to access it'),
      'Campaign nicht gefunden oder du darfst nicht darauf zugreifen'
    );
    assert.equal(
      translateServerMessage('This value is too long. It should have 255 characters or less.'),
      'Der Wert ist zu lang: höchstens 255 Zeichen.'
    );
    assert.equal(
      translateServerMessage('This value is too long. It should have 1 character or less.'),
      'Der Wert ist zu lang: höchstens 1 Zeichen.'
    );
  });
});

describe('translateDddErrorBody', () => {
  afterEach(() => setTranslations('en', 'FORMAL', {}));

  it('translates the message and every violation, keeping the English message', () => {
    setTranslations('de', 'INFORMAL', GERMAN);
    const body = {
      error: 'Request contains invalid data',
      validationErrors: {
        elements: [{ jsonPath: '.', elements: [{ propertyName: 'name', errorMessage: 'This value should not be null.' }] }],
      },
    };
    assert.deepEqual(translateDddErrorBody(body), {
      error: 'Die Anfrage enthält ungültige Daten',
      errorEnglish: 'Request contains invalid data',
      validationErrors: {
        elements: [{ jsonPath: '.', elements: [{ propertyName: 'name', errorMessage: 'Dieser Wert darf nicht leer sein.' }] }],
      },
    });
    assert.equal(body.error, 'Request contains invalid data');
  });

  it('leaves anything that is not a DDD error body alone', () => {
    assert.equal(translateDddErrorBody('plain text'), 'plain text');
    const noError = { message: 'x' };
    assert.equal(translateDddErrorBody(noError), noError);
  });

  it('translates the body of an RTK Query error', () => {
    setTranslations('de', 'INFORMAL', GERMAN);
    const error = { status: 404, data: { error: 'Campaign not found' } };
    const translated = translateDddRequestError(error);
    assert.equal(translated.status, 404);
    assert.deepEqual(translated.data, { error: 'Kampagne nicht gefunden', errorEnglish: 'Campaign not found' });
    const fetchError = { status: 'FETCH_ERROR', error: 'TypeError: Failed to fetch' };
    assert.equal(translateDddRequestError(fetchError), fetchError);
  });
});
