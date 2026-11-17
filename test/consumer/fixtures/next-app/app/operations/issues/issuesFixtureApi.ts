'use client';

// The ./issues screen on the real RTK Query: a host api of its own (`createApi` with the React hooks module) whose base
// query answers from the showcase's sample payloads in memory and records every request on
// `window.__operationsRequests`. A status change is kept, so the refetch of the list and the details shows it.
import { configureStore } from '@reduxjs/toolkit';
import { type BaseQueryFn, createApi } from '@reduxjs/toolkit/query/react';
import { createIssuesApi, type IssueGroupSummary } from '@mgamadeus/ddd-admin-ui/issues';
import { showcaseIssuesData } from '@mgamadeus/ddd-admin-ui/showcase';

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

const statusChanges = new Map<string, string>();
const withChange = (group: IssueGroupSummary): IssueGroupSummary => {
  const status = statusChanges.get(`${group.environment}:${group.groupHash}`);
  return status ? { ...group, status, resolvedAt: status === 'RESOLVED' ? '2026-01-31 10:00:00' : null } : group;
};

/** A failed answer of the sample payloads (`staticQueryFailure`) as the base query's error. */
const toReply = (answer: unknown): Reply => {
  if (answer && typeof answer === 'object' && Object.getOwnPropertySymbols(answer).length > 0 && 'error' in answer) {
    return { error: (answer as { error: { status: number; data: unknown } }).error };
  }
  return answer === undefined ? { error: { status: 404, data: { error: 'Not found' } } } : { data: answer };
};

const answer = (request: FixtureRequest): Reply => {
  const url = new URL(request.url, 'http://fixture');
  const query = Object.fromEntries(url.searchParams.entries());
  const path = url.pathname.replace(/^\/api\/admin\/common\/issues/, '');
  if (path === '/groups/list') {
    const list = showcaseIssuesData.groups?.({ ...query, limit: query.limit ? Number(query.limit) : undefined, offset: query.offset ? Number(query.offset) : undefined } as never);
    if (!list || !('groups' in list)) return toReply(list);
    const status = query.status ?? 'OPEN';
    const elements = (list.groups.elements ?? []).map(withChange).filter(group => status === 'ALL' || group.status === status);
    return { data: { ...list, groups: { elements } } };
  }
  if (path === '/trend') return toReply(showcaseIssuesData.trend?.(query));
  const match = /^\/groups\/([^/]+)\/([^/]+)(\/resolve|\/ignore|\/reopen)?$/.exec(path);
  if (match) {
    const environment = decodeURIComponent(match[1] ?? '');
    const groupHash = decodeURIComponent(match[2] ?? '');
    const detail = showcaseIssuesData.detail?.({ environment, groupHash });
    if (!detail || !('group' in detail)) return toReply(detail);
    if (match[3] && request.method === 'POST') {
      statusChanges.set(`${environment}:${groupHash}`, match[3] === '/resolve' ? 'RESOLVED' : match[3] === '/ignore' ? 'IGNORED' : 'OPEN');
      return { data: { group: withChange(detail.group) } };
    }
    return { data: { ...detail, group: withChange(detail.group) } };
  }
  return { error: { status: 404, data: { error: 'Not found' } } };
};

const fixtureBaseQuery: BaseQueryFn<FixtureRequest, unknown, { status: number; data: unknown }> = async request => {
  window.__operationsRequests = [
    ...(window.__operationsRequests ?? []),
    `${request.method ?? 'GET'} ${request.url}${request.body && Object.keys(request.body).length > 0 ? ` ${JSON.stringify(request.body)}` : ''}`,
  ];
  await new Promise(resolve => setTimeout(resolve, 20));
  return answer(request);
};

export const issuesFixtureApi = createApi({ reducerPath: 'issuesFixtureApi', baseQuery: fixtureBaseQuery, endpoints: () => ({}) });

// module scope, as a host does it
export const issuesApi = createIssuesApi({ baseApi: issuesFixtureApi, apiPrefix: '/api/admin/common/issues' });

export const makeIssuesStore = () =>
  configureStore({
    reducer: { [issuesFixtureApi.reducerPath]: issuesFixtureApi.reducer },
    middleware: getDefaultMiddleware => getDefaultMiddleware().concat(issuesFixtureApi.middleware),
  });
