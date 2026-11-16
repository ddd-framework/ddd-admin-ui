#!/usr/bin/env node
// The package's text manifest (i18n-keys.json): every UI text of the blocks and primitives with its key, context, the
// translator hint from i18n/hints.json and the files that use it. A host's text export merges it instead of scanning
// the package.
//
// Usage: node build-i18n-manifest.mjs [--check] [--built] [--dir <package dir>]
//   --dir    the package root (default: the package this script belongs to). With a `src/` folder (the repository)
//            the source is read and the manifest is i18n-keys.json; without one (an installed package, an extracted
//            tarball) the built JS of dist is read and the manifest is dist/i18n-keys.json
//   --built  read the built JS of dist even when a `src/` folder exists (check-package, rule 12)
//   --check  exit 1 when the manifest on disk is missing, stale or unsorted, or a key has no hint
//
// Scan rules (the same as the host export): string literals passed to `t()`, `translateText()` and `m()` with an
// optional `{ context }`, and `<Translate context>…</Translate>` elements; a file containing the marker
// `@translations-ignore-file` is skipped; tests are skipped; the `showcase` entry (a development page with
// developer-facing English) is skipped. Key = text, or `${text}__${context}` with a context.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const dirFlag = process.argv.indexOf('--dir');
// the shipped copy runs from dist/scripts, the repository's from scripts
const ownPackageDir = join(scriptDir, '..', ...(dirname(scriptDir).endsWith(`${sep}dist`) ? ['..'] : []));
const packageDir = resolve(dirFlag !== -1 ? process.argv[dirFlag + 1] : ownPackageDir);
const check = process.argv.includes('--check');

/** Order by code unit, never by locale: the manifest must come out the same on every machine. */
const compareKeys = (left, right) => (left < right ? -1 : left > right ? 1 : 0);

const sourceRoot = join(packageDir, 'src');
const sourceMode = !process.argv.includes('--built') && existsSync(join(sourceRoot, 'i18n', 'store.ts'));
const base = sourceMode ? packageDir : join(packageDir, 'dist');
const manifestPath = join(base, 'i18n-keys.json');
const hintsPath = join(base, 'i18n', 'hints.json');
const metaPath = join(packageDir, 'package.json');

const LITERAL = String.raw`'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|\x60(?:[^\x60\\$]|\\.)*\x60`;
const CALL = new RegExp(String.raw`\b(?:t|translateText|m)\(\s*(${LITERAL})\s*(,\s*\{[^}]*\})?`, 'g');
const CONTEXT = new RegExp(String.raw`context\s*:\s*(${LITERAL})`);
const ELEMENT = /<Translate\b([^>]*)>([^<{}]+)<\/Translate>/g;
const ELEMENT_CONTEXT = /context=(?:"([^"]*)"|'([^']*)'|\{\s*['"]([^'"]*)['"]\s*\})/;
const IGNORE_MARKER = '@translations-ignore-file';
/** Entry folders whose texts are not UI texts of the blocks: the showcase is a development page. */
const IGNORED_ENTRIES = ['showcase'];
const inIgnoredEntry = name => IGNORED_ENTRIES.some(entry => name.startsWith(`${entry}/`));

const unquote = literal =>
  literal
    .slice(1, -1)
    .replace(/\\n/g, '\n')
    .replace(/\\(.)/g, '$1');

const walk = dir =>
  readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'node_modules' || name === 'scripts' || (sourceMode && name === 'dist') ? [] : walk(path);
    return [path];
  });
const toPosix = path => path.split(sep).join('/');

/** Source files with the path the manifest names (source-relative, e.g. `list/EntityListToolbar.tsx`). */
const sourceFiles = () => {
  if (sourceMode) {
    return walk(sourceRoot)
      .filter(path => /\.(ts|tsx)$/.test(path) && !/\.test\.tsx?$/.test(path) && !path.endsWith('.d.ts'))
      .map(path => ({ path, name: toPosix(relative(sourceRoot, path)) }))
      .filter(file => !inIgnoredEntry(file.name));
  }
  // built JS keeps the calls and the comments; the path is the dist path with the source's extension (`.ts` or
  // `.tsx`, read from the file's source map)
  const distRoot = join(packageDir, 'dist');
  return walk(distRoot)
    .filter(path => path.endsWith('.js') && !/\.test\.js$/.test(path))
    .map(path => {
      const mapPath = `${path}.map`;
      const map = existsSync(mapPath) ? JSON.parse(readFileSync(mapPath, 'utf8')) : null;
      const extension = /\.tsx?$/.exec(map?.sources?.[0] ?? '')?.[0] ?? '.js';
      return { path, name: toPosix(relative(distRoot, path)).replace(/\.js$/, extension) };
    })
    .filter(file => !inIgnoredEntry(file.name));
};

const scan = ({ path, name }) => {
  const source = readFileSync(path, 'utf8');
  if (source.includes(IGNORE_MARKER)) return [];
  const usages = [];
  for (const match of source.matchAll(CALL)) {
    const context = match[2] ? CONTEXT.exec(match[2]) : null;
    usages.push({ text: unquote(match[1]), context: context ? unquote(context[1]) : undefined, file: name });
  }
  for (const match of source.matchAll(ELEMENT)) {
    const context = ELEMENT_CONTEXT.exec(match[1]);
    const text = match[2].replace(/\s+/g, ' ').trim();
    if (text) usages.push({ text, context: context ? (context[1] ?? context[2] ?? context[3]) : undefined, file: name });
  }
  return usages;
};

const build = () => {
  const hints = existsSync(hintsPath) ? JSON.parse(readFileSync(hintsPath, 'utf8')) : {};
  const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
  const byKey = new Map();
  for (const usage of sourceFiles().flatMap(scan)) {
    const key = usage.context ? `${usage.text}__${usage.context}` : usage.text;
    const entry = byKey.get(key) ?? { key, text: usage.text, ...(usage.context ? { context: usage.context } : {}), files: new Set() };
    entry.files.add(usage.file);
    byKey.set(key, entry);
  }
  const keys = [...byKey.values()]
    .sort((left, right) => compareKeys(left.key, right.key))
    .map(entry => ({ ...entry, hint: hints[entry.key] ?? '', files: [...entry.files].sort() }));
  const missingHints = keys.filter(entry => entry.hint.trim() === '').map(entry => entry.key);
  const unusedHints = Object.keys(hints).filter(key => !byKey.has(key));
  return {
    manifest: { package: meta.name, version: meta.version, generatedBy: 'scripts/build-i18n-manifest.mjs', keys },
    missingHints,
    unusedHints,
  };
};

const serialise = manifest => `${JSON.stringify(manifest, null, 2)}\n`;
const { manifest, missingHints, unusedHints } = build();
const summary = `${manifest.keys.length} keys, ${missingHints.length} without a hint, ${unusedHints.length} hints without a usage`;

if (check) {
  const problems = [];
  if (!existsSync(manifestPath)) problems.push(`${toPosix(relative(packageDir, manifestPath))} missing`);
  else {
    const current = readFileSync(manifestPath, 'utf8');
    const keys = JSON.parse(current).keys ?? [];
    if (keys.some((entry, index) => index > 0 && compareKeys(keys[index - 1].key, entry.key) > 0)) problems.push('not sorted by key');
    if (current !== serialise(manifest)) problems.push('stale: differs from a fresh run');
  }
  for (const key of missingHints) problems.push(`no hint: ${JSON.stringify(key)}`);
  if (problems.length > 0) {
    console.log(`build-i18n-manifest: ${problems.join('; ')} (${summary})`);
    process.exit(1);
  }
  console.log(`build-i18n-manifest: ok (${summary}; ${sourceMode ? 'source' : 'built JS'})`);
} else {
  writeFileSync(manifestPath, serialise(manifest));
  console.log(`build-i18n-manifest: wrote ${toPosix(relative(packageDir, manifestPath))} (${summary})`);
}
