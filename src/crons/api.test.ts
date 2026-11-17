import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadRtkQuery, recordingBaseApi, tagMatches } from '../../test/unit/injectedApiHarness.ts';
import { buildCronsRequests, createCronsApi, createStaticCronsApi, CRONS_TAG } from './api.ts';

const ENDPOINTS = [
  'adminUiCron',
  'adminUiCronActivate',
  'adminUiCronCommands',
  'adminUiCronCreate',
  'adminUiCronDeactivate',
  'adminUiCronDelete',
  'adminUiCronExecution',
  'adminUiCronExecutions',
  'adminUiCronRunNow',
  'adminUiCronSchedulePreview',
  'adminUiCronUpdate',
  'adminUiCronsList',
  'adminUiCronsTimeline',
];

describe('createCronsApi', () => {
  it('injects thirteen operations under one tag type and returns their hooks', () => {
    const { api, endpoints, tagTypes } = recordingBaseApi();
    const cronsApi = createCronsApi({ baseApi: api, apiPrefix: '/api/admin/common/crons/' });
    assert.deepEqual(tagTypes, [CRONS_TAG]);
    assert.deepEqual(Object.keys(endpoints).sort(), ENDPOINTS);
    const hooks = cronsApi as unknown as Record<string, () => string>;
    assert.equal(hooks.useCronsListQuery?.(), 'adminUiCronsList');
    assert.equal(hooks.useRunCronNowMutation?.(), 'adminUiCronRunNow');
    assert.equal(endpoints.adminUiCronCreate?.type, 'mutation');
    assert.equal(endpoints.adminUiCronSchedulePreview?.type, 'query');
  });

  it('builds the requests of the trait on the prefix', () => {
    const requests = buildCronsRequests('/api/admin/common/crons/');
    assert.deepEqual(requests.list(), { url: '/api/admin/common/crons/list' });
    assert.equal(
      requests.executions({ cronId: 3, result: 'FAILED', limit: 50, offset: 100 }).url,
      '/api/admin/common/crons/executions/list?cronId=3&result=FAILED&limit=50&offset=100'
    );
    assert.equal(requests.executions({}).url, '/api/admin/common/crons/executions/list');
    assert.equal(requests.execution({ executionId: 42 }).url, '/api/admin/common/crons/executions/42');
    assert.equal(requests.timeline({ hours: 72 }).url, '/api/admin/common/crons/timeline?hours=72');
    assert.equal(requests.commands().url, '/api/admin/common/crons/commands');
    assert.equal(requests.schedulePreview({ schedule: '*/5 * * * *' }).url, '/api/admin/common/crons/schedule-preview?schedule=*%2F5%20*%20*%20*%20*');
    assert.equal(requests.detail({ cronId: 7 }).url, '/api/admin/common/crons/7');
    const body = { name: 'send-reminders', description: 'Sends the reminders of the day', schedule: '0 6 * * *', commandName: 'app:reminders:send', arguments: null, isActive: true };
    // create posts to the prefix itself (the trait's `#[Post('')]`)
    assert.deepEqual(requests.create(body), { url: '/api/admin/common/crons', method: 'POST', body });
    // an update sends only the fields it got
    assert.deepEqual(requests.update({ cronId: 7, schedule: '0 7 * * *' }), { url: '/api/admin/common/crons/7', method: 'PATCH', body: { schedule: '0 7 * * *' } });
    assert.deepEqual(requests.update({ cronId: 7, arguments: '' }).body, { arguments: '' });
    assert.deepEqual(requests.remove({ cronId: 7 }), { url: '/api/admin/common/crons/7', method: 'DELETE' });
    assert.deepEqual(requests.activate({ cronId: 7 }), { url: '/api/admin/common/crons/7/activate', method: 'POST' });
    assert.deepEqual(requests.deactivate({ cronId: 7 }), { url: '/api/admin/common/crons/7/deactivate', method: 'POST' });
    assert.deepEqual(requests.runNow({ cronId: 7 }), { url: '/api/admin/common/crons/7/run-now', method: 'POST' });
  });

  it('lets every write refetch the list and the details; delete also the runs; the preview is never cached by tag', () => {
    const { api, endpoints } = recordingBaseApi();
    createCronsApi({ baseApi: api, apiPrefix: '/c' });
    const refetches = (mutation: string, query: string) =>
      (endpoints[query]?.providesTags ?? []).some(tag => (endpoints[mutation]?.invalidatesTags ?? []).some(other => tagMatches(tag, other)));
    for (const mutation of ['adminUiCronCreate', 'adminUiCronUpdate', 'adminUiCronDelete', 'adminUiCronActivate', 'adminUiCronDeactivate', 'adminUiCronRunNow']) {
      assert.equal(refetches(mutation, 'adminUiCronsList'), true, mutation);
      assert.equal(refetches(mutation, 'adminUiCron'), true, mutation);
    }
    assert.equal(refetches('adminUiCronDelete', 'adminUiCronExecutions'), true);
    assert.equal(refetches('adminUiCronRunNow', 'adminUiCronExecutions'), false);
    assert.equal(refetches('adminUiCronCreate', 'adminUiCronCommands'), true);
    assert.equal(refetches('adminUiCronActivate', 'adminUiCronCommands'), false);
    assert.deepEqual(endpoints.adminUiCronSchedulePreview?.providesTags, []);
  });

  it('injects once per base api and prefix', () => {
    const recorder = recordingBaseApi();
    const first = createCronsApi({ baseApi: recorder.api, apiPrefix: '/c' });
    assert.equal(createCronsApi({ baseApi: recorder.api, apiPrefix: '/c/' }), first);
    assert.equal(recorder.injections(), 1);
    assert.notEqual(createCronsApi({ baseApi: recorder.api, apiPrefix: '/other' }), first);
    assert.equal(recorder.injections(), 2);
  });

  it('answers fixed payloads: a write without an answer returns the listed Cron, a thrown answer rejects', async () => {
    const cron = { id: 4, name: 'cleanup-sessions', schedule: '*/15 * * * *', isActive: true, status: 'OK' };
    const api = createStaticCronsApi({
      list: { crons: { elements: [cron] }, runner: { serverNow: '2026-01-31 10:00:00' } },
      runNow: () => {
        throw { status: 409, data: { error: 'running' } };
      },
    });
    const [activate] = api.useActivateCronMutation();
    assert.deepEqual(await activate({ cronId: 4 }).unwrap(), { cron });
    const [runNow] = api.useRunCronNowMutation();
    await assert.rejects(runNow({ cronId: 4 }).unwrap(), (error: { status: number }) => error.status === 409);
    assert.equal(api.useCronQuery({ cronId: 4 }).isLoading, true);
  });

  it('runs on the real RTK Query: requests, and a run now refetches the list', { skip: loadRtkQuery() === null }, async () => {
    const rtk = loadRtkQuery();
    if (!rtk) return;
    const requests: string[] = [];
    const baseApi = rtk.createApi({
      reducerPath: 'adminApi',
      keepUnusedDataFor: 0,
      baseQuery: async (request: { url: string; method?: string; body?: unknown }) => {
        requests.push(`${request.method ?? 'GET'} ${request.url}${request.body ? ` ${JSON.stringify(request.body)}` : ''}`);
        return { data: { cron: { id: 1 }, crons: { elements: [] }, runner: {} } };
      },
      endpoints: () => ({}),
    });
    const injected: Record<string, unknown> = {};
    const mutations = new Set(['adminUiCronCreate', 'adminUiCronUpdate', 'adminUiCronDelete', 'adminUiCronActivate', 'adminUiCronDeactivate', 'adminUiCronRunNow']);
    const withHooks = {
      ...baseApi,
      reducerPath: baseApi.reducerPath,
      enhanceEndpoints: (options: object) => {
        const enhanced = baseApi.enhanceEndpoints(options);
        return {
          injectEndpoints: (injectOptions: object) => {
            const api = enhanced.injectEndpoints(injectOptions);
            for (const name of Object.keys(api.endpoints)) {
              injected[`use${name.charAt(0).toUpperCase()}${name.slice(1)}${mutations.has(name) ? 'Mutation' : 'Query'}`] = () => name;
            }
            return injected;
          },
        };
      },
    };
    createCronsApi({ baseApi: withHooks, apiPrefix: '/api/admin/common/crons' });
    const store = rtk.configureStore({ reducer: { adminApi: baseApi.reducer }, middleware: (getDefault: () => any[]) => getDefault().concat(baseApi.middleware) });
    const listing = store.dispatch(baseApi.endpoints.adminUiCronsList.initiate(undefined));
    await listing;
    await store.dispatch(baseApi.endpoints.adminUiCronCreate.initiate({ name: 'a-b-c', description: 'Sixteen characters!', schedule: '* * * * *', commandName: 'app:x' }));
    await new Promise(resolve => setTimeout(resolve, 20));
    await store.dispatch(baseApi.endpoints.adminUiCronUpdate.initiate({ cronId: 1, isActive: false }));
    await new Promise(resolve => setTimeout(resolve, 20));
    listing.unsubscribe();
    store.dispatch(baseApi.util.resetApiState());
    assert.deepEqual(requests, [
      'GET /api/admin/common/crons/list',
      'POST /api/admin/common/crons {"name":"a-b-c","description":"Sixteen characters!","schedule":"* * * * *","commandName":"app:x"}',
      'GET /api/admin/common/crons/list',
      'PATCH /api/admin/common/crons/1 {"isActive":false}',
      'GET /api/admin/common/crons/list',
    ]);
  });
});
