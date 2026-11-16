// tsc's rewriteRelativeImportExtensions rewrites `./file.ts` / `./file.tsx` to `./file.js` in the emitted
// JavaScript only; the declaration files keep the source extensions. This step rewrites the relative specifiers of
// every dist/**/*.d.ts the same way, so JavaScript and declarations name the same files.
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listFiles } from './lib/source-scan.mjs';

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const RELATIVE_TS_SPECIFIER = /((?:from|import)\s*\(?\s*)(['"])(\.{1,2}\/[^'"\n]*?)\.(?:ts|tsx|mts)\2/g;

let rewritten = 0;
for (const file of listFiles(dist).filter((name) => name.endsWith('.d.ts'))) {
  const full = path.join(dist, file);
  const before = fs.readFileSync(full, 'utf-8');
  const after = before.replace(RELATIVE_TS_SPECIFIER, (_match, prefix, quote, base) => `${prefix}${quote}${base}.js${quote}`);
  if (after !== before) {
    fs.writeFileSync(full, after);
    rewritten += 1;
  }
}
console.log(`rewrote relative specifiers in ${rewritten} declaration file(s)`);
