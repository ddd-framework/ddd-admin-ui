// scripts/check-tokens.mjs (shipped as `ddd-admin-ui-check-tokens`) against small host stylesheets.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const CHECK_TOKENS = fileURLToPath(new URL('../../scripts/check-tokens.mjs', import.meta.url));

const TOKENS = {
  colors: { card: { utilities: ['bg-card'] }, 'success-text': { required: false, fallback: 'success', utilities: [] } },
  properties: { '--nav-h': { themed: false }, '--surface-alpha': { themed: true } },
  layers: { '--layer-popover': { default: 50 } },
  dataAttributes: { 'data-form-actions': { readBy: 'components.css' } },
};

const PACKAGE_RULES = ':where(:root){--layer-popover:50}form>[data-form-actions]{margin-top:1rem}';
const COMPLETE_HOST_CSS =
  ':root{--card:#fff;--nav-h:4rem;--surface-alpha:90%}.dark{--card:oklch(20% 0 0);--surface-alpha:80%}' +
  `.bg-card{background-color:var(--card)}.hover\\:bg-card:hover{background-color:var(--card)}${PACKAGE_RULES}`;

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

/** Runs the check on `css` with the tokens above; returns the exit code and the output. */
const checkTokens = (css: string): { status: number | null; output: string } => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'check-tokens-'));
  roots.push(root);
  fs.writeFileSync(path.join(root, 'tokens.json'), JSON.stringify(TOKENS));
  fs.writeFileSync(path.join(root, 'host.css'), css);
  const run = spawnSync(process.execPath, [CHECK_TOKENS, path.join(root, 'host.css'), path.join(root, 'tokens.json')], {
    encoding: 'utf8',
  });
  return { status: run.status, output: `${run.stdout}${run.stderr}` };
};

describe('check-tokens', () => {
  it('passes a host that provides every utility, property, layer default and data-attribute rule', () => {
    const { status, output } = checkTokens(COMPLETE_HOST_CSS);
    assert.equal(status, 0, output);
  });

  it('names a colour utility without a rule', () => {
    const { status, output } = checkTokens(COMPLETE_HOST_CSS.replace(/\.bg-card\{[^}]*\}\.hover\\:bg-card:hover\{[^}]*\}/, ''));
    assert.equal(status, 1);
    assert.match(output, /colour role "card": no rule for bg-card/);
  });

  it('accepts a utility that exists only under a variant', () => {
    const { status, output } = checkTokens(COMPLETE_HOST_CSS.replace(/\.bg-card\{[^}]*\}/, ''));
    assert.equal(status, 0, output);
  });

  it('names a property missing on :root and a themed one missing on .dark', () => {
    const { status, output } = checkTokens(COMPLETE_HOST_CSS.replace('--nav-h:4rem;', '').replace(';--surface-alpha:80%', ''));
    assert.equal(status, 1);
    assert.match(output, /property --nav-h: not declared on :root/);
    assert.match(output, /property --surface-alpha: themed, but not declared on \.dark/);
  });

  it('refuses channels in a role read as a whole colour, accepts them inside a channel function', () => {
    const channels = COMPLETE_HOST_CSS.replace('--card:#fff', '--card:0 0% 100%').replace('--card:oklch(20% 0 0)', '--card:0 0% 10%');
    const plainRead = checkTokens(channels);
    assert.equal(plainRead.status, 1);
    assert.match(plainRead.output, /--card in ":root" is not a colour, but read as background-color/);
    const channelRead = checkTokens(channels.replaceAll('var(--card)', 'hsl(var(--card))'));
    assert.equal(channelRead.status, 0, channelRead.output);
  });

  it('names a missing layer default and a data attribute no rule reads (components.css not imported)', () => {
    const { status, output } = checkTokens(COMPLETE_HOST_CSS.replace(PACKAGE_RULES, ''));
    assert.equal(status, 1);
    assert.match(output, /layer --layer-popover: default 50 not declared/);
    assert.match(output, /data attribute data-form-actions: no rule reads it/);
  });

  it('accepts an optional role that is not declared, or declared and read; names one declared but read by no rule', () => {
    const bound = '.text-success{color:var(--success-text,var(--success))}';
    assert.equal(checkTokens(COMPLETE_HOST_CSS).status, 0);
    assert.equal(checkTokens(`${COMPLETE_HOST_CSS}:root{--success-text:#166534}${bound}`).status, 0);
    const unread = checkTokens(`${COMPLETE_HOST_CSS}:root{--success-text:#166534}`);
    assert.equal(unread.status, 1);
    assert.match(unread.output, /colour role "success-text": --success-text is declared but no rule reads it/);
  });
});
