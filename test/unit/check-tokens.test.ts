import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, it } from 'node:test';
import { checkTokens, escapeClass, isCssColor } from '../../scripts/check-tokens.mjs';

const tokens = {
  colors: { card: { themed: true } },
  properties: { '--nav-h': { themed: false } },
};

/** A package dist with one class literal and the tokens above, plus a host CSS file. */
const setup = (hostCss: string) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'check-tokens-'));
  fs.mkdirSync(path.join(root, 'dist', 'page'), { recursive: true });
  fs.writeFileSync(path.join(root, 'dist', 'tokens.json'), JSON.stringify(tokens));
  fs.writeFileSync(
    path.join(root, 'dist', 'page', 'Frame.js'),
    "export const Frame = () => _jsx('div', { className: 'bg-card md:h-[calc(100dvh_-_var(--nav-h))] group' });\n",
  );
  fs.writeFileSync(path.join(root, 'host.css'), hostCss);
  return { root, run: () => checkTokens({ packageDir: root, cssFiles: [path.join(root, 'host.css')] }) };
};

const COMPLETE_HOST_CSS =
  ':root{--card:#fff;--nav-h:4rem}.dark{--card:oklch(20% 0 0)}.bg-card{background:var(--card)}' +
  '@media (width>=48rem){.md\\:h-\\[calc\\(100dvh_-_var\\(--nav-h\\)\\)\\]{height:calc(100dvh - var(--nav-h))}}';

describe('check-tokens', () => {
  it('recognises complete CSS colours', () => {
    for (const value of ['#fff', '#ffffffcc', 'white', 'rgb(0 0 0 / 50%)', 'oklch(0.5 0.1 200)', 'hsl(0 0% 100%)', 'var(--x)']) {
      assert.ok(isCssColor(value), value);
    }
    for (const value of ['0 0% 100%', '12px', '']) assert.ok(!isCssColor(value), value);
  });

  it('escapes class names like CSS', () => {
    assert.equal(escapeClass('md:h-[1px]'), 'md\\:h-\\[1px\\]');
    assert.equal(escapeClass('bg-primary/90'), 'bg-primary\\/90');
  });

  it('passes a host that covers classes and tokens', () => {
    const { root, run } = setup(COMPLETE_HOST_CSS);
    try {
      assert.deepEqual(run(), []);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('reports a missing class rule, a missing declaration and a non-colour value', () => {
    const { root, run } = setup(':root{--card:0 0% 100%}.dark{}.bg-card{color:red}');
    try {
      assert.deepEqual(
        run().map((problem) => `${problem.check} ${problem.message}`),
        [
          "a no rule for class 'md:h-[calc(100dvh_-_var(--nav-h))]'",
          "c --card on :root is not a CSS colour: '0 0% 100%'",
          'b --card is not declared on .dark',
          'b --nav-h is not declared on :root',
        ],
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
