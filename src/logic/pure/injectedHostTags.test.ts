import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { hostTagTypes, type InjectedEndpointDefinition, withHostTags } from './injectedApi.ts';

const request = () => ({ url: '/x' });
const definitions = {
  list: { kind: 'query', request, providesTags: ['Package'] },
  save: { kind: 'mutation', request, invalidatesTags: ['Package'] },
} as const satisfies Record<string, InjectedEndpointDefinition<never>>;

describe('host cache tags (0.3.4)', () => {
  it('adds provides to the queries and invalidates to the mutations', () => {
    const joined = withHostTags(definitions, { provides: ['HostList'], invalidates: [{ type: 'HostItem', id: 'LIST' }] });
    assert.deepEqual(joined.list.providesTags, ['Package', 'HostList']);
    assert.deepEqual(joined.save.invalidatesTags, ['Package', { type: 'HostItem', id: 'LIST' }]);
  });

  it('keeps the definitions as they are without host tags', () => {
    assert.equal(withHostTags(definitions, undefined), definitions);
    assert.equal(withHostTags(definitions, { provides: [] }), definitions);
  });

  it('lists the tag types once each', () => {
    assert.deepEqual(hostTagTypes({ provides: ['A', { type: 'B', id: 1 }], invalidates: ['A'] }), ['A', 'B']);
    assert.deepEqual(hostTagTypes(undefined), []);
  });
});
