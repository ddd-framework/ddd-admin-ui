import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { UrlStateAdapter } from '../pure/urlListState.ts';
import { externalListChange, readListValues } from './useUrlListState.ts';

const KEYS = ['q', 'status'] as const;
const values = (q: string, status: string) => ({ q, status });

describe('useUrlListState follows the URL (0.3.4)', () => {
  it('takes a URL change from outside (Back, a link with other filters)', () => {
    assert.deepEqual(externalListChange(KEYS, values('b', ''), values('a', ''), values('a', '')), values('b', ''));
    assert.deepEqual(externalListChange(KEYS, values('', 'RUNNING'), values('a', ''), null), values('', 'RUNNING'));
  });

  it('ignores the echo of its own write and an unchanged URL', () => {
    assert.equal(externalListChange(KEYS, values('typed', ''), values('', ''), values('typed', '')), null);
    assert.equal(externalListChange(KEYS, values('a', ''), values('a', ''), values('typed', '')), null);
  });

  it('reads the keys trimmed, absent as empty', () => {
    const adapter: UrlStateAdapter = { get: key => (key === 'q' ? ' x ' : null), replace: () => {} };
    assert.deepEqual(readListValues(KEYS, adapter), values('x', ''));
  });
});
