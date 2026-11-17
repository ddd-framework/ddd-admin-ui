import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isInlineDescription } from './descriptionContent.ts';

test('a string or a number stays in the <p> of the description', () => {
  assert.equal(isInlineDescription('It leaves the list.'), true);
  assert.equal(isInlineDescription(3), true);
});

test('an element, a fragment or a list is rendered in a <div>', () => {
  assert.equal(isInlineDescription({ type: 'p', props: {}, key: null } as never), false);
  assert.equal(isInlineDescription(['one', 'two']), false);
});
