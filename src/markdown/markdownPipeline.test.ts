import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  extendMarkdownSanitizeSchema,
  type MarkdownSanitizeSchema,
  rehypeOutsideLinks,
  remarkLineBreaks,
  remarkUntrustedContent,
  restrictMarkdownSanitizeSchema,
  untrustedMarkdownUrl,
} from './markdownPipeline.ts';

describe('extendMarkdownSanitizeSchema', () => {
  it('adds img and its attributes, keeps the base unchanged', () => {
    const base = { tagNames: ['p', 'a'], attributes: { a: ['href'], img: ['src'] }, strip: ['script'] };
    const schema = extendMarkdownSanitizeSchema(base);
    assert.deepEqual(schema.tagNames, ['p', 'a', 'img']);
    assert.deepEqual(schema.attributes?.img, ['src', 'src', 'alt', 'title', 'width', 'height', 'style']);
    assert.deepEqual(schema.attributes?.a, ['href']);
    assert.deepEqual(schema.strip, ['script']);
    assert.deepEqual(base.tagNames, ['p', 'a']);
    assert.deepEqual(base.attributes.img, ['src']);
  });

  it('works on an empty base and never adds img twice', () => {
    assert.deepEqual(extendMarkdownSanitizeSchema<MarkdownSanitizeSchema>({}).tagNames, ['img']);
    assert.deepEqual(extendMarkdownSanitizeSchema({ tagNames: ['img'] }).tagNames, ['img']);
  });
});

describe('remarkLineBreaks', () => {
  it('turns a single newline in text into a break, recursively', () => {
    const tree = {
      type: 'root',
      children: [
        { type: 'paragraph', children: [{ type: 'text', value: 'one\ntwo' }, { type: 'emphasis', children: [{ type: 'text', value: 'a\r\nb' }] }] },
        { type: 'code', value: 'x\ny' },
      ],
    };
    remarkLineBreaks()(tree);
    assert.deepEqual(tree.children[0], {
      type: 'paragraph',
      children: [
        { type: 'text', value: 'one' },
        { type: 'break' },
        { type: 'text', value: 'two' },
        { type: 'emphasis', children: [{ type: 'text', value: 'a' }, { type: 'break' }, { type: 'text', value: 'b' }] },
      ],
    });
    assert.deepEqual(tree.children[1], { type: 'code', value: 'x\ny' });
  });

  it('leaves text without a newline as is', () => {
    const text = { type: 'text', value: 'plain' };
    const tree = { type: 'root', children: [{ type: 'paragraph', children: [text] }] };
    remarkLineBreaks()(tree);
    assert.equal(tree.children[0].children[0], text);
  });
});

describe('markdown of unknown origin', () => {
  it('keeps raw HTML as text and turns pictures into their description', () => {
    const tree = {
      type: 'root',
      children: [
        { type: 'html', value: '<script>alert(1)</script>' },
        {
          type: 'paragraph',
          children: [
            { type: 'image', url: 'https://tracker.example/p.png', alt: 'Chart' },
            { type: 'imageReference', identifier: 'logo', alt: '' },
            { type: 'html', value: '<img src=x onerror=alert(1)>' },
            { type: 'link', url: 'https://example.org', children: [{ type: 'image', url: 'https://tracker.example/q.png', alt: 'Badge' }] },
          ],
        },
      ],
    };
    remarkUntrustedContent()(tree);
    assert.deepEqual(tree.children[0], { type: 'text', value: '<script>alert(1)</script>' });
    assert.deepEqual(tree.children[1], {
      type: 'paragraph',
      children: [
        { type: 'text', value: '[image: Chart]' },
        { type: 'text', value: '[image]' },
        { type: 'text', value: '<img src=x onerror=alert(1)>' },
        { type: 'link', url: 'https://example.org', children: [{ type: 'text', value: '[image: Badge]' }] },
      ],
    });
  });

  it('drops every element that loads a resource from the schema', () => {
    const base = { tagNames: ['p', 'a', 'img', 'picture', 'source'], attributes: { a: ['href'], img: ['src'] }, strip: ['script'] };
    const schema = restrictMarkdownSanitizeSchema(base);
    assert.deepEqual(schema.tagNames, ['p', 'a']);
    assert.deepEqual(schema.attributes, { a: ['href'] });
    assert.deepEqual(schema.strip, ['script']);
    assert.deepEqual(base.tagNames, ['p', 'a', 'img', 'picture', 'source']);
  });

  it('keeps web, mail and anchor links only', () => {
    assert.equal(untrustedMarkdownUrl('https://example.org/a?b=1'), 'https://example.org/a?b=1');
    assert.equal(untrustedMarkdownUrl(' HTTP://example.org '), 'HTTP://example.org');
    assert.equal(untrustedMarkdownUrl('mailto:a@example.org'), 'mailto:a@example.org');
    assert.equal(untrustedMarkdownUrl('#chapter-2'), '#chapter-2');
    assert.equal(untrustedMarkdownUrl('javascript:alert(1)'), '');
    assert.equal(untrustedMarkdownUrl('data:text/html,<script>1</script>'), '');
    assert.equal(untrustedMarkdownUrl('//evil.example/x'), '');
    assert.equal(untrustedMarkdownUrl('../secret.md'), '');
  });

  it('opens links that leave the text outside, without an opener', () => {
    const tree = {
      type: 'root',
      children: [
        { type: 'element', tagName: 'a', properties: { href: 'https://example.org' }, children: [] },
        { type: 'element', tagName: 'p', properties: {}, children: [{ type: 'element', tagName: 'a', properties: { href: '#top' }, children: [] }] },
      ],
    };
    rehypeOutsideLinks()(tree);
    assert.deepEqual(tree.children[0].properties, { href: 'https://example.org', target: '_blank', rel: ['noopener', 'noreferrer', 'nofollow'] });
    assert.deepEqual(tree.children[1].children?.[0]?.properties, { href: '#top' });
  });
});
