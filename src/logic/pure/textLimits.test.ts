import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { countCodePoints, overLimitKeys } from './textLimits.ts';
import { mergeLanguageTabs, translationLanguageOf } from './locales.ts';

describe('text limits', () => {
  it('counts code points, not UTF-16 units', () => {
    assert.equal(countCodePoints('abc'), 3);
    assert.equal(countCodePoints('😀😀'), 2);
    assert.equal('😀😀'.length, 4);
    assert.equal(countCodePoints('é'), 1);
  });

  it('names the keys over the limit and cuts nothing', () => {
    const value = { 'en::FORMAL': 'abcd', 'de::FORMAL': '😀😀😀', 'fr::FORMAL': 'abcdef' };
    assert.deepEqual(overLimitKeys(value, 3), ['en::FORMAL', 'fr::FORMAL']);
    assert.deepEqual(overLimitKeys(value, 3, text => text.length), ['en::FORMAL', 'de::FORMAL', 'fr::FORMAL']);
    assert.deepEqual(overLimitKeys(value, undefined), []);
    assert.equal(value['fr::FORMAL'], 'abcdef');
  });
});

describe('language tabs', () => {
  it('splits the language from the style', () => {
    assert.equal(translationLanguageOf('de::INFORMAL'), 'de');
    assert.equal(translationLanguageOf('de:at:FORMAL'), 'de:at');
  });

  it('edits one key per language, deterministically, and keeps the others', () => {
    const tabs = mergeLanguageTabs('en::FORMAL', ['en::FORMAL', 'de::FORMAL', 'fr::FORMAL'], ['de::INFORMAL', 'de::FORMAL', 'it::INFORMAL']);
    assert.deepEqual(
      tabs.map(tab => [tab.key, tab.otherKeys ?? []]),
      [
        ['en::FORMAL', []],
        ['de::FORMAL', ['de::INFORMAL']],
        ['fr::FORMAL', []],
        ['it::INFORMAL', []],
      ]
    );
    assert.equal(tabs[3]?.label, 'IT · Informal');
    // the same input in another order gives the same tabs
    const again = mergeLanguageTabs('en::FORMAL', ['fr::FORMAL', 'de::FORMAL', 'en::FORMAL'], ['it::INFORMAL', 'de::FORMAL', 'de::INFORMAL']);
    assert.deepEqual(again.map(tab => tab.key).sort(), tabs.map(tab => tab.key).sort());
  });

  it('follows the default style and the style order', () => {
    const informal = mergeLanguageTabs('de::INFORMAL', ['de::INFORMAL', 'en::FORMAL'], ['en::INFORMAL', 'en::FORMAL']);
    assert.deepEqual(informal.map(tab => tab.key), ['de::INFORMAL', 'en::INFORMAL']);
    const formalFirst = mergeLanguageTabs('de::INFORMAL', [], ['en::INFORMAL', 'en::FORMAL'], { styleOrder: ['FORMAL'] });
    assert.deepEqual(formalFirst.map(tab => tab.key), ['de::INFORMAL', 'en::FORMAL']);
    assert.deepEqual(mergeLanguageTabs('en::FORMAL', ['es:mx:FORMAL'], []).map(tab => tab.key), ['en::FORMAL', 'es:mx:FORMAL']);
  });
});
