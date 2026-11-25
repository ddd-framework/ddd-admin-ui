// Highlighted source code as tokens, without a highlighter of its own: the host loads one (`CodeHighlighterLoader`,
// like pdf.js for PDFs) and the preview draws the tokens as text nodes. Pure: no React, no DOM, no peer.

/** A run of source text with the classes a stylesheet colours it by (`['keyword']`); plain text carries none. */
export interface CodeToken {
  text: string;
  classNames: readonly string[];
}

/** The part of a highlighter the preview uses. */
export interface CodeHighlighterLike {
  /**
   * The tokens of `code` in `language` (a name of `codeLanguageOfExtension`), in order, their texts joined giving the
   * code again; `null` when the highlighter does not know the language (the code is then shown plain).
   */
  highlight: (code: string, language: string) => readonly CodeToken[] | null;
}

/**
 * Loads a highlighter in the host, on the first source file shown, e.g.
 * `() => import('highlight.js/lib/common').then(module => codeHighlighterFromHighlightJs(module.default))`.
 */
export type CodeHighlighterLoader = () => Promise<CodeHighlighterLike>;

/** The part of highlight.js the adapter calls (structural, so the package does not depend on it). */
export interface HighlightJsLike {
  getLanguage: (name: string) => unknown;
  highlight: (code: string, options: { language: string; ignoreIllegals?: boolean }) => { value: string };
}

/** Source longer than this is shown plain: highlighting it would block the page for seconds. */
export const CODE_HIGHLIGHT_MAX_CHARACTERS = 200_000;

const ENTITIES: Readonly<Record<string, string>> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'", '#x27': "'" };

const decodeEntities = (text: string): string => text.replace(/&(amp|lt|gt|quot|apos|#39|#x27);/gi, (match, name: string) => ENTITIES[name.toLowerCase()] ?? match);

/** `hljs-keyword language_` → `['keyword']`: only highlight.js' own token classes, without the prefix. */
const tokenClassesOf = (classAttribute: string): string[] =>
  classAttribute
    .split(/\s+/)
    .filter(name => /^hljs-[a-z][a-z0-9_-]*$/i.test(name))
    .map(name => name.slice('hljs-'.length).toLowerCase());

const SPAN_TAG = /<span class="([^"<>]*)">|<\/span>/g;

/**
 * The tokens of highlight.js' output. That output is HTML made of escaped text and `<span class="hljs-…">` only; it is
 * read as a string and never inserted into a document, so nothing of it can run. Anything that is not one of those
 * two tags stays text. Nested spans join their classes.
 */
export const codeTokensFromHighlightJsHtml = (html: string): CodeToken[] => {
  const tokens: CodeToken[] = [];
  const stack: string[][] = [];
  const push = (raw: string) => {
    if (raw === '') return;
    const text = decodeEntities(raw);
    const classNames = [...new Set(stack.flat())];
    const last = tokens[tokens.length - 1];
    if (last && last.classNames.join(' ') === classNames.join(' ')) last.text += text;
    else tokens.push({ text, classNames });
  };
  let position = 0;
  SPAN_TAG.lastIndex = 0;
  for (let match = SPAN_TAG.exec(html); match !== null; match = SPAN_TAG.exec(html)) {
    push(html.slice(position, match.index));
    position = match.index + match[0].length;
    if (match[1] !== undefined) stack.push(tokenClassesOf(match[1]));
    else stack.pop();
  }
  push(html.slice(position));
  return tokens;
};

/**
 * A `CodeHighlighterLike` on highlight.js (any build: `highlight.js/lib/common`, or `core` with the host's languages).
 * A language the build does not know, source over `CODE_HIGHLIGHT_MAX_CHARACTERS`, or output that does not give the
 * code back answers `null` (the preview shows the code plain).
 */
export const codeHighlighterFromHighlightJs = (highlightJs: HighlightJsLike): CodeHighlighterLike => ({
  highlight: (code, language) => {
    if (code.length > CODE_HIGHLIGHT_MAX_CHARACTERS || !highlightJs.getLanguage(language)) return null;
    const tokens = codeTokensFromHighlightJsHtml(highlightJs.highlight(code, { language, ignoreIllegals: true }).value);
    return tokens.map(token => token.text).join('') === code ? tokens : null;
  },
});
