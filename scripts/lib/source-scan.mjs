// Small, dependency-free scanners for the built JavaScript, declaration and CSS files of this package.
// They read tsc output (unminified, one file per source file); they are not general JavaScript parsers:
// regular-expression literals that contain `//` or quotes are not recognised as such.
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Walks `code` once and reports comments and string literals. Template literals are reported with their raw text;
 * `${…}` expressions inside them are scanned as code.
 *
 * @returns {{ kind: 'comment' | 'string' | 'template', start: number, end: number, value: string }[]}
 */
export function scanTokens(code) {
  const tokens = [];
  /** Brace depth at which each open template expression resumes its template. */
  const templateStack = [];
  let braceDepth = 0;
  let index = 0;
  const readTemplate = (start) => {
    // `index` points just after the opening backtick or the closing brace of an expression.
    let value = '';
    while (index < code.length) {
      const char = code[index];
      if (char === '\\') {
        value += code.slice(index, index + 2);
        index += 2;
        continue;
      }
      if (char === '`') {
        index += 1;
        tokens.push({ kind: 'template', start, end: index, value });
        return;
      }
      if (char === '$' && code[index + 1] === '{') {
        index += 2;
        tokens.push({ kind: 'template', start, end: index, value, open: true });
        templateStack.push(braceDepth);
        braceDepth += 1;
        return;
      }
      value += char;
      index += 1;
    }
    tokens.push({ kind: 'template', start, end: index, value });
  };
  while (index < code.length) {
    const char = code[index];
    const next = code[index + 1];
    if (char === '/' && next === '/') {
      const end = code.indexOf('\n', index);
      const stop = end === -1 ? code.length : end;
      tokens.push({ kind: 'comment', start: index, end: stop, value: code.slice(index, stop) });
      index = stop;
    } else if (char === '/' && next === '*') {
      const end = code.indexOf('*/', index + 2);
      const stop = end === -1 ? code.length : end + 2;
      tokens.push({ kind: 'comment', start: index, end: stop, value: code.slice(index, stop) });
      index = stop;
    } else if (char === '"' || char === "'") {
      const start = index;
      index += 1;
      let value = '';
      while (index < code.length && code[index] !== char && code[index] !== '\n') {
        if (code[index] === '\\') {
          value += code[index + 1] ?? '';
          index += 2;
        } else {
          value += code[index];
          index += 1;
        }
      }
      index += 1;
      tokens.push({ kind: 'string', start, end: index, value });
    } else if (char === '`') {
      const start = index;
      index += 1;
      readTemplate(start);
    } else if (char === '{') {
      braceDepth += 1;
      index += 1;
    } else if (char === '}') {
      braceDepth -= 1;
      index += 1;
      if (templateStack.length > 0 && templateStack[templateStack.length - 1] === braceDepth) {
        templateStack.pop();
        readTemplate(index - 1);
      }
    } else {
      index += 1;
    }
  }
  return tokens;
}

/** `code` with every comment replaced by spaces (line breaks kept). */
export function stripComments(code) {
  let result = '';
  let last = 0;
  for (const token of scanTokens(code)) {
    if (token.kind !== 'comment') continue;
    result += code.slice(last, token.start) + token.value.replace(/[^\n]/g, ' ');
    last = token.end;
  }
  return result + code.slice(last);
}

/** `code` without comments and with the content of every string and template literal blanked. */
export function blankLiterals(code) {
  let result = '';
  let last = 0;
  for (const token of scanTokens(code)) {
    const blank =
      token.kind === 'comment'
        ? token.value.replace(/[^\n]/g, ' ')
        : code.slice(token.start, token.end).replace(/[^\n'"`${}]/g, ' ');
    result += code.slice(last, token.start) + blank;
    last = token.end;
  }
  return result + code.slice(last);
}

const STATIC_SPECIFIER = /(?:^|[^\w$.])(?:import|export)\s*(?:type\s+)?(?:[^'";]*?\bfrom\s*)?(['"])([^'"\n]+)\1/g;
const DYNAMIC_SPECIFIER = /(?:^|[^\w$.])import\s*\(\s*(['"])([^'"\n]+)\1\s*\)/g;

/**
 * Module specifiers of a JS or declaration file: static imports and re-exports, side-effect imports, dynamic
 * `import('…')` and declaration `import("…")` types.
 *
 * @returns {{ specifier: string, isTypeOnly: boolean }[]}
 */
export function extractSpecifiers(code) {
  const source = stripComments(code);
  const found = [];
  for (const match of source.matchAll(STATIC_SPECIFIER)) {
    found.push({ specifier: match[2], isTypeOnly: /^\W?(?:import|export)\s*type\b/.test(match[0].trimStart()) });
  }
  for (const match of source.matchAll(DYNAMIC_SPECIFIER)) found.push({ specifier: match[2], isTypeOnly: false });
  return found;
}

/** Whether a file starts with a `'use client'` directive (after an optional shebang and comments). */
export function hasUseClientDirective(code) {
  const body = stripComments(code.startsWith('#!') ? code.slice(code.indexOf('\n') + 1) : code).trimStart();
  return /^(['"])use client\1\s*;?/.test(body);
}

/**
 * Why a file needs `'use client'`: the React hooks, `createContext` or `react-dom` it uses. Empty for a file that
 * can run in a server component.
 *
 * @returns {string[]}
 */
export function clientReasons(code) {
  const reasons = new Set();
  const source = blankLiterals(code);
  for (const match of source.matchAll(/(?<!function\s+)(?<![\w$])(use(?:[A-Z][\w$]*)?)\s*\(/g)) {
    reasons.add(`${match[1]}()`);
  }
  if (/(?<![\w$])createContext\s*[(<]/.test(source)) reasons.add('createContext()');
  for (const { specifier } of extractSpecifiers(code)) {
    if (specifier === 'react-dom' || specifier.startsWith('react-dom/')) reasons.add(`import '${specifier}'`);
  }
  return [...reasons].sort();
}

/** Skips a balanced `(…)` / `{…}` / `[…]` group of blanked code starting at `open`; returns the index after it. */
function skipBalanced(blanked, open) {
  const pairs = { '(': ')', '{': '}', '[': ']' };
  const stack = [];
  for (let index = open; index < blanked.length; index += 1) {
    const char = blanked[index];
    if (pairs[char]) stack.push(pairs[char]);
    else if (char === stack[stack.length - 1]) {
      stack.pop();
      if (stack.length === 0) return index + 1;
    }
  }
  return blanked.length;
}

const CLASS_FUNCTIONS = /(?<![\w$])(?:cn|cva|clsx|cx|twMerge)\s*\(/g;

/**
 * The class-name string literals of a built file: values of `className:` / `className=` and the string arguments of
 * `cn(…)`, `cva(…)`, `clsx(…)`, `cx(…)`, `twMerge(…)` (without cva's `defaultVariants`).
 *
 * @returns {string[]}
 */
export function extractClassLiterals(code) {
  const blanked = blankLiterals(code);
  const literals = scanTokens(code).filter((token) => token.kind === 'string' || (token.kind === 'template' && !token.open));
  const ranges = [];
  for (const match of blanked.matchAll(/className\s*[:=]\s*/g)) {
    const at = match.index + match[0].length;
    if (blanked[at] === '"' || blanked[at] === "'" || blanked[at] === '`') ranges.push([at, at + 1]);
  }
  const excluded = [];
  for (const match of blanked.matchAll(CLASS_FUNCTIONS)) {
    const open = match.index + match[0].length - 1;
    const end = skipBalanced(blanked, open);
    ranges.push([open, end]);
    const inner = blanked.slice(open, end);
    for (const defaults of inner.matchAll(/defaultVariants\s*:\s*\{/g)) {
      const start = open + defaults.index + defaults[0].length - 1;
      excluded.push([start, skipBalanced(blanked, start)]);
    }
  }
  const inside = (position, list) => list.some(([start, end]) => position >= start && position < end);
  return literals
    .filter((token) => inside(token.start, ranges) && !inside(token.start, excluded))
    .map((token) => token.value)
    .filter((value) => value.trim() !== '');
}

/** Every class token of a set of class literals. */
export function classTokensOf(literals) {
  return literals.flatMap((literal) => literal.split(/\s+/)).filter((token) => token !== '');
}

/** CSS without comments. */
export function stripCssComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '));
}

/** Innermost rules of a stylesheet: `{ selector, body }` (nested at-rules are flattened). */
export function cssRules(css) {
  const rules = [];
  for (const match of stripCssComments(css).matchAll(/([^{};]+)\{([^{}]*)\}/g)) {
    rules.push({ selector: match[1].trim(), body: match[2] });
  }
  return rules;
}

/** Custom-property declarations of a rule body: `[name, value]` pairs. */
export function customPropertyDeclarations(body) {
  return [...body.matchAll(/(--[\w-]+)\s*:\s*([^;]*)(?:;|$)/g)].map((match) => [match[1], match[2].trim()]);
}

/** Every file below `dir` (relative paths with `/`), symlinks not followed. */
export function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const result = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else result.push(path.relative(dir, full).split(path.sep).join('/'));
    }
  };
  walk(dir);
  return result.sort();
}

/** The package name of a bare specifier (`@scope/name/sub` → `@scope/name`). */
export function packageNameOf(specifier) {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}
