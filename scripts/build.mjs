#!/usr/bin/env node
// Builds the package into dist/: removes the previous output, runs `tsc -p tsconfig.build.json` (one JS + one
// declaration file per source file, directives kept, relative specifiers rewritten to `.js` in the JS), rewrites the
// declarations' relative `.ts` / `.tsx` specifiers to `.js` (the compiler keeps them), then copy-assets puts the
// stylesheets, the JSON manifests and the shipped scripts next to the compiled files.
//
// Usage: node scripts/build.mjs   (`pnpm build`)
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDir = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'));
const dist = join(packageDir, 'dist');
const tsc = join(packageDir, 'node_modules', '.bin', 'tsc');
if (!existsSync(tsc)) {
  console.error(`build: ${tsc} missing; run pnpm install first`);
  process.exit(1);
}

const walk = dir =>
  readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

// tsc never deletes the output of a removed source file
rmSync(dist, { recursive: true, force: true });
const emit = spawnSync(tsc, ['-p', join(packageDir, 'tsconfig.build.json')], { stdio: 'inherit' });
if (emit.status !== 0) process.exit(emit.status ?? 1);

// Declarations: relative `.ts` / `.tsx` specifiers → `.js` (from '…', import('…'), export … from '…').
const SPECIFIER = /((?:\bfrom\s*|\bimport\s*\(\s*)['"])(\.{1,2}\/[^'"]+?)\.tsx?(['"])/g;
let rewritten = 0;
for (const file of walk(dist).filter(path => path.endsWith('.d.ts'))) {
  const source = readFileSync(file, 'utf8');
  const next = source.replace(SPECIFIER, (_whole, lead, path, quote) => {
    rewritten += 1;
    return `${lead}${path}.js${quote}`;
  });
  if (next !== source) writeFileSync(file, next);
}
console.log(`build: emitted into ${dist}; ${rewritten} declaration specifier(s) rewritten to .js`);

const assets = spawnSync(process.execPath, [join(packageDir, 'scripts', 'copy-assets.mjs')], { stdio: 'inherit' });
if (assets.status !== 0) process.exit(assets.status ?? 1);
