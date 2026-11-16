import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { withStickyParams } from './stickyParams.ts';

describe('withStickyParams', () => {
  it('appends the sticky parameters present in the current URL', () => {
    assert.equal(withStickyParams('/projects', ['workspace', 'debug'], '?workspace=7&q=x'), '/projects?workspace=7');
    assert.equal(withStickyParams('/projects', ['workspace'], 'workspace=7'), '/projects?workspace=7');
  });

  it("keeps the link's own parameters and hash; the link's own value wins", () => {
    assert.equal(withStickyParams('/p?tab=a#top', ['workspace'], '?workspace=7'), '/p?tab=a&workspace=7#top');
    assert.equal(withStickyParams('/p?workspace=1', ['workspace'], '?workspace=7'), '/p?workspace=1');
  });

  it('returns the link unchanged when nothing is sticky', () => {
    assert.equal(withStickyParams('/p#x', ['workspace'], '?q=1'), '/p#x');
    assert.equal(withStickyParams('/p', [], '?workspace=7'), '/p');
  });

  it('works with absolute links, repeated values and URLSearchParams', () => {
    assert.equal(
      withStickyParams('https://example.com/a', ['tag'], new URLSearchParams('tag=a&tag=b')),
      'https://example.com/a?tag=a&tag=b'
    );
  });
});
