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
import type {
  CronCreateBody,
  CronDeleteResponse,
  CronDetailResponse,
  CronExecutionArg,
  CronExecutionDetailResponse,
  CronExecutionsListArg,
  CronExecutionsListResponse,
  CronIdArg,
  CronResponse,
  CronSchedulableCommandsResponse,
  CronSchedulePreviewArg,
  CronSchedulePreviewResponse,
  CronsListResponse,
  CronsTimelineArg,
  CronsTimelineResponse,
  CronUpdateArg,
} from './types.ts';

/** The cache tag type of the crons operations (one per api; ids `LIST`, `DETAIL`, `RUNS`, `COMMANDS`). */
export const CRONS_TAG = 'AdminUiCrons';

/** The hooks `createCronsApi` returns; every crons screen takes them as its `api`. */
export interface CronsApi {
  /** `GET /list`: every Cron with its health, newest 30 runs and 24-hour stats; the runner's summary. */
  useCronsListQuery: ApiQueryHook<void, CronsListResponse>;
  /** `GET /executions/list?cronId&result&limit&offset`: one page of runs, newest first. */
  useCronExecutionsQuery: ApiQueryHook<CronExecutionsListArg, CronExecutionsListResponse>;
  /** `GET /executions/{executionId}`: one run with its full output (404: unknown run). */
  useCronExecutionQuery: ApiQueryHook<CronExecutionArg, CronExecutionDetailResponse>;
  /** `GET /timeline?hours`: runs per Cron per bucket. */
  useCronsTimelineQuery: ApiQueryHook<CronsTimelineArg, CronsTimelineResponse>;
  /** `GET /commands`: the schedulable console commands with the Crons that run them. */
  useCronCommandsQuery: ApiQueryHook<void, CronSchedulableCommandsResponse>;
  /** `GET /schedule-preview?schedule`: valid or not, and the next 5 slots. */
  useCronSchedulePreviewQuery: ApiQueryHook<CronSchedulePreviewArg, CronSchedulePreviewResponse>;
  /** `GET /{cronId}`: one Cron with its next slots, 14-day stats and duration history (404: unknown Cron). */
  useCronQuery: ApiQueryHook<CronIdArg, CronDetailResponse>;
  /** `POST` on the prefix itself: creates a Cron (400 names the field of a broken rule). */
  useCreateCronMutation: ApiMutationHook<CronCreateBody, CronResponse>;
  /** `PATCH /{cronId}` with only the changed fields (409: a new schedule while it runs). */
  useUpdateCronMutation: ApiMutationHook<CronUpdateArg, CronResponse>;
  /** `DELETE /{cronId}`: the Cron and its run history (409 while it runs). */
  useDeleteCronMutation: ApiMutationHook<CronIdArg, CronDeleteResponse>;
  /** `POST /{cronId}/activate` (idempotent; re-anchors the next slot). */
  useActivateCronMutation: ApiMutationHook<CronIdArg, CronResponse>;
  /** `POST /{cronId}/deactivate` (idempotent). */
  useDeactivateCronMutation: ApiMutationHook<CronIdArg, CronResponse>;
  /** `POST /{cronId}/run-now`: due now, the runner's next tick runs it (409 while paused or running). */
  useRunCronNowMutation: ApiMutationHook<CronIdArg, CronResponse>;
}

export interface CreateCronsApiOptions {
  /** The host's RTK Query api (`createApi` with the React hooks module). */
  baseApi: InjectableBaseApi;
  /** Where the host mounts `CronsControllerTrait`, without a trailing slash (`/api/admin/common/crons`). */
  apiPrefix: string;
}

const cronPath = (cronId: number): string => `/${encodeURIComponent(String(cronId))}`;

/** The request of every operation, on `apiPrefix`. Pure: no RTK runtime. */
export const buildCronsRequests = (apiPrefix: string) => {
  const prefix = trimApiPrefix(apiPrefix);
  return {
    list: (): InjectedRequest => ({ url: `${prefix}/list` }),
    executions: ({ cronId, result, limit, offset }: CronExecutionsListArg): InjectedRequest => ({
      url: `${prefix}/executions/list${toQueryString({ cronId, result, limit, offset })}`,
    }),
    execution: ({ executionId }: CronExecutionArg): InjectedRequest => ({
      url: `${prefix}/executions/${encodeURIComponent(String(executionId))}`,
    }),
    timeline: ({ hours }: CronsTimelineArg): InjectedRequest => ({ url: `${prefix}/timeline${toQueryString({ hours })}` }),
    commands: (): InjectedRequest => ({ url: `${prefix}/commands` }),
    schedulePreview: ({ schedule }: CronSchedulePreviewArg): InjectedRequest => ({
      url: `${prefix}/schedule-preview${toQueryString({ schedule })}`,
    }),
    detail: ({ cronId }: CronIdArg): InjectedRequest => ({ url: `${prefix}${cronPath(cronId)}` }),
    create: (body: CronCreateBody): InjectedRequest => ({ url: prefix, method: 'POST', body }),
    update: ({ cronId, ...body }: CronUpdateArg): InjectedRequest => ({ url: `${prefix}${cronPath(cronId)}`, method: 'PATCH', body }),
    remove: ({ cronId }: CronIdArg): InjectedRequest => ({ url: `${prefix}${cronPath(cronId)}`, method: 'DELETE' }),
    activate: ({ cronId }: CronIdArg): InjectedRequest => ({ url: `${prefix}${cronPath(cronId)}/activate`, method: 'POST' }),
    deactivate: ({ cronId }: CronIdArg): InjectedRequest => ({ url: `${prefix}${cronPath(cronId)}/deactivate`, method: 'POST' }),
    runNow: ({ cronId }: CronIdArg): InjectedRequest => ({ url: `${prefix}${cronPath(cronId)}/run-now`, method: 'POST' }),
  };
};

const LIST = { type: CRONS_TAG, id: 'LIST' } as const;
const DETAIL = { type: CRONS_TAG, id: 'DETAIL' } as const;
const RUNS = { type: CRONS_TAG, id: 'RUNS' } as const;
const COMMANDS = { type: CRONS_TAG, id: 'COMMANDS' } as const;

/**
 * The operations as injected (endpoint name → definition). Cache: the list provides `LIST`, a Cron's details `DETAIL`,
 * the runs, one run and the timeline `RUNS`, the commands `COMMANDS` (their "used by"); the schedule preview provides
 * nothing. Every write invalidates `LIST` and `DETAIL`; create, update and delete also `COMMANDS`, delete also `RUNS`
 * (its runs go with it). Run now changes the Cron's next slot, not its runs: the run appears with the next list fetch.
 */
export const cronsEndpointDefinitions = (apiPrefix: string) => {
  const requests = buildCronsRequests(apiPrefix);
  return {
    adminUiCronsList: { kind: 'query', request: requests.list, providesTags: [LIST] },
    adminUiCronExecutions: { kind: 'query', request: requests.executions, providesTags: [RUNS] },
    adminUiCronExecution: { kind: 'query', request: requests.execution, providesTags: [RUNS] },
    adminUiCronsTimeline: { kind: 'query', request: requests.timeline, providesTags: [RUNS] },
    adminUiCronCommands: { kind: 'query', request: requests.commands, providesTags: [COMMANDS] },
    adminUiCronSchedulePreview: { kind: 'query', request: requests.schedulePreview },
    adminUiCron: { kind: 'query', request: requests.detail, providesTags: [DETAIL] },
    adminUiCronCreate: { kind: 'mutation', request: requests.create, invalidatesTags: [LIST, DETAIL, COMMANDS] },
    adminUiCronUpdate: { kind: 'mutation', request: requests.update, invalidatesTags: [LIST, DETAIL, COMMANDS] },
    adminUiCronDelete: { kind: 'mutation', request: requests.remove, invalidatesTags: [LIST, DETAIL, COMMANDS, RUNS] },
    adminUiCronActivate: { kind: 'mutation', request: requests.activate, invalidatesTags: [LIST, DETAIL] },
    adminUiCronDeactivate: { kind: 'mutation', request: requests.deactivate, invalidatesTags: [LIST, DETAIL] },
    adminUiCronRunNow: { kind: 'mutation', request: requests.runNow, invalidatesTags: [LIST, DETAIL] },
  } as const satisfies Record<string, InjectedEndpointDefinition<never>>;
};

/**
 * Injects the crons operations into the host's RTK Query api and returns their hooks. Call it once at module scope;
 * a second call with the same api and prefix returns the first result.
 *
 * ```ts
 * export const cronsApi = createCronsApi({ baseApi: adminApi, apiPrefix: '/api/admin/common/crons' });
 * ```
 */
export const createCronsApi = ({ baseApi, apiPrefix }: CreateCronsApiOptions): CronsApi =>
  injectEndpointsOnce(baseApi, `crons:${trimApiPrefix(apiPrefix)}`, [CRONS_TAG], cronsEndpointDefinitions(apiPrefix), hookOf => ({
    useCronsListQuery: hookOf('adminUiCronsList') as CronsApi['useCronsListQuery'],
    useCronExecutionsQuery: hookOf('adminUiCronExecutions') as CronsApi['useCronExecutionsQuery'],
    useCronExecutionQuery: hookOf('adminUiCronExecution') as CronsApi['useCronExecutionQuery'],
    useCronsTimelineQuery: hookOf('adminUiCronsTimeline') as CronsApi['useCronsTimelineQuery'],
    useCronCommandsQuery: hookOf('adminUiCronCommands') as CronsApi['useCronCommandsQuery'],
    useCronSchedulePreviewQuery: hookOf('adminUiCronSchedulePreview') as CronsApi['useCronSchedulePreviewQuery'],
    useCronQuery: hookOf('adminUiCron') as CronsApi['useCronQuery'],
    useCreateCronMutation: hookOf('adminUiCronCreate') as CronsApi['useCreateCronMutation'],
    useUpdateCronMutation: hookOf('adminUiCronUpdate') as CronsApi['useUpdateCronMutation'],
    useDeleteCronMutation: hookOf('adminUiCronDelete') as CronsApi['useDeleteCronMutation'],
    useActivateCronMutation: hookOf('adminUiCronActivate') as CronsApi['useActivateCronMutation'],
    useDeactivateCronMutation: hookOf('adminUiCronDeactivate') as CronsApi['useDeactivateCronMutation'],
    useRunCronNowMutation: hookOf('adminUiCronRunNow') as CronsApi['useRunCronNowMutation'],
  }));

type StaticAnswer<TData> = TData | StaticQueryFailure | undefined;

/**
 * Fixed answers of a `createStaticCronsApi`; a query without one stays loading, a write without one answers the Cron
 * of the list unchanged. A write that throws rejects (`{ status: 409, data: { error: '…' } }`, as RTK Query reports it).
 */
export interface StaticCronsData {
  list?: CronsListResponse | StaticQueryFailure;
  executions?: (arg: CronExecutionsListArg) => StaticAnswer<CronExecutionsListResponse>;
  execution?: (arg: CronExecutionArg) => StaticAnswer<CronExecutionDetailResponse>;
  timeline?: (arg: CronsTimelineArg) => StaticAnswer<CronsTimelineResponse>;
  commands?: CronSchedulableCommandsResponse;
  schedulePreview?: (arg: CronSchedulePreviewArg) => StaticAnswer<CronSchedulePreviewResponse>;
  detail?: (arg: CronIdArg) => StaticAnswer<CronDetailResponse>;
  create?: (body: CronCreateBody) => CronResponse | Promise<CronResponse>;
  update?: (arg: CronUpdateArg) => CronResponse | Promise<CronResponse>;
  remove?: (arg: CronIdArg) => CronDeleteResponse | Promise<CronDeleteResponse>;
  activate?: (arg: CronIdArg) => CronResponse | Promise<CronResponse>;
  deactivate?: (arg: CronIdArg) => CronResponse | Promise<CronResponse>;
  runNow?: (arg: CronIdArg) => CronResponse | Promise<CronResponse>;
}

/** A `CronsApi` answering fixed payloads, without a store or a request: for showcases, tests and design reviews. */
export const createStaticCronsApi = (data: StaticCronsData): CronsApi => {
  const cronOf = (cronId: number): CronResponse => {
    const list = data.list && 'crons' in data.list ? data.list : undefined;
    const cron = list?.crons.elements?.find(candidate => candidate.id === cronId);
    if (!cron) throw { status: 404, data: { error: `No Cron ${cronId}` } };
    return { cron };
  };
  return {
    useCronsListQuery: staticQueryHook(() => data.list),
    useCronExecutionsQuery: staticQueryHook(arg => data.executions?.(arg)),
    useCronExecutionQuery: staticQueryHook(arg => data.execution?.(arg)),
    useCronsTimelineQuery: staticQueryHook(arg => data.timeline?.(arg)),
    useCronCommandsQuery: staticQueryHook(() => data.commands),
    useCronSchedulePreviewQuery: staticQueryHook(arg => data.schedulePreview?.(arg)),
    useCronQuery: staticQueryHook(arg => data.detail?.(arg)),
    useCreateCronMutation: staticMutationHook(body =>
      data.create ? data.create(body) : { cron: { id: 0, name: body.name, schedule: body.schedule, isActive: body.isActive ?? true, status: 'OK' } }
    ),
    useUpdateCronMutation: staticMutationHook(arg => (data.update ? data.update(arg) : cronOf(arg.cronId))),
    useDeleteCronMutation: staticMutationHook(arg => (data.remove ? data.remove(arg) : { deletedCronId: arg.cronId })),
    useActivateCronMutation: staticMutationHook(arg => (data.activate ? data.activate(arg) : cronOf(arg.cronId))),
    useDeactivateCronMutation: staticMutationHook(arg => (data.deactivate ? data.deactivate(arg) : cronOf(arg.cronId))),
    useRunCronNowMutation: staticMutationHook(arg => (data.runNow ? data.runNow(arg) : cronOf(arg.cronId))),
  };
};
