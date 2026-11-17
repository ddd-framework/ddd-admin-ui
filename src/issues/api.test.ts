import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadRtkQuery, recordingBaseApi, tagMatches } from '../../test/unit/injectedApiHarness.ts';
import { buildIssuesRequests, createIssuesApi, createStaticIssuesApi, ISSUES_TAG } from './api.ts';

describe('createIssuesApi', () => {
  it('injects six operations under one tag type and returns their hooks', () => {
    const { api, endpoints, tagTypes } = recordingBaseApi();
    const issuesApi = createIssuesApi({ baseApi: api, apiPrefix: '/api/admin/common/issues/' });
    assert.deepEqual(tagTypes, [ISSUES_TAG]);
    assert.deepEqual(Object.keys(endpoints).sort(), [
      'adminUiIssueGroupDetail',
      'adminUiIssueGroupIgnore',
      'adminUiIssueGroupReopen',
      'adminUiIssueGroupResolve',
      'adminUiIssueGroups',
      'adminUiIssuesTrend',
    ]);
    const hooks = issuesApi as unknown as Record<string, () => string>;
    assert.equal(hooks.useIssueGroupsQuery?.(), 'adminUiIssueGroups');
    assert.equal(hooks.useResolveIssueGroupMutation?.(), 'adminUiIssueGroupResolve');
    assert.equal(endpoints.adminUiIssueGroupIgnore?.type, 'mutation');
    assert.equal(endpoints.adminUiIssuesTrend?.type, 'query');
  });

  it('builds the requests of the trait on the prefix', () => {
    const requests = buildIssuesRequests('/api/admin/common/issues/');
    assert.equal(requests.groups({}).url, '/api/admin/common/issues/groups/list');
    assert.equal(
      requests.groups({ environment: 'all', status: 'RESOLVED', search: 'json error', section: 'HTTP', release: '1.2', limit: 50, offset: 50 }).url,
      '/api/admin/common/issues/groups/list?environment=all&status=RESOLVED&search=json%20error&section=HTTP&release=1.2&limit=50&offset=50'
    );
    assert.equal(
      requests.trend({ environment: 'prod', groupHash: 'abc', from: '2026-01-31T09:00:00Z', to: '2026-01-31T10:00:00Z' }).url,
      '/api/admin/common/issues/trend?environment=prod&groupHash=abc&from=2026-01-31T09%3A00%3A00Z&to=2026-01-31T10%3A00%3A00Z'
    );
    assert.deepEqual(requests.detail({ environment: 'prod.eu', groupHash: 'abc' }), { url: '/api/admin/common/issues/groups/prod.eu/abc' });
    assert.deepEqual(requests.resolve({ environment: 'prod', groupHash: 'abc' }), { url: '/api/admin/common/issues/groups/prod/abc/resolve', method: 'POST', body: {} });
    assert.equal(requests.ignore({ environment: 'prod', groupHash: 'abc' }).url, '/api/admin/common/issues/groups/prod/abc/ignore');
    assert.equal(requests.reopen({ environment: 'prod', groupHash: 'abc' }).url, '/api/admin/common/issues/groups/prod/abc/reopen');
  });

  it('lets a status change invalidate the list and the details, not the trend', () => {
    const { api, endpoints } = recordingBaseApi();
    createIssuesApi({ baseApi: api, apiPrefix: '/i' });
    for (const mutation of ['adminUiIssueGroupResolve', 'adminUiIssueGroupIgnore', 'adminUiIssueGroupReopen']) {
      const invalidated = endpoints[mutation]?.invalidatesTags ?? [];
      const refetched = (name: string) => (endpoints[name]?.providesTags ?? []).some(tag => invalidated.some(other => tagMatches(tag, other)));
      assert.equal(refetched('adminUiIssueGroups'), true);
      assert.equal(refetched('adminUiIssueGroupDetail'), true);
      assert.equal(refetched('adminUiIssuesTrend'), false);
    }
  });

  it('injects once per base api and prefix', () => {
    const recorder = recordingBaseApi();
    const first = createIssuesApi({ baseApi: recorder.api, apiPrefix: '/i' });
    assert.equal(createIssuesApi({ baseApi: recorder.api, apiPrefix: '/i/' }), first);
    assert.equal(recorder.injections(), 1);
    assert.notEqual(createIssuesApi({ baseApi: recorder.api, apiPrefix: '/other' }), first);
    assert.equal(recorder.injections(), 2);
  });

  it('answers a status change of the static api with the group and its new status', async () => {
    const staticApi = createStaticIssuesApi({
      detail: () => ({ group: { environment: 'prod', groupHash: 'abc', status: 'OPEN', eventCount: 3 }, issues: {}, events: {}, agentJson: '' }),
    });
    const [resolve] = staticApi.useResolveIssueGroupMutation();
    const response = await resolve({ environment: 'prod', groupHash: 'abc' }).unwrap();
    assert.equal(response.group.status, 'RESOLVED');
    assert.equal(response.group.eventCount, 3);
  });

  it('runs on the real RTK Query: requests, and a resolve refetches the list', { skip: loadRtkQuery() === null }, async () => {
    const rtk = loadRtkQuery();
    if (!rtk) return;
    const requests: string[] = [];
    const baseApi = rtk.createApi({
      reducerPath: 'adminApi',
      keepUnusedDataFor: 0,
      baseQuery: async (request: { url: string; method?: string }) => {
        requests.push(`${request.method ?? 'GET'} ${request.url}`);
        return { data: { group: {}, groups: { elements: [] } } };
      },
      endpoints: () => ({}),
    });
    const withHooks = {
      ...baseApi,
      reducerPath: baseApi.reducerPath,
      enhanceEndpoints: (options: object) => {
        const enhanced = baseApi.enhanceEndpoints(options);
        return {
          injectEndpoints: (injectOptions: object) => {
            const api = enhanced.injectEndpoints(injectOptions);
            const injected: Record<string, unknown> = {};
            for (const name of Object.keys(api.endpoints)) {
              const kind = /Resolve|Ignore|Reopen/.test(name) ? 'Mutation' : 'Query';
              injected[`use${name.charAt(0).toUpperCase()}${name.slice(1)}${kind}`] = () => name;
            }
            return injected;
          },
        };
      },
    };
    createIssuesApi({ baseApi: withHooks, apiPrefix: '/api/admin/common/issues' });
    const store = rtk.configureStore({ reducer: { adminApi: baseApi.reducer }, middleware: (getDefault: () => any[]) => getDefault().concat(baseApi.middleware) });
    const list = store.dispatch(baseApi.endpoints.adminUiIssueGroups.initiate({ status: 'OPEN' }));
    const trend = store.dispatch(baseApi.endpoints.adminUiIssuesTrend.initiate({ status: 'OPEN' }));
    await list;
    await trend;
    await store.dispatch(baseApi.endpoints.adminUiIssueGroupResolve.initiate({ environment: 'prod', groupHash: 'abc' }));
    await new Promise(resolve => setTimeout(resolve, 20));
    list.unsubscribe();
    trend.unsubscribe();
    store.dispatch(baseApi.util.resetApiState());
    assert.deepEqual(requests, [
      'GET /api/admin/common/issues/groups/list?status=OPEN',
      'GET /api/admin/common/issues/trend?status=OPEN',
      'POST /api/admin/common/issues/groups/prod/abc/resolve',
      'GET /api/admin/common/issues/groups/list?status=OPEN',
    ]);
  });
});
