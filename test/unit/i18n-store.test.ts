import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { m } from '../../src/i18n/m.ts';
import {
  getTranslationsSnapshot,
  setTranslations,
  subscribeTranslations,
  translateText,
  translationKeyOf,
} from '../../src/i18n/store.ts';

afterEach(() => setTranslations('en', 'FORMAL', {}));

describe('i18n store', () => {
  it('keys a text with its context', () => {
    assert.equal(translationKeyOf('Close'), 'Close');
    assert.equal(translationKeyOf('Close', 'dialog'), 'Close__dialog');
  });

  it('translates with the active translations and falls back to the text', () => {
    setTranslations('de', 'FORMAL', { 'Clear filters': 'Filter zurücksetzen', Close__dialog: 'Schließen' });
    assert.equal(translateText('Clear filters'), 'Filter zurücksetzen');
    assert.equal(m('Close', { context: 'dialog' }), 'Schließen');
    assert.equal(m('Close'), 'Close');
  });

  it('replaces %name% placeholders and keeps unknown ones', () => {
    setTranslations('de', 'FORMAL', { '%count% rows': '%count% Zeilen' });
    assert.equal(m('%count% rows', { replacements: { count: 3 } }), '3 Zeilen');
    assert.equal(m('%other% rows', { replacements: { count: 3 } }), '%other% rows');
  });

  it('notifies subscribers and gives a new snapshot per change', () => {
    const before = getTranslationsSnapshot();
    let calls = 0;
    const unsubscribe = subscribeTranslations(() => {
      calls += 1;
    });
    setTranslations('de', 'INFORMAL', {});
    unsubscribe();
    setTranslations('fr', 'FORMAL', {});
    assert.equal(calls, 1);
    assert.notEqual(getTranslationsSnapshot(), before);
    assert.equal(getTranslationsSnapshot().languageCode, 'fr');
  });
});
