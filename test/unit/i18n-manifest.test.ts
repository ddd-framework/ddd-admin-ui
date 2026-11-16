// scripts/build-i18n-manifest.mjs (shipped as `ddd-admin-ui-i18n-manifest`) on a small package: the source mode
// (repository with src/) and the built mode (dist only, as in an installed package).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const GENERATOR = fileURLToPath(new URL('../../scripts/build-i18n-manifest.mjs', import.meta.url));

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

const createPackage = (files: Record<string, string>): string => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-manifest-'));
  roots.push(root);
  const all: Record<string, string> = {
    'package.json': '{ "name": "@sample/blocks", "version": "0.1.0" }',
    'src/i18n/store.ts': 'export const m = (text: string) => text;\n',
    ...files,
  };
  for (const [file, content] of Object.entries(all)) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), content);
  }
  return root;
};

const generate = (root: string, ...args: string[]) => {
  const run = spawnSync(process.execPath, [GENERATOR, '--dir', root, ...args], { encoding: 'utf8' });
  return { status: run.status, output: `${run.stdout}${run.stderr}` };
};

describe('build-i18n-manifest', () => {
  it('collects t, translateText, m and <Translate> texts with context, hints and files, sorted, skipping tests', () => {
    const root = createPackage({
      'src/b/B.tsx': "t('Zebra'); translateText('Close', { context: 'dialog' });\n<Translate context=\"nav\">\n  Go   back\n</Translate>",
      'src/a/A.ts': "m('Zebra'); m(`Apple`)",
      'src/a/A.test.ts': "t('Only in a test')",
      'src/c/Ignored.ts': "// @translations-ignore-file\nt('Hidden')",
      'i18n/hints.json': '{ "Zebra": "An animal.", "Close__dialog": "Closes a dialog.", "Apple": "A fruit.", "Go back__nav": "Back." }',
    });
    const { status, output } = generate(root);
    assert.equal(status, 0, output);
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'i18n-keys.json'), 'utf8'));
    assert.deepEqual(manifest, {
      package: '@sample/blocks',
      version: '0.1.0',
      generatedBy: 'scripts/build-i18n-manifest.mjs',
      keys: [
        { key: 'Apple', text: 'Apple', files: ['a/A.ts'], hint: 'A fruit.' },
        { key: 'Close__dialog', text: 'Close', context: 'dialog', files: ['b/B.tsx'], hint: 'Closes a dialog.' },
        { key: 'Go back__nav', text: 'Go back', context: 'nav', files: ['b/B.tsx'], hint: 'Back.' },
        { key: 'Zebra', text: 'Zebra', files: ['a/A.ts', 'b/B.tsx'], hint: 'An animal.' },
      ],
    });
    assert.equal(generate(root, '--check').status, 0);
  });

  // The map-level context of defineStatusMap is runtime only: an extractor reads the m() call, so a label rendered with a
  // context is marked with it (FAILED); an unmarked one (DONE) is recorded without it.
  it('records the context of m() inside a status map definition (key text__context)', () => {
    const root = createPackage({
      'src/a/status.ts':
        "export const IMPORT_STATUS = defineStatusMap({\n  FAILED: { label: m('Failed', { context: 'import-status' }), tone: 'danger' },\n  DONE: { label: m(\"Done\"), tone: 'success' },\n}, { context: 'import-status' });\n",
      'i18n/hints.json': '{ "Failed__import-status": "Status of an import.", "Done": "Status of an import." }',
    });
    const { status, output } = generate(root);
    assert.equal(status, 0, output);
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'i18n-keys.json'), 'utf8'));
    assert.deepEqual(manifest.keys, [
      { key: 'Done', text: 'Done', files: ['a/status.ts'], hint: 'Status of an import.' },
      { key: 'Failed__import-status', text: 'Failed', context: 'import-status', files: ['a/status.ts'], hint: 'Status of an import.' },
    ]);
  });

  it('skips the showcase entry (developer-facing English), in the source and in the built JS', () => {
    const root = createPackage({
      'src/a/A.ts': "m('Apple')",
      'src/showcase/Showcase.tsx': "t('Only in the showcase'); m('Also showcase')",
      'dist/a/A.js': "m('Apple')",
      'dist/showcase/Showcase.js': "t('Only in the showcase')",
      'i18n/hints.json': '{ "Apple": "A fruit." }',
      'dist/i18n/hints.json': '{ "Apple": "A fruit." }',
    });
    for (const args of [[], ['--built']]) {
      const { status, output } = generate(root, ...args);
      assert.equal(status, 0, output);
    }
    for (const file of ['i18n-keys.json', 'dist/i18n-keys.json']) {
      const manifest = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
      assert.deepEqual(manifest.keys.map((entry: { key: string }) => entry.key), ['Apple'], file);
    }
  });

  it('--check fails on a stale manifest and on a key without a hint', () => {
    const root = createPackage({ 'src/a/A.ts': "m('Apple')", 'i18n/hints.json': '{ "Apple": "A fruit." }' });
    assert.equal(generate(root).status, 0);
    fs.writeFileSync(path.join(root, 'src/a/A.ts'), "m('Apple'); m('Pear')");
    const { status, output } = generate(root, '--check');
    assert.equal(status, 1);
    assert.match(output, /stale: differs from a fresh run/);
    assert.match(output, /no hint: "Pear"/);
  });

  it('--built reads the built JS and dist/i18n-keys.json, naming files with the source extension', () => {
    const root = createPackage({
      'dist/a/A.js': "export const label = t('Apple');\n",
      'dist/a/A.js.map': '{"version":3,"sources":["../../src/a/A.tsx"],"mappings":""}',
      'dist/i18n/hints.json': '{ "Apple": "A fruit." }',
    });
    const { status, output } = generate(root, '--built');
    assert.equal(status, 0, output);
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'dist', 'i18n-keys.json'), 'utf8'));
    assert.deepEqual(manifest.keys, [{ key: 'Apple', text: 'Apple', files: ['a/A.tsx'], hint: 'A fruit.' }]);
  });
});
