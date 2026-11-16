#!/usr/bin/env node
// Checks a package directory: the repository root after `pnpm build`, or the `package/` folder of an extracted
// tarball. Fails on:
//   1  a missing `exports` target (and `./package.json` must be exported), or a missing `bin` target
//   2  a 'use client' directive that does not match the file: a file carries one exactly when it uses a React hook,
//      createContext or react-dom; barrels (index.js) never
//   3  a relative specifier that does not end in `.js` or does not resolve inside dist; any `.ts`/`.tsx` specifier
//   4  an app alias specifier (`@/`, `~/`) or an absolute path, in JS, declarations and CSS
//   5  a denied word in dist, docs, README, CHANGELOG, skills or the manifests: the comma-separated list in the
//      environment variable CHECK_PACKAGE_DENY (and --deny), plus built-in home-directory path patterns
//   6  a bare specifier that is neither a dependency nor a peer (Node built-ins only in the CLI), or node_modules
//      inside dist
//   7  a run-time import edge between entries outside the allowed matrix; `next` reached from any entry but ./next,
//      `sonner` from any but ./notify-sonner, `recharts` from any file but a chart file of ./data;
//      `@reduxjs/toolkit` or `@mgamadeus/ddd-web/api` from anywhere; Tailwind helpers, Radix or lucide from
//      ./logic or ./i18n
//   8  a module-state file that is missing or exists twice, or a context name created more than once
//   9  `files` not covering dist, docs and skills, or `sideEffects` missing a shipped CSS file
//   10 a JS file without its `.d.ts`
//   11 a test file in dist
//   12 an i18n-keys.json (dist and repository root) that differs from a fresh generator run over the source
//   13 a CSS custom property read by shipped CSS, or a custom property in a class name (`z-(--layer-…)`,
//      `var(--…)`), that tokens.json does not list
//
// Usage: node scripts/check-package.mjs <packageDir> [--source <srcDir>] [--deny a,b] [--require-skills]
//                                                    [--require-deny-list]
//   --source             source tree for rule 12 (default: <packageDir>/src, else this repository's src)
//   --require-skills     at least one .claude/skills/<name>/SKILL.md must be shipped
//   --require-deny-list  fail when no deny word is configured (release)
import * as fs from 'node:fs';
import { builtinModules } from 'node:module';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildI18nManifest, serializeManifest } from './lib/i18n-manifest.mjs';
import {
  classTokensOf,
  clientReasons,
  cssRules,
  extractClassLiterals,
  extractSpecifiers,
  hasUseClientDirective,
  listFiles,
  packageNameOf,
  stripCssComments,
} from './lib/source-scan.mjs';

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Run-time import edges allowed between entries (row → columns). Type-only imports are not edges. */
export const ALLOWED_EDGES = {
  logic: ['i18n'],
  i18n: [],
  primitives: ['i18n'],
  list: ['logic', 'i18n', 'primitives'],
  page: ['list', 'logic', 'i18n', 'primitives'],
  form: ['page', 'logic', 'i18n', 'primitives'],
  translations: ['form', 'logic', 'i18n', 'primitives'],
  media: ['list', 'form', 'logic', 'i18n', 'primitives'],
  glass: ['logic', 'i18n', 'primitives'],
  data: ['logic', 'i18n', 'primitives'],
  next: ['logic', 'provider'],
  provider: ['logic', 'i18n', 'primitives'],
  'notify-sonner': ['logic'],
};

/** Folders of dist that are not entries: the CLI may use Node built-ins and no entry may import it. */
export const NON_ENTRY_FOLDERS = ['cli'];

/** Files that hold module state; each must exist exactly once. */
export const MODULE_STATE_FILES = ['i18n/store.js', 'logic/pure/notify.js', 'next/searchParamsWriter.js'];

/** Packages only one entry (or file pattern) may reach. */
const RESTRICTED_PACKAGES = [
  { name: 'next', allowedEntry: 'next' },
  { name: 'sonner', allowedEntry: 'notify-sonner' },
  { name: 'recharts', allowedEntry: 'data', allowedFile: /(^|\/)[^/]*chart[^/]*\.js$/i },
];
/** Specifiers no entry may reach. */
const FORBIDDEN_SPECIFIERS = [/^@reduxjs\/toolkit(\/|$)/, /^@mgamadeus\/ddd-web\/api(\/|$)/];
/** Packages ./logic and ./i18n must not reach (they run without Tailwind, Radix or icons). */
const STYLING_PACKAGES = [
  'clsx',
  'tailwind-merge',
  'class-variance-authority',
  'radix-ui',
  'cmdk',
  'lucide-react',
];
const STYLING_FREE_ENTRIES = ['logic', 'i18n'];

/** Home-directory paths, always denied. */
const BUILT_IN_DENY_PATTERNS = [/\/Users\/[^/\s'"`]+/, /\/home\/[^/\s'"`]+/, /[A-Za-z]:\\Users\\/];

const TEXT_FILE = /\.(js|mjs|cjs|ts|mts|tsx|map|json|css|md|txt|ya?ml)$/;

/** Every string leaf of an `exports` value. */
const targetsOf = (value) =>
  typeof value === 'string' ? [value] : value && typeof value === 'object' ? Object.values(value).flatMap(targetsOf) : [];

const normalize = (target) => target.replace(/^\.\//, '');

/** A `files` / `sideEffects` glob as a regular expression over package-relative paths. */
export function globToRegExp(glob) {
  const source = normalize(glob)
    .split(/(\*\*\/|\*\*|\*)/)
    .map((part) =>
      part === '**/' ? '(?:.*/)?' : part === '**' ? '.*' : part === '*' ? '[^/]*' : part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'),
    )
    .join('');
  return new RegExp(`^${source}$`);
}

/** Whether a package-relative path is covered by the `files` list (a directory entry covers everything below it). */
const coveredByFiles = (files, relativePath) =>
  files.some((entry) => {
    const pattern = normalize(entry).replace(/\/$/, '');
    return relativePath === pattern || relativePath.startsWith(`${pattern}/`) || globToRegExp(pattern).test(relativePath);
  });

const parseDenyList = (value) =>
  (value ?? '')
    .split(',')
    .map((word) => word.trim())
    .filter((word) => word !== '');

const denyPattern = (word) =>
  new RegExp(`(?<![A-Za-z0-9])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z0-9])`, 'i');

/**
 * Runs every rule over a package directory.
 *
 * @param {string} packageDir
 * @param {{ source?: string, deny?: string[], requireSkills?: boolean, requireDenyList?: boolean, log?: (line: string) => void }} [options]
 * @returns {{ rule: number, message: string }[]} the problems; empty when the package passes
 */
export function checkPackage(packageDir, options = {}) {
  const log = options.log ?? (() => {});
  const root = path.resolve(packageDir);
  const dist = path.join(root, 'dist');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
  const problems = [];
  const fail = (rule, message) => problems.push({ rule, message });
  const ruleDone = (rule, label) => {
    const count = problems.filter((problem) => problem.rule === rule).length;
    log(`${count === 0 ? 'ok    ' : 'FAILED'} [${String(rule).padStart(2)}] ${label}${count ? ` (${count})` : ''}`);
  };

  const distFiles = listFiles(dist);
  const jsFiles = distFiles.filter((file) => file.endsWith('.js'));
  const dtsFiles = distFiles.filter((file) => file.endsWith('.d.ts'));
  const cssFiles = distFiles.filter((file) => file.endsWith('.css'));
  const read = (file) => fs.readFileSync(path.join(dist, file), 'utf-8');
  const entryOf = (file) => file.split('/')[0];
  const isEntryFile = (file) => file.includes('/') && !NON_ENTRY_FOLDERS.includes(entryOf(file));
  const tokens = fs.existsSync(path.join(dist, 'tokens.json'))
    ? JSON.parse(read('tokens.json'))
    : fs.existsSync(path.join(root, 'tokens.json'))
      ? JSON.parse(fs.readFileSync(path.join(root, 'tokens.json'), 'utf-8'))
      : null;

  // 1 — exports and bin targets
  const exportsMap = manifest.exports ?? {};
  for (const target of targetsOf(exportsMap)) {
    if (!fs.existsSync(path.join(root, target))) fail(1, `missing exports target ${target}`);
  }
  if (!('./package.json' in exportsMap)) fail(1, '`./package.json` is not exported');
  const binTargets = typeof manifest.bin === 'string' ? [manifest.bin] : Object.values(manifest.bin ?? {});
  for (const target of binTargets) {
    if (!fs.existsSync(path.join(root, target))) fail(1, `missing bin target ${target}`);
  }
  if (options.requireSkills) {
    const skillsDir = path.join(root, '.claude', 'skills');
    const skills = fs.existsSync(skillsDir)
      ? fs.readdirSync(skillsDir).filter((name) => fs.existsSync(path.join(skillsDir, name, 'SKILL.md')))
      : [];
    if (skills.length === 0) fail(1, 'no .claude/skills/<name>/SKILL.md shipped');
  }
  ruleDone(1, `exports / bin targets exist (${targetsOf(exportsMap).length + binTargets.length})`);

  // 2 — 'use client' matches the content
  for (const file of jsFiles) {
    const code = read(file);
    const hasDirective = hasUseClientDirective(code);
    const isBarrel = path.posix.basename(file) === 'index.js';
    const reasons = clientReasons(code);
    if (isBarrel && hasDirective) fail(2, `dist/${file}: a barrel must not carry 'use client'`);
    else if (!isBarrel && reasons.length > 0 && !hasDirective) {
      fail(2, `dist/${file}: uses ${reasons.join(', ')} but has no 'use client'`);
    } else if (!isBarrel && reasons.length === 0 && hasDirective) {
      fail(2, `dist/${file}: has 'use client' but uses no hook, createContext or react-dom`);
    }
  }
  ruleDone(2, `'use client' matches the content (${jsFiles.length} files)`);

  // 3, 4, 6 — specifiers
  const allowedPackages = new Set([
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {}),
  ]);
  const builtins = new Set(builtinModules);
  /** file → run-time relative targets (dist-relative) and bare specifiers */
  const graph = new Map();
  for (const file of [...jsFiles, ...dtsFiles]) {
    const isJs = file.endsWith('.js');
    const node = { files: [], packages: [] };
    for (const { specifier, isTypeOnly } of extractSpecifiers(read(file))) {
      if (/^(@\/|~\/)/.test(specifier)) {
        fail(4, `dist/${file}: app alias specifier '${specifier}'`);
      } else if (/^(\/|[A-Za-z]:[\\/]|file:)/.test(specifier)) {
        fail(4, `dist/${file}: absolute specifier '${specifier}'`);
      } else if (specifier.startsWith('.')) {
        if (/\.(ts|tsx|mts|cts)$/.test(specifier) && !/\.d\.ts$/.test(specifier)) {
          fail(3, `dist/${file}: TypeScript specifier '${specifier}' left in the output`);
        } else if (!specifier.endsWith('.js')) {
          fail(3, `dist/${file}: relative specifier '${specifier}' does not end in .js`);
        }
        const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier));
        if (resolved.startsWith('..')) fail(3, `dist/${file}: '${specifier}' resolves outside dist`);
        else if (specifier.endsWith('.js') && !fs.existsSync(path.join(dist, resolved))) {
          fail(3, `dist/${file}: '${specifier}' does not resolve to a file in dist`);
        } else if (isJs && !isTypeOnly) node.files.push(resolved);
      } else if (specifier.startsWith('node:') || builtins.has(specifier)) {
        if (!NON_ENTRY_FOLDERS.includes(entryOf(file))) fail(6, `dist/${file}: Node built-in '${specifier}' in browser code`);
      } else {
        const name = packageNameOf(specifier);
        if (!allowedPackages.has(name)) fail(6, `dist/${file}: '${specifier}' is neither a dependency nor a peer`);
        if (isJs && !isTypeOnly) node.packages.push(specifier);
      }
    }
    if (isJs) graph.set(file, node);
  }
  for (const file of cssFiles) {
    const css = stripCssComments(read(file));
    for (const match of css.matchAll(/@(?:import|source|plugin|config|reference)\s+(?:url\()?\s*(['"])([^'"]+)\1/g)) {
      const specifier = match[2];
      if (/^(@\/|~\/)/.test(specifier)) fail(4, `dist/${file}: app alias '${specifier}'`);
      else if (/^(\/|[A-Za-z]:[\\/]|file:)/.test(specifier)) fail(4, `dist/${file}: absolute path '${specifier}'`);
    }
  }
  ruleDone(3, 'relative specifiers end in .js and resolve inside dist');
  ruleDone(4, 'no app alias, no absolute path');

  // 5 — denied words and home-directory paths
  const denyWords = [...parseDenyList(process.env.CHECK_PACKAGE_DENY), ...(options.deny ?? [])];
  if (options.requireDenyList && denyWords.length === 0) {
    fail(5, 'no deny list configured (CHECK_PACKAGE_DENY is empty)');
  }
  const denyPatterns = [...BUILT_IN_DENY_PATTERNS, ...denyWords.map(denyPattern)];
  const scanned = [
    ...distFiles.map((file) => `dist/${file}`),
    ...listFiles(path.join(root, 'docs')).map((file) => `docs/${file}`),
    ...listFiles(path.join(root, '.claude', 'skills')).map((file) => `.claude/skills/${file}`),
    ...['README.md', 'CHANGELOG.md', 'package.json', 'tokens.json', 'i18n-keys.json'].filter((file) =>
      fs.existsSync(path.join(root, file)),
    ),
  ].filter((file) => TEXT_FILE.test(file));
  for (const file of scanned) {
    const content = fs.readFileSync(path.join(root, file), 'utf-8');
    for (const pattern of denyPatterns) {
      const match = pattern.exec(content);
      if (match) {
        const line = content.slice(0, match.index).split('\n').length;
        // the denied word itself is not printed: the list is not public
        const shown = BUILT_IN_DENY_PATTERNS.includes(pattern) ? `home-directory path '${match[0]}'` : 'a denied word';
        fail(5, `${file}:${line}: ${shown}`);
      }
    }
  }
  ruleDone(5, `no denied word or home-directory path (${scanned.length} files, ${denyWords.length} deny words)`);

  // 6 — node_modules inside dist
  for (const file of distFiles) {
    if (file.split('/').includes('node_modules')) fail(6, `dist/${file}: node_modules inside dist`);
  }
  ruleDone(6, 'bare specifiers are dependencies or peers; no node_modules in dist');

  // 7 — entry edges and restricted packages
  for (const [file, node] of graph) {
    const from = entryOf(file);
    const fromIsEntry = isEntryFile(file);
    for (const target of node.files) {
      const to = entryOf(target);
      if (from === to) continue;
      if (!isEntryFile(target)) {
        fail(7, `dist/${file} imports dist/${target}: entries must not import non-entry files`);
      } else if (!fromIsEntry) {
        fail(7, `dist/${file} imports dist/${target}: non-entry files must not import entries`);
      } else if (!(ALLOWED_EDGES[from] ?? []).includes(to)) {
        fail(7, `dist/${file} imports dist/${target}: edge ${from} → ${to} is not allowed`);
      }
    }
    for (const specifier of node.packages) {
      if (FORBIDDEN_SPECIFIERS.some((pattern) => pattern.test(specifier))) {
        fail(7, `dist/${file} imports '${specifier}', which no entry may import`);
      }
      for (const restricted of RESTRICTED_PACKAGES) {
        if (packageNameOf(specifier) !== restricted.name) continue;
        const allowed = from === restricted.allowedEntry && (!restricted.allowedFile || restricted.allowedFile.test(file));
        if (!allowed) fail(7, `dist/${file} imports '${specifier}', which only ${restricted.allowedEntry} may import`);
      }
    }
  }
  /** Packages an entry reaches through its own files and everything they import. */
  const reachedPackages = (entry) => {
    const queue = jsFiles.filter((file) => entryOf(file) === entry);
    const seen = new Set();
    const packages = new Set();
    while (queue.length > 0) {
      const file = queue.pop();
      if (seen.has(file) || !graph.has(file)) continue;
      seen.add(file);
      for (const target of graph.get(file).files) queue.push(target);
      for (const specifier of graph.get(file).packages) packages.add(specifier);
    }
    return packages;
  };
  for (const entry of Object.keys(ALLOWED_EDGES)) {
    const reached = [...reachedPackages(entry)];
    for (const restricted of RESTRICTED_PACKAGES) {
      if (entry === restricted.allowedEntry) continue;
      const hit = reached.find((specifier) => packageNameOf(specifier) === restricted.name);
      if (hit) fail(7, `./${entry} reaches '${hit}'`);
    }
    if (STYLING_FREE_ENTRIES.includes(entry)) {
      for (const specifier of reached) {
        const name = packageNameOf(specifier);
        if (STYLING_PACKAGES.includes(name) || name.startsWith('@radix-ui/')) fail(7, `./${entry} reaches '${specifier}'`);
      }
    }
  }
  ruleDone(7, 'entry edges and restricted packages');

  // 8 — module state once
  for (const stateFile of MODULE_STATE_FILES) {
    if (!jsFiles.includes(stateFile)) fail(8, `module-state file dist/${stateFile} is missing`);
    const copies = jsFiles.filter((file) => path.posix.basename(file) === path.posix.basename(stateFile));
    if (copies.length > 1) fail(8, `module-state file ${path.posix.basename(stateFile)} exists ${copies.length} times: ${copies.join(', ')}`);
  }
  const contexts = new Map();
  for (const file of jsFiles) {
    for (const match of read(file).matchAll(/(?:const|let|var)\s+([\w$]+)\s*=\s*(?:[\w$]+\.)?createContext\s*[(<]/g)) {
      contexts.set(match[1], [...(contexts.get(match[1]) ?? []), file]);
    }
  }
  for (const [name, files] of contexts) {
    if (files.length > 1) fail(8, `context ${name} is created ${files.length} times: ${files.join(', ')}`);
  }
  ruleDone(8, `module state exists once (${MODULE_STATE_FILES.length} files, ${contexts.size} contexts)`);

  // 9 — files and sideEffects
  const files = Array.isArray(manifest.files) ? manifest.files : [];
  for (const required of ['dist', 'docs', '.claude/skills']) {
    if (!files.map((entry) => normalize(entry).replace(/\/$/, '')).includes(required)) fail(9, `\`files\` does not list ${required}`);
  }
  for (const target of targetsOf(exportsMap).map(normalize)) {
    if (target !== 'package.json' && !coveredByFiles(files, target)) fail(9, `\`files\` does not cover ${target}`);
  }
  const sideEffects = Array.isArray(manifest.sideEffects) ? manifest.sideEffects : [];
  for (const file of cssFiles) {
    if (!sideEffects.some((glob) => globToRegExp(glob).test(`dist/${file}`))) {
      fail(9, `\`sideEffects\` does not list dist/${file}`);
    }
  }
  ruleDone(9, '`files` and `sideEffects` cover the shipped files');

  // 10 — declarations
  for (const file of jsFiles) {
    if (!distFiles.includes(file.replace(/\.js$/, '.d.ts'))) fail(10, `dist/${file} has no .d.ts`);
  }
  ruleDone(10, 'every .js has a .d.ts');

  // 11 — tests
  for (const file of distFiles) {
    if (/\.(test|spec)\.[cm]?[jt]sx?(\.map)?$/.test(file) || file.split('/').includes('__tests__')) {
      fail(11, `test file dist/${file}`);
    }
  }
  ruleDone(11, 'no test file in dist');

  // 12 — i18n manifest is fresh
  const sourceDir =
    options.source ?? (fs.existsSync(path.join(root, 'src')) ? path.join(root, 'src') : path.join(REPOSITORY_ROOT, 'src'));
  const hintsFile = path.join(path.dirname(sourceDir), 'i18n', 'hints.json');
  if (!fs.existsSync(sourceDir)) {
    fail(12, `no source tree at ${path.relative(process.cwd(), sourceDir) || '.'} to compare i18n-keys.json against`);
  } else {
    const fresh = serializeManifest(
      buildI18nManifest({ sourceDir, hintsFile, packageName: manifest.name, version: manifest.version }).manifest,
    );
    for (const candidate of ['dist/i18n-keys.json', 'i18n-keys.json']) {
      const file = path.join(root, candidate);
      if (!fs.existsSync(file)) {
        if (candidate.startsWith('dist/')) fail(12, `${candidate} is missing`);
        continue;
      }
      if (fs.readFileSync(file, 'utf-8') !== fresh) fail(12, `${candidate} differs from a fresh run (run \`pnpm i18n:manifest\`)`);
    }
  }
  ruleDone(12, 'i18n-keys.json equals a fresh generator run');

  // 13 — custom properties are listed in tokens.json
  if (!tokens) {
    fail(13, 'tokens.json is missing');
  } else {
    const listed = new Set([
      ...Object.keys(tokens.colors ?? {}).map((name) => `--${name}`),
      ...Object.keys(tokens.properties ?? {}),
      ...Object.keys(tokens.layers ?? {}),
    ]);
    const colorThemeVariables = new Set(Object.keys(tokens.colors ?? {}).map((name) => `--color-${name}`));
    /** Theme variables the package's own @theme blocks declare (e.g. --radius-lg). */
    const ownThemeVariables = new Set();
    for (const file of cssFiles) {
      for (const block of stripCssComments(read(file)).matchAll(/@theme[^{]*\{([^}]*)\}/g)) {
        for (const declaration of block[1].matchAll(/(--[\w-]+)\s*:/g)) ownThemeVariables.add(declaration[1]);
      }
    }
    /** Custom properties declared by the shipped CSS itself (e.g. the layer defaults). */
    const declaredByCss = new Set();
    for (const file of cssFiles) {
      for (const rule of cssRules(read(file))) {
        for (const declaration of rule.body.matchAll(/(--[\w-]+)\s*:/g)) declaredByCss.add(declaration[1]);
      }
    }
    for (const name of declaredByCss) {
      if (!listed.has(name) && !ownThemeVariables.has(name)) fail(13, `shipped CSS declares ${name}, which tokens.json does not list`);
    }
    for (const file of cssFiles) {
      const css = stripCssComments(read(file));
      for (const match of css.matchAll(/(?<![\w-])var\(\s*(--[\w-]+)/g)) {
        if (!listed.has(match[1]) && !ownThemeVariables.has(match[1]) && !match[1].startsWith('--tw-')) {
          fail(13, `dist/${file} reads ${match[1]}, which tokens.json does not list`);
        }
      }
      for (const match of css.matchAll(/--theme\(\s*(--[\w-]+)/g)) {
        if (!colorThemeVariables.has(match[1]) && !ownThemeVariables.has(match[1])) {
          fail(13, `dist/${file} reads the theme variable ${match[1]}, which is no colour of tokens.json`);
        }
      }
    }
    for (const file of jsFiles) {
      for (const token of classTokensOf(extractClassLiterals(read(file)))) {
        for (const match of token.matchAll(/(?:var\(|\()(--[\w-]+)/g)) {
          if (!listed.has(match[1]) && !match[1].startsWith('--tw-')) {
            fail(13, `dist/${file}: class '${token}' reads ${match[1]}, which tokens.json does not list`);
          }
        }
      }
    }
  }
  ruleDone(13, 'custom properties of shipped CSS and class names are listed in tokens.json');

  return problems;
}

// realpath: a package manager may run this file through a symlink (pnpm's node_modules layout)
const isMain =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(fs.realpathSync(path.resolve(process.argv[1]))).href;
if (isMain) {
  const args = process.argv.slice(2);
  const valueOf = (flag) => {
    const index = args.indexOf(flag);
    return index === -1 ? undefined : args[index + 1];
  };
  const flagValues = new Set([valueOf('--source'), valueOf('--deny')]);
  const packageDir = args.find((arg) => !arg.startsWith('--') && !flagValues.has(arg)) ?? '.';
  const problems = checkPackage(packageDir, {
    ...(valueOf('--source') ? { source: path.resolve(valueOf('--source')) } : {}),
    deny: parseDenyList(valueOf('--deny')),
    requireSkills: args.includes('--require-skills'),
    requireDenyList: args.includes('--require-deny-list'),
    log: (line) => console.log(line),
  });
  if (problems.length > 0) {
    for (const problem of problems) console.error(`[rule ${problem.rule}] ${problem.message}`);
    console.error(`${path.resolve(packageDir)}: ${problems.length} problem(s)`);
    process.exit(1);
  }
  console.log(`${path.resolve(packageDir)}: package checks passed`);
}
