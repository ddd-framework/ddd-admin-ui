#!/usr/bin/env node
// Writes i18n-keys.json: every literal passed to t(…), translateText(…), m(…) (optional second argument
// `{ context: '…' }`) and every <Translate context="…">text</Translate> of src/. Key = text or `text__context`.
// Files containing `@translations-ignore-file` and tests are skipped; hints come from i18n/hints.json.
//
// Usage: node scripts/build-i18n-manifest.mjs [--check]
//   --check  do not write; exit 1 when the committed manifest differs from a fresh run
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildI18nManifestForRoot, serializeManifest } from './lib/i18n-manifest.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(root, 'i18n-keys.json');
const { manifest, missingHints } = buildI18nManifestForRoot(root);
const content = serializeManifest(manifest);

for (const key of missingHints) console.warn(`warning: no hint for "${key}" in i18n/hints.json`);

if (process.argv.includes('--check')) {
  const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf-8') : '';
  if (current !== content) {
    console.error('i18n-keys.json is stale: run `pnpm i18n:manifest`');
    process.exit(1);
  }
  console.log(`i18n-keys.json is current (${manifest.keys.length} keys)`);
} else {
  fs.writeFileSync(target, content);
  console.log(`wrote i18n-keys.json (${manifest.keys.length} keys)`);
}
