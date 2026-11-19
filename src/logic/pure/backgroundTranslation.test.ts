import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  endedTranslationPartIds,
  hasOpenTranslationPart,
  isOpenTranslationRow,
  parseTranslationFailureMessage,
  translationLanguageCodesOf,
  translationProgressRowsOf,
} from './backgroundTranslation.ts';

describe('translationProgressRowsOf', () => {
  it('folds the parts of a language into one row, in the order the languages appear', () => {
    const rows = translationProgressRowsOf([
      { id: 1, languageCode: 'fr', status: 'COMPLETED' },
      { id: 2, languageCode: 'EN', status: 'QUEUED' },
      { id: 3, languageCode: 'fr', status: 'RUNNING' },
      { id: 4, languageCode: 'en', status: 'COMPLETED' },
    ]);
    assert.deepEqual(rows, [
      { locale: 'fr', status: 'running', failures: [] },
      { locale: 'en', status: 'pending', failures: [] },
    ]);
    assert.equal(rows.every(isOpenTranslationRow), true);
  });

  it('is done when every part of the language completed and failed when one failed', () => {
    const rows = translationProgressRowsOf([
      { id: 1, languageCode: 'fr', status: 'COMPLETED' },
      { id: 2, languageCode: 'fr', status: 'COMPLETED' },
      { id: 3, languageCode: 'cs', status: 'COMPLETED' },
      { id: 4, languageCode: 'cs', status: 'FAILED', failureReason: 'BUDGET_EXCEEDED', failureMessage: 'BUDGET_EXCEEDED: name' },
    ]);
    assert.equal(rows[0]?.status, 'done');
    assert.equal(rows[1]?.status, 'failed');
    assert.deepEqual(rows[1]?.failures, [{ reason: 'BUDGET_EXCEEDED', propertyNames: ['name'], detail: null }]);
  });

  it('keeps a language open while one of its parts is open, also next to a failed one', () => {
    const rows = translationProgressRowsOf([
      { id: 1, languageCode: 'fr', status: 'FAILED', failureReason: 'OTHER' },
      { id: 2, languageCode: 'fr', status: 'QUEUED' },
    ]);
    assert.equal(rows[0]?.status, 'pending');
  });

  it('skips a part without a language', () => {
    assert.deepEqual(translationProgressRowsOf([{ id: 1, status: 'QUEUED' }]), []);
  });
});

describe('parseTranslationFailureMessage', () => {
  it('reads reasons with their properties and the detail', () => {
    assert.deepEqual(parseTranslationFailureMessage('PROVIDER_ERROR', 'PROVIDER_ERROR: name, description; SOURCE_MISSING: faqs (HTTP 503 (upstream))'), [
      { reason: 'PROVIDER_ERROR', propertyNames: ['name', 'description'], detail: 'HTTP 503 (upstream)' },
      { reason: 'SOURCE_MISSING', propertyNames: ['faqs'], detail: 'HTTP 503 (upstream)' },
    ]);
  });

  it('takes a free message as the detail of the part reason', () => {
    assert.deepEqual(parseTranslationFailureMessage('STALLED', 'No sign of life for 30 minutes'), [
      { reason: 'STALLED', propertyNames: [], detail: 'No sign of life for 30 minutes' },
    ]);
  });

  it('names the reason alone without a message, OTHER without a reason', () => {
    assert.deepEqual(parseTranslationFailureMessage('SOURCE_MISSING', null), [{ reason: 'SOURCE_MISSING', propertyNames: [], detail: null }]);
    assert.deepEqual(parseTranslationFailureMessage(null, ''), [{ reason: 'OTHER', propertyNames: [], detail: null }]);
  });
});

describe('part helpers', () => {
  it('knows open and ended parts', () => {
    const parts = [
      { id: 7, languageCode: 'fr', status: 'COMPLETED' },
      { id: '8', languageCode: 'en', status: 'FAILED' },
      { id: 9, languageCode: 'cs', status: 'RUNNING' },
    ];
    assert.equal(hasOpenTranslationPart(parts), true);
    assert.deepEqual(endedTranslationPartIds(parts), [7, 8]);
    assert.equal(hasOpenTranslationPart(parts.slice(0, 2)), false);
  });

  it('names each language of the picked locale keys once', () => {
    assert.deepEqual(translationLanguageCodesOf(['fr::FORMAL', 'de::FORMAL', 'de::INFORMAL', 'pt-BR::FORMAL']), ['fr', 'de', 'pt']);
  });
});
