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
  IssueGroupArg,
  IssueGroupDetailResponse,
  IssueGroupResponse,
  IssueGroupsListArg,
  IssueGroupsListResponse,
  IssuesTrendArg,
  IssuesTrendResponse,
} from './types.ts';

/** The cache tag type of the issues operations (ids `LIST`, `TREND`, `DETAIL`). */
export const ISSUES_TAG = 'AdminUiIssues';

/** The hooks `createIssuesApi` returns; every issues screen takes them as its `api`. */
export interface IssuesApi {
  /** `GET /groups/list`: one page of groups with the status counts, the environments and the job health. */
  useIssueGroupsQuery: ApiQueryHook<IssueGroupsListArg, IssueGroupsListResponse>;
  /** `GET /trend`: error events per bucket of the list's selection, or of one group. */
  useIssuesTrendQuery: ApiQueryHook<IssuesTrendArg, IssuesTrendResponse>;
  /** `GET /groups/{environment}/{groupHash}`: the group, its issues, its newest events, the agent payload. */
  useIssueGroupDetailQuery: ApiQueryHook<IssueGroupArg, IssueGroupDetailResponse>;
  /** `POST /groups/{environment}/{groupHash}/resolve`: fixed; a later event reopens it as a regression. */
  useResolveIssueGroupMutation: ApiMutationHook<IssueGroupArg, IssueGroupResponse>;
  /** `POST /groups/{environment}/{groupHash}/ignore`: never alerts again. */
  useIgnoreIssueGroupMutation: ApiMutationHook<IssueGroupArg, IssueGroupResponse>;
  /** `POST /groups/{environment}/{groupHash}/reopen`: open again. */
  useReopenIssueGroupMutation: ApiMutationHook<IssueGroupArg, IssueGroupResponse>;
}

export interface CreateIssuesApiOptions {
  /** The host's RTK Query api (`createApi` with the React hooks module). */
  baseApi: InjectableBaseApi;
  /** Where the host mounts `IssuesControllerTrait`, without a trailing slash (`/api/admin/common/issues`). */
  apiPrefix: string;
}

const groupPath = ({ environment, groupHash }: IssueGroupArg): string =>
  `/groups/${encodeURIComponent(environment)}/${encodeURIComponent(groupHash)}`;

/** The request of every operation, on `apiPrefix`. Pure: no RTK runtime. */
export const buildIssuesRequests = (apiPrefix: string) => {
  const prefix = trimApiPrefix(apiPrefix);
  return {
    groups: ({ environment, status, search, section, release, limit, offset }: IssueGroupsListArg): InjectedRequest => ({
      url: `${prefix}/groups/list${toQueryString({ environment, status, search, section, release, limit, offset })}`,
    }),
    trend: ({ environment, groupHash, status, search, section, release, from, to }: IssuesTrendArg): InjectedRequest => ({
      url: `${prefix}/trend${toQueryString({ environment, groupHash, status, search, section, release, from, to })}`,
    }),
    detail: (arg: IssueGroupArg): InjectedRequest => ({ url: `${prefix}${groupPath(arg)}` }),
    resolve: (arg: IssueGroupArg): InjectedRequest => ({ url: `${prefix}${groupPath(arg)}/resolve`, method: 'POST', body: {} }),
    ignore: (arg: IssueGroupArg): InjectedRequest => ({ url: `${prefix}${groupPath(arg)}/ignore`, method: 'POST', body: {} }),
    reopen: (arg: IssueGroupArg): InjectedRequest => ({ url: `${prefix}${groupPath(arg)}/reopen`, method: 'POST', body: {} }),
  };
};

const LIST = { type: ISSUES_TAG, id: 'LIST' } as const;
const TREND = { type: ISSUES_TAG, id: 'TREND' } as const;
const DETAIL = { type: ISSUES_TAG, id: 'DETAIL' } as const;

/**
 * The operations as injected (endpoint name → definition). Cache: the list provides `LIST`, the trend `TREND`, the
 * details `DETAIL`; a status change invalidates `LIST` (the tab counts and the rows) and `DETAIL`. The trend counts log
 * events, which a status change does not touch; a status-filtered trend follows on the next window change.
 */
export const issuesEndpointDefinitions = (apiPrefix: string) => {
  const requests = buildIssuesRequests(apiPrefix);
  return {
    adminUiIssueGroups: { kind: 'query', request: requests.groups, providesTags: [LIST] },
    adminUiIssuesTrend: { kind: 'query', request: requests.trend, providesTags: [TREND] },
    adminUiIssueGroupDetail: { kind: 'query', request: requests.detail, providesTags: [DETAIL] },
    adminUiIssueGroupResolve: { kind: 'mutation', request: requests.resolve, invalidatesTags: [LIST, DETAIL] },
    adminUiIssueGroupIgnore: { kind: 'mutation', request: requests.ignore, invalidatesTags: [LIST, DETAIL] },
    adminUiIssueGroupReopen: { kind: 'mutation', request: requests.reopen, invalidatesTags: [LIST, DETAIL] },
  } as const satisfies Record<string, InjectedEndpointDefinition<never>>;
};

/**
 * Injects the issues operations into the host's RTK Query api and returns their hooks. Call it once at module scope;
 * a second call with the same api and prefix returns the first result.
 *
 * ```ts
 * export const issuesApi = createIssuesApi({ baseApi: adminApi, apiPrefix: '/api/admin/common/issues' });
 * ```
 */
export const createIssuesApi = ({ baseApi, apiPrefix }: CreateIssuesApiOptions): IssuesApi =>
  injectEndpointsOnce(baseApi, `issues:${trimApiPrefix(apiPrefix)}`, [ISSUES_TAG], issuesEndpointDefinitions(apiPrefix), hookOf => ({
    useIssueGroupsQuery: hookOf('adminUiIssueGroups') as IssuesApi['useIssueGroupsQuery'],
    useIssuesTrendQuery: hookOf('adminUiIssuesTrend') as IssuesApi['useIssuesTrendQuery'],
    useIssueGroupDetailQuery: hookOf('adminUiIssueGroupDetail') as IssuesApi['useIssueGroupDetailQuery'],
    useResolveIssueGroupMutation: hookOf('adminUiIssueGroupResolve') as IssuesApi['useResolveIssueGroupMutation'],
    useIgnoreIssueGroupMutation: hookOf('adminUiIssueGroupIgnore') as IssuesApi['useIgnoreIssueGroupMutation'],
    useReopenIssueGroupMutation: hookOf('adminUiIssueGroupReopen') as IssuesApi['useReopenIssueGroupMutation'],
  }));

type StaticAnswer<TArg, TData> = (arg: TArg) => TData | StaticQueryFailure | undefined;

/** Fixed answers of a `createStaticIssuesApi`; an operation without one stays loading. */
export interface StaticIssuesData {
  groups?: StaticAnswer<IssueGroupsListArg, IssueGroupsListResponse>;
  trend?: StaticAnswer<IssuesTrendArg, IssuesTrendResponse>;
  detail?: StaticAnswer<IssueGroupArg, IssueGroupDetailResponse>;
  /** A status change; default: the group of `detail` with the new status. Throw to answer a failure. */
  setStatus?: (arg: IssueGroupArg & { status: 'RESOLVED' | 'IGNORED' | 'OPEN' }) => IssueGroupResponse | Promise<IssueGroupResponse>;
}

const statusAnswer =
  (data: StaticIssuesData, status: 'RESOLVED' | 'IGNORED' | 'OPEN') =>
  (arg: IssueGroupArg): IssueGroupResponse | Promise<IssueGroupResponse> => {
    if (data.setStatus) return data.setStatus({ ...arg, status });
    const detail = data.detail?.(arg);
    const group = detail && 'group' in detail ? detail.group : { environment: arg.environment, groupHash: arg.groupHash, status, eventCount: 0 };
    return { group: { ...group, status, resolvedAt: status === 'OPEN' ? null : (group.resolvedAt ?? null) } };
  };

/** An `IssuesApi` answering fixed payloads, without a store or a request: for showcases, tests and design reviews. */
export const createStaticIssuesApi = (data: StaticIssuesData): IssuesApi => ({
  useIssueGroupsQuery: staticQueryHook(arg => data.groups?.(arg)),
  useIssuesTrendQuery: staticQueryHook(arg => data.trend?.(arg)),
  useIssueGroupDetailQuery: staticQueryHook(arg => data.detail?.(arg)),
  useResolveIssueGroupMutation: staticMutationHook(statusAnswer(data, 'RESOLVED')),
  useIgnoreIssueGroupMutation: staticMutationHook(statusAnswer(data, 'IGNORED')),
  useReopenIssueGroupMutation: staticMutationHook(statusAnswer(data, 'OPEN')),
});
