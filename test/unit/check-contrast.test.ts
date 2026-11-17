// scripts/check-contrast.mjs (shipped as `ddd-admin-ui-check-contrast`) against small host stylesheets.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const CHECK_CONTRAST = fileURLToPath(new URL('../../scripts/check-contrast.mjs', import.meta.url));

const TOKENS = {
  contrast: {
    pairs: [
      { foreground: 'foreground', background: 'background', minimum: 4.5 },
      { foreground: 'muted-foreground', background: 'card', minimum: 4.5 },
      { foreground: 'success', background: 'success/15', minimum: 4.5 },
    ],
    exceptions: [] as { foreground: string; background: string; theme?: string; reason: string }[],
  },
};

const GOOD_HOST =
  ':root{--background:#ffffff;--foreground:#111111;--card:#fff;--muted-foreground:#595959;--success:#0a5c0a}' +
  '.dark{--background:oklch(20% 0 0);--foreground:oklch(98% 0 0);--card:hsl(240 10% 12%);--muted-foreground:rgb(170 170 170);--success:#7ee07e}' +
  '@layer theme{:root{--color-card:var(--card)}}';

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

const checkContrast = (css: string, tokens: object = TOKENS, extra: string[] = []): { status: number | null; output: string } => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'check-contrast-'));
  roots.push(root);
  fs.writeFileSync(path.join(root, 'tokens.json'), JSON.stringify(tokens));
  fs.writeFileSync(path.join(root, 'host.css'), css);
  const run = spawnSync(process.execPath, [CHECK_CONTRAST, path.join(root, 'host.css'), path.join(root, 'tokens.json'), ...extra], {
    encoding: 'utf8',
  });
  return { status: run.status, output: `${run.stdout}${run.stderr}` };
};

describe('check-contrast', () => {
  it('passes a host whose declared pairs reach their minimum in both themes', () => {
    const { status, output } = checkContrast(GOOD_HOST);
    assert.equal(status, 0, output);
    assert.match(output, /light:[\s\S]*dark:/);
    assert.match(output, /ok {5}foreground on background: 18\.88:1/);
  });

  it('fails a pair below its minimum, naming the theme and the ratio', () => {
    const { status, output } = checkContrast(GOOD_HOST.replace('--muted-foreground:rgb(170 170 170)', '--muted-foreground:rgb(70 70 80)'));
    assert.equal(status, 1);
    assert.match(output, /dark:[\s\S]*FAILED muted-foreground on card: \d+\.\d\d:1 \(needs 4\.5:1\)/);
  });

  it('composites an alpha background over the base role (badges)', () => {
    const { status, output } = checkContrast(GOOD_HOST.replace('--success:#0a5c0a', '--success:#1aa104'));
    assert.equal(status, 1);
    assert.match(output, /FAILED success on success\/15 over|FAILED success on success\/15: 2\.\d\d:1/);
  });

  it('accepts a failing pair on the exception list, for the named theme only', () => {
    const css = GOOD_HOST.replace('--muted-foreground:rgb(170 170 170)', '--muted-foreground:rgb(70 70 80)');
    const excepted = structuredClone(TOKENS);
    excepted.contrast.exceptions.push({ foreground: 'muted-foreground', background: 'card', theme: 'dark', reason: 'decorative' });
    const passed = checkContrast(css, excepted);
    assert.equal(passed.status, 0, passed.output);
    assert.match(passed.output, /except muted-foreground on card: .* — decorative/);
    excepted.contrast.exceptions[0].theme = 'light';
    assert.equal(checkContrast(css, excepted).status, 1);
  });

  it('merges a host exception file (array or { exceptions }) and refuses a malformed one', () => {
    const css = GOOD_HOST.replace('--muted-foreground:rgb(170 170 170)', '--muted-foreground:rgb(70 70 80)');
    assert.equal(checkContrast(css).status, 1);
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'check-contrast-host-'));
    roots.push(root);
    const asArray = path.join(root, 'array.json');
    fs.writeFileSync(asArray, JSON.stringify([{ foreground: 'muted-foreground', background: 'card', theme: 'dark', reason: 'decorative' }]));
    const asObject = path.join(root, 'object.json');
    fs.writeFileSync(asObject, JSON.stringify({ exceptions: [{ foreground: 'muted-foreground', background: 'card', reason: 'decorative' }] }));
    const arrayRun = checkContrast(css, TOKENS, ['--exceptions', asArray]);
    assert.equal(arrayRun.status, 0, arrayRun.output);
    assert.match(arrayRun.output, /except muted-foreground on card: .* — decorative/);
    assert.equal(checkContrast(css, TOKENS, ['--exceptions', asObject]).status, 0);
    const wrongTheme = path.join(root, 'light.json');
    fs.writeFileSync(wrongTheme, JSON.stringify([{ foreground: 'muted-foreground', background: 'card', theme: 'light', reason: 'x' }]));
    assert.equal(checkContrast(css, TOKENS, ['--exceptions', wrongTheme]).status, 1);
    const malformed = path.join(root, 'bad.json');
    fs.writeFileSync(malformed, JSON.stringify([{ foreground: 'muted-foreground', background: 'card' }]));
    assert.equal(checkContrast(css, TOKENS, ['--exceptions', malformed]).status, 2);
    assert.equal(checkContrast(css, TOKENS, ['--exceptions']).status, 2);
  });

  it('reads channel triplets through the channel function the stylesheet uses', () => {
    const css =
      ':root{--background:0 0% 100%;--foreground:0 0% 7%;--card:0 0% 100%;--muted-foreground:0 0% 35%;--success:120 80% 20%}' +
      '.bg-background{background-color:hsl(var(--background))}.text-foreground{color:hsl(var(--foreground))}' +
      '.bg-card{background-color:hsl(var(--card))}.text-muted-foreground{color:hsl(var(--muted-foreground))}' +
      '.text-success{color:hsl(var(--success))}';
    const { status, output } = checkContrast(css);
    assert.equal(status, 0, output);
    assert.match(output, /no \.dark declarations/);
  });

  it('reports a value it cannot evaluate as a failure, a warning with --allow-unevaluated', () => {
    const css = GOOD_HOST.replace('--card:#fff', '--card:color-mix(in oklab, white 90%, black)');
    const strict = checkContrast(css);
    assert.equal(strict.status, 1);
    assert.match(strict.output, /FAILED muted-foreground on card: --card: cannot evaluate/);
    assert.equal(checkContrast(css, TOKENS, ['--allow-unevaluated']).status, 0);
  });

  it('names an undeclared role and refuses a tokens file without pairs', () => {
    const missing = checkContrast(GOOD_HOST.replace(';--success:#0a5c0a', '').replace(';--success:#7ee07e', ''));
    assert.equal(missing.status, 1);
    assert.match(missing.output, /--success not declared/);
    assert.equal(checkContrast(GOOD_HOST, {}).status, 2);
  });

  it('checks the package tokens.json pairs against a fixture host', () => {
    const tokens = JSON.parse(fs.readFileSync(fileURLToPath(new URL('./fixtures/contrast-tokens.json', import.meta.url)), 'utf8'));
    const css = fs.readFileSync(fileURLToPath(new URL('./fixtures/contrast-host.css', import.meta.url)), 'utf8');
    const { status, output } = checkContrast(css, tokens);
    assert.equal(status, 0, output);
  });
});
