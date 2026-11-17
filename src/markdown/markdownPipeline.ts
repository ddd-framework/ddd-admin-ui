// The markdown pipeline of the editor's preview and of MarkdownPreview, without the libraries: the sanitise schema is
// built from the schema rehype-sanitize ships (passed in, so this file imports nothing), and the line-break plugin
// walks the syntax tree itself. Pure: no React, no peer.

/** The part of a `hast-util-sanitize` schema this file reads and extends (structural, so no peer type is named). */
export interface MarkdownSanitizeSchema {
  tagNames?: string[] | null;
  attributes?: Record<string, unknown[]> | null;
  [key: string]: unknown;
}

/** Attributes an image keeps besides the defaults: authors size and title pictures in content fields. */
export const MARKDOWN_IMAGE_ATTRIBUTES = ['src', 'alt', 'title', 'width', 'height', 'style'] as const;

/**
 * The sanitise schema of every markdown the package renders: the given base (rehype-sanitize's `defaultSchema`, the
 * GitHub rules) plus `<img>` with its common attributes. Raw HTML in the source is parsed first and then sanitised,
 * so scripts, event handlers and `javascript:` links never reach the page. Returns a new schema; the base is kept.
 */
export const extendMarkdownSanitizeSchema = <TSchema extends MarkdownSanitizeSchema>(base: TSchema): TSchema => {
  const tagNames = base.tagNames ?? [];
  const attributes = base.attributes ?? {};
  return {
    ...base,
    tagNames: tagNames.includes('img') ? [...tagNames] : [...tagNames, 'img'],
    attributes: { ...attributes, img: [...(attributes.img ?? []), ...MARKDOWN_IMAGE_ATTRIBUTES] },
  };
};

interface MdastNode {
  type: string;
  value?: string;
  children?: MdastNode[];
  [key: string]: unknown;
}

const splitText = (node: MdastNode): MdastNode[] => {
  const value = node.value ?? '';
  if (!value.includes('\n')) return [node];
  const parts: MdastNode[] = [];
  value.split(/\r?\n/).forEach((line, index) => {
    if (index > 0) parts.push({ type: 'break' });
    if (line !== '') parts.push({ type: 'text', value: line });
  });
  return parts;
};

const breakLines = (node: MdastNode): void => {
  if (!node.children) return;
  node.children = node.children.flatMap(child => {
    if (child.type === 'text') return splitText(child);
    breakLines(child);
    return [child];
  });
};

/**
 * A remark plugin: a single newline inside a paragraph is a line break (`<br>`), as authors of content fields expect;
 * code keeps its newlines (code nodes carry no text children).
 */
export const remarkLineBreaks = () => (tree: unknown) => {
  breakLines(tree as MdastNode);
};
