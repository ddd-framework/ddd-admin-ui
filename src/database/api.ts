import {
  type ApiMutationHook,
  type ApiQueryHook,
  type InjectableBaseApi,
  type InjectedEndpointDefinition,
  type InjectedRequest,
  injectEndpointsOnce,
  type StaticQueryFailure,
  staticMutationHook,
  staticQueryHook,
  toQueryString,
  trimApiPrefix,
} from '../logic/pure/injectedApi.ts';
import type { ApplyDiffArg, ApplyDiffsArg, DBTableDiffsResponse, DoctrineModelForEntityArg } from './types.ts';

/** The cache tag type of the database operations (ids `DIFF`, `CODE`). */
export const DATABASE_TAG = 'AdminUiDatabase';

/** The hooks `createDatabaseApi` returns; every database screen takes them as its `api`. */
export interface DatabaseApi {
  /** `GET /diff`: the pending differences between the entity-derived schema and the live database, one per table. */
  useSchemaDiffQuery: ApiQueryHook<void, DBTableDiffsResponse>;
  /** `POST /applyDiff`: applies one table's diff; answers the diff computed afterwards. */
  useApplyDiffMutation: ApiMutationHook<ApplyDiffArg, DBTableDiffsResponse>;
  /** `POST /applyDiffs`: applies every pending diff or the listed tables; answers the diff computed afterwards. */
  useApplyDiffsMutation: ApiMutationHook<ApplyDiffsArg, DBTableDiffsResponse>;
  /** `GET /generateDatabaseTables` (text/plain): the SQL of every table; 403 while schema writes are disabled. */
  useDatabaseTablesSqlQuery: ApiQueryHook<void, string>;
  /** `GET /generateDoctrineModels` (text/plain): the model code of every database entity. */
  useDoctrineModelsCodeQuery: ApiQueryHook<void, string>;
  /** `GET /generateForEntity?entityName=` (text/plain): one entity's model code (400 ambiguous, 404 unknown). */
  useDoctrineModelForEntityQuery: ApiQueryHook<DoctrineModelForEntityArg, string>;
}

export interface CreateDatabaseApiOptions {
  /** The host's RTK Query api (`createApi` with the React hooks module). */
  baseApi: InjectableBaseApi;
  /** Where the host mounts `DatabaseModelsControllerTrait`, without a trailing slash (`/api/admin/common/databaseModels`). */
  apiPrefix: string;
}

/** The request of every operation, on `apiPrefix`. Pure: no RTK runtime. */
export const buildDatabaseRequests = (apiPrefix: string) => {
  const prefix = trimApiPrefix(apiPrefix);
  return {
    schemaDiff: (): InjectedRequest => ({ url: `${prefix}/diff` }),
    applyDiff: ({ sqlTableName, expectedDiffSignature, disableForeignKeyChecks = true }: ApplyDiffArg): InjectedRequest => ({
      url: `${prefix}/applyDiff`,
      method: 'POST',
      body: { sqlTableName, expectedDiffSignature: expectedDiffSignature ?? null, disableForeignKeyChecks },
    }),
    applyDiffs: ({ sqlTableNames, expectedDiffSignatures, disableForeignKeyChecks = true }: ApplyDiffsArg): InjectedRequest => ({
      url: `${prefix}/applyDiffs`,
      method: 'POST',
      body: {
        sqlTableNames: sqlTableNames === null ? null : [...sqlTableNames],
        expectedDiffSignatures: expectedDiffSignatures ?? null,
        disableForeignKeyChecks,
      },
    }),
    databaseTablesSql: (): InjectedRequest => ({ url: `${prefix}/generateDatabaseTables`, responseHandler: 'text' }),
    doctrineModelsCode: (): InjectedRequest => ({ url: `${prefix}/generateDoctrineModels`, responseHandler: 'text' }),
    doctrineModelForEntity: ({ entityName }: DoctrineModelForEntityArg): InjectedRequest => ({
      url: `${prefix}/generateForEntity${toQueryString({ entityName })}`,
      responseHandler: 'text',
    }),
  };
};

const DIFF = { type: DATABASE_TAG, id: 'DIFF' } as const;
const CODE = { type: DATABASE_TAG, id: 'CODE' } as const;

/**
 * The operations as injected (endpoint name → definition). Cache: the diff provides `DIFF`, the generated code `CODE`.
 * The applies invalidate nothing: they answer the diff computed afterwards, and the screen shows that answer (no
 * second request).
 */
export const databaseEndpointDefinitions = (apiPrefix: string) => {
  const requests = buildDatabaseRequests(apiPrefix);
  return {
    adminUiDatabaseSchemaDiff: { kind: 'query', request: requests.schemaDiff, providesTags: [DIFF] },
    adminUiDatabaseApplyDiff: { kind: 'mutation', request: requests.applyDiff },
    adminUiDatabaseApplyDiffs: { kind: 'mutation', request: requests.applyDiffs },
    adminUiDatabaseTablesSql: { kind: 'query', request: requests.databaseTablesSql, providesTags: [CODE] },
    adminUiDatabaseDoctrineModelsCode: { kind: 'query', request: requests.doctrineModelsCode, providesTags: [CODE] },
    adminUiDatabaseDoctrineModelForEntity: { kind: 'query', request: requests.doctrineModelForEntity, providesTags: [CODE] },
  } as const satisfies Record<string, InjectedEndpointDefinition<never>>;
};

/**
 * Injects the database operations into the host's RTK Query api and returns their hooks. Call it once at module scope;
 * a second call with the same api and prefix returns the first result.
 *
 * ```ts
 * export const databaseApi = createDatabaseApi({ baseApi: adminApi, apiPrefix: '/api/admin/common/databaseModels' });
 * ```
 */
export const createDatabaseApi = ({ baseApi, apiPrefix }: CreateDatabaseApiOptions): DatabaseApi =>
  injectEndpointsOnce(baseApi, `database:${trimApiPrefix(apiPrefix)}`, [DATABASE_TAG], databaseEndpointDefinitions(apiPrefix), hookOf => ({
    useSchemaDiffQuery: hookOf('adminUiDatabaseSchemaDiff') as DatabaseApi['useSchemaDiffQuery'],
    useApplyDiffMutation: hookOf('adminUiDatabaseApplyDiff') as DatabaseApi['useApplyDiffMutation'],
    useApplyDiffsMutation: hookOf('adminUiDatabaseApplyDiffs') as DatabaseApi['useApplyDiffsMutation'],
    useDatabaseTablesSqlQuery: hookOf('adminUiDatabaseTablesSql') as DatabaseApi['useDatabaseTablesSqlQuery'],
    useDoctrineModelsCodeQuery: hookOf('adminUiDatabaseDoctrineModelsCode') as DatabaseApi['useDoctrineModelsCodeQuery'],
    useDoctrineModelForEntityQuery: hookOf('adminUiDatabaseDoctrineModelForEntity') as DatabaseApi['useDoctrineModelForEntityQuery'],
  }));

/**
 * Fixed answers of a `createStaticDatabaseApi`; an operation without one stays loading. A query answer may be
 * `staticQueryFailure(error)` (`./logic`), a mutation answer may throw (rejects like a failed request).
 */
export interface StaticDatabaseData {
  diff?: DBTableDiffsResponse | StaticQueryFailure;
  applyDiff?: (arg: ApplyDiffArg) => DBTableDiffsResponse | Promise<DBTableDiffsResponse>;
  applyDiffs?: (arg: ApplyDiffsArg) => DBTableDiffsResponse | Promise<DBTableDiffsResponse>;
  databaseTablesSql?: string | StaticQueryFailure;
  doctrineModelsCode?: string | StaticQueryFailure;
  doctrineModelForEntity?: (arg: DoctrineModelForEntityArg) => string | StaticQueryFailure | undefined;
}

const EMPTY_DIFFS: DBTableDiffsResponse = { diffs: { elements: [] } };

/** A `DatabaseApi` answering fixed payloads, without a store or a request: for showcases, tests and design reviews. */
export const createStaticDatabaseApi = (data: StaticDatabaseData): DatabaseApi => ({
  useSchemaDiffQuery: staticQueryHook(() => data.diff),
  useApplyDiffMutation: staticMutationHook(arg => (data.applyDiff ? data.applyDiff(arg) : EMPTY_DIFFS)),
  useApplyDiffsMutation: staticMutationHook(arg => (data.applyDiffs ? data.applyDiffs(arg) : EMPTY_DIFFS)),
  useDatabaseTablesSqlQuery: staticQueryHook(() => data.databaseTablesSql),
  useDoctrineModelsCodeQuery: staticQueryHook(() => data.doctrineModelsCode),
  useDoctrineModelForEntityQuery: staticQueryHook(arg => data.doctrineModelForEntity?.(arg)),
});
