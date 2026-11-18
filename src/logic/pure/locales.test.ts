import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  languageEditedKey,
  languageFieldTabs,
  languagesOfStore,
  languageTextsOf,
  mergeLanguageTabs,
  mergeLocaleKeys,
  storeWithLanguageTexts,
  translationFieldKey,
} from './locales.ts';

describe('offered-only tabs', () => {
  it('leaves stored keys that are not offered without a tab (key model)', () => {
    const all = mergeLocaleKeys('en::FORMAL', ['en::FORMAL', 'de::FORMAL'], ['de::INFORMAL', 'fr::FORMAL']).map(tab => tab.key);
    assert.deepEqual(all, ['en::FORMAL', 'de::FORMAL', 'de::INFORMAL', 'fr::FORMAL']);
    const offered = mergeLocaleKeys('en::FORMAL', ['en::FORMAL', 'de::FORMAL'], ['de::INFORMAL', 'fr::FORMAL'], { offeredOnly: true });
    assert.deepEqual(offered.map(tab => tab.key), ['en::FORMAL', 'de::FORMAL']);
  });

  it('leaves stored languages and regions that are not offered without a tab (language model)', () => {
    const stored = ['de:at:FORMAL', 'fr::FORMAL', 'de::INFORMAL'];
    const all = mergeLanguageTabs('en::FORMAL', ['de::FORMAL'], stored).map(tab => tab.key);
    assert.deepEqual(all, ['en::FORMAL', 'de::INFORMAL', 'de:at:FORMAL', 'fr::FORMAL']);
    const offered = mergeLanguageTabs('en::FORMAL', ['de::FORMAL'], stored, { offeredOnly: true });
    assert.deepEqual(offered.map(tab => tab.key), ['en::FORMAL', 'de::INFORMAL']);
  });
});

describe('edited key per field', () => {
  const tabs = mergeLanguageTabs('en::FORMAL', ['de::FORMAL'], ['de::INFORMAL'], { editedKeyPerField: true });

  it('gives every tab the language in the first style and its keys in order', () => {
    assert.deepEqual(
      tabs.map(tab => [tab.key, tab.fieldKeys]),
      [
        ['en::FORMAL', ['en::FORMAL', 'en::INFORMAL']],
        ['de::FORMAL', ['de::FORMAL', 'de::INFORMAL']],
      ]
    );
    assert.equal(tabs[1]?.otherKeys, undefined);
  });

  it('edits FORMAL, else INFORMAL when only that holds text', () => {
    const german = tabs[1] as (typeof tabs)[number];
    assert.equal(translationFieldKey(german, { 'de::INFORMAL': 'Hallo' }), 'de::INFORMAL');
    assert.equal(translationFieldKey(german, { 'de::INFORMAL': 'Hallo', 'de::FORMAL': 'Guten Tag' }), 'de::FORMAL');
    assert.equal(translationFieldKey(german, {}), 'de::FORMAL');
    assert.equal(translationFieldKey(german, { 'de::INFORMAL': '  ' }), 'de::FORMAL');
  });

  it('keeps the per-form choice without the option', () => {
    const perForm = mergeLanguageTabs('en::FORMAL', ['de::FORMAL'], ['de::INFORMAL']);
    assert.equal(perForm[1]?.key, 'de::INFORMAL');
    assert.equal(translationFieldKey(perForm[1] as (typeof perForm)[number], { 'de::FORMAL': 'x' }), 'de::INFORMAL');
  });
});

describe('one text per language', () => {
  const store = { 'de::INFORMAL': 'Hallo', 'en::FORMAL': 'Hello', 'en::INFORMAL': 'Hi', 'fr::FORMAL': '' };

  it('reads the edited key of every language', () => {
    assert.equal(languageEditedKey(store, 'de'), 'de::INFORMAL');
    assert.equal(languageEditedKey(store, 'en'), 'en::FORMAL');
    assert.equal(languageEditedKey(store, 'fr'), 'fr::FORMAL');
    assert.deepEqual(languageTextsOf(store, ['de', 'en', 'fr', 'it']), { de: 'Hallo', en: 'Hello', fr: '', it: '' });
    assert.deepEqual(languageTextsOf({ 'de:at:FORMAL': 'Servus' }), { 'de:at': 'Servus' });
  });

  it('writes texts into the edited keys and keeps every other key', () => {
    assert.deepEqual(storeWithLanguageTexts(store, { de: 'Hallo du', it: 'Ciao' }), {
      'de::INFORMAL': 'Hallo du',
      'en::FORMAL': 'Hello',
      'en::INFORMAL': 'Hi',
      'it::FORMAL': 'Ciao',
    });
    assert.deepEqual(storeWithLanguageTexts(store, { en: '' }), { 'de::INFORMAL': 'Hallo', 'en::INFORMAL': 'Hi' });
  });

  it('builds one tab per language with its style keys', () => {
    assert.deepEqual(
      languageFieldTabs(['de', 'en::FORMAL', 'de:at', 'de']).map(tab => [tab.key, tab.label, tab.fieldKeys]),
      [
        ['de::FORMAL', 'DE', ['de::FORMAL', 'de::INFORMAL']],
        ['en::FORMAL', 'EN', ['en::FORMAL', 'en::INFORMAL']],
        ['de:at:FORMAL', 'DE-AT', ['de:at:FORMAL', 'de:at:INFORMAL']],
      ]
    );
  });
});

describe('language texts with fixed edited keys (0.3.3)', () => {
  it('keeps a language on the key it was typed in after that key was emptied', () => {
    const store = { 'de::FORMAL': '', 'de::INFORMAL': 'Hallo du' };
    assert.deepEqual(languageTextsOf(store, ['de']), { de: 'Hallo du' });
    assert.deepEqual(languageTextsOf(store, ['de'], undefined, { editedKeys: { de: 'de::FORMAL' } }), { de: '' });
    assert.deepEqual(
      storeWithLanguageTexts(store, { de: 'H' }, undefined, { editedKeys: { de: 'de::FORMAL' } }),
      { 'de::FORMAL': 'H', 'de::INFORMAL': 'Hallo du' }
    );
  });

  it('keeps blank texts in the editing state only with keepBlank', () => {
    assert.deepEqual(storeWithLanguageTexts({}, { de: ' ' }), {});
    assert.deepEqual(storeWithLanguageTexts({}, { de: ' ' }, undefined, { keepBlank: true }), { 'de::FORMAL': ' ' });
  });

  it('lists the languages of a store once each', () => {
    assert.deepEqual(languagesOfStore({ 'de::FORMAL': 'a', 'de::INFORMAL': 'b', 'de:at:FORMAL': 'c', 'en::FORMAL': 'd' }), ['de', 'de:at', 'en']);
  });
});
