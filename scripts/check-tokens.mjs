#!/usr/bin/env node
// Checks a host's built stylesheet against tokens.json: every colour role's utilities exist, every required custom
// property is declared on :root (and on .dark when themed), declared colour values fit how the stylesheet uses them,
// the layer defaults of components.css are present, and the data attributes components.css reads appear in its rules.
//
// Colour values follow use: a role property read only inside a channel function (`hsl(var(--card))`,
// `rgb(var(--x) / 0.5)`, `oklch(…)`) may hold channels (`0 0% 100%`); a property read anywhere else (a plain
// `background-color: var(--card)`, inside `color-mix()` or `light-dark()`, which take whole colours) must hold a colour.
// A custom property that passes another one on (`--surface: var(--card)`) takes the uses of the receiving property.
// A role property that nothing reads is held to the strict rule.
//
// Usage: node check-tokens.mjs <built.css | directory of .css files> [tokens.json]
// Exit 0 when everything is provided; exit 1 with one line per missing item otherwise; exit 2 on bad arguments.
//
// The parser is a small tolerant one (no dependency): it strips comments, honours strings and nested blocks, and reads
// selectors and declarations of style rules at any depth (@layer, @media, @supports). Limits: it does not evaluate
// `var()`, cascade order or media conditions; a property counts as declared when any rule for the scope declares it;
// a colour value passes as a hex colour, a colour function (rgb, hsl, hwb, lab, lch, oklab, oklch, color, color-mix,
// light-dark), a `var()` reference or a single keyword (named colours are not checked against the CSS list).

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const [cssArg, tokensArg] = process.argv.slice(2);
if (!cssArg) {
  console.error('usage: node check-tokens.mjs <built.css | directory of .css files> [tokens.json]');
  process.exit(2);
}
const tokensPath = resolve(tokensArg ?? join(dirname(fileURLToPath(import.meta.url)), '..', 'tokens.json'));
const cssPath = resolve(cssArg);
if (!existsSync(cssPath) || !existsSync(tokensPath)) {
  console.error(`not found: ${existsSync(cssPath) ? tokensPath : cssPath}`);
  process.exit(2);
}

const cssFiles = statSync(cssPath).isDirectory()
  ? readdirSync(cssPath)
      .filter(name => name.endsWith('.css'))
      .map(name => join(cssPath, name))
  : [cssPath];
const tokens = JSON.parse(readFileSync(tokensPath, 'utf8'));

/** Style rules as `{ selector, declarations: Map<property, value> }`, at any nesting depth. */
const parseRules = source => {
  const text = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [];
  const stack = [];
  let buffer = '';
  let quote = null;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      buffer += char;
      if (char === '\\') {
        buffer += text[index + 1] ?? '';
        index += 1;
      } else if (char === quote) quote = null;
      continue;
    }
    if (char === '\\') {
      // an escaped character in a selector (`.content-\[\'x\'\]`, `.w-1\/2`): never a quote or a brace
      buffer += char + (text[index + 1] ?? '');
      index += 1;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      buffer += char;
      continue;
    }
    if (char === '{') {
      const prelude = buffer.trim();
      buffer = '';
      const rule = prelude.startsWith('@') ? null : { selector: prelude, declarations: new Map() };
      if (rule) rules.push(rule);
      stack.push(rule);
      continue;
    }
    if (char === ';' || char === '}') {
      const current = stack[stack.length - 1];
      const chunk = buffer.trim();
      buffer = '';
      if (current && chunk.includes(':')) {
        const colon = chunk.indexOf(':');
        current.declarations.set(chunk.slice(0, colon).trim(), chunk.slice(colon + 1).trim());
      }
      if (char === '}') stack.pop();
      continue;
    }
    buffer += char;
  }
  return rules;
};

const rules = cssFiles.flatMap(file => parseRules(readFileSync(file, 'utf8')));

/** Every class name in the selectors, unescaped (`hover\:bg-card\/90` → `hover:bg-card/90`). */
const classNames = new Set();
for (const rule of rules) {
  for (const match of rule.selector.matchAll(/\.((?:\\.|[A-Za-z0-9_-])+)/g)) {
    classNames.add(match[1].replace(/\\(.)/g, '$1'));
  }
}
/** A utility is provided when it exists bare or under any variant (`hover:bg-tint`, `dark:bg-input/30`). */
const hasUtility = utility => {
  if (classNames.has(utility)) return true;
  for (const name of classNames) if (name.endsWith(`:${utility}`)) return true;
  return false;
};

const selectorParts = rule => rule.selector.split(',').map(part => part.trim());
const isRootSelector = part => /^(:root|html|:host|:where\(:root\))$/.test(part);
const isDarkSelector = part => /^(:root|html)?\.dark$/.test(part);
const declaredIn = (property, predicate) =>
  rules.some(rule => rule.declarations.has(property) && selectorParts(rule).some(predicate));

const missing = [];

for (const [role, definition] of Object.entries(tokens.colors ?? {})) {
  const absent = (definition.utilities ?? []).filter(utility => !hasUtility(utility));
  if (absent.length > 0) missing.push(`colour role "${role}": no rule for ${absent.join(', ')}`);
}

for (const [property, definition] of Object.entries(tokens.properties ?? {})) {
  if (definition.required === false) continue;
  if (!declaredIn(property, isRootSelector)) missing.push(`property ${property}: not declared on :root`);
  if (definition.themed && !declaredIn(property, isDarkSelector)) {
    missing.push(`property ${property}: themed, but not declared on .dark`);
  }
}

/** Functions whose arguments are colour channels, so `fn(var(--x))` needs channels in `--x`, not a colour. */
const CHANNEL_FUNCTIONS = new Set(['rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklab', 'oklch', 'color']);

/** Every `var(--name…)` in a value, with the innermost enclosing function other than `var` (`null` at top level). */
const varReads = value => {
  const reads = [];
  const stack = [];
  const pattern = /([A-Za-z-]*)\(|\)/g;
  let match = pattern.exec(value);
  while (match !== null) {
    if (match[0] === ')') stack.pop();
    else {
      const name = match[1].toLowerCase();
      if (name === 'var') {
        const property = /^\s*(--[A-Za-z0-9_-]+)/.exec(value.slice(pattern.lastIndex));
        const outer = stack.filter(item => item !== 'var');
        if (property) reads.push({ property: property[1], within: outer.length > 0 ? outer[outer.length - 1] : null });
      }
      stack.push(name);
    }
    match = pattern.exec(value);
  }
  return reads;
};

/** Per custom property: where it is read, as `{ declaredOn, within, selector }`. */
const readsOf = new Map();
for (const rule of rules) {
  for (const [declaredOn, value] of rule.declarations) {
    for (const read of varReads(value)) {
      const list = readsOf.get(read.property) ?? [];
      list.push({ declaredOn, within: read.within, selector: rule.selector });
      readsOf.set(read.property, list);
    }
  }
}

/**
 * The first read of `property` that needs a whole colour (`null` when every read is inside a channel function), as
 * text for the report. A read passed on to another custom property counts as that property's reads.
 */
const colourRead = (property, seen = new Set()) => {
  if (seen.has(property)) return null;
  seen.add(property);
  const reads = readsOf.get(property) ?? [];
  if (reads.length === 0) return 'read nowhere';
  for (const read of reads) {
    if (read.within !== null && CHANNEL_FUNCTIONS.has(read.within)) continue;
    if (read.within === null && read.declaredOn.startsWith('--')) {
      const onward = colourRead(read.declaredOn, seen);
      if (onward !== null && onward !== 'read nowhere') return `passed to ${read.declaredOn}, ${onward}`;
      continue;
    }
    return `read as ${read.declaredOn}: ${read.within ? `${read.within}(var(${property}))` : `var(${property})`} in "${read.selector}"`;
  }
  return null;
};

/** Channels of a colour function: numbers, percentages, angles, `none`, separated by spaces, commas or `/`. */
const isChannelValue = value =>
  /^(?:[+-]?(?:\d+\.?\d*|\.\d+)(?:%|deg|rad|grad|turn)?|none)(?:\s*[\s,/]\s*(?:[+-]?(?:\d+\.?\d*|\.\d+)(?:%|deg|rad|grad|turn)?|none))*$/i.test(
    value.replace(/\s*!important\s*$/, '').trim()
  );

/** Does a declared value read as a colour? (see the limits above) */
const isColourValue = value => {
  const trimmed = value.replace(/\s*!important\s*$/, '').trim();
  if (/^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(trimmed)) return true;
  if (/^(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark|var)\(.*\)$/i.test(trimmed)) return true;
  return /^[a-z]+$/i.test(trimmed);
};

for (const role of Object.keys(tokens.colors ?? {})) {
  for (const property of [`--${role}`, `--color-${role}`]) {
    for (const rule of rules) {
      const value = rule.declarations.get(property);
      if (value === undefined || isColourValue(value)) continue;
      const needsColour = colourRead(property);
      if (needsColour === null && isChannelValue(value)) continue;
      const why = needsColour === null ? 'neither a colour nor channels' : `not a colour, but ${needsColour}`;
      missing.push(`colour role "${role}": ${property} in "${rule.selector}" is ${why} (${value})`);
    }
  }
}

for (const [property, definition] of Object.entries(tokens.layers ?? {})) {
  const declared = rules.some(rule => rule.declarations.get(property) === String(definition.default));
  if (!declared) missing.push(`layer ${property}: default ${definition.default} not declared (is components.css imported?)`);
}

for (const [attribute, definition] of Object.entries(tokens.dataAttributes ?? {})) {
  if (definition.readBy !== 'components.css') continue;
  if (!rules.some(rule => rule.selector.includes(`[${attribute}`))) {
    missing.push(`data attribute ${attribute}: no rule reads it (is components.css imported?)`);
  }
}

const checked = `${Object.keys(tokens.colors ?? {}).length} colour roles, ${Object.keys(tokens.properties ?? {}).length} properties, ${Object.keys(tokens.layers ?? {}).length} layers, ${Object.keys(tokens.dataAttributes ?? {}).length} data attributes`;
if (missing.length > 0) {
  console.log(`check-tokens: ${missing.length} missing (${checked}; ${cssFiles.length} css file(s))`);
  for (const line of missing) console.log(`  missing: ${line}`);
  process.exit(1);
}
console.log(`check-tokens: ok (${checked}; ${cssFiles.length} css file(s), ${rules.length} rules)`);
