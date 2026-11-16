// One passing fixture and, per check-package rule, at least one fixture that must fail with that rule.
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { checkPackage } from '../../scripts/check-package.mjs';
import { createFixture, readFile, removeFixture, updateManifest, writeFile } from './fixture.ts';

const roots: string[] = [];
const fixture = (): string => {
  const root = createFixture();
  roots.push(root);
  return root;
};
afterEach(() => {
  for (const root of roots.splice(0)) removeFixture(root);
});

const check = (root: string, options: Parameters<typeof checkPackage>[1] = {}) =>
  checkPackage(root, { source: path.join(root, 'src'), ...options });

/** Asserts that `rule` fails, and returns its messages. */
const assertFails = (root: string, rule: number, options: Parameters<typeof checkPackage>[1] = {}): string[] => {
  const problems = check(root, options);
  const messages = problems.filter((problem) => problem.rule === rule).map((problem) => problem.message);
  assert.ok(messages.length > 0, `rule ${rule} did not fail; problems: ${JSON.stringify(problems)}`);
  return messages;
};

describe('check-package', () => {
  it('passes the valid fixture', () => {
    assert.deepEqual(check(fixture(), { requireSkills: true, deny: ['forbiddenword'] }), []);
  });

  it('rule 1: a missing exports target fails', () => {
    const root = fixture();
    fs.rmSync(path.join(root, 'dist/logic/index.d.ts'));
    assert.match(assertFails(root, 1).join('\n'), /missing exports target \.\/dist\/logic\/index\.d\.ts/);
  });

  it('rule 1: ./package.json must be exported', () => {
    const root = fixture();
    updateManifest(root, (manifest) => {
      delete (manifest.exports as Record<string, unknown>)['./package.json'];
    });
    assertFails(root, 1);
  });

  it('rule 1: --require-skills fails without a shipped skill', () => {
    const root = fixture();
    fs.rmSync(path.join(root, '.claude'), { recursive: true });
    assertFails(root, 1, { requireSkills: true });
  });

  it('rule 2: a hook file without the directive fails', () => {
    const root = fixture();
    writeFile(root, 'dist/i18n/useLanguage.js', readFile(root, 'dist/i18n/useLanguage.js').replace("'use client';\n", ''));
    assert.match(assertFails(root, 2).join('\n'), /useSyncExternalStore\(\).*no 'use client'/);
  });

  it('rule 2: a createContext file without the directive fails', () => {
    const root = fixture();
    writeFile(root, 'dist/primitives/portal.js', readFile(root, 'dist/primitives/portal.js').replace("'use client';\n", ''));
    assert.match(assertFails(root, 2).join('\n'), /createContext\(\)/);
  });

  it('rule 2: a react-dom import without the directive fails', () => {
    const root = fixture();
    writeFile(root, 'dist/logic/pure/notify.js', `import { flushSync } from 'react-dom';\n${readFile(root, 'dist/logic/pure/notify.js')}`);
    updateManifest(root, (manifest) => {
      (manifest.peerDependencies as Record<string, string>)['react-dom'] = '^19.0.0';
    });
    assert.match(assertFails(root, 2).join('\n'), /import 'react-dom'/);
  });

  it('rule 2: a directive on a pure file fails', () => {
    const root = fixture();
    writeFile(root, 'dist/i18n/store.js', `'use client';\n${readFile(root, 'dist/i18n/store.js')}`);
    assert.match(assertFails(root, 2).join('\n'), /uses no hook/);
  });

  it('rule 2: a directive on a barrel fails', () => {
    const root = fixture();
    writeFile(root, 'dist/i18n/index.js', `'use client';\n${readFile(root, 'dist/i18n/index.js')}`);
    assert.match(assertFails(root, 2).join('\n'), /barrel/);
  });

  it('rule 2: a hook name in a comment or string does not count', () => {
    const root = fixture();
    writeFile(root, 'dist/i18n/store.js', `// call useState() here\nexport const hint = 'useEffect(';\n${readFile(root, 'dist/i18n/store.js')}`);
    assert.deepEqual(check(root), []);
  });

  it('rule 3: an extensionless relative specifier fails', () => {
    const root = fixture();
    writeFile(root, 'dist/logic/index.js', "export { notify } from './pure/notify';\n");
    assert.match(assertFails(root, 3).join('\n'), /does not end in \.js/);
  });

  it('rule 3: a .ts specifier left in a declaration fails', () => {
    const root = fixture();
    writeFile(root, 'dist/logic/index.d.ts', "export { notify } from './pure/notify.ts';\n");
    assert.match(assertFails(root, 3).join('\n'), /TypeScript specifier/);
  });

  it('rule 3: a specifier that resolves to no file fails', () => {
    const root = fixture();
    writeFile(root, 'dist/logic/index.js', "export { notify } from './pure/missing.js';\n");
    assert.match(assertFails(root, 3).join('\n'), /does not resolve/);
  });

  it('rule 3: a specifier that leaves dist fails', () => {
    const root = fixture();
    writeFile(root, 'dist/logic/index.js', "export { notify } from '../../src/notify.js';\n");
    assert.match(assertFails(root, 3).join('\n'), /outside dist/);
  });

  it('rule 4: an app alias specifier fails', () => {
    const root = fixture();
    writeFile(root, 'dist/logic/index.js', `import '@/lib/persistence.js';\n${readFile(root, 'dist/logic/index.js')}`);
    assert.match(assertFails(root, 4).join('\n'), /app alias/);
  });

  it('rule 4: an absolute path in CSS fails', () => {
    const root = fixture();
    writeFile(root, 'dist/components.css', `@source "/srv/app/src";\n${readFile(root, 'dist/components.css')}`);
    assert.match(assertFails(root, 4).join('\n'), /absolute path/);
  });

  it('rule 5: a denied word in docs fails (from --deny)', () => {
    const root = fixture();
    writeFile(root, 'docs/README.md', '# Docs\nBuilt for ForbiddenWord.\n');
    assert.match(assertFails(root, 5, { deny: ['forbiddenword'] }).join('\n'), /docs\/README\.md:2: a denied word/);
  });

  it('rule 5: a denied word from CHECK_PACKAGE_DENY in a skill fails', () => {
    const root = fixture();
    writeFile(root, '.claude/skills/sample-skill/SKILL.md', '---\nname: sample-skill\n---\nAsk the SecretTeam.\n');
    const previous = process.env.CHECK_PACKAGE_DENY;
    process.env.CHECK_PACKAGE_DENY = 'unrelated, secretteam';
    try {
      assertFails(root, 5);
    } finally {
      if (previous === undefined) delete process.env.CHECK_PACKAGE_DENY;
      else process.env.CHECK_PACKAGE_DENY = previous;
    }
  });

  it('rule 5: a home-directory path in dist fails without any deny list', () => {
    const root = fixture();
    // assembled at run time, so this repository itself carries no home-directory path
    const homePath = ['', 'Users', 'someone', 'project'].join('/');
    writeFile(root, 'dist/logic/index.js.map', `{"sources":["${homePath}/src/logic/index.ts"]}`);
    assert.match(assertFails(root, 5).join('\n'), /home-directory path/);
  });

  it('rule 5: --require-deny-list fails without deny words', () => {
    const previous = process.env.CHECK_PACKAGE_DENY;
    delete process.env.CHECK_PACKAGE_DENY;
    try {
      assertFails(fixture(), 5, { requireDenyList: true });
    } finally {
      if (previous !== undefined) process.env.CHECK_PACKAGE_DENY = previous;
    }
  });

  it('rule 6: a bare specifier that is neither dependency nor peer fails', () => {
    const root = fixture();
    writeFile(root, 'dist/logic/pure/notify.js', `import pad from 'left-pad';\n${readFile(root, 'dist/logic/pure/notify.js')}`);
    assert.match(assertFails(root, 6).join('\n'), /'left-pad' is neither/);
  });

  it('rule 6: a Node built-in in browser code fails', () => {
    const root = fixture();
    writeFile(root, 'dist/logic/pure/notify.js', `import * as fs from 'node:fs';\n${readFile(root, 'dist/logic/pure/notify.js')}`);
    assert.match(assertFails(root, 6).join('\n'), /Node built-in/);
  });

  it('rule 6: node_modules inside dist fails', () => {
    const root = fixture();
    writeFile(root, 'dist/node_modules/clsx/index.js', 'export const clsx = () => "";\n');
    assert.match(assertFails(root, 6).join('\n'), /node_modules inside dist/);
  });

  it('rule 7: an edge outside the matrix fails (logic → primitives)', () => {
    const root = fixture();
    writeFile(root, 'dist/logic/pure/notify.js', `import { layerClass } from '../../primitives/portal.js';\n${readFile(root, 'dist/logic/pure/notify.js')}`);
    const messages = assertFails(root, 7).join('\n');
    assert.match(messages, /edge logic → primitives is not allowed/);
    assert.match(messages, /\.\/logic reaches 'clsx'/);
  });

  it('rule 7: next imported outside ./next fails', () => {
    const root = fixture();
    writeFile(root, 'dist/primitives/portal.js', `import Link from 'next/link';\n${readFile(root, 'dist/primitives/portal.js')}`);
    assert.match(assertFails(root, 7).join('\n'), /only next may import/);
  });

  it('rule 7: @reduxjs/toolkit and @mgamadeus/ddd-web/api fail everywhere', () => {
    const root = fixture();
    updateManifest(root, (manifest) => {
      Object.assign(manifest.peerDependencies as Record<string, string>, {
        '@reduxjs/toolkit': '^2.0.0',
        '@mgamadeus/ddd-web': '>=0.13.0 <1.0.0',
      });
    });
    writeFile(
      root,
      'dist/next/searchParamsWriter.js',
      `import { createSlice } from '@reduxjs/toolkit';\nimport { api } from '@mgamadeus/ddd-web/api';\n${readFile(root, 'dist/next/searchParamsWriter.js')}`,
    );
    const messages = assertFails(root, 7).join('\n');
    assert.match(messages, /'@reduxjs\/toolkit', which no entry may import/);
    assert.match(messages, /'@mgamadeus\/ddd-web\/api', which no entry may import/);
  });

  it('rule 7: recharts outside a chart file of ./data fails', () => {
    const root = fixture();
    updateManifest(root, (manifest) => {
      (manifest.peerDependencies as Record<string, string>).recharts = '^3.0.0';
    });
    writeFile(root, 'dist/data/StatTile.js', "import { LineChart } from 'recharts';\nexport const Tile = LineChart;\n");
    writeFile(root, 'dist/data/StatTile.d.ts', 'export declare const Tile: unknown;\n');
    assert.match(assertFails(root, 7).join('\n'), /'recharts', which only data may import/);
  });

  it('rule 8: a second copy of a module-state file fails', () => {
    const root = fixture();
    writeFile(root, 'dist/primitives/store.js', "let current = 'en';\nexport const getLanguage = () => current;\n");
    writeFile(root, 'dist/primitives/store.d.ts', 'export declare const getLanguage: () => string;\n');
    assert.match(assertFails(root, 8).join('\n'), /store\.js exists 2 times/);
  });

  it('rule 8: a context created twice fails', () => {
    const root = fixture();
    writeFile(
      root,
      'dist/i18n/useLanguage.js',
      `${readFile(root, 'dist/i18n/useLanguage.js')}import { createContext } from 'react';\nconst PortalContext = createContext(null);\nexport const Second = PortalContext;\n`,
    );
    assert.match(assertFails(root, 8).join('\n'), /context PortalContext is created 2 times/);
  });

  it('rule 8: a missing module-state file fails', () => {
    const root = fixture();
    writeFile(root, 'dist/next/index.js', "export const write = (value) => value;\n");
    fs.rmSync(path.join(root, 'dist/next/searchParamsWriter.js'));
    assert.match(assertFails(root, 8).join('\n'), /searchParamsWriter\.js is missing/);
  });

  it('rule 9: files without docs and sideEffects without the CSS fail', () => {
    const root = fixture();
    updateManifest(root, (manifest) => {
      manifest.files = ['dist', '.claude/skills'];
      manifest.sideEffects = false;
    });
    const messages = assertFails(root, 9).join('\n');
    assert.match(messages, /does not list docs/);
    assert.match(messages, /`sideEffects` does not list dist\/components\.css/);
  });

  it('rule 10: a JS file without its declaration fails', () => {
    const root = fixture();
    fs.rmSync(path.join(root, 'dist/logic/pure/notify.d.ts'));
    assert.match(assertFails(root, 10).join('\n'), /notify\.js has no \.d\.ts/);
  });

  it('rule 11: a test file in dist fails', () => {
    const root = fixture();
    writeFile(root, 'dist/logic/pure/notify.test.js', 'export {};\n');
    writeFile(root, 'dist/logic/pure/notify.test.d.ts', 'export {};\n');
    assert.match(assertFails(root, 11).join('\n'), /notify\.test\.js/);
  });

  it('rule 12: a stale i18n-keys.json fails', () => {
    const root = fixture();
    writeFile(root, 'src/i18n/store.ts', "export const m = (text: string) => text;\nexport const label = m('Hello');\nexport const other = m('New text');\n");
    const messages = assertFails(root, 12).join('\n');
    assert.match(messages, /dist\/i18n-keys\.json differs/);
    assert.match(messages, /^i18n-keys\.json differs/m);
  });

  it('rule 13: CSS reading a property tokens.json does not list fails', () => {
    const root = fixture();
    writeFile(root, 'dist/components.css', `${readFile(root, 'dist/components.css')}.x { padding: var(--app-gap); }\n`);
    assert.match(assertFails(root, 13).join('\n'), /reads --app-gap/);
  });

  it('rule 13: a z-(--layer-*) class tokens.json does not list fails', () => {
    const root = fixture();
    writeFile(root, 'dist/primitives/portal.js', readFile(root, 'dist/primitives/portal.js').replace('z-(--layer-popover)', 'z-(--layer-toast)'));
    assert.match(assertFails(root, 13).join('\n'), /class 'z-\(--layer-toast\)' reads --layer-toast/);
  });
});
