// A minimal package directory that passes every check-package rule. Each negative test copies it, breaks one rule
// and expects that rule to fail.
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { buildI18nManifest, serializeManifest } from '../../scripts/lib/i18n-manifest.mjs';

const FILES: Record<string, string> = {
  'src/i18n/store.ts': "export const m = (text: string) => text;\nexport const label = m('Hello');\n",
  'i18n/hints.json': '{ "Hello": "Greeting." }\n',
  'docs/README.md': '# Docs\n',
  '.claude/skills/sample-skill/SKILL.md': '---\nname: sample-skill\ndescription: Sample.\n---\n',
  'README.md': '# Sample\n',
  'dist/i18n/store.js': "let current = 'en';\nexport const setLanguage = (code) => { current = code; };\nexport const getLanguage = () => current;\n",
  'dist/i18n/store.d.ts': 'export declare const setLanguage: (code: string) => void;\nexport declare const getLanguage: () => string;\n',
  'dist/i18n/useLanguage.js':
    "'use client';\nimport { useSyncExternalStore } from 'react';\nimport { getLanguage } from './store.js';\nexport const useLanguage = () => useSyncExternalStore(() => () => {}, getLanguage, getLanguage);\n",
  'dist/i18n/useLanguage.d.ts': 'export declare const useLanguage: () => string;\n',
  'dist/i18n/index.js': "export { setLanguage, getLanguage } from './store.js';\nexport { useLanguage } from './useLanguage.js';\n",
  'dist/i18n/index.d.ts': "export { setLanguage, getLanguage } from './store.js';\nexport { useLanguage } from './useLanguage.js';\n",
  'dist/logic/pure/notify.js': "import { getLanguage } from '../../i18n/store.js';\nexport const notify = (message) => `${getLanguage()}: ${message}`;\n",
  'dist/logic/pure/notify.d.ts': 'export declare const notify: (message: string) => string;\n',
  'dist/logic/index.js': "export { notify } from './pure/notify.js';\n",
  'dist/logic/index.d.ts': "export { notify } from './pure/notify.js';\n",
  'dist/primitives/portal.js':
    "'use client';\nimport { createContext, useContext } from 'react';\nimport { clsx } from 'clsx';\nconst PortalContext = createContext(null);\nexport const usePortal = () => useContext(PortalContext);\nexport const layerClass = () => clsx('z-(--layer-popover)');\n",
  'dist/primitives/portal.d.ts': 'export declare const usePortal: () => unknown;\nexport declare const layerClass: () => string;\n',
  'dist/primitives/index.js': "export { usePortal, layerClass } from './portal.js';\n",
  'dist/primitives/index.d.ts': "export { usePortal, layerClass } from './portal.js';\n",
  'dist/next/searchParamsWriter.js':
    "import { useRouter } from 'next/navigation';\nexport const routerHook = useRouter;\nexport const write = (value) => value;\n",
  'dist/next/searchParamsWriter.d.ts': 'export declare const routerHook: unknown;\nexport declare const write: (value: string) => string;\n',
  'dist/next/index.js': "export { write, routerHook } from './searchParamsWriter.js';\n",
  'dist/next/index.d.ts': "export { write, routerHook } from './searchParamsWriter.js';\n",
  'dist/cli/run.js': "#!/usr/bin/env node\nimport * as fs from 'node:fs';\nexport const exists = (file) => fs.existsSync(file);\n",
  'dist/cli/run.d.ts': 'export declare const exists: (file: string) => boolean;\n',
  'dist/components.css': '@source "./";\n:where(:root) { --layer-popover: 50; }\n.frame { height: calc(100dvh - var(--nav-h)); }\n',
  'dist/tokens.json': JSON.stringify({
    version: 1,
    colors: { card: { themed: true } },
    properties: { '--nav-h': { themed: false } },
    layers: { '--layer-popover': { default: 50 } },
  }),
};

export const FIXTURE_MANIFEST = {
  name: '@sample/admin-blocks',
  version: '0.1.0',
  type: 'module',
  sideEffects: ['**/*.css'],
  exports: {
    './logic': { types: './dist/logic/index.d.ts', import: './dist/logic/index.js' },
    './i18n': { types: './dist/i18n/index.d.ts', import: './dist/i18n/index.js' },
    './primitives': { types: './dist/primitives/index.d.ts', import: './dist/primitives/index.js' },
    './next': { types: './dist/next/index.d.ts', import: './dist/next/index.js' },
    './components.css': './dist/components.css',
    './tokens.json': './dist/tokens.json',
    './i18n-keys.json': './dist/i18n-keys.json',
    './package.json': './package.json',
  },
  bin: { sample: './dist/cli/run.js' },
  files: ['dist', 'docs', '.claude/skills', 'README.md'],
  dependencies: { clsx: '^2.1.1' },
  peerDependencies: { react: '^19.0.0', next: '^16.0.0' },
};

/** Writes the passing fixture into a fresh temporary directory and returns its path. */
export function createFixture(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'check-package-'));
  writeFile(root, 'package.json', `${JSON.stringify(FIXTURE_MANIFEST, null, 2)}\n`);
  for (const [file, content] of Object.entries(FILES)) writeFile(root, file, content);
  regenerateManifest(root);
  return root;
}

/** Writes (or overwrites) a file of the fixture, creating its folder. */
export function writeFile(root: string, file: string, content: string): void {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), content);
}

export function readFile(root: string, file: string): string {
  return fs.readFileSync(path.join(root, file), 'utf-8');
}

/** Rewrites i18n-keys.json (root and dist) from the fixture's source. */
export function regenerateManifest(root: string): void {
  const content = serializeManifest(
    buildI18nManifest({
      sourceDir: path.join(root, 'src'),
      hintsFile: path.join(root, 'i18n', 'hints.json'),
      packageName: FIXTURE_MANIFEST.name,
      version: FIXTURE_MANIFEST.version,
    }).manifest,
  );
  writeFile(root, 'i18n-keys.json', content);
  writeFile(root, 'dist/i18n-keys.json', content);
}

export function updateManifest(root: string, change: (manifest: Record<string, unknown>) => void): void {
  const manifest = JSON.parse(readFile(root, 'package.json')) as Record<string, unknown>;
  change(manifest);
  writeFile(root, 'package.json', JSON.stringify(manifest, null, 2));
}

export function removeFixture(root: string): void {
  fs.rmSync(root, { recursive: true, force: true });
}
