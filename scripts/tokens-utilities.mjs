#!/usr/bin/env node
// The `utilities` lists of tokens.json: every colour utility the blocks and primitives use, per role, without variants
// (`hover:bg-tint` counts as `bg-tint`). Extracted from the source (`.ts` / `.tsx`) or from the built JS (`--from dist`).
//
// Usage: node tokens-utilities.mjs [--check | --write] [--from src | --from dist --dir <built package>]
//   --check (default) exits 1 and names every role whose list in tokens.json differs from the extraction.
//   --write rewrites the lists in tokens.json.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Built from parts on purpose: a Tailwind build that scans this file would read a literal such as a side-specific
// border prefix or the inset ring as a class name and add a utility to its CSS.
const SIDES = ['t', 'b', 'l', 'r', 'x', 'y'];
const PREFIXES = [
  'bg', 'text', 'border', ...SIDES.map(side => `border-${side}`), 'ring', 'ring-offset', 'outline', 'fill', 'stroke',
  'from', 'to', 'via', 'decoration', 'caret', 'accent', 'divide', 'placeholder', 'shadow', ['inset', 'ring'].join('-'),
];

const walk = dir =>
  readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

/** Files of the package that carry class names: the source (`src/`) or the built JS, never tests or scripts. */
export const classNameFiles = (packageDir, from) => {
  const base = join(packageDir, from === 'dist' ? 'dist' : 'src');
  return walk(base).filter(path => {
    const rel = relative(packageDir, path).split(sep).join('/');
    if (rel.startsWith('dist/scripts/')) return false;
    if (/\.test\.(ts|js)$/.test(rel)) return false;
    return from === 'dist' ? rel.endsWith('.js') : /\.(ts|tsx)$/.test(rel) && !rel.endsWith('.d.ts');
  });
};

const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** role → sorted variant-free utilities found in `files`. */
export const extractRoleUtilities = (files, roles) => {
  const byLength = [...roles].sort((left, right) => right.length - left.length).map(escapeRegex);
  const prefixes = [...PREFIXES].sort((left, right) => right.length - left.length).map(escapeRegex);
  const pattern = new RegExp(
    `(?<![\\w-])((?:[a-z0-9-]+:)*)(${prefixes.join('|')})-(${byLength.join('|')})(?:/(\\d+|\\[[^\\]]+\\]|\\([^)]+\\)))?(?![\\w-])`,
    'g'
  );
  const found = new Map(roles.map(role => [role, new Set()]));
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(pattern)) {
      const utility = match[0].split(':').pop();
      found.get(match[3])?.add(utility);
    }
  }
  return new Map([...found].map(([role, set]) => [role, [...set].sort()]));
};

/** Roles whose list in `tokens` differs from `extracted`, as readable lines. */
export const staleRoles = (tokens, extracted) => {
  const lines = [];
  for (const [role, utilities] of extracted) {
    const listed = tokens.colors?.[role]?.utilities ?? [];
    const missing = utilities.filter(utility => !listed.includes(utility));
    const extra = listed.filter(utility => !utilities.includes(utility));
    if (missing.length > 0 || extra.length > 0) {
      lines.push(`colour role "${role}": ${[missing.length ? `not listed ${missing.join(', ')}` : '', extra.length ? `listed but unused ${extra.join(', ')}` : ''].filter(Boolean).join('; ')}`);
    }
  }
  return lines;
};

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const sourceDir = join(dirname(fileURLToPath(import.meta.url)), '..');
  const fromFlag = process.argv.indexOf('--from');
  const from = fromFlag !== -1 ? process.argv[fromFlag + 1] : 'src';
  const dirFlag = process.argv.indexOf('--dir');
  const packageDir = from === 'dist' && dirFlag !== -1 ? process.argv[dirFlag + 1] : sourceDir;
  const tokensPath = join(sourceDir, 'tokens.json');
  const tokens = JSON.parse(readFileSync(tokensPath, 'utf8'));
  const extracted = extractRoleUtilities(classNameFiles(packageDir, from), Object.keys(tokens.colors ?? {}));
  if (process.argv.includes('--write')) {
    for (const [role, utilities] of extracted) tokens.colors[role].utilities = utilities;
    writeFileSync(tokensPath, `${JSON.stringify(tokens, null, 2)}\n`);
    console.log(`tokens-utilities: wrote ${extracted.size} role lists (from ${from})`);
  } else {
    const stale = staleRoles(tokens, extracted);
    if (stale.length > 0) {
      console.log(`tokens-utilities: tokens.json is stale (${stale.length} role(s), from ${from}); run with --write`);
      for (const line of stale) console.log(`  stale: ${line}`);
      process.exit(1);
    }
    console.log(`tokens-utilities: ok (${extracted.size} roles, from ${from})`);
  }
}
