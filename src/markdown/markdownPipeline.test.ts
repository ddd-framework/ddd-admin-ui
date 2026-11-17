import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { extendMarkdownSanitizeSchema, type MarkdownSanitizeSchema, remarkLineBreaks } from './markdownPipeline.ts';

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
