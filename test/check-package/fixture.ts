// A minimal built package that passes every check-package rule. Each negative test copies it, breaks one rule and
// expects that rule to fail.
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

/** The repository's node_modules: peers, dependencies and the TypeScript compiler for rule 10. */
export const REPOSITORY_MODULES = fileURLToPath(new URL('../../node_modules', import.meta.url));
const GENERATOR = fileURLToPath(new URL('../../scripts/build-i18n-manifest.mjs', import.meta.url));

const FILES: Record<string, string> = {
  'README.md': '# Sample\n',
  '.claude/skills/sample-skill/SKILL.md': '---\nname: sample-skill\ndescription: "Sample skill. Use when testing."\n---\n# Sample\n',
  'dist/i18n/hints.json': '{ "Hello": "Greeting." }\n',
  'dist/i18n/store.js':
    "let current = { languageCode: 'en', translations: {} };\n" +
    'export const setTranslations = (languageCode, translations) => { current = { languageCode, translations }; };\n' +
    'export const getLanguage = () => current.languageCode;\n' +
    'export const m = (text) => text;\n' +
    "export const greeting = m('Hello');\n",
  'dist/i18n/store.js.map': '{"version":3,"file":"store.js","sources":["../../src/i18n/store.ts"],"mappings":""}',
  'dist/i18n/store.d.ts':
    'export declare const setTranslations: (languageCode: string, translations: Record<string, string>) => void;\n' +
    'export declare const getLanguage: () => string;\n' +
    'export declare const m: <T extends string>(text: T) => T;\n' +
    'export declare const greeting: string;\n',
  'dist/i18n/useLanguage.js':
    "'use client';\nimport { useSyncExternalStore } from 'react';\nimport { getLanguage } from './store.js';\n" +
    'export const useLanguage = () => useSyncExternalStore(() => () => {}, getLanguage, getLanguage);\n',
  'dist/i18n/useLanguage.d.ts': 'export declare const useLanguage: () => string;\n',
  'dist/i18n/index.js':
    "export { setTranslations, getLanguage, m, greeting } from './store.js';\nexport { useLanguage } from './useLanguage.js';\n",
  'dist/i18n/index.d.ts':
    "export { setTranslations, getLanguage, m, greeting } from './store.js';\nexport { useLanguage } from './useLanguage.js';\n",
  'dist/logic/pure/notify.js':
    "import { getLanguage } from '../../i18n/store.js';\nlet adapter = null;\n" +
    'export const setNotificationAdapter = (next) => { adapter = next; };\n' +
    'export const notify = (message) => adapter?.(`${getLanguage()}: ${message}`);\n',
  'dist/logic/pure/notify.d.ts':
    'export declare const setNotificationAdapter: (next: ((message: string) => void) | null) => void;\n' +
    'export declare const notify: (message: string) => void;\n',
  'dist/logic/index.js': "export { notify, setNotificationAdapter } from './pure/notify.js';\n",
  'dist/logic/index.d.ts': "export { notify, setNotificationAdapter } from './pure/notify.js';\n",
  'dist/primitives/portal.js':
    "'use client';\nimport { createContext, useContext } from 'react';\nimport { clsx } from 'clsx';\n" +
    'const PortalContext = createContext(null);\nexport const usePortal = () => useContext(PortalContext);\n' +
    "export const layerClass = () => clsx('bg-card z-(--layer-popover)');\n",
  'dist/primitives/portal.d.ts': 'export declare const usePortal: () => unknown;\nexport declare const layerClass: () => string;\n',
  'dist/primitives/index.js': "export { usePortal, layerClass } from './portal.js';\n",
  'dist/primitives/index.d.ts': "export { usePortal, layerClass } from './portal.js';\n",
  'dist/next/searchParamsWriter.js':
    "import { useRouter } from 'next/navigation';\nexport const routerHook = useRouter;\n" +
    'export const queueSearchParamsWrite = (value) => value;\n',
  'dist/next/searchParamsWriter.d.ts':
    'export declare const routerHook: unknown;\nexport declare const queueSearchParamsWrite: (value: string) => string;\n',
  'dist/next/index.js': "export { queueSearchParamsWrite, routerHook } from './searchParamsWriter.js';\n",
  'dist/next/index.d.ts': "export { queueSearchParamsWrite, routerHook } from './searchParamsWriter.js';\n",
  'dist/cli/run.js': "#!/usr/bin/env node\nimport * as fs from 'node:fs';\nexport const exists = (file) => fs.existsSync(file);\n",
  'dist/cli/run.d.ts': 'export declare const exists: (file: string) => boolean;\n',
  'dist/components.css': '@source "./";\n:where(:root) { --layer-popover: 50; }\n.frame { height: calc(100dvh - var(--nav-h)); }\n',
  'dist/tokens.json': `${JSON.stringify(
    {
      colors: { card: { themed: true, utilities: ['bg-card'] } },
      properties: { '--nav-h': { themed: false } },
      layers: { '--layer-popover': { default: 50 } },
    },
    null,
    2,
  )}\n`,
};

export const FIXTURE_MANIFEST = {
  name: '@sample/admin-blocks',
  version: '0.1.0',
  type: 'module',
  sideEffects: ['**/*.css'],
  exports: {
    './package.json': './package.json',
    './logic': { types: './dist/logic/index.d.ts', default: './dist/logic/index.js' },
    './i18n': { types: './dist/i18n/index.d.ts', default: './dist/i18n/index.js' },
    './primitives': { types: './dist/primitives/index.d.ts', default: './dist/primitives/index.js' },
    './next': { types: './dist/next/index.d.ts', default: './dist/next/index.js' },
    './components.css': './dist/components.css',
    './tokens.json': './dist/tokens.json',
    './i18n-keys.json': './dist/i18n-keys.json',
  },
  bin: { sample: './dist/cli/run.js' },
  files: ['dist', '.claude/skills', 'README.md'],
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

/** Rewrites dist/i18n-keys.json from the fixture's built JS. */
export function regenerateManifest(root: string): void {
  const run = spawnSync(process.execPath, [GENERATOR, '--built', '--dir', root], { encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`build-i18n-manifest failed: ${run.stdout}${run.stderr}`);
}

export function updateManifest(root: string, change: (manifest: Record<string, unknown>) => void): void {
  const manifest = JSON.parse(readFile(root, 'package.json')) as Record<string, unknown>;
  change(manifest);
  writeFile(root, 'package.json', JSON.stringify(manifest, null, 2));
}

export function removeFixture(root: string): void {
  fs.rmSync(root, { recursive: true, force: true });
}
