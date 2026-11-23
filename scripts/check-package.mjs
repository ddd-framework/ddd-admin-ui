#!/usr/bin/env node
// check-package: rules 1–13 of the package contract, run on the built repository (after `pnpm build`) or on the
// extracted `pack` tarball (`<extracted>/package`).
//
//   1  every exports and bin target exists (bins start with a node shebang); ./package.json is exported
//   2  'use client' wherever a hook, createContext or react-dom is used; never on barrels and logic/pure (a directive
//      on another file without a hook is a client boundary: listed, not failed)
//   3  every relative specifier (JS and declarations) ends in .js and resolves inside dist
//   4  no app alias (@/, ~/) and no absolute path: specifiers, CSS imports, source map sources
//   5  no denied word and no home-directory path in shipped files
//   6  every bare specifier is a dependency or a peer (Node built-ins only in dist/scripts and dist/cli); nothing
//      vendored
//   7  entry edges within the import matrix, runtime and type-only apart; per-entry package reach (next, sonner,
//      recharts, Redux, ddd-web/api; ./logic and ./i18n draw nothing; logic/pure runs without React)
//   8  module state exists once; every context is defined once
//   9  `files` covers dist, the docs and .claude/skills (each skill with name and description); `sideEffects` lists
//      every CSS file
//   10 every .js has a .d.ts; the declarations compile in a strict consumer (skipLibCheck false) with
//      moduleResolution bundler and nodenext (./next under bundler only)
//   11 no test file shipped
//   12 dist/i18n-keys.json equals a fresh generator run over the built JS and is sorted
//   13 every var(--x) of the shipped CSS and every --layer-* class is in tokens.json; its utilities lists equal a
//      fresh extraction from the built JS
//
// Usage: node check-package.mjs --dir <package dir> [--modules <node_modules dir>] [--deny-env <VAR>] [--deny a,b]
//                               [--require-deny-list]
//   --dir                the package root holding package.json and dist (required)
//   --modules            a node_modules folder with the peers, dependencies and a TypeScript compiler, for rule 10
//                        (default: the first node_modules found upwards from the package root, then from the working
//                        directory)
//   --deny-env           name of an environment variable with a comma-separated deny list for rule 5
//                        (default CHECK_PACKAGE_DENY; the CI workflows fill it from a repository variable)
//   --deny               comma-separated deny list (added to the one from the environment)
//   --require-deny-list  rule 5 fails when the deny list is empty (release)
// Exit 0 when every rule passes (skipped rules say so), 1 otherwise.
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { classNameFiles, extractRoleUtilities, staleRoles } from './tokens-utilities.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));

export const DEFAULT_DENY_ENV = 'CHECK_PACKAGE_DENY';

/**
 * Runs the rules over a package directory.
 *
 * @param {string} packageDirectory the package root holding package.json and dist
 * @param {{ modules?: string, denyEnv?: string, deny?: string[], requireDenyList?: boolean, rules?: number[] }} [options]
 *   `rules` limits the run to these rule numbers (default: all)
 * @returns {{ rule: number, title: string, failures: string[], notes: string[] }[]}
 */
export function checkPackage(packageDirectory, options = {}) {
  const packageDir = resolve(packageDirectory);
  const dist = join(packageDir, 'dist');
  const manifest = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'));

  const toPosix = path => path.split(sep).join('/');
  const rel = path => toPosix(relative(packageDir, path));
  const walk = dir =>
    existsSync(dir)
      ? readdirSync(dir).flatMap(name => {
          const path = join(dir, name);
          return statSync(path).isDirectory() ? walk(path) : [path];
        })
      : [];

  // ── Import model of the built files ────────────────────────────────────────────────────────────────────────────────
  // statement-anchored, so a `from` inside a string (`'… from'`) is no import
  const STATIC = /^\s*(?:import|export)\b[^;'"]*?\bfrom\s*['"]([^'"]+)['"]/gm;
  const SIDE_EFFECT = /^\s*import\s*['"]([^'"]+)['"]/gm;
  const DYNAMIC = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  const stripComments = text => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const specifiersOf = file => {
    const code = stripComments(readFileSync(file, 'utf8'));
    return [STATIC, SIDE_EFFECT, DYNAMIC].flatMap(pattern => [...code.matchAll(pattern)].map(match => match[1]));
  };
  const packageNameOf = specifier =>
    specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0];

  const distFiles = walk(dist);
  const jsFiles = distFiles.filter(path => path.endsWith('.js'));
  const dtsFiles = distFiles.filter(path => path.endsWith('.d.ts'));
  const entryOf = file => rel(file).split('/')[1];

  const results = [];
  const runs = rule => !options.rules || options.rules.includes(rule);
  const record = (rule, title, failures, notes = []) => results.push({ rule, title, failures, notes });

  // ── 1. exports and bin targets ─────────────────────────────────────────────────────────────────────────────────────────────
  if (runs(1)) {
    const failures = [];
    const targets = [];
    // conditions nest (`./logic/pure`: import / require, each with types / default)
    const collect = (label, value) => {
      if (typeof value === 'string') targets.push([label, value]);
      else for (const [condition, target] of Object.entries(value)) collect(`${label} (${condition})`, target);
    };
    for (const [key, value] of Object.entries(manifest.exports ?? {})) collect(key, value);
    for (const [key, target] of targets) if (!existsSync(join(packageDir, target))) failures.push(`${key} → ${target} missing`);
    if (!manifest.exports?.['./package.json']) failures.push('./package.json is not exported');
    const bins = Object.entries(manifest.bin ?? {});
    for (const [name, target] of bins) {
      const path = join(packageDir, target);
      if (!existsSync(path)) failures.push(`bin ${name} → ${target} missing`);
      else if (!readFileSync(path, 'utf8').startsWith('#!/usr/bin/env node')) failures.push(`bin ${name} → ${target} has no node shebang`);
    }
    record(1, 'every exports and bin target exists; ./package.json exported', failures, [`${targets.length} targets, ${bins.length} bins`]);
  }

  // ── 2. directives ──────────────────────────────────────────────────────────────────────────────────────────────────
  if (runs(2)) {
    const failures = [];
    const notes = [];
    for (const file of jsFiles) {
      if (rel(file).startsWith('dist/scripts/')) continue;
      const code = stripComments(readFileSync(file, 'utf8'));
      const hasDirective = /^\s*['"]use client['"]/.test(code);
      const trigger =
        /(?<![\w.$])use[A-Z]\w*\s*\(/.test(code) || /\bcreateContext\s*\(/.test(code) || /from\s*['"]react-dom['"]/.test(code);
      const barrelOrPure = rel(file).endsWith('/index.js') || rel(file).startsWith('dist/logic/pure/');
      if (trigger && !hasDirective) failures.push(`${rel(file)}: calls a hook / createContext / react-dom without 'use client'`);
      if (hasDirective && barrelOrPure) failures.push(`${rel(file)}: barrel or logic/pure file carries 'use client'`);
      if (hasDirective && !trigger && !barrelOrPure) notes.push(rel(file));
    }
    record(2, "'use client' exactly where a hook, createContext or react-dom is used; never on barrels and logic/pure", failures, [
      `${notes.length} client boundaries without a hook (allowed: they render client-only components): ${notes.join(', ')}`,
    ]);
  }

  // ── 3. relative specifiers ─────────────────────────────────────────────────────────────────────────────────────────
  if (runs(3)) {
    const failures = [];
    for (const file of [...jsFiles, ...dtsFiles]) {
      for (const specifier of specifiersOf(file)) {
        if (!specifier.startsWith('.')) continue;
        if (/\.tsx?$/.test(specifier)) failures.push(`${rel(file)}: ${specifier} (TypeScript specifier)`);
        else if (!specifier.endsWith('.js')) failures.push(`${rel(file)}: ${specifier} (no .js)`);
        else {
          const target = resolve(dirname(file), specifier);
          const exists = file.endsWith('.d.ts') ? existsSync(target.replace(/\.js$/, '.d.ts')) : existsSync(target);
          if (!exists || !target.startsWith(dist)) failures.push(`${rel(file)}: ${specifier} does not resolve inside dist`);
        }
      }
    }
    record(3, 'every relative specifier ends in .js and resolves inside dist', failures, [`${jsFiles.length} JS, ${dtsFiles.length} declarations`]);
  }

  // shipped files: everything `files` names plus package.json
  const shipped = [
    join(packageDir, 'package.json'),
    ...(manifest.files ?? []).flatMap(entry => {
      const path = join(packageDir, entry);
      if (!existsSync(path)) return [];
      return statSync(path).isDirectory() ? walk(path) : [path];
    }),
  ];
  const textFiles = shipped.filter(path => /\.(js|mjs|d\.ts|map|css|json|md)$/.test(path));

  // ── 4. no app alias, no absolute path ──────────────────────────────────────────────────────────────────────────────
  if (runs(4)) {
    const failures = [];
    for (const file of textFiles) {
      if (file.endsWith('.js') || file.endsWith('.d.ts') || file.endsWith('.mjs')) {
        for (const specifier of specifiersOf(file)) {
          if (/^[@~]\//.test(specifier)) failures.push(`${rel(file)}: app alias ${specifier}`);
          if (/^(\/|[A-Za-z]:\\|file:)/.test(specifier)) failures.push(`${rel(file)}: absolute specifier ${specifier}`);
        }
      }
      if (file.endsWith('.css')) {
        const css = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
        for (const match of css.matchAll(/@(?:import|source|plugin|config|reference)\s+(?:url\()?\s*(['"])([^'"]+)\1/g)) {
          if (/^[@~]\//.test(match[2])) failures.push(`${rel(file)}: app alias ${match[2]}`);
          if (/^(\/|[A-Za-z]:[\\/]|file:)/.test(match[2])) failures.push(`${rel(file)}: absolute path ${match[2]}`);
        }
      }
      if (file.endsWith('.map')) {
        const map = JSON.parse(readFileSync(file, 'utf8'));
        for (const source of map.sources ?? []) if (/^(\/|[A-Za-z]:|file:)/.test(source)) failures.push(`${rel(file)}: absolute source ${source}`);
      }
    }
    record(4, 'no app alias (@/, ~/) and no absolute path in shipped files', failures, [`${textFiles.length} files`]);
  }

  // ── 5. deny list ───────────────────────────────────────────────────────────────────────────────────────────────────
  if (runs(5)) {
    const envName = options.denyEnv ?? DEFAULT_DENY_ENV;
    const fromEnv = (process.env[envName] ?? '').split(',');
    const words = [...fromEnv, ...(options.deny ?? [])].map(word => word.trim()).filter(Boolean);
    const patterns = [
      ...words.map(word => ({ label: '(deny list entry)', regex: new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })),
      // home-directory roots, built from parts so this file itself carries no such path
      ...['Users', 'home'].map(root => ({ label: `/${root}/`, regex: new RegExp(`/${root}/`) })),
      { label: 'C:\\', regex: /[A-Z]:\\\\/ },
    ];
    const failures = [];
    if (options.requireDenyList && words.length === 0) failures.push(`no deny list configured (${envName} is empty)`);
    for (const file of textFiles) {
      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, index) => {
        for (const pattern of patterns) if (pattern.regex.test(line)) failures.push(`${rel(file)}:${index + 1} ${pattern.label}`);
      });
    }
    record(5, 'no denied name and no home-directory path in shipped files', failures, [
      words.length > 0 ? `${words.length} deny entries from ${envName} / --deny` : `deny list empty (set ${envName}); built-in path patterns only`,
    ]);
  }

  // ── 6. bare specifiers declared, nothing vendored ──────────────────────────────────────────────────────────────────
  if (runs(6)) {
    const declared = new Set([
      ...Object.keys(manifest.dependencies ?? {}),
      ...Object.keys(manifest.peerDependencies ?? {}),
    ]);
    const failures = [];
    const used = new Set();
    for (const file of [...jsFiles, ...dtsFiles, ...distFiles.filter(path => path.endsWith('.mjs'))]) {
      for (const specifier of specifiersOf(file)) {
        if (specifier.startsWith('.')) continue;
        if (specifier.startsWith('node:')) {
          if (!/^dist\/(scripts|cli)\//.test(rel(file))) failures.push(`${rel(file)}: ${specifier} outside dist/scripts and dist/cli`);
          continue;
        }
        const name = packageNameOf(specifier);
        used.add(name);
        if (!declared.has(name)) failures.push(`${rel(file)}: ${specifier} is neither a dependency nor a peer`);
      }
    }
    if (shipped.some(path => `/${rel(path)}`.includes('/node_modules/'))) failures.push('node_modules inside the shipped files');
    const vendorMarkers = [/\bfunction useForm\s*\(/, /__SECRET_INTERNALS|ReactCurrentDispatcher/, /\$ZodType\b/, /\bfunction createElement\s*\(/];
    for (const file of jsFiles) {
      const text = readFileSync(file, 'utf8');
      if (text.length > 200_000) failures.push(`${rel(file)}: ${text.length} bytes (a bundled peer?)`);
      for (const marker of vendorMarkers) if (marker.test(text)) failures.push(`${rel(file)}: looks like a copied peer (${marker})`);
    }
    record(6, 'every bare specifier is a dependency or a peer; nothing vendored', failures, [`used: ${[...used].sort().join(', ')}`]);
  }

  // ── 7. entry edges and reach ───────────────────────────────────────────────────────────────────────────────────────
  if (runs(7)) {
    const ALLOWED = {
      form: ['logic', 'i18n', 'primitives', 'page'],
      glass: ['logic', 'i18n', 'primitives'],
      i18n: [],
      list: ['logic', 'i18n', 'primitives'],
      logic: ['i18n'],
      media: ['logic', 'i18n', 'primitives', 'list', 'form'],
      next: ['logic', 'provider'],
      'notify-sonner': ['logic'],
      page: ['logic', 'i18n', 'primitives', 'list'],
      primitives: ['i18n'],
      provider: ['logic', 'i18n', 'primitives'],
      shell: ['logic', 'i18n', 'primitives'],
      // the animated background: no other entry (a host that does not import it pays nothing)
      'shell-background': [],
      // the development page: every block entry, never an entry with an optional peer (./next, ./notify-sonner)
      showcase: [
        'logic', 'i18n', 'primitives', 'list', 'page', 'form', 'translations', 'media', 'glass', 'data', 'workers', 'issues',
        'database', 'clouddrive', 'crons', 'shell', 'shell-background',
      ],
      // the inputs (form only through fieldLabels and useConfirmDialog) and the admin screens (lists, pages, the key drawer)
      translations: ['logic', 'i18n', 'primitives', 'form', 'list', 'page'],
      // the screens of the worker monitoring; charts are SVG, no chart library
      workers: ['logic', 'i18n', 'primitives', 'list', 'page'],
      // the operations screens on Core's admin traits (issues, schema diff, crons); charts are SVG, no chart library
      issues: ['logic', 'i18n', 'primitives', 'list', 'page', 'form', 'data'],
      database: ['logic', 'i18n', 'primitives', 'list', 'page', 'form', 'data'],
      crons: ['logic', 'i18n', 'primitives', 'list', 'page', 'form', 'data'],
      // the drive screen on the cloud drive module's admin trait
      clouddrive: ['logic', 'i18n', 'primitives', 'page', 'form'],
      data: ['logic', 'i18n', 'primitives'],
      markdown: ['logic', 'i18n', 'primitives'],
      // the design studio's components map: blocks only
      'design-studio': ['primitives', 'list', 'page', 'glass'],
    };
    const TYPE_ONLY = { provider: ['media', 'translations'], markdown: ['translations'] };
    const FILE_LIMITS = {
      'form->page': ['page/DetailHeader', 'page/EntityMetadata'],
      'page->list': ['list/EmptyValue', 'list/EntityListEmpty', 'list/EntityListCard'],
      'translations->form': [
        'form/fieldLabels',
        'form/useConfirmDialog',
        'form/Form',
        'form/FormActions',
        'form/FormDrawer',
        'form/FormField',
        'form/FormSubmitButton',
      ],
    };
    // known and documented: the deprecated re-export of EntityListPage (removed with the rewrite of old import paths)
    const EXCEPTIONS = ['list/index -> page/EntityListPage'];
    const failures = [];
    const stem = file => rel(file).replace(/^dist\//, '').replace(/\.d\.ts$|\.js$/, '');

    const edgesOf = (files, kind) => {
      for (const file of files) {
        const from = entryOf(file);
        for (const specifier of specifiersOf(file)) {
          if (!specifier.startsWith('.')) continue;
          const target = resolve(dirname(file), specifier);
          if (!target.startsWith(dist)) continue;
          const to = entryOf(target);
          if (from === to || !(from in ALLOWED)) continue;
          const edge = `${stem(file)} -> ${stem(target.replace(/\.js$/, kind === 'type' ? '.d.ts' : '.js'))}`;
          if (EXCEPTIONS.includes(edge)) continue;
          const allowed = ALLOWED[from].includes(to) || (kind === 'type' && (TYPE_ONLY[from] ?? []).includes(to));
          const limit = FILE_LIMITS[`${from}->${to}`];
          const targetStem = stem(target.replace(/\.js$/, '.js'));
          if (!allowed) failures.push(`${kind} edge ${from} → ${to}: ${edge}`);
          else if (limit && !limit.includes(targetStem)) failures.push(`${kind} edge ${from} → ${to} only to ${limit.join(', ')}: ${edge}`);
        }
      }
    };
    edgesOf(jsFiles, 'runtime');
    edgesOf(dtsFiles, 'type');

    // reach: the packages each entry's runtime graph reaches (transitively through relative imports)
    const graph = new Map(jsFiles.map(file => [file, specifiersOf(file)]));
    const reach = start => {
      const seen = new Set();
      const packages = new Set();
      const stack = [start];
      while (stack.length > 0) {
        const file = stack.pop();
        if (seen.has(file)) continue;
        seen.add(file);
        for (const specifier of graph.get(file) ?? []) {
          if (specifier.startsWith('.')) stack.push(resolve(dirname(file), specifier));
          else packages.add(specifier);
        }
      }
      return { packages, files: seen };
    };
    const RULES = [
      { test: name => name === 'next' || name.startsWith('next/'), only: ['next'], label: 'next/*' },
      { test: name => name === 'sonner', only: ['notify-sonner'], label: 'sonner' },
      { test: name => name === 'recharts', only: [], label: 'recharts' },
      { test: name => name.startsWith('@uiw/') || name === 'rehype-sanitize', only: ['markdown'], label: 'markdown editor peers' },
      { test: name => name.startsWith('@reduxjs/') || name.startsWith('@mgamadeus/ddd-web/api'), only: [], label: 'Redux / ddd-web/api' },
    ];
    const UI_ONLY = name => /^(radix-ui|@radix-ui\/|class-variance-authority$|cmdk$|clsx$|tailwind-merge$|lucide-react$)/.test(name);
    for (const file of jsFiles.filter(path => !rel(path).startsWith('dist/scripts/'))) {
      const entry = entryOf(file);
      const { packages } = reach(file);
      for (const name of packages) {
        for (const rule of RULES) if (rule.test(name) && !rule.only.includes(entry)) failures.push(`${rel(file)} reaches ${rule.label} (${name})`);
        if ((entry === 'logic' || entry === 'i18n') && UI_ONLY(name)) failures.push(`${rel(file)} reaches ${name} (logic and i18n draw nothing)`);
        if (rel(file).startsWith('dist/logic/pure/') && /^(react|react-dom|react-hook-form)(\/|$)/.test(name)) {
          failures.push(`${rel(file)} reaches ${name} at run time (logic/pure runs without React)`);
        }
      }
    }
    record(7, 'entry edges within the import matrix (runtime and type-only apart); package reach per entry', failures, [
      `${jsFiles.length} JS, ${dtsFiles.length} declarations; exceptions: ${EXCEPTIONS.join(', ')}`,
    ]);
  }

  // ── 8. module state and contexts once ─────────────────────────────────────────────────────────────────────────────
  if (runs(8)) {
    const failures = [];
    for (const path of ['dist/i18n/store.js', 'dist/next/searchParamsWriter.js', 'dist/logic/pure/notify.js']) {
      if (!existsSync(join(packageDir, path))) failures.push(`${path} missing`);
    }
    const contexts = new Map();
    for (const file of jsFiles) {
      for (const match of readFileSync(file, 'utf8').matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*createContext\s*\(/g)) {
        contexts.set(match[1], [...(contexts.get(match[1]) ?? []), rel(file)]);
      }
    }
    for (const [name, files] of contexts) if (files.length > 1) failures.push(`context ${name} defined in ${files.join(', ')}`);
    for (const name of ['setTranslations', 'setNotificationAdapter', 'queueSearchParamsWrite']) {
      const definers = jsFiles.filter(file => new RegExp(`export\\s+const\\s+${name}\\s*=`).test(readFileSync(file, 'utf8')));
      if (definers.length !== 1) failures.push(`${name} defined ${definers.length}× (${definers.map(rel).join(', ')})`);
    }
    record(8, 'module state exists once; every context is defined once', failures, [`${contexts.size} contexts`]);
  }

  // ── 9. files and sideEffects ───────────────────────────────────────────────────────────────────────────────────────
  if (runs(9)) {
    const failures = [];
    const notes = [];
    const files = manifest.files ?? [];
    if (!files.includes('dist')) failures.push('files does not include dist');
    for (const doc of ['README.md', 'STANDARDS.md', 'CHANGELOG.md', 'LICENSE']) {
      if (existsSync(join(packageDir, doc)) && !files.includes(doc)) failures.push(`files does not include ${doc}`);
    }
    // the skills sit where `ddd-admin-ui link-skills` looks for them in the installed package
    if (!files.includes('.claude/skills')) failures.push('files does not include .claude/skills');
    const skillFiles = walk(join(packageDir, '.claude', 'skills')).filter(path => path.endsWith('/SKILL.md'));
    if (skillFiles.length === 0) failures.push('no .claude/skills/<name>/SKILL.md');
    for (const file of skillFiles) {
      const text = readFileSync(file, 'utf8');
      const description = /^description:\s*(.*)$/m.exec(text.split('---')[1] ?? '')?.[1] ?? '';
      if (!/^name:\s*\S/m.test(text) || description === '') failures.push(`${rel(file)}: frontmatter needs name and description`);
      else if (description.replace(/^"|"$/g, '').length > 1024) failures.push(`${rel(file)}: description longer than 1,024 characters`);
    }
    notes.push(`${skillFiles.length} skill(s)`);
    const globToRegex = glob =>
      new RegExp(`^${glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*\//g, '(?:.*/)?').replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*')}$`);
    const sideEffects = Array.isArray(manifest.sideEffects) ? manifest.sideEffects.map(globToRegex) : null;
    for (const css of distFiles.filter(path => path.endsWith('.css'))) {
      if (manifest.sideEffects !== true && !(sideEffects ?? []).some(regex => regex.test(rel(css)))) {
        failures.push(`${rel(css)} is not listed in sideEffects`);
      }
    }
    record(9, 'files covers dist, CSS, JSON, docs, .claude/skills; sideEffects lists every CSS file', failures, notes);
  }

  // ── 10. declarations ───────────────────────────────────────────────────────────────────────────────────────────────
  if (runs(10)) {
    const failures = [];
    const notes = [];
    for (const file of jsFiles) if (!existsSync(file.replace(/\.js$/, '.d.ts'))) failures.push(`${rel(file)} has no .d.ts`);
    const findModules = start => {
      for (let dir = start; ; dir = dirname(dir)) {
        if (existsSync(join(dir, 'node_modules', '.bin', 'tsc'))) return join(dir, 'node_modules');
        if (dirname(dir) === dir) return null;
      }
    };
    const modules = options.modules ? resolve(options.modules) : (findModules(packageDir) ?? findModules(process.cwd()));
    if (!modules) {
      failures.push('no node_modules with a TypeScript compiler found for the consumer compile (pass --modules)');
    } else {
      const consumer = mkdtempSync(join(tmpdir(), 'ddd-admin-ui-consumer-'));
      try {
        const nodeModules = join(consumer, 'node_modules');
        // a copy of the shipped files (not a link): the declarations then resolve their peers from this consumer only
        const installed = join(nodeModules, '@mgamadeus', 'ddd-admin-ui');
        for (const file of shipped) {
          const target = join(installed, relative(packageDir, file));
          mkdirSync(dirname(target), { recursive: true });
          copyFileSync(file, target);
        }
        const names = [
          ...Object.keys(manifest.dependencies ?? {}),
          ...Object.keys(manifest.peerDependencies ?? {}),
          '@types/react',
          '@types/react-dom',
        ];
        for (const name of names) {
          const source = join(modules, name);
          if (!existsSync(source)) {
            notes.push(`${name} not in ${modules} (optional peers may be absent)`);
            continue;
          }
          mkdirSync(dirname(join(nodeModules, name)), { recursive: true });
          if (!existsSync(join(nodeModules, name))) symlinkSync(source, join(nodeModules, name), 'dir');
        }
        const entries = Object.keys(manifest.exports ?? {}).filter(key => key !== './package.json' && !/\.(css|json)$/.test(key));
        // ./next serves Next hosts, which resolve like a bundler; `next` has no `exports` map, so its subpaths do not
        // resolve under nodenext. That entry is compiled in the bundler run only.
        const consumerSource = list =>
          `${list.map((key, index) => `import * as entry${index} from '@mgamadeus/ddd-admin-ui${key.slice(1)}';`).join('\n')}\nexport const entries = [${list.map((_, index) => `entry${index}`).join(', ')}];\n`;
        writeFileSync(join(consumer, 'index.bundler.ts'), consumerSource(entries));
        writeFileSync(join(consumer, 'index.nodenext.ts'), consumerSource(entries.filter(key => key !== './next')));
        writeFileSync(join(consumer, 'package.json'), '{ "type": "module" }\n');
        const tsc = join(modules, '.bin', 'tsc');
        for (const mode of ['bundler', 'nodenext']) {
          const config = {
            compilerOptions: {
              strict: true,
              skipLibCheck: false,
              noEmit: true,
              target: 'es2022',
              lib: ['dom', 'dom.iterable', 'esnext'],
              jsx: 'react-jsx',
              module: mode === 'bundler' ? 'esnext' : 'nodenext',
              moduleResolution: mode,
              types: [],
            },
            files: [`index.${mode}.ts`],
          };
          writeFileSync(join(consumer, `tsconfig.${mode}.json`), JSON.stringify(config));
          const run = spawnSync(tsc, ['-p', join(consumer, `tsconfig.${mode}.json`)], { encoding: 'utf8' });
          if (run.status !== 0) {
            const lines = `${run.stdout}${run.stderr}`.split('\n').filter(Boolean);
            failures.push(`strict consumer (${mode}) fails: ${lines.length} line(s); first: ${lines.slice(0, 5).join(' | ')}`);
          } else notes.push(`strict consumer compiles (${mode}, skipLibCheck false)`);
        }
      } finally {
        rmSync(consumer, { recursive: true, force: true });
      }
    }
    record(10, 'every .js has a .d.ts; the declarations compile in a strict consumer (bundler and nodenext)', failures, notes);
  }

  // ── 11. no tests shipped ───────────────────────────────────────────────────────────────────────────────────────────
  if (runs(11)) record(
    11,
    'no test file shipped',
    shipped.filter(path => /\.test\.(js|ts|d\.ts|mjs)$|\.test\.d\.ts$/.test(path)).map(path => `${rel(path)} is a test`)
  );

  // ── 12. i18n manifest ──────────────────────────────────────────────────────────────────────────────────────────────
  if (runs(12)) {
    const manifestPath = [join(dist, 'i18n-keys.json'), join(packageDir, 'i18n-keys.json')].find(existsSync);
    if (!manifestPath) {
      record(12, 'i18n-keys.json equals a fresh generator run and is sorted', [], ['skipped: no i18n-keys.json yet']);
    } else {
      const failures = [];
      const keys = JSON.parse(readFileSync(manifestPath, 'utf8'));
      const list = Array.isArray(keys) ? keys : Array.isArray(keys.keys) ? keys.keys : Object.keys(keys);
      const names = list.map(item => (typeof item === 'string' ? item : item.key));
      if (names.some((name, index) => index > 0 && names[index - 1] > name)) failures.push('not sorted');
      const generator = join(scriptDir, 'build-i18n-manifest.mjs');
      if (!existsSync(generator)) failures.push('no generator (scripts/build-i18n-manifest.mjs) to compare against');
      else {
        const run = spawnSync(process.execPath, [generator, '--check', '--built', '--dir', packageDir], { encoding: 'utf8' });
        if (run.status !== 0) failures.push(`stale: ${`${run.stdout}${run.stderr}`.trim().split('\n')[0]}`);
      }
      record(12, 'i18n-keys.json equals a fresh generator run and is sorted', failures);
    }
  }

  // ── 13. tokens.json covers the CSS and the layer classes ───────────────────────────────────────────────────────────
  if (runs(13)) {
    const failures = [];
    const tokensPath = [join(dist, 'tokens.json'), join(packageDir, 'tokens.json')].find(existsSync);
    if (!tokensPath) failures.push('tokens.json missing');
    else {
      const tokens = JSON.parse(readFileSync(tokensPath, 'utf8'));
      const known = new Set([
        ...Object.keys(tokens.properties ?? {}),
        ...Object.keys(tokens.layers ?? {}),
        ...Object.keys(tokens.colors ?? {}).flatMap(role => [`--${role}`, `--color-${role}`]),
      ]);
      for (const css of distFiles.filter(path => path.endsWith('.css'))) {
        const text = readFileSync(css, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
        const defined = new Set([...text.matchAll(/(--[\w-]+)\s*:/g)].map(match => match[1]));
        for (const match of text.matchAll(/(?:var|--theme)\(\s*(--[\w-]+)/g)) {
          const name = match[1];
          if (!known.has(name) && !defined.has(name)) failures.push(`${rel(css)} reads ${name}, not in tokens.json`);
        }
      }
      for (const file of jsFiles) {
        for (const match of readFileSync(file, 'utf8').matchAll(/z-\((--layer-[\w-]+)\)/g)) {
          if (!(match[1] in (tokens.layers ?? {}))) failures.push(`${rel(file)} uses ${match[1]}, not in tokens.json layers`);
        }
      }
      const stale = staleRoles(tokens, extractRoleUtilities(classNameFiles(packageDir, 'dist'), Object.keys(tokens.colors ?? {})));
      for (const line of stale) failures.push(`stale utilities list: ${line}`);
    }
    record(13, 'every var(--x) of the shipped CSS and every --layer-* class is in tokens.json; utilities lists fresh', failures);
  }

  return results.sort((left, right) => left.rule - right.rule);
}

// ── report ─────────────────────────────────────────────────────────────────────────────────────────────────────────
// realpath: a package manager may run this file through a symlink (pnpm's node_modules layout)
const isMain = process.argv[1] !== undefined && realpathSync(resolve(process.argv[1])) === fileURLToPath(import.meta.url);
if (isMain) {
  const argument = name => {
    const index = process.argv.indexOf(name);
    return index !== -1 ? process.argv[index + 1] : undefined;
  };
  if (!argument('--dir')) {
    console.error('usage: node check-package.mjs --dir <package root or extracted tarball> [--modules <node_modules>]');
    process.exit(2);
  }
  const packageDir = resolve(argument('--dir'));
  const results = checkPackage(packageDir, {
    modules: argument('--modules'),
    denyEnv: argument('--deny-env'),
    deny: (argument('--deny') ?? '').split(','),
    requireDenyList: process.argv.includes('--require-deny-list'),
  });
  let failed = 0;
  for (const result of results) {
    const status = result.failures.length === 0 ? (result.notes.some(note => note.startsWith('skipped')) ? 'skip' : 'ok') : 'FAIL';
    if (status === 'FAIL') failed += 1;
    console.log(`rule ${String(result.rule).padStart(2)} ${status.padEnd(4)} ${result.title}`);
    for (const note of result.notes) console.log(`         · ${note}`);
    for (const failure of result.failures.slice(0, 25)) console.log(`         ✗ ${failure}`);
    if (result.failures.length > 25) console.log(`         … ${result.failures.length - 25} more`);
  }
  console.log(`check-package: ${failed === 0 ? 'ok' : `${failed} rule(s) failed`} (${packageDir})`);
  process.exit(failed === 0 ? 0 : 1);
}
