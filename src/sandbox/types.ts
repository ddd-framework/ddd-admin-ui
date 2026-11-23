// The payloads of mgamadeus/ddd-agents' `AgentSandboxesControllerTrait` (≥ 0.1.32). Date-times are the server's
// offsetless UTC strings (`Y-m-d H:i:s`); sets arrive as `{ elements: [...] }`.

/** `AgentSandboxWorkspace::STATE_*`. */
export type AgentSandboxState = 'RUNNING' | 'IDLE' | 'OFFLOADED';

/** `AgentSandboxWorkspace::MOUNT_MODE_*`. */
export type AgentSandboxMountMode = 'FUSE' | 'PLAIN';

export interface AgentSandboxElements<TItem> {
  elements?: TItem[] | null;
}

/** One workspace (one per agent space). */
export interface AgentSandboxWorkspace {
  workspaceKey: string;
  agentSpaceId?: number | null;
  /** The space's name as the drive shows it; `null` = none (the key is shown). */
  displayName?: string | null;
  state: AgentSandboxState | string;
  lastActivityAt?: string | null;
  diskUsedBytes?: number | null;
  diskQuotaBytes?: number | null;
  memoryBytes?: number | null;
  memoryPeakBytes?: number | null;
  memoryLimitBytes?: number | null;
  mountMode?: AgentSandboxMountMode | string | null;
  mountModeReason?: string | null;
  runnerPod?: string | null;
  ownerDisplayName?: string | null;
  runningJobCount?: number | null;
  conversationCount?: number | null;
  /** A conversation of the space has a running turn: actions need `force` + a reason. */
  hasLiveTurn?: boolean;
}

export interface AgentSandboxWorkspacesResponse {
  /** `false`: the host has no `AgentSandboxAdministration`; the screen says so. */
  isConfigured: boolean;
  workspaces: AgentSandboxElements<AgentSandboxWorkspace>;
}

export interface AgentSandboxWorkspaceResponse {
  workspace: AgentSandboxWorkspace;
}

export type AgentSandboxFileType = 'FILE' | 'DIRECTORY' | 'SYMLINK';

export interface AgentSandboxFileEntry {
  name: string;
  /** Relative to the workspace root (`reports/q1.csv`). */
  path: string;
  type: AgentSandboxFileType | string;
  sizeBytes?: number | null;
  modifiedAt?: string | null;
}

export interface AgentSandboxFilesResponse {
  directoryPath: string;
  entries: AgentSandboxElements<AgentSandboxFileEntry>;
}

export interface AgentSandboxDriveChange {
  path: string;
  changeType: 'ADDED' | 'MODIFIED' | 'DELETED' | 'RENAMED' | string;
  previousPath?: string | null;
  sizeBytes?: number | null;
}

export interface AgentSandboxDriveStatus {
  isDriveWorkspace: boolean;
  pendingChangeCount: number;
  changes: AgentSandboxElements<AgentSandboxDriveChange>;
  lastCommittedAt?: string | null;
}

export interface AgentSandboxDriveStatusResponse {
  driveStatus: AgentSandboxDriveStatus;
}

export interface AgentSandboxProcess {
  pid: number;
  command: string;
  startedAt?: string | null;
  cpuSeconds?: number | null;
  rssBytes?: number | null;
  jobId?: string | null;
}

export interface AgentSandboxProcessesResponse {
  processes: AgentSandboxElements<AgentSandboxProcess>;
}

export interface AgentSandboxCommand {
  seq: number;
  command: string;
  startedAt?: string | null;
  durationMs?: number | null;
  exitCode?: number | null;
  stdoutTail?: string | null;
  stderrTail?: string | null;
  isTruncated: boolean;
  jobId?: string | null;
  /**
   * `RUNNING` | `EXITED` | `KILLED` | `TIMED_OUT` (ddd-agents ≥ 0.1.34); null or absent = unknown — never read as
   * running.
   */
  status?: AgentSandboxCommandStatus | null;
}

/** `AgentSandboxCommand.status`. */
export type AgentSandboxCommandStatus = 'RUNNING' | 'EXITED' | 'KILLED' | 'TIMED_OUT';

export interface AgentSandboxCommandsResponse {
  commands: AgentSandboxElements<AgentSandboxCommand>;
}

export interface AgentSandboxSessionEvent {
  occurredAt?: string | null;
  /** `MEMORY_EXCEEDED`, `SECCOMP_DENIED`, `TIMEOUT`, … */
  type: string;
  detail?: string | null;
}

export interface AgentSandboxSessionEventsResponse {
  sessionEvents: AgentSandboxElements<AgentSandboxSessionEvent>;
}

export interface AgentSandboxConversation {
  conversationId: number;
  accountId?: number | null;
  runState?: string | null;
  purposeName?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface AgentSandboxConversationsResponse {
  conversations: AgentSandboxElements<AgentSandboxConversation>;
}

/** `AgentSandboxActionLogEntry::ACTION_*`. */
export type AgentSandboxAction = 'START' | 'OFFLOAD' | 'KILL_JOB' | 'END' | 'RESET';

/** `AgentSandboxActionLogEntry::OUTCOME_*`. */
export type AgentSandboxActionOutcome = 'SUCCEEDED' | 'REFUSED' | 'FAILED';

export interface AgentSandboxActionLogEntry {
  id?: number | null;
  workspaceKey?: string | null;
  agentSpaceId?: number | null;
  action?: AgentSandboxAction | string | null;
  jobId?: string | null;
  actorAccountId?: number | null;
  forced?: boolean | null;
  reason?: string | null;
  outcome?: AgentSandboxActionOutcome | string | null;
  outcomeDetail?: string | null;
  /** When the action ran (the row's change history). */
  changeHistory?: { createdTime?: string | null; modifiedTime?: string | null } | null;
}

export interface AgentSandboxActionLogEntriesResponse {
  actionLogEntries: AgentSandboxElements<AgentSandboxActionLogEntry>;
}

export interface AgentSandboxOffloadResult {
  committedChangeCount: number;
  wasSessionReleased: boolean;
  detail?: string | null;
}

export interface AgentSandboxActionResult {
  action: AgentSandboxAction | string;
  workspaceKey: string;
  outcome: AgentSandboxActionOutcome | string;
  offloadResult?: AgentSandboxOffloadResult | null;
  actionLogEntryId?: number | null;
}

export interface AgentSandboxActionResponse {
  actionResult: AgentSandboxActionResult;
}

export interface AgentSandboxKeyArg {
  workspaceKey: string;
}

export interface AgentSandboxLimitArg extends AgentSandboxKeyArg {
  limit?: number;
}

export interface AgentSandboxFilesArg extends AgentSandboxKeyArg {
  /** `''` = the root. */
  path?: string;
}

export interface AgentSandboxFileContentArg extends AgentSandboxKeyArg {
  path: string;
  disposition: 'inline' | 'attachment';
}

/**
 * One file's bytes, in the shape of every file download (`{ blob, filename, contentType }`, as ddd-web's
 * `blobResponseHandler`): a host whose store ignores `payload.blob` needs no other rule. The bytes never enter the
 * cache (a mutation, not a query).
 */
export interface AgentSandboxFileContent {
  blob: Blob;
  /** From `Content-Disposition`; null without one. */
  filename: string | null;
  contentType: string;
  /** The server cut an inline text preview (`X-Content-Truncated: true`). */
  isTruncated: boolean;
}

/** The body of every action: `force` with a `reason` while a turn runs; `confirmation` (the name) for a reset. */
export interface AgentSandboxActionBody {
  force?: boolean;
  reason?: string;
  confirmation?: string;
}

export interface AgentSandboxActionArg extends AgentSandboxKeyArg, AgentSandboxActionBody {
  action: 'start' | 'offload' | 'end' | 'reset';
}

export interface AgentSandboxKillArg extends AgentSandboxKeyArg, AgentSandboxActionBody {
  jobId: string;
}
