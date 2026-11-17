import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadRtkQuery, recordingBaseApi } from '../../test/unit/injectedApiHarness.ts';
import { buildDatabaseRequests, createDatabaseApi, createStaticDatabaseApi, DATABASE_TAG } from './api.ts';
import { staticQueryFailure } from '../logic/pure/injectedApi.ts';
import {
  classifyApplyFailure,
  countDiffSeverities,
  diffSummary,
  entityClassNameOf,
  expectedSignaturesOf,
  formatTableSize,
  isApplicableDiff,
  sqlScriptOf,
  withoutErrorCode,
} from './diff.ts';
import type { DBTableDiff } from './types.ts';

describe('createDatabaseApi', () => {
  it('injects six operations under one tag type and returns their hooks', () => {
    const { api, endpoints, tagTypes } = recordingBaseApi();
    const databaseApi = createDatabaseApi({ baseApi: api, apiPrefix: '/api/admin/common/databaseModels/' });
    assert.deepEqual(tagTypes, [DATABASE_TAG]);
    assert.deepEqual(Object.keys(endpoints).sort(), [
      'adminUiDatabaseApplyDiff',
      'adminUiDatabaseApplyDiffs',
      'adminUiDatabaseDoctrineModelForEntity',
      'adminUiDatabaseDoctrineModelsCode',
      'adminUiDatabaseSchemaDiff',
      'adminUiDatabaseTablesSql',
    ]);
    const hooks = databaseApi as unknown as Record<string, () => string>;
    assert.equal(hooks.useSchemaDiffQuery?.(), 'adminUiDatabaseSchemaDiff');
    assert.equal(hooks.useApplyDiffsMutation?.(), 'adminUiDatabaseApplyDiffs');
    assert.equal(endpoints.adminUiDatabaseApplyDiff?.type, 'mutation');
    assert.equal(endpoints.adminUiDatabaseTablesSql?.type, 'query');
  });

  it('builds the requests of the trait on the prefix', () => {
    const requests = buildDatabaseRequests('/api/admin/common/databaseModels/');
    assert.deepEqual(requests.schemaDiff(), { url: '/api/admin/common/databaseModels/diff' });
    assert.deepEqual(requests.applyDiff({ sqlTableName: 'Orders', expectedDiffSignature: 'abc' }), {
      url: '/api/admin/common/databaseModels/applyDiff',
      method: 'POST',
      body: { sqlTableName: 'Orders', expectedDiffSignature: 'abc', disableForeignKeyChecks: true },
    });
    assert.deepEqual(
      requests.applyDiffs({
        sqlTableNames: ['Orders', 'Accounts'],
        expectedDiffSignatures: { elements: [{ sqlTableName: 'Orders', signature: 'abc' }] },
        disableForeignKeyChecks: false,
      }),
      {
        url: '/api/admin/common/databaseModels/applyDiffs',
        method: 'POST',
        body: {
          sqlTableNames: ['Orders', 'Accounts'],
          expectedDiffSignatures: { elements: [{ sqlTableName: 'Orders', signature: 'abc' }] },
          disableForeignKeyChecks: false,
        },
      }
    );
    assert.deepEqual((requests.applyDiffs({ sqlTableNames: null }).body as { sqlTableNames: unknown }).sqlTableNames, null);
    assert.deepEqual(requests.databaseTablesSql(), { url: '/api/admin/common/databaseModels/generateDatabaseTables', responseHandler: 'text' });
    assert.deepEqual(requests.doctrineModelsCode(), { url: '/api/admin/common/databaseModels/generateDoctrineModels', responseHandler: 'text' });
    assert.deepEqual(requests.doctrineModelForEntity({ entityName: 'App\\Domain\\Order' }), {
      url: '/api/admin/common/databaseModels/generateForEntity?entityName=App%5CDomain%5COrder',
      responseHandler: 'text',
    });
  });

  it('lets the applies invalidate nothing: their answer replaces the diff', () => {
    const { api, endpoints } = recordingBaseApi();
    createDatabaseApi({ baseApi: api, apiPrefix: '/db' });
    assert.deepEqual(endpoints.adminUiDatabaseApplyDiff?.invalidatesTags, []);
    assert.deepEqual(endpoints.adminUiDatabaseApplyDiffs?.invalidatesTags, []);
    assert.deepEqual(endpoints.adminUiDatabaseSchemaDiff?.providesTags, [{ type: DATABASE_TAG, id: 'DIFF' }]);
  });

  it('injects once per base api and prefix', () => {
    const recorder = recordingBaseApi();
    const first = createDatabaseApi({ baseApi: recorder.api, apiPrefix: '/db' });
    assert.equal(createDatabaseApi({ baseApi: recorder.api, apiPrefix: '/db/' }), first);
    assert.equal(recorder.injections(), 1);
    assert.notEqual(createDatabaseApi({ baseApi: recorder.api, apiPrefix: '/other' }), first);
    assert.equal(recorder.injections(), 2);
  });

  it('answers fixed payloads statically, failures included', async () => {
    const api = createStaticDatabaseApi({
      diff: { diffs: { elements: [] } },
      databaseTablesSql: staticQueryFailure({ status: 403, data: { error: 'Schema writes are disabled' } }),
      applyDiff: () => {
        throw { status: 400, data: { error: '[DIFF_APPLY_LOCK_BUSY] Another apply holds the lock.' } };
      },
    });
    assert.deepEqual(api.useSchemaDiffQuery(undefined).data, { diffs: { elements: [] } });
    assert.equal(api.useDatabaseTablesSqlQuery(undefined).isError, true);
    assert.equal(api.useDatabaseTablesSqlQuery(undefined, { skip: true }).isError, false);
    const [applyDiff] = api.useApplyDiffMutation();
    await assert.rejects(applyDiff({ sqlTableName: 'Orders' }).unwrap());
  });

  it('runs on the real RTK Query: JSON and text answers, an apply sends no follow-up GET', { skip: loadRtkQuery() === null }, async () => {
    const rtk = loadRtkQuery();
    if (!rtk) return;
    const requests: string[] = [];
    const baseApi = rtk.createApi({
      reducerPath: 'adminApi',
      keepUnusedDataFor: 0,
      baseQuery: async (request: { url: string; method?: string; body?: unknown; responseHandler?: string }) => {
        requests.push(`${request.method ?? 'GET'} ${request.url}${request.responseHandler ? ` (${request.responseHandler})` : ''}`);
        if (request.url.endsWith('/generateDatabaseTables')) return { data: 'CREATE TABLE `Orders` (…);' };
        return { data: { diffs: { elements: [] } } };
      },
      endpoints: () => ({}),
    });
    const injected: Record<string, unknown> = {};
    const withHooks = {
      ...baseApi,
      reducerPath: baseApi.reducerPath,
      enhanceEndpoints: (options: object) => {
        const enhanced = baseApi.enhanceEndpoints(options);
        return {
          injectEndpoints: (injectOptions: object) => {
            const api = enhanced.injectEndpoints(injectOptions);
            for (const name of Object.keys(api.endpoints)) {
              injected[`use${name.charAt(0).toUpperCase()}${name.slice(1)}${/Apply/.test(name) ? 'Mutation' : 'Query'}`] = () => name;
            }
            return injected;
          },
        };
      },
    };
    createDatabaseApi({ baseApi: withHooks, apiPrefix: '/api/admin/db' });
    const store = rtk.configureStore({ reducer: { adminApi: baseApi.reducer }, middleware: (getDefault: () => any[]) => getDefault().concat(baseApi.middleware) });
    const diff = store.dispatch(baseApi.endpoints.adminUiDatabaseSchemaDiff.initiate(undefined));
    const tables = store.dispatch(baseApi.endpoints.adminUiDatabaseTablesSql.initiate(undefined));
    await diff;
    const tablesResult = await tables;
    await store.dispatch(baseApi.endpoints.adminUiDatabaseApplyDiff.initiate({ sqlTableName: 'Orders', expectedDiffSignature: 'abc' }));
    await new Promise(resolve => setTimeout(resolve, 20));
    diff.unsubscribe();
    tables.unsubscribe();
    store.dispatch(baseApi.util.resetApiState());
    assert.equal(tablesResult.data, 'CREATE TABLE `Orders` (…);');
    assert.deepEqual(requests, ['GET /api/admin/db/diff', 'GET /api/admin/db/generateDatabaseTables (text)', 'POST /api/admin/db/applyDiff']);
  });
});

const diff = (patch: Partial<DBTableDiff>): DBTableDiff => ({ sqlTableName: 'Orders', changeType: 'ALTER_TABLE', severity: 'ADDITIVE', ...patch });

describe('database helpers', () => {
  it('summarises a table diff per aspect', () => {
    assert.equal(
      diffSummary(
        diff({
          columnDiffs: { elements: [{ changeKind: 'ADD' }, { changeKind: 'ADD' }, { changeKind: 'MODIFY' }, { changeKind: 'DROP' }, { changeKind: 'DROP' }, { changeKind: 'DROP' }] },
          indexDiffs: { elements: [{ changeKind: 'DROP' }] },
          collationChange: { from: 'a_ci', to: 'b_ci' },
        })
      ),
      '+2 ±1 -3 columns · -1 index · collation a_ci → b_ci'
    );
    assert.equal(diffSummary(diff({ changeType: 'CREATE_TABLE' })), 'New table');
    assert.equal(diffSummary(diff({})), 'No structural change');
  });

  it('counts severities and the blocked diffs', () => {
    const counts = countDiffSeverities([
      diff({ severity: 'ADDITIVE' }),
      diff({ severity: 'MIXED' }),
      diff({ severity: 'DESTRUCTIVE', directApplyBlocked: true }),
    ]);
    assert.deepEqual(counts, { total: 3, additive: 1, mixed: 1, destructive: 1, blocked: 1 });
    assert.equal(isApplicableDiff(diff({ directApplyBlocked: true })), false);
    assert.equal(isApplicableDiff(diff({ sqlTableName: '' })), false);
  });

  it('formats size and rows, the entity class and the script', () => {
    assert.equal(formatTableSize({ tableSizeMb: 374, tableRowCount: 290_067 }), '374 MB · 290,067 rows');
    assert.equal(formatTableSize({ tableSizeMb: null, tableRowCount: 1 }), '1 row');
    assert.equal(formatTableSize({ tableSizeMb: null, tableRowCount: null }), null);
    assert.equal(entityClassNameOf(diff({ entityClassWithNamespace: { name: 'Order', namespace: 'App\\Shop' } })), 'App\\Shop\\Order');
    assert.equal(entityClassNameOf(diff({ entityClassWithNamespace: null })), null);
    assert.equal(sqlScriptOf(diff({ sqlStatements: { elements: [{ sql: 'A;' }, { sql: ' ' }, { sql: 'B' }] } })), '-- [1/2]\nA;\n\n-- [2/2]\nB;');
  });

  it('sends the signature of every shown diff that has one', () => {
    assert.deepEqual(expectedSignaturesOf([diff({ diffSignature: 'x' }), diff({ sqlTableName: 'Accounts', diffSignature: null })]), {
      elements: [{ sqlTableName: 'Orders', signature: 'x' }],
    });
  });

  it('sorts apply failures by the error codes and statuses of the trait', () => {
    const failure = (status: number, error: string) => classifyApplyFailure({ status, data: { error } }, 'failed');
    assert.equal(failure(400, '[DIFF_SIGNATURE_MISMATCH] The diff changed.').kind, 'signature-mismatch');
    assert.equal(failure(400, '[DIFF_APPLY_LOCK_BUSY] Busy.').kind, 'lock-busy');
    assert.equal(failure(403, 'Schema writes are disabled on this process').kind, 'forbidden');
    assert.equal(failure(404, 'No pending diff').kind, 'not-found');
    assert.equal(failure(400, 'The production guard refuses').kind, 'refused');
    assert.equal(withoutErrorCode('[DIFF_SIGNATURE_MISMATCH] The diff changed.'), 'The diff changed.');
  });
});
