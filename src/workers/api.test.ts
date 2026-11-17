import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadRtkQuery, recordingBaseApi, tagMatches } from '../../test/unit/injectedApiHarness.ts';
import { buildWorkersRequests, createWorkersApi, WORKERS_TAG } from './api.ts';
import { drainMs, perWorkerMinute, rankTransports, throughputWindowOf, waitingStateLabel, zipSeries } from './format.ts';
import { resolveWorkersWindow, toWorkersWindowPreset } from './window.ts';

describe('createWorkersApi', () => {
  it('injects six operations under one tag type and returns their hooks', () => {
    const { api, endpoints, tagTypes } = recordingBaseApi();
    const workersApi = createWorkersApi({ baseApi: api, apiPrefix: '/api/admin/workers/' });
    assert.deepEqual(tagTypes, [WORKERS_TAG]);
    assert.deepEqual(Object.keys(endpoints).sort(), [
      'adminUiWorkerMessageRuns',
      'adminUiWorkerProcesses',
      'adminUiWorkerTransportDetail',
      'adminUiWorkersHistory',
      'adminUiWorkersOverview',
      'adminUiWorkersRestart',
    ]);
    const hooks = workersApi as unknown as Record<string, () => string>;
    assert.equal(hooks.useOverviewQuery?.(), 'adminUiWorkersOverview');
    assert.equal(hooks.useRestartMutation?.(), 'adminUiWorkersRestart');
    assert.equal(endpoints.adminUiWorkersRestart?.type, 'mutation');
    assert.equal(endpoints.adminUiWorkersOverview?.type, 'query');
  });

  it('builds the requests of the trait on the prefix', () => {
    const requests = buildWorkersRequests('/api/admin/workers/');
    assert.deepEqual(requests.overview(), { url: '/api/admin/workers/overview' });
    assert.equal(
      requests.history({ from: '2026-01-31T09:00:00Z', to: '2026-01-31T10:00:00Z', stepSeconds: 60 }).url,
      '/api/admin/workers/history?from=2026-01-31T09%3A00%3A00Z&to=2026-01-31T10%3A00%3A00Z&stepSeconds=60'
    );
    assert.equal(requests.transportDetail({ transport: 'a b/c', stepSeconds: 300 }).url, '/api/admin/workers/transports/a%20b%2Fc?stepSeconds=300');
    assert.equal(
      requests.messageRuns({ transport: 'mail', filters: "outcome ne 'HANDLED'", orderBy: 'startedAt desc', top: 50, skip: 0 }).url,
      "/api/admin/workers/transports/mail/messageRuns?filters=outcome%20ne%20'HANDLED'&orderBy=startedAt%20desc&top=50&skip=0"
    );
    assert.equal(requests.processes({ transport: 'mail' }).url, '/api/admin/workers/transports/mail/processes');
    assert.deepEqual(requests.restart({}), { url: '/api/admin/workers/restart', method: 'POST', body: {} });
    assert.deepEqual(requests.restart({ transport: 'mail' }).body, { transport: 'mail' });
  });

  it('lets the restart invalidate the live reads, the history and the runs', () => {
    const { api, endpoints } = recordingBaseApi();
    createWorkersApi({ baseApi: api, apiPrefix: '/w' });
    const invalidated = endpoints.adminUiWorkersRestart?.invalidatesTags ?? [];
    const refetched = (name: string) => (endpoints[name]?.providesTags ?? []).some(tag => invalidated.some(other => tagMatches(tag, other)));
    assert.equal(refetched('adminUiWorkersOverview'), true);
    assert.equal(refetched('adminUiWorkerTransportDetail'), true);
    assert.equal(refetched('adminUiWorkerProcesses'), true);
    assert.equal(refetched('adminUiWorkersHistory'), true);
    assert.equal(refetched('adminUiWorkerMessageRuns'), true);
  });

  it('injects once per base api and prefix', () => {
    const recorder = recordingBaseApi();
    const first = createWorkersApi({ baseApi: recorder.api, apiPrefix: '/w' });
    assert.equal(createWorkersApi({ baseApi: recorder.api, apiPrefix: '/w/' }), first);
    assert.equal(recorder.injections(), 1);
    assert.notEqual(createWorkersApi({ baseApi: recorder.api, apiPrefix: '/other' }), first);
    assert.equal(recorder.injections(), 2);
  });

  it('fails clearly on an api without the React hooks module', () => {
    const api = { reducerPath: 'api', enhanceEndpoints: () => ({ injectEndpoints: () => ({}) }), injectEndpoints: () => ({}) };
    assert.throws(() => createWorkersApi({ baseApi: api, apiPrefix: '/nohooks' }), /useAdminUiWorkersOverviewQuery/);
  });

  it('runs on the real RTK Query: requests, and a restart refetches the overview', { skip: loadRtkQuery() === null }, async () => {
    const rtk = loadRtkQuery();
    if (!rtk) return;
    const requests: string[] = [];
    const baseApi = rtk.createApi({
      reducerPath: 'adminApi',
      keepUnusedDataFor: 0,
      baseQuery: async (request: { url: string; method?: string; body?: unknown }) => {
        requests.push(`${request.method ?? 'GET'} ${request.url}${request.body ? ` ${JSON.stringify(request.body)}` : ''}`);
        if (request.url.endsWith('/restart')) return { data: { requestedProcessCount: 0, workerProcesses: { elements: [] } } };
        return { data: { workersOverview: {}, workersHistory: {} } };
      },
      endpoints: () => ({}),
    });
    // the core module has no hooks: map the endpoint names onto stand-ins so the entry finds them
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
              injected[`use${name.charAt(0).toUpperCase()}${name.slice(1)}${name === 'adminUiWorkersRestart' ? 'Mutation' : 'Query'}`] = () => name;
            }
            return injected;
          },
        };
      },
    };
    createWorkersApi({ baseApi: withHooks, apiPrefix: '/api/admin/workers' });
    const store = rtk.configureStore({ reducer: { adminApi: baseApi.reducer }, middleware: (getDefault: () => any[]) => getDefault().concat(baseApi.middleware) });
    const overview = store.dispatch(baseApi.endpoints.adminUiWorkersOverview.initiate(undefined));
    const history = store.dispatch(baseApi.endpoints.adminUiWorkersHistory.initiate({ stepSeconds: 60 }));
    await overview;
    await history;
    await store.dispatch(baseApi.endpoints.adminUiWorkersRestart.initiate({ transport: 'mail' }));
    await new Promise(resolve => setTimeout(resolve, 20));
    overview.unsubscribe();
    history.unsubscribe();
    store.dispatch(baseApi.util.resetApiState());
    assert.deepEqual(requests, [
      'GET /api/admin/workers/overview',
      'GET /api/admin/workers/history?stepSeconds=60',
      'POST /api/admin/workers/restart {"transport":"mail"}',
      'GET /api/admin/workers/overview',
      'GET /api/admin/workers/history?stepSeconds=60',
    ]);
  });
});

describe('workers helpers', () => {
  it('keeps a missing reading as a gap, never a zero', () => {
    const rows = zipSeries({
      waiting: [
        { x: '2026-01-31T10:00:00Z', y: 3 },
        { x: '2026-01-31T10:01:00Z', y: null },
      ],
      handled: [{ x: '2026-01-31T10:01:00Z', y: 0 }],
    });
    assert.deepEqual(rows, [
      { ms: Date.UTC(2026, 0, 31, 10, 0), waiting: 3 },
      { ms: Date.UTC(2026, 0, 31, 10, 1), waiting: null, handled: 0 },
    ]);
  });

  it('folds the transports beyond seven into Other and keeps the busiest first', () => {
    const histories = Array.from({ length: 9 }, (_, index) => ({
      transport: `t${index}`,
      sequences: { elements: [{ name: 'processes', elements: [{ x: '2026-01-31T10:00:00Z', y: index + 1 }] }] },
    }));
    const ranked = rankTransports(histories, count => `Other (${count})`);
    assert.equal(ranked.length, 8);
    assert.equal(ranked[0]?.label, 't8');
    assert.equal(ranked[7]?.label, 'Other (2)');
    assert.equal(ranked[7]?.processes[0]?.y, 3);
  });

  it('computes rates per worker and the time to drain', () => {
    const windows = { elements: [{ windowSeconds: 300, handledCount: 10, failedCount: 1, workerSeconds: 600 }] };
    const last5 = throughputWindowOf(windows, 300);
    assert.equal(perWorkerMinute(last5), 1);
    assert.equal(drainMs(20, last5), 600_000);
    assert.equal(drainMs(20, throughputWindowOf(windows, 900)), null);
    assert.equal(perWorkerMinute(throughputWindowOf(windows, 900)), null);
  });

  it('names an uncounted queue instead of a zero', () => {
    assert.equal(waitingStateLabel('QUEUE_NOT_SET_UP'), 'Queue not set up');
    assert.equal(waitingStateLabel(null), 'Not counted');
  });

  it('resolves window presets to the steps the backend accepts', () => {
    assert.equal(toWorkersWindowPreset('7d'), '7d');
    assert.equal(toWorkersWindowPreset('2y'), '6h');
    const window = resolveWorkersWindow('1h', Date.UTC(2026, 0, 31, 10, 0));
    assert.deepEqual(window, { from: '2026-01-31T09:00:00Z', to: '2026-01-31T10:00:00Z', stepSeconds: 60, windowMs: 3_600_000 });
    assert.equal(resolveWorkersWindow('14d', 0).stepSeconds, 3600);
  });
});
