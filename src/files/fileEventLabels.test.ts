import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { type TranslateFn, translationKeyOf } from '../i18n/store.ts';
import { translateFileAccessAudience, translateFileAccessVariant, translateFileEventType } from './fileEventLabels.ts';

/** A German translation table keyed like the store (`<text>__<context>`). */
const germanTexts: Record<string, string> = {
  [translationKeyOf('Staff', 'file-access-audience')]: 'Mitarbeiter',
  [translationKeyOf('Partner', 'file-access-audience')]: 'Partner (extern)',
  [translationKeyOf('Preview', 'file-access-variant')]: 'Vorschau',
  [translationKeyOf('Viewed', 'file-event')]: 'Angesehen',
  [translationKeyOf('Moved to the trash')]: 'In den Papierkorb verschoben',
};
const translateGerman: TranslateFn = (text, options) => germanTexts[translationKeyOf(text, options?.context)] ?? text;

describe('file activity labels', () => {
  it('translates the access audience with its context ("· Staff")', () => {
    assert.equal(translateFileAccessAudience('INTERNAL', translateGerman), 'Mitarbeiter');
    assert.equal(translateFileAccessAudience('SHARED', translateGerman), 'Partner (extern)');
  });

  it('translates the access variant and contexted event types with their context', () => {
    assert.equal(translateFileAccessVariant('INLINE', translateGerman), 'Vorschau');
    assert.equal(translateFileEventType('VIEWED', translateGerman), 'Angesehen');
  });

  it('translates an event type without a context by its plain text', () => {
    assert.equal(translateFileEventType('TRASHED', translateGerman), 'In den Papierkorb verschoben');
  });

  it('shows unknown values as they are', () => {
    assert.equal(translateFileAccessAudience('ROBOT', translateGerman), 'ROBOT');
    assert.equal(translateFileEventType('CUSTOM_EVENT', translateGerman), 'CUSTOM_EVENT');
  });
});
