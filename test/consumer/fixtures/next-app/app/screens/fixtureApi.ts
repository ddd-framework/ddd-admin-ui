'use client';

// The screens on the real RTK Query: a host api (`createApi` with the React hooks module) whose base query answers
// from the showcase's sample payloads in memory and records every request on `window.__screenRequests`, and the two
// injected apis. A locale write is kept, so the refetch after the isActive toggle shows it.
import { configureStore } from '@reduxjs/toolkit';
import { type BaseQueryFn, createApi } from '@reduxjs/toolkit/query/react';
import type { AdminLocale } from '@mgamadeus/ddd-admin-ui/translations';
import { createTranslationsApi } from '@mgamadeus/ddd-admin-ui/translations';
import { showcaseTranslationsData, showcaseWorkersData } from '@mgamadeus/ddd-admin-ui/showcase';
import { createWorkersApi } from '@mgamadeus/ddd-admin-ui/workers';

declare global {
  interface Window {
    __screenRequests?: string[];
  }
}

interface FixtureRequest {
  url: string;
  method?: string;
  body?: unknown;
}

const localeChanges = new Map<string, AdminLocale>();

const answer = (request: FixtureRequest): unknown => {
  const url = new URL(request.url, 'http://fixture');
  const query = Object.fromEntries(url.searchParams.entries());
  const path = url.pathname;
  const workers = '/api/admin/workers';
  if (path === `${workers}/overview`) return showcaseWorkersData.overview;
  if (path === `${workers}/history`) return showcaseWorkersData.history?.({ ...query, stepSeconds: Number(query.stepSeconds) });
  if (path === `${workers}/restart`) return showcaseWorkersData.restart?.((request.body ?? {}) as { transport?: string });
  const transportMatch = /^\/api\/admin\/workers\/transports\/([^/]+)(\/messageRuns|\/processes)?$/.exec(path);
  if (transportMatch) {
    const transport = decodeURIComponent(transportMatch[1] ?? '');
    if (transportMatch[2] === '/messageRuns') return showcaseWorkersData.messageRuns?.({ transport, ...query });
    if (transportMatch[2] === '/processes') return showcaseWorkersData.processes?.({ transport, ...query });
    return showcaseWorkersData.transportDetail?.({ transport, ...query, stepSeconds: Number(query.stepSeconds) });
  }
  const common = '/api/admin/common';
  if (path === `${common}/app-translations/keys/list`) return showcaseTranslationsData.appTranslationKeys?.(query);
  if (path === `${common}/app-translations/keys/completeness`) return showcaseTranslationsData.completeness;
  const keyMatch = /\/app-translations\/keys\/(\d+)$/.exec(path);
  if (keyMatch) return showcaseTranslationsData.appTranslationKey?.({ appTranslationKeyId: keyMatch[1] ?? '' });
  if (path === `${common}/languages/list`) return showcaseTranslationsData.languages?.(query);
  if (path === `${common}/locales/list` || path === `${common}/locales/importFromConfig`) {
    const response = showcaseTranslationsData.locales?.(query);
    return { locales: { elements: (response?.locales.elements ?? []).map(locale => localeChanges.get(String(locale.id)) ?? locale) } };
  }
  if (path === `${common}/locales` && request.method === 'PATCH') {
    const { locale } = request.body as { locale: AdminLocale };
    localeChanges.set(String(locale.id), locale);
    return { locale };
  }
  return {};
};

const fixtureBaseQuery: BaseQueryFn<FixtureRequest, unknown, { status: number; data: unknown }> = async request => {
  window.__screenRequests = [...(window.__screenRequests ?? []), `${request.method ?? 'GET'} ${request.url}${request.body ? ` ${JSON.stringify(request.body)}` : ''}`];
  await new Promise(resolve => setTimeout(resolve, 20));
  const data = answer(request);
  return data === undefined ? { error: { status: 404, data: { error: 'Not found' } } } : { data };
};

export const adminApi = createApi({ reducerPath: 'adminApi', baseQuery: fixtureBaseQuery, endpoints: () => ({}) });

// module scope, as a host does it: the host api's own type goes in, no cast
export const workersApi = createWorkersApi({ baseApi: adminApi, apiPrefix: '/api/admin/workers' });
export const translationsApi = createTranslationsApi({ baseApi: adminApi, apiPrefix: '/api/admin/common' });

export const makeStore = () =>
  configureStore({
    reducer: { [adminApi.reducerPath]: adminApi.reducer },
    middleware: getDefaultMiddleware => getDefaultMiddleware().concat(adminApi.middleware),
  });
