import {
  type ApiMutationHook,
  type ApiQueryHook,
  type InjectableBaseApi,
  type InjectedEndpointDefinition,
  type InjectedRequest,
  hostTagTypes,
  injectEndpointsOnce,
  type InjectedHostTags,
  withHostTags,
  staticMutationHook,
  staticQueryHook,
  toQueryString,
  trimApiPrefix,
} from '../logic/pure/injectedApi.ts';
import type {
  WorkerMessageRunsResponse,
  WorkerProcessesResponse,
  WorkersHistoryResponse,
  WorkersOverviewResponse,
  WorkersRestartArg,
  WorkersRestartResponse,
  WorkersWindowArg,
  WorkerTransportArg,
  WorkerTransportDetailResponse,
  WorkerTransportListArg,
} from './types.ts';

/** The cache tag type of the workers operations (one per api; ids `LIVE`, `HISTORY`, `RUNS`). */
export const WORKERS_TAG = 'AdminUiWorkers';

/** The hooks `createWorkersApi` returns; every workers screen takes them as its `api`. */
export interface WorkersApi {
  /** `GET /overview`: every transport, the totals, the live processes, the loops. */
  useOverviewQuery: ApiQueryHook<void, WorkersOverviewResponse>;
  /** `GET /history?from&to&stepSeconds`: per transport and in total, over a window. */
  useHistoryQuery: ApiQueryHook<WorkersWindowArg, WorkersHistoryResponse>;
  /** `GET /transports/{transport}?from&to&stepSeconds` (404: unknown transport). */
  useTransportDetailQuery: ApiQueryHook<WorkerTransportArg, WorkerTransportDetailResponse>;
  /** `GET /transports/{transport}/messageRuns` (QueryOptions; newest first by default). */
  useMessageRunsQuery: ApiQueryHook<WorkerTransportListArg, WorkerMessageRunsResponse>;
  /** `GET /transports/{transport}/processes` (QueryOptions; newest first by default). */
  useProcessesQuery: ApiQueryHook<WorkerTransportListArg, WorkerProcessesResponse>;
  /** `POST /restart`: asks the live processes (of one transport, or all) to stop after their current message. */
  useRestartMutation: ApiMutationHook<WorkersRestartArg, WorkersRestartResponse>;
}

export interface CreateWorkersApiOptions {
  /** The host's RTK Query api (`createApi` with the React hooks module). */
  baseApi: InjectableBaseApi;
  /** Where the host mounts `WorkersControllerTrait`, without a trailing slash (`/api/admin/maintenance/workers`). */
  apiPrefix: string;
  /** The host's cache tags joined with the package's: provided by every query, invalidated by the restart request. */
  tags?: InjectedHostTags;
}

const windowQuery = ({ from, to, stepSeconds }: WorkersWindowArg): string => toQueryString({ from, to, stepSeconds });

const listQuery = ({ filters, orderBy, top, skip }: WorkerTransportListArg): string =>
  toQueryString({ filters, orderBy, top, skip });

const transportPath = (transport: string): string => `/transports/${encodeURIComponent(transport)}`;

/** The request of every operation, on `apiPrefix`. Pure: no RTK runtime. */
export const buildWorkersRequests = (apiPrefix: string) => {
  const prefix = trimApiPrefix(apiPrefix);
  return {
    overview: (): InjectedRequest => ({ url: `${prefix}/overview` }),
    history: (arg: WorkersWindowArg): InjectedRequest => ({ url: `${prefix}/history${windowQuery(arg)}` }),
    transportDetail: ({ transport, ...window }: WorkerTransportArg): InjectedRequest => ({
      url: `${prefix}${transportPath(transport)}${windowQuery(window)}`,
    }),
    messageRuns: (arg: WorkerTransportListArg): InjectedRequest => ({
      url: `${prefix}${transportPath(arg.transport)}/messageRuns${listQuery(arg)}`,
    }),
    processes: (arg: WorkerTransportListArg): InjectedRequest => ({
      url: `${prefix}${transportPath(arg.transport)}/processes${listQuery(arg)}`,
    }),
    restart: ({ transport }: WorkersRestartArg): InjectedRequest => ({
      url: `${prefix}/restart`,
      method: 'POST',
      body: transport ? { transport } : {},
    }),
  };
};

const LIVE = { type: WORKERS_TAG, id: 'LIVE' } as const;
const HISTORY = { type: WORKERS_TAG, id: 'HISTORY' } as const;
const RUNS = { type: WORKERS_TAG, id: 'RUNS' } as const;

/**
 * The operations as injected (endpoint name → definition). Cache: the overview, the transport detail and the process
 * lists provide `LIVE`, the history `HISTORY`, the message runs `RUNS`; the restart request invalidates all three (it
 * changes `restartPending` and the processes' `restartRequestedAt`, and the stops and new starts reach the history and
 * the runs).
 */
export const workersEndpointDefinitions = (apiPrefix: string) => {
  const requests = buildWorkersRequests(apiPrefix);
  return {
    adminUiWorkersOverview: { kind: 'query', request: requests.overview, providesTags: [LIVE] },
    adminUiWorkersHistory: { kind: 'query', request: requests.history, providesTags: [HISTORY] },
    adminUiWorkerTransportDetail: { kind: 'query', request: requests.transportDetail, providesTags: [LIVE, HISTORY] },
    adminUiWorkerMessageRuns: { kind: 'query', request: requests.messageRuns, providesTags: [RUNS] },
    adminUiWorkerProcesses: { kind: 'query', request: requests.processes, providesTags: [LIVE] },
    adminUiWorkersRestart: { kind: 'mutation', request: requests.restart, invalidatesTags: [LIVE, HISTORY, RUNS] },
  } as const satisfies Record<string, InjectedEndpointDefinition<never>>;
};

/**
 * Injects the workers operations into the host's RTK Query api and returns their hooks. Call it once at module scope;
 * a second call with the same api and prefix returns the first result.
 *
 * ```ts
 * export const workersApi = createWorkersApi({ baseApi: adminApi, apiPrefix: '/api/admin/maintenance/workers' });
 * ```
 */
export const createWorkersApi = ({ baseApi, apiPrefix, tags }: CreateWorkersApiOptions): WorkersApi =>
  injectEndpointsOnce(
    baseApi,
    `workers:${trimApiPrefix(apiPrefix)}${tags ? `:tags:${JSON.stringify(tags)}` : ''}`,
    [WORKERS_TAG, ...hostTagTypes(tags)],
    withHostTags(workersEndpointDefinitions(apiPrefix), tags),
    hookOf => ({
    useOverviewQuery: hookOf('adminUiWorkersOverview') as WorkersApi['useOverviewQuery'],
    useHistoryQuery: hookOf('adminUiWorkersHistory') as WorkersApi['useHistoryQuery'],
    useTransportDetailQuery: hookOf('adminUiWorkerTransportDetail') as WorkersApi['useTransportDetailQuery'],
    useMessageRunsQuery: hookOf('adminUiWorkerMessageRuns') as WorkersApi['useMessageRunsQuery'],
    useProcessesQuery: hookOf('adminUiWorkerProcesses') as WorkersApi['useProcessesQuery'],
    useRestartMutation: hookOf('adminUiWorkersRestart') as WorkersApi['useRestartMutation'],
    })
  );

/** Fixed answers of a `createStaticWorkersApi`; an operation without one stays loading. */
export interface StaticWorkersData {
  overview?: WorkersOverviewResponse;
  history?: (arg: WorkersWindowArg) => WorkersHistoryResponse | undefined;
  transportDetail?: (arg: WorkerTransportArg) => WorkerTransportDetailResponse | undefined;
  messageRuns?: (arg: WorkerTransportListArg) => WorkerMessageRunsResponse | undefined;
  processes?: (arg: WorkerTransportListArg) => WorkerProcessesResponse | undefined;
  restart?: (arg: WorkersRestartArg) => WorkersRestartResponse | Promise<WorkersRestartResponse>;
}

/** A `WorkersApi` answering fixed payloads, without a store or a request: for showcases, tests and design reviews. */
export const createStaticWorkersApi = (data: StaticWorkersData): WorkersApi => ({
  useOverviewQuery: staticQueryHook(() => data.overview),
  useHistoryQuery: staticQueryHook(arg => data.history?.(arg)),
  useTransportDetailQuery: staticQueryHook(arg => data.transportDetail?.(arg)),
  useMessageRunsQuery: staticQueryHook(arg => data.messageRuns?.(arg)),
  useProcessesQuery: staticQueryHook(arg => data.processes?.(arg)),
  useRestartMutation: staticMutationHook(arg =>
    data.restart ? data.restart(arg) : { requestedProcessCount: 0, workerProcesses: { elements: [] } }
  ),
});
