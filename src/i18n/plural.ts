/**
 * ICU plural formatting.
 *
 * One key carries every plural form: `{count, plural, one {# item} other {# items}}`.
 * Pure TypeScript with no imports.
 */

const PLURAL_HEAD = /^\{\s*[A-Za-z_][\w]*\s*,\s*plural\s*,/;

type PluralBranches = Record<string, string>;

/** Reads `{ ... }` starting at `start` (which must point at `{`); returns the inner text and the index after `}`. */
const readBraced = (
  source: string,
  start: number,
): { inner: string; end: number } | null => {
  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return { inner: source.slice(start + 1, index), end: index + 1 };
      }
    }
  }
  return null;
};

/** Parses `<category> {text} <category> {text} ...`; null when the shape is not a plural body. */
const parseBranches = (body: string): PluralBranches | null => {
  const branches: PluralBranches = {};
  let cursor = 0;
  while (cursor < body.length) {
    const selector = /^\s*(=\d+|zero|one|two|few|many|other)\s*\{/.exec(
      body.slice(cursor),
    );
    if (!selector) {
      return body.slice(cursor).trim() === '' ? branches : null;
    }
    const braceStart = cursor + selector[0].length - 1;
    const braced = readBraced(body, braceStart);
    if (!braced) return null;
    branches[selector[1]] = braced.inner;
    cursor = braced.end;
  }
  return branches;
};

const PLURAL_START = /\{\s*[A-Za-z_][\w]*\s*,\s*plural\s*,/;

type IcuPluralParts = { prefix: string; branches: PluralBranches; suffix: string };

/**
 * Finds the one ICU plural block in `message` and splits it into the text before it, its
 * branches and the text after it (`%name%: {count, plural, one {# order} other {# orders}}`).
 * Null when there is no plural block, more than one, or the block has no `other` branch.
 */
const parseIcuPlural = (message: string): IcuPluralParts | null => {
  const start = PLURAL_START.exec(message);
  if (!start) return null;
  const braced = readBraced(message, start.index);
  if (!braced) return null;
  const head = PLURAL_HEAD.exec(message.slice(start.index));
  if (!head) return null;
  const branches = parseBranches(braced.inner.slice(head[0].length - 1));
  if (!branches || !('other' in branches)) return null;
  const suffix = message.slice(braced.end);
  if (PLURAL_START.test(suffix)) return null;
  return { prefix: message.slice(0, start.index), branches, suffix };
};

/** True when `message` holds exactly one ICU plural block with an `other` branch (text around it is allowed). */
export const isIcuPlural = (message: string): boolean =>
  parseIcuPlural(message) !== null;

/**
 * Picks the plural branch for `count` in `locale` and substitutes `#`.
 * An exact `=N` branch wins, then the CLDR category, then `other`.
 * Text before and after the block is kept. Any message without a plural block is returned unchanged.
 */
export const formatIcuPlural = (
  message: string,
  count: number,
  locale: string,
): string => {
  const parts = parseIcuPlural(message);
  if (!parts) return message;
  const { prefix, branches, suffix } = parts;

  let category = 'other';
  try {
    category = new Intl.PluralRules(locale).select(count);
  } catch {
    category = 'other';
  }
  const branch = branches[`=${count}`] ?? branches[category] ?? branches.other;

  let formattedCount = String(count);
  try {
    formattedCount = new Intl.NumberFormat(locale).format(count);
  } catch {
    formattedCount = String(count);
  }
  return prefix + branch.replace(/#/g, formattedCount) + suffix;
};
