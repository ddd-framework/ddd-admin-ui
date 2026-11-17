'use client';

// The ./crons screen on the real RTK Query: a host api of its own (`createApi` with the React hooks module) whose base
// query answers from the showcase's sample payloads in memory, keeps every write (so the refetches show it), answers
// a duplicate name with a 400 naming the field and a Run now of `cleanup-sessions` with a 409 (the runner started it
// meanwhile), and records every request on `window.__operationsRequests`.
import { configureStore } from '@reduxjs/toolkit';
import { type BaseQueryFn, createApi } from '@reduxjs/toolkit/query/react';
import type { CronOverview, CronsListResponse } from '@mgamadeus/ddd-admin-ui/crons';
import { createCronsApi } from '@mgamadeus/ddd-admin-ui/crons';
import { showcaseCronsData } from '@mgamadeus/ddd-admin-ui/showcase';

declare global {
  interface Window {
    __operationsRequests?: string[];
  }
}

interface FixtureRequest {
  url: string;
  method?: string;
  body?: unknown;
}

type Reply = { data: unknown } | { error: { status: number; data: unknown } };

const PREFIX = '/api/admin/common/crons';
const initial = showcaseCronsData.list as CronsListResponse;
let crons: CronOverview[] = (initial.crons.elements ?? []).map(cron => ({ ...cron }));
let nextId = 100;

const replaceCron = (cron: CronOverview) => {
  crons = crons.map(candidate => (candidate.id === cron.id ? cron : candidate));
  return { data: { cron } };
};
const failure = (status: number, error: string, validationErrors?: unknown): Reply => ({ error: { status, data: { error, ...(validationErrors ? { validationErrors } : {}) } } });
const unwrap = (value: unknown): Reply =>
  value && typeof value === 'object' && Symbol.for('ddd-admin-ui.staticQueryFailure') in value
    ? { error: (value as { error: { status: number; data: unknown } }).error }
    : value === undefined
      ? failure(404, 'Not found')
      : { data: value };

const answer = (request: FixtureRequest): Reply => {
  const url = new URL(request.url, 'http://fixture');
  const query = Object.fromEntries(url.searchParams.entries());
  const path = url.pathname;
  const method = request.method ?? 'GET';
  if (path === `${PREFIX}/list`) return { data: { crons: { elements: crons }, runner: initial.runner } };
  if (path === `${PREFIX}/executions/list`) {
    return unwrap(
      showcaseCronsData.executions?.({
        cronId: query.cronId ? Number(query.cronId) : undefined,
        result: (query.result as 'ALL' | undefined) ?? 'ALL',
        limit: query.limit ? Number(query.limit) : undefined,
        offset: query.offset ? Number(query.offset) : undefined,
      })
    );
  }
  const executionMatch = /\/executions\/(\d+)$/.exec(path);
  if (executionMatch) return unwrap(showcaseCronsData.execution?.({ executionId: Number(executionMatch[1]) }));
  if (path === `${PREFIX}/timeline`) return unwrap(showcaseCronsData.timeline?.({ hours: Number(query.hours ?? 24) }));
  if (path === `${PREFIX}/commands`) return { data: showcaseCronsData.commands };
  if (path === `${PREFIX}/schedule-preview`) return unwrap(showcaseCronsData.schedulePreview?.({ schedule: query.schedule ?? '' }));
  if (path === PREFIX && method === 'POST') {
    const body = request.body as { name: string; description: string; schedule: string; commandName: string; arguments?: string | null; isActive?: boolean };
    if (crons.some(cron => cron.name === body.name)) {
      return failure(400, 'Validation failed', {
        elements: [{ jsonPath: '.', elements: [{ propertyName: 'name', errorMessage: 'This name is already used by another Cron.' }] }],
      });
    }
    const cron: CronOverview = {
      id: nextId++,
      name: body.name,
      description: body.description,
      schedule: body.schedule,
      commandName: body.commandName,
      command: [body.commandName, body.arguments].filter(Boolean).join(' '),
      arguments: body.arguments ?? null,
      isActive: body.isActive ?? true,
      status: 'OK',
      recentExecutions: { elements: [] },
      stats24h: { runCount: 0, failureCount: 0, successRate: null },
    };
    crons = [...crons, cron].sort((left, right) => left.name.localeCompare(right.name));
    return { data: { cron } };
  }
  const cronMatch = /^\/api\/admin\/common\/crons\/(\d+)(\/activate|\/deactivate|\/run-now)?$/.exec(path);
  if (cronMatch) {
    const cron = crons.find(candidate => candidate.id === Number(cronMatch[1]));
    if (!cron) return failure(404, `No Cron ${cronMatch[1]}`);
    const action = cronMatch[2];
    if (action === '/activate') return replaceCron({ ...cron, isActive: true, status: cron.status === 'PAUSED' ? 'OK' : cron.status });
    if (action === '/deactivate') return replaceCron({ ...cron, isActive: false, status: cron.status === 'MISSING_COMMAND' ? cron.status : 'PAUSED' });
    if (action === '/run-now') {
      if (cron.name === 'cleanup-sessions') return failure(409, 'The Cron cleanup-sessions started meanwhile: it is running.');
      return replaceCron({ ...cron, nextExecutionScheduledAt: initial.runner.serverNow });
    }
    if (method === 'PATCH') {
      const changes = request.body as Partial<CronOverview>;
      return replaceCron({ ...cron, ...changes, command: [changes.commandName ?? cron.commandName, changes.arguments ?? cron.arguments].filter(Boolean).join(' ') });
    }
    if (method === 'DELETE') {
      crons = crons.filter(candidate => candidate.id !== cron.id);
      return { data: { deletedCronId: cron.id } };
    }
    const detail = showcaseCronsData.detail?.({ cronId: cron.id });
    return detail && 'cron' in detail ? { data: { ...detail, cron } } : unwrap(detail);
  }
  return failure(404, 'Not found');
};

const fixtureBaseQuery: BaseQueryFn<FixtureRequest, unknown, { status: number; data: unknown }> = async request => {
  window.__operationsRequests = [
    ...(window.__operationsRequests ?? []),
    `${request.method ?? 'GET'} ${request.url}${request.body ? ` ${JSON.stringify(request.body)}` : ''}`,
  ];
  await new Promise(resolve => setTimeout(resolve, 20));
  return answer(request);
};

export const cronsFixtureApi = createApi({ reducerPath: 'cronsFixtureApi', baseQuery: fixtureBaseQuery, endpoints: () => ({}) });

// module scope, as a host does it
export const cronsApi = createCronsApi({ baseApi: cronsFixtureApi, apiPrefix: PREFIX });

export const makeCronsStore = () =>
  configureStore({
    reducer: { [cronsFixtureApi.reducerPath]: cronsFixtureApi.reducer },
    middleware: getDefaultMiddleware => getDefaultMiddleware().concat(cronsFixtureApi.middleware),
  });
