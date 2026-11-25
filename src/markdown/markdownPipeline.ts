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

/** Elements a markdown of unknown origin never keeps: they fetch from a foreign host as soon as they are drawn. */
export const UNTRUSTED_MARKDOWN_REMOVED_TAGS = ['img', 'picture', 'source', 'video', 'audio', 'iframe'] as const;

/**
 * The sanitise schema for markdown of unknown origin (a file somebody uploaded): the given base (rehype-sanitize's
 * `defaultSchema`) without every element that loads a resource. Returns a new schema; the base is kept.
 */
export const restrictMarkdownSanitizeSchema = <TSchema extends MarkdownSanitizeSchema>(base: TSchema): TSchema => {
  const removed: readonly string[] = UNTRUSTED_MARKDOWN_REMOVED_TAGS;
  const attributes = Object.fromEntries(Object.entries(base.attributes ?? {}).filter(([tagName]) => !removed.includes(tagName)));
  return { ...base, tagNames: (base.tagNames ?? []).filter(tagName => !removed.includes(tagName)), attributes };
};

const untrustText = (node: MdastNode): MdastNode => {
  if (node.type === 'html') return { type: 'text', value: node.value ?? '' };
  if (node.type === 'image' || node.type === 'imageReference') {
    const alt = typeof node.alt === 'string' ? node.alt.trim() : '';
    return { type: 'text', value: alt === '' ? '[image]' : `[image: ${alt}]` };
  }
  return node;
};

const untrustChildren = (node: MdastNode): void => {
  if (!node.children) return;
  node.children = node.children.map(child => {
    const replaced = untrustText(child);
    if (replaced === child) untrustChildren(child);
    return replaced;
  });
};

/**
 * A remark plugin for markdown of unknown origin: raw HTML stays text (it is shown as typed, never parsed as markup)
 * and a picture becomes its description (`[image: …]`), so drawing the markdown never contacts another host.
 */
export const remarkUntrustedContent = () => (tree: unknown) => {
  untrustChildren(tree as MdastNode);
};

/**
 * The link targets markdown of unknown origin keeps: `http(s):`, `mailto:` and anchors inside the text (`#…`); every
 * other URL (`javascript:`, `data:`, a relative path, a protocol-relative one) becomes empty.
 */
export const untrustedMarkdownUrl = (url: string): string => {
  const trimmed = url.trim();
  if (trimmed.startsWith('#')) return trimmed;
  return /^(https?:\/\/|mailto:)/i.test(trimmed) ? trimmed : '';
};

interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

const openLinksOutside = (node: HastNode): void => {
  if (node.type === 'element' && node.tagName === 'a') {
    const href = typeof node.properties?.href === 'string' ? node.properties.href : '';
    if (!href.startsWith('#')) node.properties = { ...node.properties, target: '_blank', rel: ['noopener', 'noreferrer', 'nofollow'] };
  }
  node.children?.forEach(openLinksOutside);
};

/** A rehype plugin: every link that leaves the text opens in a new tab without an opener and without a referrer. */
export const rehypeOutsideLinks = () => (tree: unknown) => {
  openLinksOutside(tree as HastNode);
};
