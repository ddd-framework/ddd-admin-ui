#!/usr/bin/env node
// Checks that a host installs every Radix package once. Radix keeps its focus traps, outside-click layers and portals
// in module state: two copies of one package (an overlay from `radix-ui` and another from a single `@radix-ui/*`
// package or from a dependency such as `cmdk`) do not see each other, so one overlay's focus trap does not pause for
// the other's, and an outside click closes the wrong one.
//
// Usage: node check-radix.mjs [host directory]   (default: the working directory)
// Reads the node_modules folders of the host directory and of every folder above it (where the host resolves
// packages from), in the npm layout (nested node_modules) and the pnpm layout (node_modules/.pnpm).
// Exit 0 when every `radix-ui` / `@radix-ui/*` package is installed once; exit 1 with one line per package installed
// more than once — in two versions, or in one version twice (two pnpm peer variants, a nested npm copy) — with where
// each copy sits; exit 2 on bad arguments.

import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const hostArg = process.argv[2];
const host = resolve(hostArg ?? '.');
if (!existsSync(host) || !statSync(host).isDirectory()) {
  console.error(`usage: node check-radix.mjs [host directory] (not a directory: ${host})`);
  process.exit(2);
}

/** name → version → set of install folders (real paths) */
const installs = new Map();
const visited = new Set();

const listDir = path => {
  try {
    return readdirSync(path, { withFileTypes: true });
  } catch {
    return [];
  }
};

const isDirectory = path => {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
};

const record = (name, packageDir) => {
  const manifestPath = join(packageDir, 'package.json');
  if (!existsSync(manifestPath)) return;
  const real = realpathSync(packageDir);
  const { version } = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (typeof version !== 'string') return;
  const versions = installs.get(name) ?? new Map();
  const folders = versions.get(version) ?? new Set();
  folders.add(real);
  versions.set(version, folders);
  installs.set(name, versions);
};

/** One node_modules folder: Radix packages are recorded, every other package's own node_modules is read in turn. */
const walk = nodeModules => {
  if (!isDirectory(nodeModules)) return;
  const real = realpathSync(nodeModules);
  if (visited.has(real)) return;
  visited.add(real);
  for (const entry of listDir(nodeModules)) {
    const path = join(nodeModules, entry.name);
    if (entry.name === '.pnpm') {
      for (const store of listDir(path)) walk(join(path, store.name, 'node_modules'));
      continue;
    }
    if (entry.name.startsWith('.')) continue;
    if (entry.name.startsWith('@')) {
      for (const scoped of listDir(path)) {
        const packageDir = join(path, scoped.name);
        if (entry.name === '@radix-ui') record(`@radix-ui/${scoped.name}`, packageDir);
        walk(join(packageDir, 'node_modules'));
      }
      continue;
    }
    if (entry.name === 'radix-ui') record('radix-ui', path);
    walk(join(path, 'node_modules'));
  }
};

for (let folder = host; ; folder = dirname(folder)) {
  walk(join(folder, 'node_modules'));
  if (dirname(folder) === folder) break;
}

/** Numeric version order (`1.1.3` before `1.1.11`); pre-release suffixes compare as text. */
const byVersion = (a, b) => {
  const left = a.split(/[.-]/);
  const right = b.split(/[.-]/);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const x = left[index] ?? '';
    const y = right[index] ?? '';
    if (x === y) continue;
    const numeric = /^\d+$/.test(x) && /^\d+$/.test(y);
    return numeric ? Number(x) - Number(y) : x < y ? -1 : 1;
  }
  return 0;
};

/** Install folders shown per version; the rest is counted. */
const SHOWN_FOLDERS = 3;

const where = folder => {
  const path = relative(host, folder);
  return path.startsWith('..') ? folder : path;
};

const copies = versions => [...versions.values()].reduce((count, folders) => count + folders.size, 0);
const duplicates = [...installs.entries()].filter(([, versions]) => copies(versions) > 1).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
const packages = installs.size;
if (packages === 0) {
  console.log(`check-radix: no radix-ui or @radix-ui/* package found from ${host}`);
  process.exit(0);
}
if (duplicates.length > 0) {
  console.log(`check-radix: ${duplicates.length} Radix package(s) installed more than once (${packages} checked)`);
  for (const [name, versions] of duplicates) {
    const ordered = [...versions.keys()].sort(byVersion);
    console.log(`  duplicate: ${name} ${ordered.join(', ')} (${copies(versions)} copies)`);
    for (const version of ordered) {
      const folders = [...versions.get(version)].map(where).sort();
      for (const folder of folders.slice(0, SHOWN_FOLDERS)) console.log(`    ${version}  ${folder}`);
      if (folders.length > SHOWN_FOLDERS) console.log(`    ${version}  … ${folders.length - SHOWN_FOLDERS} more`);
    }
  }
  console.log('  fix: align the single @radix-ui/* packages (and overrides for dependencies) to the versions radix-ui pins');
  process.exit(1);
}
console.log(`check-radix: ok (${packages} Radix packages, one copy each)`);
