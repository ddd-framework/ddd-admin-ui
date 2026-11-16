import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, it } from 'node:test';
import { buildI18nManifest, extractTexts } from '../../scripts/lib/i18n-manifest.mjs';

describe('i18n manifest', () => {
  it('finds t, translateText and m calls with an optional context', () => {
    const source = [
      "t('Save')",
      'translateText("Delete", { context: \'action\' })',
      'm(`Users`)',
      "notAt('x'); obj.t('member call is skipped')",
    ].join('\n');
    assert.deepEqual(extractTexts(source), [
      { text: 'Save' },
      { text: 'Delete', context: 'action' },
      { text: 'Users' },
    ]);
  });

  it('finds <Translate> elements and normalises their whitespace', () => {
    const source = '<Translate context="navigation">\n  Go   back\n</Translate><Translate>Plain</Translate>';
    assert.deepEqual(extractTexts(source), [{ text: 'Go back', context: 'navigation' }, { text: 'Plain' }]);
  });

  it('skips files marked @translations-ignore-file', () => {
    assert.deepEqual(extractTexts("// @translations-ignore-file\nt('Hidden')"), []);
  });

  it('builds a sorted manifest with hints and files, skipping tests', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-manifest-'));
    try {
      const write = (file: string, content: string) => {
        fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
        fs.writeFileSync(path.join(root, file), content);
      };
      write('src/b/B.tsx', "t('Zebra'); t('Close', { context: 'dialog' })");
      write('src/a/A.ts', "m('Zebra'); m('Apple')");
      write('src/a/A.test.ts', "t('Only in a test')");
      write('i18n/hints.json', '{ "Zebra": "An animal.", "Close__dialog": "Closes a dialog." }');
      const { manifest, missingHints } = buildI18nManifest({
        sourceDir: path.join(root, 'src'),
        hintsFile: path.join(root, 'i18n', 'hints.json'),
        packageName: '@sample/blocks',
        version: '0.1.0',
      });
      assert.deepEqual(manifest, {
        package: '@sample/blocks',
        version: '0.1.0',
        generatedBy: 'scripts/build-i18n-manifest.mjs',
        keys: [
          { key: 'Apple', text: 'Apple', hint: '', files: ['a/A.ts'] },
          { key: 'Close__dialog', text: 'Close', context: 'dialog', hint: 'Closes a dialog.', files: ['b/B.tsx'] },
          { key: 'Zebra', text: 'Zebra', hint: 'An animal.', files: ['a/A.ts', 'b/B.tsx'] },
        ],
      });
      assert.deepEqual(missingHints, ['Apple']);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
