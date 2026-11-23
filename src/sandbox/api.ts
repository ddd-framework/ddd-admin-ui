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
  AgentSandboxActionArg,
  AgentSandboxActionLogEntriesResponse,
  AgentSandboxActionResponse,
  AgentSandboxCommandsResponse,
  AgentSandboxConversationsResponse,
  AgentSandboxDriveStatusResponse,
  AgentSandboxFileContent,
  AgentSandboxFileContentArg,
  AgentSandboxFilesArg,
  AgentSandboxFilesResponse,
  AgentSandboxKeyArg,
  AgentSandboxKillArg,
  AgentSandboxLimitArg,
  AgentSandboxProcessesResponse,
  AgentSandboxSessionEventsResponse,
  AgentSandboxWorkspaceResponse,
  AgentSandboxWorkspacesResponse,
} from './types.ts';

/** The file name of a `Content-Disposition` header (`filename*=UTF-8''…` before `filename="…"`); null without one. */
export const fileNameOfContentDisposition = (header: string | null): string | null => {
  if (!header) return null;
  const encoded = /filename\*\s*=\s*(?:UTF-8|utf-8)''([^;]+)/.exec(header);
  if (encoded?.[1]) {
    try {
      return decodeURIComponent(encoded[1].trim().replace(/^"|"$/g, ''));
    } catch {
      // fall through to the plain name
    }
  }
  const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(header);
  return plain?.[1]?.trim() || null;
};

/** The response handler of the file content: the shared download shape. */
export const readSandboxFileContent = async (response: Response): Promise<AgentSandboxFileContent> => {
  const blob = await response.blob();
  return {
    blob,
    filename: fileNameOfContentDisposition(response.headers.get('Content-Disposition')),
    contentType: response.headers.get('Content-Type') ?? blob.type,
    isTruncated: response.headers.get('X-Content-Truncated') === 'true',
  };
};

/** The cache tag type of the sandbox operations (ids `LIST`, `DETAIL`). */
export const SANDBOXES_TAG = 'AdminUiSandboxes';

/** The hooks `createSandboxesApi` returns; the sandbox screens take them as their `api`. */
export interface SandboxesApi {
  /** `GET /list`: every workspace, `isConfigured` false without a host administration. */
  useSandboxesListQuery: ApiQueryHook<void, AgentSandboxWorkspacesResponse>;
  /** `GET /{workspaceKey}`: one workspace (404: unknown). */
  useSandboxQuery: ApiQueryHook<AgentSandboxKeyArg, AgentSandboxWorkspaceResponse>;
  /** `GET /{workspaceKey}/files?path=`: one directory, read only. */
  useSandboxFilesQuery: ApiQueryHook<AgentSandboxFilesArg, AgentSandboxFilesResponse>;
  /** `GET /{workspaceKey}/driveStatus`: changes not yet in the drive. */
  useSandboxDriveStatusQuery: ApiQueryHook<AgentSandboxKeyArg, AgentSandboxDriveStatusResponse>;
  /** `GET /{workspaceKey}/processes`: running processes and jobs. */
  useSandboxProcessesQuery: ApiQueryHook<AgentSandboxKeyArg, AgentSandboxProcessesResponse>;
  /** `GET /{workspaceKey}/commands?limit=`: the newest commands with exit code, duration and output tails. */
  useSandboxCommandsQuery: ApiQueryHook<AgentSandboxLimitArg, AgentSandboxCommandsResponse>;
  /** `GET /{workspaceKey}/events?limit=`: the session log (memory, seccomp, timeouts). */
  useSandboxSessionEventsQuery: ApiQueryHook<AgentSandboxLimitArg, AgentSandboxSessionEventsResponse>;
  /** `GET /{workspaceKey}/conversations?limit=`: the agent conversations of the space, newest first. */
  useSandboxConversationsQuery: ApiQueryHook<AgentSandboxLimitArg, AgentSandboxConversationsResponse>;
  /** `GET /{workspaceKey}/actions?limit=`: the audit of the actions on this workspace. */
  useSandboxActionLogQuery: ApiQueryHook<AgentSandboxLimitArg, AgentSandboxActionLogEntriesResponse>;
  /** `GET /{workspaceKey}/files/content?path&disposition`: one file's bytes as `{ blob, filename, contentType, isTruncated }` (not cached). */
  useSandboxFileContentMutation: ApiMutationHook<AgentSandboxFileContentArg, AgentSandboxFileContent>;
  /** `POST /{workspaceKey}/start|offload|end|reset` (409 while a turn runs, unless `force` + `reason`). */
  useSandboxActionMutation: ApiMutationHook<AgentSandboxActionArg, AgentSandboxActionResponse>;
  /** `POST /{workspaceKey}/jobs/{jobId}/kill`. */
  useKillSandboxJobMutation: ApiMutationHook<AgentSandboxKillArg, AgentSandboxActionResponse>;
}

export interface CreateSandboxesApiOptions {
  /** The host's RTK Query api (`createApi` with the React hooks module). */
  baseApi: InjectableBaseApi;
  /** Where the host mounts `AgentSandboxesControllerTrait`, without a trailing slash (`/api/admin/maintenance/sandboxes`). */
  apiPrefix: string;
}

const keyPath = (workspaceKey: string): string => `/${encodeURIComponent(workspaceKey)}`;
const actionBody = ({ force, reason, confirmation }: { force?: boolean; reason?: string; confirmation?: string }) => ({
  ...(force ? { force: true } : {}),
  ...(reason ? { reason } : {}),
  ...(confirmation !== undefined ? { confirmation } : {}),
});

/** The request of every operation, on `apiPrefix`. Pure: no RTK runtime. */
export const buildSandboxesRequests = (apiPrefix: string) => {
  const prefix = trimApiPrefix(apiPrefix);
  return {
    list: (): InjectedRequest => ({ url: `${prefix}/list` }),
    workspace: ({ workspaceKey }: AgentSandboxKeyArg): InjectedRequest => ({ url: `${prefix}${keyPath(workspaceKey)}` }),
    files: ({ workspaceKey, path }: AgentSandboxFilesArg): InjectedRequest => ({
      url: `${prefix}${keyPath(workspaceKey)}/files${toQueryString({ path: path || undefined })}`,
    }),
    driveStatus: ({ workspaceKey }: AgentSandboxKeyArg): InjectedRequest => ({ url: `${prefix}${keyPath(workspaceKey)}/driveStatus` }),
    processes: ({ workspaceKey }: AgentSandboxKeyArg): InjectedRequest => ({ url: `${prefix}${keyPath(workspaceKey)}/processes` }),
    commands: ({ workspaceKey, limit }: AgentSandboxLimitArg): InjectedRequest => ({
      url: `${prefix}${keyPath(workspaceKey)}/commands${toQueryString({ limit })}`,
    }),
    events: ({ workspaceKey, limit }: AgentSandboxLimitArg): InjectedRequest => ({
      url: `${prefix}${keyPath(workspaceKey)}/events${toQueryString({ limit })}`,
    }),
    conversations: ({ workspaceKey, limit }: AgentSandboxLimitArg): InjectedRequest => ({
      url: `${prefix}${keyPath(workspaceKey)}/conversations${toQueryString({ limit })}`,
    }),
    actions: ({ workspaceKey, limit }: AgentSandboxLimitArg): InjectedRequest => ({
      url: `${prefix}${keyPath(workspaceKey)}/actions${toQueryString({ limit })}`,
    }),
    content: ({ workspaceKey, path, disposition }: AgentSandboxFileContentArg): InjectedRequest => ({
      url: `${prefix}${keyPath(workspaceKey)}/files/content${toQueryString({ path, disposition })}`,
      responseHandler: readSandboxFileContent,
    }),
    action: ({ workspaceKey, action, ...body }: AgentSandboxActionArg): InjectedRequest => ({
      url: `${prefix}${keyPath(workspaceKey)}/${action}`,
      method: 'POST',
      body: actionBody(body),
    }),
    kill: ({ workspaceKey, jobId, ...body }: AgentSandboxKillArg): InjectedRequest => ({
      url: `${prefix}${keyPath(workspaceKey)}/jobs/${encodeURIComponent(jobId)}/kill`,
      method: 'POST',
      body: actionBody(body),
    }),
  };
};

const LIST = { type: SANDBOXES_TAG, id: 'LIST' } as const;
const DETAIL = { type: SANDBOXES_TAG, id: 'DETAIL' } as const;

/** The operations as injected. Every action invalidates the list and the details; file bytes are never cached. */
export const sandboxesEndpointDefinitions = (apiPrefix: string) => {
  const requests = buildSandboxesRequests(apiPrefix);
  return {
    adminUiSandboxesList: { kind: 'query', request: requests.list, providesTags: [LIST] },
    adminUiSandbox: { kind: 'query', request: requests.workspace, providesTags: [DETAIL] },
    adminUiSandboxFiles: { kind: 'query', request: requests.files, providesTags: [DETAIL] },
    adminUiSandboxDriveStatus: { kind: 'query', request: requests.driveStatus, providesTags: [DETAIL] },
    adminUiSandboxProcesses: { kind: 'query', request: requests.processes, providesTags: [DETAIL] },
    adminUiSandboxCommands: { kind: 'query', request: requests.commands, providesTags: [DETAIL] },
    adminUiSandboxEvents: { kind: 'query', request: requests.events, providesTags: [DETAIL] },
    adminUiSandboxConversations: { kind: 'query', request: requests.conversations, providesTags: [DETAIL] },
    adminUiSandboxActionLog: { kind: 'query', request: requests.actions, providesTags: [DETAIL] },
    adminUiSandboxFileContent: { kind: 'mutation', request: requests.content },
    adminUiSandboxAction: { kind: 'mutation', request: requests.action, invalidatesTags: [LIST, DETAIL] },
    adminUiSandboxKillJob: { kind: 'mutation', request: requests.kill, invalidatesTags: [LIST, DETAIL] },
  } as const satisfies Record<string, InjectedEndpointDefinition<never>>;
};

/**
 * Injects the sandbox operations into the host's RTK Query api and returns their hooks. Call it once at module scope:
 * `export const sandboxesApi = createSandboxesApi({ baseApi: adminApi, apiPrefix: '/api/admin/maintenance/sandboxes' });`
 */
export const createSandboxesApi = ({ baseApi, apiPrefix }: CreateSandboxesApiOptions): SandboxesApi =>
  injectEndpointsOnce(baseApi, `sandboxes:${trimApiPrefix(apiPrefix)}`, [SANDBOXES_TAG], sandboxesEndpointDefinitions(apiPrefix), hookOf => ({
    useSandboxesListQuery: hookOf('adminUiSandboxesList') as SandboxesApi['useSandboxesListQuery'],
    useSandboxQuery: hookOf('adminUiSandbox') as SandboxesApi['useSandboxQuery'],
    useSandboxFilesQuery: hookOf('adminUiSandboxFiles') as SandboxesApi['useSandboxFilesQuery'],
    useSandboxDriveStatusQuery: hookOf('adminUiSandboxDriveStatus') as SandboxesApi['useSandboxDriveStatusQuery'],
    useSandboxProcessesQuery: hookOf('adminUiSandboxProcesses') as SandboxesApi['useSandboxProcessesQuery'],
    useSandboxCommandsQuery: hookOf('adminUiSandboxCommands') as SandboxesApi['useSandboxCommandsQuery'],
    useSandboxSessionEventsQuery: hookOf('adminUiSandboxEvents') as SandboxesApi['useSandboxSessionEventsQuery'],
    useSandboxConversationsQuery: hookOf('adminUiSandboxConversations') as SandboxesApi['useSandboxConversationsQuery'],
    useSandboxActionLogQuery: hookOf('adminUiSandboxActionLog') as SandboxesApi['useSandboxActionLogQuery'],
    useSandboxFileContentMutation: hookOf('adminUiSandboxFileContent') as SandboxesApi['useSandboxFileContentMutation'],
    useSandboxActionMutation: hookOf('adminUiSandboxAction') as SandboxesApi['useSandboxActionMutation'],
    useKillSandboxJobMutation: hookOf('adminUiSandboxKillJob') as SandboxesApi['useKillSandboxJobMutation'],
  }));

/** Fixed answers of a `createStaticSandboxesApi`; a query without one stays loading. */
export interface StaticSandboxesData {
  list?: AgentSandboxWorkspacesResponse | StaticQueryFailure;
  workspace?: (arg: AgentSandboxKeyArg) => AgentSandboxWorkspaceResponse | StaticQueryFailure | undefined;
  files?: (arg: AgentSandboxFilesArg) => AgentSandboxFilesResponse | StaticQueryFailure | undefined;
  driveStatus?: (arg: AgentSandboxKeyArg) => AgentSandboxDriveStatusResponse | StaticQueryFailure | undefined;
  processes?: (arg: AgentSandboxKeyArg) => AgentSandboxProcessesResponse | StaticQueryFailure | undefined;
  commands?: (arg: AgentSandboxLimitArg) => AgentSandboxCommandsResponse | StaticQueryFailure | undefined;
  events?: (arg: AgentSandboxLimitArg) => AgentSandboxSessionEventsResponse | StaticQueryFailure | undefined;
  conversations?: (arg: AgentSandboxLimitArg) => AgentSandboxConversationsResponse | StaticQueryFailure | undefined;
  actions?: (arg: AgentSandboxLimitArg) => AgentSandboxActionLogEntriesResponse | StaticQueryFailure | undefined;
  /** A file's text (served as `text/plain`); absent = 404. */
  fileText?: (arg: AgentSandboxFileContentArg) => string | undefined;
}

const NOT_AVAILABLE = (): never => {
  throw { status: 403, data: { error: 'Not available in this preview' } };
};

/** A `SandboxesApi` answering fixed payloads, without a store or a request; actions are refused. */
export const createStaticSandboxesApi = (data: StaticSandboxesData): SandboxesApi => ({
  useSandboxesListQuery: staticQueryHook(() => data.list),
  useSandboxQuery: staticQueryHook(arg => data.workspace?.(arg)),
  useSandboxFilesQuery: staticQueryHook(arg => data.files?.(arg)),
  useSandboxDriveStatusQuery: staticQueryHook(arg => data.driveStatus?.(arg)),
  useSandboxProcessesQuery: staticQueryHook(arg => data.processes?.(arg)),
  useSandboxCommandsQuery: staticQueryHook(arg => data.commands?.(arg)),
  useSandboxSessionEventsQuery: staticQueryHook(arg => data.events?.(arg)),
  useSandboxConversationsQuery: staticQueryHook(arg => data.conversations?.(arg)),
  useSandboxActionLogQuery: staticQueryHook(arg => data.actions?.(arg)),
  useSandboxFileContentMutation: staticMutationHook((arg: AgentSandboxFileContentArg) => {
    const text = data.fileText?.(arg);
    if (text === undefined) throw { status: 404, data: { error: 'Not found' } };
    return { blob: new Blob([text], { type: 'text/plain' }), filename: null, contentType: 'text/plain', isTruncated: false };
  }),
  useSandboxActionMutation: staticMutationHook(NOT_AVAILABLE),
  useKillSandboxJobMutation: staticMutationHook(NOT_AVAILABLE),
});
