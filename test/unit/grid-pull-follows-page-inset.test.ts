// The grid view pulls itself out of its list card by the page inset (components.css) so its cards line up with the
// toolbar. A pull wider than the inset reaches past the window and makes the page scroll sideways, so the two
// are held together here: the inset of each breakpoint in `PAGE_INSET_CLASS` is the pull of the same breakpoint.
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const readSource = (relativePath: string): string => fs.readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8');

const COMPONENTS_CSS = readSource('../../src/components.css');
// read as text: the constant lives in a .tsx file, which the test runner does not load
const PAGE_INSET_CLASS = /export const PAGE_INSET_CLASS = '([^']+)';/.exec(readSource('../../src/page/PageHeader.tsx'))?.[1] ?? '';
const GRID_SELECTOR = '.surface:has([data-entity-grid]) [data-entity-grid]';
/** Tailwind's breakpoints (rem) for the prefixes the inset uses; no prefix = every width. */
const BREAKPOINT_REM: Record<string, number> = { '': 0, sm: 40, md: 48, lg: 64, xl: 80 };

/** The horizontal page inset in rem per breakpoint (rem), read from the class list (`px-4` = 1rem). */
const pageInsetByBreakpoint = (): Map<number, number> => {
  const insets = new Map<number, number>();
  for (const className of PAGE_INSET_CLASS.split(' ')) {
    const match = /^(?:([a-z]+):)?px-(\d+(?:\.\d+)?)$/.exec(className);
    if (!match) continue;
    const breakpoint = BREAKPOINT_REM[match[1] ?? ''];
    assert.notEqual(breakpoint, undefined, `unknown breakpoint prefix in ${className}`);
    insets.set(breakpoint, Number(match[2]) / 4);
  }
  return insets;
};

/** The grid's side padding and negative side margin in rem per breakpoint (rem), read from the stylesheet. */
const gridPullByBreakpoint = (): Map<number, { padding: number; margin: number }> => {
  const pulls = new Map<number, { padding: number; margin: number }>();
  const escapedSelector = GRID_SELECTOR.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rule = new RegExp(`(?:@media \\(width >= (\\d+(?:\\.\\d+)?)rem\\) \\{\\s*)?${escapedSelector} \\{([^}]*)\\}`, 'g');
  for (const match of COMPONENTS_CSS.matchAll(rule)) {
    const padding = /padding-inline: (\d+(?:\.\d+)?)rem;/.exec(match[2]);
    const margin = /margin-inline: -(\d+(?:\.\d+)?)rem;/.exec(match[2]);
    if (!padding || !margin) continue;
    pulls.set(Number(match[1] ?? 0), { padding: Number(padding[1]), margin: Number(margin[1]) });
  }
  return pulls;
};

describe('the grid view in a list card', () => {
  it('pulls itself out by the page inset of each breakpoint, never further', () => {
    const insets = pageInsetByBreakpoint();
    const pulls = gridPullByBreakpoint();
    assert.ok(insets.size >= 2, 'the page inset has no breakpoints to read');
    assert.deepEqual([...pulls.keys()].sort((a, b) => a - b), [...insets.keys()].sort((a, b) => a - b));
    for (const [breakpoint, inset] of insets) {
      assert.deepEqual(pulls.get(breakpoint), { padding: inset, margin: inset }, `from ${breakpoint}rem`);
    }
  });
});
