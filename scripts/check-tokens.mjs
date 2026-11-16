#!/usr/bin/env node
// Checks a host's built CSS against this package (static; computed values are checked in a browser):
//   a  every class token in the package's dist (class-name literals) has a rule in the CSS
//   b  every colour and property of tokens.json is declared on :root and, when `themed`, under .dark
//   c  declared colour values parse as CSS colours (`0 0% 100%` without hsl() does not)
//
// Usage: node node_modules/@mgamadeus/ddd-admin-ui/scripts/check-tokens.mjs <built-css-file…> [--package <dir>]
//   e.g. after `next build`: … check-tokens.mjs .next/static/css/*.css
//   --package  the installed package directory (default: the package this script belongs to)
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { classTokensOf, cssRules, customPropertyDeclarations, extractClassLiterals, listFiles, stripCssComments } from './lib/source-scan.mjs';

/** Class tokens that produce no rule of their own. */
const MARKER_CLASSES = /^(group|peer)(\/[\w-]+)?$/;

const NAMED_COLORS = new Set(
  (
    'aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood ' +
    'cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray ' +
    'darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen ' +
    'darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue ' +
    'firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew ' +
    'hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan ' +
    'lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray ' +
    'lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue ' +
    'mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred ' +
    'midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid ' +
    'palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple ' +
    'rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue ' +
    'slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white ' +
    'whitesmoke yellow yellowgreen transparent currentcolor'
  ).split(' '),
);
const COLOR_FUNCTION = /^(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark|var)\(.*\)$/s;

/** Whether a declared value is a complete CSS colour. A `var(…)` reference is accepted (not resolvable statically). */
export function isCssColor(value) {
  const normalized = value.trim().toLowerCase();
  return (
    /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(normalized) ||
    NAMED_COLORS.has(normalized) ||
    COLOR_FUNCTION.test(normalized)
  );
}

/** The selector form of a class token, escaped as CSS does (`md:h-[1px]` → `md\:h-\[1px\]`). */
export const escapeClass = (token) => token.replace(/[^A-Za-z0-9_-]/g, (char) => `\\${char}`);

const hasRuleFor = (css, token) => {
  const selector = `.${escapeClass(token)}`;
  let index = css.indexOf(selector);
  while (index !== -1) {
    const next = css[index + selector.length];
    if (next === undefined || !/[A-Za-z0-9_\\-]/.test(next)) return true;
    index = css.indexOf(selector, index + 1);
  }
  return false;
};

/**
 * @param {{ packageDir: string, cssFiles: string[] }} options
 * @returns {{ check: 'a' | 'b' | 'c', message: string }[]}
 */
export function checkTokens({ packageDir, cssFiles }) {
  const problems = [];
  const css = cssFiles.map((file) => stripCssComments(fs.readFileSync(file, 'utf-8'))).join('\n');
  const dist = path.join(packageDir, 'dist');
  const tokens = JSON.parse(fs.readFileSync(path.join(dist, 'tokens.json'), 'utf-8'));

  // a — class tokens have rules
  const classTokens = new Set();
  for (const file of listFiles(dist).filter((name) => name.endsWith('.js'))) {
    for (const token of classTokensOf(extractClassLiterals(fs.readFileSync(path.join(dist, file), 'utf-8')))) {
      if (!MARKER_CLASSES.test(token)) classTokens.add(token);
    }
  }
  for (const token of [...classTokens].sort()) {
    if (!hasRuleFor(css, token)) problems.push({ check: 'a', message: `no rule for class '${token}'` });
  }

  // b, c — declarations on :root and .dark
  const declared = { root: new Map(), dark: new Map() };
  for (const rule of cssRules(css)) {
    const selectors = rule.selector.split(',').map((selector) => selector.trim());
    const scope = selectors.some((selector) => selector === ':root' || selector === 'html')
      ? 'root'
      : selectors.some((selector) => /(^|[\s>:(])\.dark(?![\w-])/.test(selector))
        ? 'dark'
        : null;
    if (!scope) continue;
    for (const [name, value] of customPropertyDeclarations(rule.body)) declared[scope].set(name, value);
  }
  const expected = [
    ...Object.entries(tokens.colors ?? {}).map(([name, meta]) => ({ name: `--${name}`, themed: meta.themed, isColor: true })),
    ...Object.entries(tokens.properties ?? {}).map(([name, meta]) => ({ name, themed: meta.themed, isColor: false })),
  ];
  for (const { name, themed, isColor } of expected) {
    for (const scope of themed ? ['root', 'dark'] : ['root']) {
      const value = declared[scope].get(name);
      const where = scope === 'root' ? ':root' : '.dark';
      if (value === undefined) problems.push({ check: 'b', message: `${name} is not declared on ${where}` });
      else if (isColor && !isCssColor(value)) {
        problems.push({ check: 'c', message: `${name} on ${where} is not a CSS colour: '${value}'` });
      }
    }
  }
  return problems;
}

// realpath: a package manager may run this file through a symlink (pnpm's node_modules layout)
const isMain =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(fs.realpathSync(path.resolve(process.argv[1]))).href;
if (isMain) {
  const args = process.argv.slice(2);
  const packageIndex = args.indexOf('--package');
  const packageDir =
    packageIndex === -1
      ? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
      : path.resolve(args[packageIndex + 1]);
  const cssFiles = args.filter(
    (arg, index) => !arg.startsWith('--') && (packageIndex === -1 || index !== packageIndex + 1),
  );
  if (cssFiles.length === 0) {
    console.error('Usage: check-tokens.mjs <built-css-file…> [--package <dir>]');
    process.exit(2);
  }
  const problems = checkTokens({ packageDir, cssFiles });
  for (const problem of problems) console.error(`[${problem.check}] ${problem.message}`);
  if (problems.length > 0) {
    console.error(`check-tokens: ${problems.length} problem(s) in ${cssFiles.length} CSS file(s)`);
    process.exit(1);
  }
  console.log(`check-tokens: ${cssFiles.length} CSS file(s) cover the package's classes and tokens`);
}
