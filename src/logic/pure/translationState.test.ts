import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { mergeTranslatedStore, translationsChanged } from './translationState.ts';

describe('translation state (0.3.3)', () => {
  it('merges only non-blank incoming texts into blank entries', () => {
    const merged = mergeTranslatedStore({ title: { 'en::FORMAL': 'Hello', 'de::FORMAL': '' } }, { title: { 'de::FORMAL': 'Hallo', 'fr::FORMAL': ' ', 'en::FORMAL': 'Hi' } }, ['title']);
    assert.deepEqual(merged, { title: { 'en::FORMAL': 'Hello', 'de::FORMAL': 'Hallo' } });
  });

  it('tells a change from blank entries and key order', () => {
    const baseline = { title: { 'en::FORMAL': 'Hello', 'de::FORMAL': 'Hallo' } };
    assert.equal(translationsChanged({ title: { 'de::FORMAL': 'Hallo', 'en::FORMAL': 'Hello', 'fr::FORMAL': '' } }, baseline, ['title']), false);
    assert.equal(translationsChanged({ title: { 'en::FORMAL': 'Hello' } }, baseline, ['title']), true);
    assert.equal(translationsChanged({ title: { 'en::FORMAL': 'Hello!', 'de::FORMAL': 'Hallo' } }, baseline, ['title']), true);
  });
});
