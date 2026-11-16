// One passing fixture and, per check-package rule, at least one fixture that must fail with that rule.
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { checkPackage } from '../../scripts/check-package.mjs';
import { createFixture, readFile, REPOSITORY_MODULES, regenerateManifest, removeFixture, updateManifest, writeFile } from './fixture.ts';

type CheckOptions = NonNullable<Parameters<typeof checkPackage>[1]>;

const roots: string[] = [];
const fixture = (): string => {
  const root = createFixture();
  roots.push(root);
  return root;
};
afterEach(() => {
  for (const root of roots.splice(0)) removeFixture(root);
});

/** The failures of one rule (only that rule runs). */
const failuresOf = (root: string, rule: number, options: CheckOptions = {}): string[] =>
  checkPackage(root, { modules: REPOSITORY_MODULES, ...options, rules: [rule] }).flatMap(result => result.failures);

/** Asserts that `rule` fails and returns its failures as one text. */
const assertFails = (root: string, rule: number, options: CheckOptions = {}): string => {
  const failures = failuresOf(root, rule, options);
  assert.ok(failures.length > 0, `rule ${rule} did not fail`);
  return failures.join('\n');
};

/** Runs `change` with CHECK_PACKAGE_DENY set to `value` (or unset), restoring it afterwards. */
const withDenyEnvironment = <T>(value: string | undefined, change: () => T): T => {
  const previous = process.env.CHECK_PACKAGE_DENY;
  if (value === undefined) delete process.env.CHECK_PACKAGE_DENY;
  else process.env.CHECK_PACKAGE_DENY = value;
  try {
    return change();
  } finally {
    if (previous === undefined) delete process.env.CHECK_PACKAGE_DENY;
    else process.env.CHECK_PACKAGE_DENY = previous;
  }
};

describe('check-package', () => {
  it('passes the valid fixture on every rule (the strict consumer compile included)', () => {
    const results = withDenyEnvironment(undefined, () =>
      checkPackage(fixture(), { modules: REPOSITORY_MODULES, deny: ['forbiddenword'], requireDenyList: true }),
    );
    assert.deepEqual(
      results.filter(result => result.failures.length > 0),
      [],
    );
    assert.deepEqual(
      results.map(result => result.rule),
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    );
  });

  it('rule 1: a missing exports target fails', () => {
    const root = fixture();
    fs.rmSync(path.join(root, 'dist/logic/index.d.ts'));
    assert.match(assertFails(root, 1), /\.\/logic \(types\) → \.\/dist\/logic\/index\.d\.ts missing/);
  });

  it('rule 1: ./package.json must be exported', () => {
    const root = fixture();
    updateManifest(root, manifest => {
      delete (manifest.exports as Record<string, unknown>)['./package.json'];
    });
    assert.match(assertFails(root, 1), /\.\/package\.json is not exported/);
  });

  it('rule 1: a bin target without a node shebang fails', () => {
    const root = fixture();
    writeFile(root, 'dist/cli/run.js', readFile(root, 'dist/cli/run.js').replace('#!/usr/bin/env node\n', ''));
    assert.match(assertFails(root, 1), /bin sample → \.\/dist\/cli\/run\.js has no node shebang/);
  });

  it('rule 2: a hook file without the directive fails', () => {
    const root = fixture();
    writeFile(root, 'dist/i18n/useLanguage.js', readFile(root, 'dist/i18n/useLanguage.js').replace("'use client';\n", ''));
    assert.match(assertFails(root, 2), /useLanguage\.js: calls a hook/);
  });

  it('rule 2: a createContext file without the directive fails', () => {
    const root = fixture();
    writeFile(root, 'dist/primitives/portal.js', readFile(root, 'dist/primitives/portal.js').replace("'use client';\n", ''));
    assert.match(assertFails(root, 2), /portal\.js: calls a hook \/ createContext/);
  });

  it('rule 2: a react-dom import without the directive fails', () => {
    const root = fixture();
    writeFile(root, 'dist/i18n/store.js', `import { flushSync } from 'react-dom';\n${readFile(root, 'dist/i18n/store.js')}`);
    assert.match(assertFails(root, 2), /store\.js: calls a hook \/ createContext \/ react-dom/);
  });

  it('rule 2: a directive on a barrel fails', () => {
    const root = fixture();
    writeFile(root, 'dist/i18n/index.js', `'use client';\n${readFile(root, 'dist/i18n/index.js')}`);
    assert.match(assertFails(root, 2), /dist\/i18n\/index\.js: barrel or logic\/pure file carries 'use client'/);
  });

  it('rule 2: a directive on a logic/pure file fails', () => {
    const root = fixture();
    writeFile(root, 'dist/logic/pure/notify.js', `'use client';\n${readFile(root, 'dist/logic/pure/notify.js')}`);
    assert.match(assertFails(root, 2), /notify\.js: barrel or logic\/pure file carries 'use client'/);
  });

  it('rule 2: a directive on another file without a hook is a client boundary (listed, not failed)', () => {
    const root = fixture();
    writeFile(root, 'dist/i18n/store.js', `'use client';\n${readFile(root, 'dist/i18n/store.js')}`);
    const [result] = checkPackage(root, { rules: [2] });
    assert.deepEqual(result?.failures, []);
    assert.match(result?.notes.join('\n') ?? '', /1 client boundaries without a hook .*dist\/i18n\/store\.js/);
  });

  it('rule 2: a hook name in a comment does not count', () => {
    const root = fixture();
    writeFile(root, 'dist/i18n/store.js', `// call useState() here\n/* useEffect() */\n${readFile(root, 'dist/i18n/store.js')}`);
    assert.deepEqual(failuresOf(root, 2), []);
  });

  it('rule 3: an extensionless relative specifier fails', () => {
    const root = fixture();
    writeFile(root, 'dist/logic/index.js', "export { notify, setNotificationAdapter } from './pure/notify';\n");
    assert.match(assertFails(root, 3), /\.\/pure\/notify \(no \.js\)/);
  });

  it('rule 3: a .ts specifier left in a declaration fails', () => {
    const root = fixture();
    writeFile(root, 'dist/logic/index.d.ts', "export { notify, setNotificationAdapter } from './pure/notify.ts';\n");
    assert.match(assertFails(root, 3), /\(TypeScript specifier\)/);
  });

  it('rule 3: a specifier that resolves to no file fails', () => {
    const root = fixture();
    writeFile(root, 'dist/logic/index.js', "export { notify } from './pure/missing.js';\n");
    assert.match(assertFails(root, 3), /\.\/pure\/missing\.js does not resolve inside dist/);
  });

  it('rule 3: a specifier that leaves dist fails', () => {
    const root = fixture();
    writeFile(root, 'README.js', 'export const readme = 1;\n');
    writeFile(root, 'dist/logic/index.js', "export { readme } from '../../README.js';\n");
    assert.match(assertFails(root, 3), /\.\.\/\.\.\/README\.js does not resolve inside dist/);
  });

  it('rule 4: an app alias specifier fails', () => {
    const root = fixture();
    writeFile(root, 'dist/logic/index.js', `import '@/lib/persistence.js';\n${readFile(root, 'dist/logic/index.js')}`);
    assert.match(assertFails(root, 4), /app alias @\/lib\/persistence\.js/);
  });

  it('rule 4: an absolute path in CSS fails', () => {
    const root = fixture();
    writeFile(root, 'dist/components.css', `@source "/srv/app/src";\n${readFile(root, 'dist/components.css')}`);
    assert.match(assertFails(root, 4), /components\.css: absolute path \/srv\/app\/src/);
  });

  it('rule 4: an absolute source in a source map fails', () => {
    const root = fixture();
    writeFile(root, 'dist/i18n/store.js.map', '{"version":3,"sources":["/srv/app/src/i18n/store.ts"],"mappings":""}');
    assert.match(assertFails(root, 4), /absolute source \/srv\/app\/src\/i18n\/store\.ts/);
  });

  it('rule 5: a denied word in a shipped file fails (from --deny)', () => {
    const root = fixture();
    writeFile(root, 'README.md', '# Sample\nBuilt for ForbiddenWord.\n');
    assert.match(assertFails(root, 5, { deny: ['forbiddenword'] }), /README\.md:2 \(deny list entry\)/);
  });

  it('rule 5: a denied word from CHECK_PACKAGE_DENY in a skill fails', () => {
    const root = fixture();
    writeFile(root, '.claude/skills/sample-skill/SKILL.md', '---\nname: sample-skill\ndescription: x\n---\nAsk the SecretTeam.\n');
    const failures = withDenyEnvironment('unrelated, secretteam', () => assertFails(root, 5));
    assert.match(failures, /SKILL\.md:5 \(deny list entry\)/);
  });

  it('rule 5: a home-directory path fails without any deny list', () => {
    const root = fixture();
    // assembled at run time, so this repository itself carries no home-directory path
    const homePath = ['', 'Users', 'someone', 'project'].join('/');
    writeFile(root, 'dist/logic/index.js', `${readFile(root, 'dist/logic/index.js')}// built in ${homePath}\n`);
    assert.match(withDenyEnvironment(undefined, () => assertFails(root, 5)), /dist\/logic\/index\.js:2 \/Users\//);
  });

  it('rule 5: --require-deny-list fails without deny words', () => {
    const failures = withDenyEnvironment(undefined, () => assertFails(fixture(), 5, { requireDenyList: true }));
    assert.match(failures, /no deny list configured \(CHECK_PACKAGE_DENY is empty\)/);
  });

  it('rule 6: a bare specifier that is neither dependency nor peer fails', () => {
    const root = fixture();
    writeFile(root, 'dist/logic/pure/notify.js', `import pad from 'left-pad';\n${readFile(root, 'dist/logic/pure/notify.js')}`);
    assert.match(assertFails(root, 6), /left-pad is neither a dependency nor a peer/);
  });

  it('rule 6: a Node built-in outside dist/scripts and dist/cli fails', () => {
    const root = fixture();
    writeFile(root, 'dist/logic/pure/notify.js', `import * as fs from 'node:fs';\n${readFile(root, 'dist/logic/pure/notify.js')}`);
    assert.match(assertFails(root, 6), /node:fs outside dist\/scripts and dist\/cli/);
  });

  it('rule 6: node_modules inside the shipped files fails', () => {
    const root = fixture();
    writeFile(root, 'dist/node_modules/clsx/index.js', 'export const clsx = () => "";\n');
    assert.match(assertFails(root, 6), /node_modules inside the shipped files/);
  });

  it('rule 6: a copied peer fails', () => {
    const root = fixture();
    writeFile(root, 'dist/logic/pure/notify.js', `${readFile(root, 'dist/logic/pure/notify.js')}function useForm() {}\n`);
    assert.match(assertFails(root, 6), /looks like a copied peer/);
  });

  it('rule 7: a runtime edge outside the matrix fails (logic → primitives), and logic then reaches clsx', () => {
    const root = fixture();
    writeFile(root, 'dist/logic/pure/notify.js', `import { layerClass } from '../../primitives/portal.js';\n${readFile(root, 'dist/logic/pure/notify.js')}`);
    const failures = assertFails(root, 7);
    assert.match(failures, /runtime edge logic → primitives/);
    assert.match(failures, /reaches clsx \(logic and i18n draw nothing\)/);
    assert.match(failures, /reaches react at run time \(logic\/pure runs without React\)/);
  });

  it('rule 7: a type-only edge outside the matrix fails', () => {
    const root = fixture();
    writeFile(root, 'dist/i18n/store.d.ts', `import type { notify } from '../logic/pure/notify.js';\n${readFile(root, 'dist/i18n/store.d.ts')}`);
    assert.match(assertFails(root, 7), /type edge i18n → logic/);
  });

  it('rule 7: an allowed edge to a file outside its file limit fails (page → list)', () => {
    const root = fixture();
    writeFile(root, 'dist/list/EntityListTable.js', 'export const EntityListTable = () => null;\n');
    writeFile(root, 'dist/list/EntityListTable.d.ts', 'export declare const EntityListTable: () => null;\n');
    writeFile(root, 'dist/page/Header.js', "import { EntityListTable } from '../list/EntityListTable.js';\nexport const Header = EntityListTable;\n");
    writeFile(root, 'dist/page/Header.d.ts', 'export declare const Header: () => null;\n');
    assert.match(assertFails(root, 7), /runtime edge page → list only to .*: page\/Header -> list\/EntityListTable/);
  });

  it('rule 7: next reached outside ./next fails', () => {
    const root = fixture();
    writeFile(root, 'dist/primitives/portal.js', `import Link from 'next/link';\n${readFile(root, 'dist/primitives/portal.js')}`);
    assert.match(assertFails(root, 7), /dist\/primitives\/portal\.js reaches next\/\* \(next\/link\)/);
  });

  it('rule 7: @reduxjs/toolkit and @mgamadeus/ddd-web/api fail everywhere', () => {
    const root = fixture();
    writeFile(
      root,
      'dist/next/searchParamsWriter.js',
      `import { createSlice } from '@reduxjs/toolkit';\nimport { api } from '@mgamadeus/ddd-web/api';\n${readFile(root, 'dist/next/searchParamsWriter.js')}`,
    );
    const failures = assertFails(root, 7);
    assert.match(failures, /reaches Redux \/ ddd-web\/api \(@reduxjs\/toolkit\)/);
    assert.match(failures, /reaches Redux \/ ddd-web\/api \(@mgamadeus\/ddd-web\/api\)/);
  });

  it('rule 7: recharts fails in every entry', () => {
    const root = fixture();
    writeFile(root, 'dist/primitives/chart.js', "import { LineChart } from 'recharts';\nexport const Chart = LineChart;\n");
    writeFile(root, 'dist/primitives/chart.d.ts', 'export declare const Chart: unknown;\n');
    assert.match(assertFails(root, 7), /chart\.js reaches recharts/);
  });

  it('rule 8: a second definer of module state fails', () => {
    const root = fixture();
    writeFile(root, 'dist/primitives/store.js', 'export const setTranslations = () => {};\n');
    writeFile(root, 'dist/primitives/store.d.ts', 'export declare const setTranslations: () => void;\n');
    assert.match(assertFails(root, 8), /setTranslations defined 2×/);
  });

  it('rule 8: a context created twice fails', () => {
    const root = fixture();
    writeFile(
      root,
      'dist/i18n/useLanguage.js',
      `${readFile(root, 'dist/i18n/useLanguage.js')}import { createContext } from 'react';\nconst PortalContext = createContext(null);\nexport const Second = PortalContext;\n`,
    );
    assert.match(assertFails(root, 8), /context PortalContext defined in/);
  });

  it('rule 8: a missing module-state file fails', () => {
    const root = fixture();
    fs.rmSync(path.join(root, 'dist/next/searchParamsWriter.js'));
    assert.match(assertFails(root, 8), /dist\/next\/searchParamsWriter\.js missing/);
  });

  it('rule 9: files without .claude/skills and sideEffects without the CSS fail', () => {
    const root = fixture();
    updateManifest(root, manifest => {
      manifest.files = ['dist'];
      manifest.sideEffects = false;
    });
    const failures = assertFails(root, 9);
    assert.match(failures, /files does not include README\.md/);
    assert.match(failures, /files does not include \.claude\/skills/);
    assert.match(failures, /dist\/components\.css is not listed in sideEffects/);
  });

  it('rule 9: a skill without a description fails', () => {
    const root = fixture();
    writeFile(root, '.claude/skills/sample-skill/SKILL.md', '---\nname: sample-skill\n---\n# Sample\n');
    assert.match(assertFails(root, 9), /SKILL\.md: frontmatter needs name and description/);
  });

  it('rule 10: a JS file without its declaration fails', () => {
    const root = fixture();
    fs.rmSync(path.join(root, 'dist/logic/pure/notify.d.ts'));
    assert.match(assertFails(root, 10), /notify\.js has no \.d\.ts/);
  });

  it('rule 10: a declaration that does not compile in a strict consumer fails', () => {
    const root = fixture();
    writeFile(root, 'dist/i18n/store.d.ts', `${readFile(root, 'dist/i18n/store.d.ts')}export declare const broken: UnknownType;\n`);
    assert.match(assertFails(root, 10), /strict consumer \(bundler\) fails/);
  });

  it('rule 11: a test file in the shipped files fails', () => {
    const root = fixture();
    writeFile(root, 'dist/logic/pure/notify.test.js', 'export {};\n');
    assert.match(assertFails(root, 11), /notify\.test\.js is a test/);
  });

  it('rule 12: a stale dist/i18n-keys.json fails', () => {
    const root = fixture();
    writeFile(root, 'dist/i18n/store.js', `${readFile(root, 'dist/i18n/store.js')}export const other = m('New text');\n`);
    assert.match(assertFails(root, 12), /stale/);
  });

  it('rule 12: a key without a hint fails', () => {
    const root = fixture();
    writeFile(root, 'dist/i18n/store.js', `${readFile(root, 'dist/i18n/store.js')}export const other = m('New text');\n`);
    regenerateManifest(root);
    assert.match(assertFails(root, 12), /no hint: "New text"/);
  });

  it('rule 13: CSS reading a property tokens.json does not list fails', () => {
    const root = fixture();
    writeFile(root, 'dist/components.css', `${readFile(root, 'dist/components.css')}.x { padding: var(--app-gap); }\n`);
    assert.match(assertFails(root, 13), /components\.css reads --app-gap, not in tokens\.json/);
  });

  it('rule 13: a z-(--layer-*) class tokens.json does not list fails', () => {
    const root = fixture();
    writeFile(root, 'dist/primitives/portal.js', readFile(root, 'dist/primitives/portal.js').replace('z-(--layer-popover)', 'z-(--layer-toast)'));
    assert.match(assertFails(root, 13), /uses --layer-toast, not in tokens\.json layers/);
  });

  it('rule 13: a stale utilities list fails', () => {
    const root = fixture();
    writeFile(root, 'dist/primitives/portal.js', readFile(root, 'dist/primitives/portal.js').replace('bg-card', 'bg-card hover:text-card'));
    assert.match(assertFails(root, 13), /stale utilities list: colour role "card": not listed text-card/);
  });
});
