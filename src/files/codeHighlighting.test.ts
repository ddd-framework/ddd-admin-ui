import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CODE_HIGHLIGHT_MAX_CHARACTERS, codeHighlighterFromHighlightJs, codeTokensFromHighlightJsHtml } from './codeHighlighting.ts';

describe('code highlighting', () => {
  it('reads highlight.js output as tokens', () => {
    const tokens = codeTokensFromHighlightJsHtml('<span class="hljs-keyword">const</span> a = <span class="hljs-string">&quot;x &lt; y&quot;</span>;');
    assert.deepEqual(tokens, [
      { text: 'const', classNames: ['keyword'] },
      { text: ' a = ', classNames: [] },
      { text: '"x < y"', classNames: ['string'] },
      { text: ';', classNames: [] },
    ]);
  });

  it('joins the classes of nested spans and drops foreign classes', () => {
    const tokens = codeTokensFromHighlightJsHtml('<span class="hljs-title function_ evil">f<span class="hljs-params">(a)</span></span>');
    assert.deepEqual(tokens, [
      { text: 'f', classNames: ['title'] },
      { text: '(a)', classNames: ['title', 'params'] },
    ]);
  });

  it('keeps every other tag as text', () => {
    const tokens = codeTokensFromHighlightJsHtml('<script>alert(1)</script><img src=x onerror=alert(1)>');
    assert.deepEqual(tokens, [{ text: '<script>alert(1)</script><img src=x onerror=alert(1)>', classNames: [] }]);
  });

  it('answers null for an unknown language, long source and output that lost text', () => {
    const escape = (code: string) => code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const highlightJs = { getLanguage: (name: string) => (name === 'json' ? {} : undefined), highlight: (code: string) => ({ value: escape(code) }) };
    const highlighter = codeHighlighterFromHighlightJs(highlightJs);
    assert.deepEqual(highlighter.highlight('{"a": "<b>"}', 'json'), [{ text: '{"a": "<b>"}', classNames: [] }]);
    assert.equal(highlighter.highlight('x', 'cobol'), null);
    assert.equal(highlighter.highlight('x'.repeat(CODE_HIGHLIGHT_MAX_CHARACTERS + 1), 'json'), null);
    const lossy = codeHighlighterFromHighlightJs({ getLanguage: () => ({}), highlight: () => ({ value: 'other' }) });
    assert.equal(lossy.highlight('x', 'json'), null);
  });
});
