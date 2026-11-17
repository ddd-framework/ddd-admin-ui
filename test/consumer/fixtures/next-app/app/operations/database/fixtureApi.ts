'use client';

// The ./database screen on the real RTK Query: a host api (`createApi` with the React hooks module) whose base query
// keeps the showcase's sample diff in memory and records every request on `window.__operationsRequests`. Normal mode:
// an apply removes the applied tables (and checks the signatures); `Accounts` answers a signature mismatch (and its
// diff changes), `AuditEntries` a busy apply lock. Forbidden mode: the applies and the tables SQL answer 403, as on a
// process with APP_SCHEMA_WRITES_DISABLED.
import { configureStore } from '@reduxjs/toolkit';
import { type BaseQueryFn, createApi } from '@reduxjs/toolkit/query/react';
import { createDatabaseApi, type DBTableDiff } from '@mgamadeus/ddd-admin-ui/database';
import { showcaseDatabaseData } from '@mgamadeus/ddd-admin-ui/showcase';

declare global {
  interface Window {
    __operationsRequests?: string[];
  }
}

interface FixtureRequest {
  url: string;
  method?: string;
  body?: unknown;
  responseHandler?: string;
}
type FixtureError = { status: number; data: unknown };

const PREFIX = '/api/admin/common/databaseModels';
const FORBIDDEN_MESSAGE = "Schema writes are disabled on this process: it shares another stage's database. Apply schema changes through the process that owns the database.";
const initialDiffs = (): DBTableDiff[] =>
  structuredClone(showcaseDatabaseData.diff && 'diffs' in showcaseDatabaseData.diff ? (showcaseDatabaseData.diff.diffs.elements ?? []) : []);

const createFixtureBaseQuery = (forbidden: boolean): BaseQueryFn<FixtureRequest, unknown, FixtureError> => {
  let diffs = initialDiffs();
  const refuse = (status: number, error: string) => ({ error: { status, data: { error } } });
  const signatureOf = (table: string) => diffs.find(diff => diff.sqlTableName === table)?.diffSignature;
  return async request => {
    if (typeof window !== 'undefined') {
      window.__operationsRequests = [
        ...(window.__operationsRequests ?? []),
        `${request.method ?? 'GET'} ${request.url}${request.body ? ` ${JSON.stringify(request.body)}` : ''}${request.responseHandler ? ` (${request.responseHandler})` : ''}`,
      ];
    }
    await new Promise(resolve => setTimeout(resolve, 20));
    const url = new URL(request.url, 'http://fixture');
    const path = url.pathname.slice(PREFIX.length);
    if (path === '/diff') return { data: { diffs: { elements: diffs } } };
    if (path === '/generateDatabaseTables') return forbidden ? refuse(403, FORBIDDEN_MESSAGE) : { data: showcaseDatabaseData.databaseTablesSql };
    if (path === '/generateDoctrineModels') return { data: showcaseDatabaseData.doctrineModelsCode };
    if (path === '/generateForEntity') {
      const entityName = url.searchParams.get('entityName') ?? '';
      if (entityName === 'Ambiguous') return refuse(400, 'The entity name `Ambiguous` is ambiguous; pass the fully qualified class name.');
      return { data: showcaseDatabaseData.doctrineModelForEntity?.({ entityName }) };
    }
    if (path === '/applyDiff' && request.method === 'POST') {
      if (forbidden) return refuse(403, FORBIDDEN_MESSAGE);
      const { sqlTableName, expectedDiffSignature } = request.body as { sqlTableName: string; expectedDiffSignature: string | null };
      if (sqlTableName === 'AuditEntries') return refuse(400, '[DIFF_APPLY_LOCK_BUSY] Another schema apply holds the lock. Retry in a few seconds.');
      if (sqlTableName === 'Accounts') {
        diffs = diffs.map(diff => (diff.sqlTableName === 'Accounts' ? { ...diff, diffSignature: 'changed-elsewhere' } : diff));
      }
      if (signatureOf(sqlTableName) !== expectedDiffSignature) {
        return refuse(400, `[DIFF_SIGNATURE_MISMATCH] The diff of table \`${sqlTableName}\` changed since it was computed. Refresh the diff.`);
      }
      diffs = diffs.filter(diff => diff.sqlTableName !== sqlTableName);
      return { data: { diffs: { elements: diffs } } };
    }
    if (path === '/applyDiffs' && request.method === 'POST') {
      if (forbidden) return refuse(403, FORBIDDEN_MESSAGE);
      const { sqlTableNames, expectedDiffSignatures } = request.body as {
        sqlTableNames: string[] | null;
        expectedDiffSignatures: { elements: { sqlTableName: string; signature: string }[] } | null;
      };
      if (Array.isArray(sqlTableNames) && sqlTableNames.length === 0) return refuse(400, '`sqlTableNames` must be null (apply every diff) or name at least one table.');
      const names = sqlTableNames ?? diffs.map(diff => diff.sqlTableName ?? '');
      for (const name of names) {
        const sent = expectedDiffSignatures?.elements.find(entry => entry.sqlTableName === name)?.signature;
        if (sent !== signatureOf(name)) return refuse(400, `[DIFF_SIGNATURE_MISMATCH] The diff of \`${name}\` changed. Refresh the diff and submit again.`);
      }
      diffs = diffs.filter(diff => !names.includes(diff.sqlTableName ?? ''));
      return { data: { diffs: { elements: diffs } } };
    }
    return refuse(404, 'Not found');
  };
};

const createFixture = (reducerPath: string, forbidden: boolean) => {
  const baseApi = createApi({ reducerPath, baseQuery: createFixtureBaseQuery(forbidden), endpoints: () => ({}) });
  // module scope, as a host does it: the host api's own type goes in, no cast
  const databaseApi = createDatabaseApi({ baseApi, apiPrefix: PREFIX });
  const makeStore = () =>
    configureStore({
      reducer: { [baseApi.reducerPath]: baseApi.reducer },
      middleware: getDefaultMiddleware => getDefaultMiddleware().concat(baseApi.middleware),
    });
  return { databaseApi, makeStore };
};

export const databaseFixture = createFixture('databaseFixtureApi', false);
export const forbiddenDatabaseFixture = createFixture('databaseForbiddenFixtureApi', true);
