import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { recordingBaseApi } from './injectedApiHarness.ts';
import { createTranslationsApi } from '../../src/translations/api.ts';
import { createWorkersApi } from '../../src/workers/api.ts';
import { hostTagsMemoKey, hostTagTypes, type InjectedEndpointDefinition, resolveHostTagsOf, withHostTags } from '../../src/logic/pure/injectedApi.ts';

const request = () => ({ url: '/x' });
const definitions = {
  endpointList: { kind: 'query', request, providesTags: ['Package'] },
  endpointDetail: { kind: 'query', request, providesTags: ['Package'] },
  endpointSave: { kind: 'mutation', request, invalidatesTags: ['Package'] },
} as const satisfies Record<string, InjectedEndpointDefinition<never>>;
const operationNames = { endpointList: 'list', endpointDetail: 'detail', endpointSave: 'save' };

describe('host cache tags per operation (0.3.7)', () => {
  it('keys provides and invalidates by operation, `others` for the rest', () => {
    const joined = withHostTags(
      definitions,
      { provides: { byOperation: { list: ['HostList'] }, others: ['HostAny'] }, invalidates: { byOperation: { save: [{ type: 'HostItem', id: 'LIST' }] } } },
      operationNames
    );
    assert.deepEqual(joined.endpointList.providesTags, ['Package', 'HostList']);
    assert.deepEqual(joined.endpointDetail.providesTags, ['Package', 'HostAny']);
    assert.deepEqual(joined.endpointSave.invalidatesTags, ['Package', { type: 'HostItem', id: 'LIST' }]);
  });

  it('asks a function per operation and kind', () => {
    const asked: string[] = [];
    const tags = (operation: string, kind: 'query' | 'mutation') => {
      asked.push(`${operation}:${kind}`);
      return operation === 'detail' ? undefined : [kind === 'query' ? 'HostRead' : 'HostWrite'];
    };
    const joined = withHostTags(definitions, tags, operationNames);
    assert.deepEqual(asked, ['list:query', 'detail:query', 'save:mutation']);
    assert.deepEqual(joined.endpointList.providesTags, ['Package', 'HostRead']);
    assert.equal(joined.endpointDetail, definitions.endpointDetail);
    assert.deepEqual(joined.endpointSave.invalidatesTags, ['Package', 'HostWrite']);
    assert.deepEqual(hostTagTypes(tags, definitions, operationNames), ['HostRead', 'HostWrite']);
  });

  it('keeps the array form and falls back to the endpoint name without a name map', () => {
    assert.deepEqual(resolveHostTagsOf({ provides: ['A'] }, 'anything', 'query'), ['A']);
    assert.deepEqual(resolveHostTagsOf({ provides: ['A'] }, 'anything', 'mutation'), []);
    const joined = withHostTags(definitions, { provides: { byOperation: { endpointList: ['ByEndpoint'] } } });
    assert.deepEqual(joined.endpointList.providesTags, ['Package', 'ByEndpoint']);
    assert.equal(withHostTags(definitions, { provides: { byOperation: {} } }, operationNames), definitions);
  });

  it('lists the tag types of the keyed form and gives equal tags one memo key', () => {
    assert.deepEqual(hostTagTypes({ provides: { byOperation: { list: ['A'] }, others: [{ type: 'B', id: 1 }] }, invalidates: ['A'] }), ['A', 'B']);
    assert.equal(hostTagsMemoKey(definitions, undefined), '');
    assert.equal(
      hostTagsMemoKey(definitions, () => ['A'], operationNames),
      hostTagsMemoKey(definitions, { provides: ['A'], invalidates: ['A'] }, operationNames)
    );
  });

  it('reaches the workers and translations operations by their public names', () => {
    const workers = recordingBaseApi();
    createWorkersApi({ baseApi: workers.api, apiPrefix: '/w', tags: { provides: { byOperation: { overview: ['HostOverview'] } } } });
    assert.ok((workers.endpoints.adminUiWorkersOverview?.providesTags ?? []).includes('HostOverview'));
    assert.ok(!(workers.endpoints.adminUiWorkersHistory?.providesTags ?? []).includes('HostOverview'));
    assert.ok(workers.tagTypes.includes('HostOverview'));

    const translations = recordingBaseApi();
    createTranslationsApi({
      baseApi: translations.api,
      apiPrefix: '/t',
      tags: (operation, kind) => (operation === 'languages' || operation === 'updateLanguage' ? [kind === 'query' ? 'HostLanguages' : 'HostLanguagesWrite'] : undefined),
    });
    assert.ok((translations.endpoints.adminUiLanguages?.providesTags ?? []).includes('HostLanguages'));
    assert.ok((translations.endpoints.adminUiUpdateLanguage?.invalidatesTags ?? []).includes('HostLanguagesWrite'));
    assert.ok(!(translations.endpoints.adminUiLocales?.providesTags ?? []).includes('HostLanguages'));
    assert.ok(translations.tagTypes.includes('HostLanguagesWrite'));
  });
});
