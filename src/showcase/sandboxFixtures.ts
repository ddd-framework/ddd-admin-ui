// Sample payloads of the ./sandbox endpoints (`AgentSandboxesControllerTrait` of mgamadeus/ddd-agents): the showcase
// and the checks render the sandbox screens with them through `createStaticSandboxesApi`; a host can use them in its
// own design reviews. Neutral names only.
import { staticQueryFailure } from '../logic/pure/injectedApi.ts';
import type { StaticSandboxesData } from '../sandbox/api.ts';
import type { AgentSandboxWorkspace } from '../sandbox/types.ts';

const MB = 1024 * 1024;
const GB = 1024 * MB;

const WORKSPACES: AgentSandboxWorkspace[] = [
  {
    workspaceKey: 'space-12',
    agentSpaceId: 12,
    displayName: 'Personal · Ann',
    state: 'RUNNING',
    lastActivityAt: '2026-11-23 13:58:12',
    diskUsedBytes: 1.4 * GB,
    diskQuotaBytes: 2 * GB,
    memoryBytes: 610 * MB,
    memoryPeakBytes: 930 * MB,
    memoryLimitBytes: 1024 * MB,
    mountMode: 'FUSE',
    runnerPod: 'sandbox-runner-0',
    ownerDisplayName: 'Ann Example',
    runningJobCount: 1,
    conversationCount: 14,
    hasLiveTurn: true,
  },
  {
    workspaceKey: 'space-31',
    agentSpaceId: 31,
    displayName: 'Team Berlin',
    state: 'IDLE',
    lastActivityAt: '2026-11-23 12:40:00',
    diskUsedBytes: 320 * MB,
    diskQuotaBytes: 2 * GB,
    memoryBytes: 120 * MB,
    memoryPeakBytes: 410 * MB,
    memoryLimitBytes: 1024 * MB,
    mountMode: 'PLAIN',
    mountModeReason: 'FUSE is not available on this node; files are copied',
    runnerPod: 'sandbox-runner-1',
    ownerDisplayName: 'Ben Sample',
    runningJobCount: 0,
    conversationCount: 3,
    hasLiveTurn: false,
  },
  {
    workspaceKey: 'space-5',
    agentSpaceId: 5,
    displayName: null,
    state: 'OFFLOADED',
    lastActivityAt: '2026-11-20 09:12:44',
    diskUsedBytes: 48 * MB,
    diskQuotaBytes: 2 * GB,
    conversationCount: 1,
    hasLiveTurn: false,
  },
];

/** Sample payloads of the sandbox endpoints: three workspaces (running with a turn, idle, offloaded) and their parts. */
export const showcaseSandboxesData: StaticSandboxesData = {
  list: { isConfigured: true, workspaces: { elements: WORKSPACES } },
  workspace: ({ workspaceKey }) => {
    const workspace = WORKSPACES.find(candidate => candidate.workspaceKey === workspaceKey);
    return workspace ? { workspace } : staticQueryFailure({ status: 404, data: { error: 'Unknown workspace' } });
  },
  files: ({ path }) =>
    path
      ? {
          directoryPath: path,
          entries: { elements: [{ name: 'q1.csv', path: `${path}/q1.csv`, type: 'FILE', sizeBytes: 18_204, modifiedAt: '2026-11-23 13:50:02' }] },
        }
      : {
          directoryPath: '',
          entries: {
            elements: [
              { name: 'reports', path: 'reports', type: 'DIRECTORY', modifiedAt: '2026-11-23 13:50:02' },
              { name: 'notes.md', path: 'notes.md', type: 'FILE', sizeBytes: 2_310, modifiedAt: '2026-11-23 13:41:10' },
              { name: 'analysis.py', path: 'analysis.py', type: 'FILE', sizeBytes: 5_120, modifiedAt: '2026-11-23 13:30:00' },
            ],
          },
        },
  fileText: ({ path }) => (path === 'notes.md' ? '# Notes\n\n- revenue by month\n- <script> stays text\n' : path.endsWith('.py') ? 'print("hello")\n' : undefined),
  driveStatus: () => ({
    driveStatus: {
      isDriveWorkspace: true,
      pendingChangeCount: 2,
      lastCommittedAt: '2026-11-23 13:20:00',
      changes: {
        elements: [
          { path: 'reports/q1.csv', changeType: 'ADDED', sizeBytes: 18_204 },
          { path: 'notes.md', changeType: 'MODIFIED', sizeBytes: 2_310 },
        ],
      },
    },
  }),
  processes: () => ({
    processes: {
      elements: [
        { pid: 1, command: 'runner-shell', startedAt: '2026-11-23 13:00:00', cpuSeconds: 1.2, rssBytes: 24 * MB },
        { pid: 412, command: 'python analysis.py --all', startedAt: '2026-11-23 13:57:40', cpuSeconds: 31.5, rssBytes: 540 * MB, jobId: 'job-7' },
      ],
    },
  }),
  commands: () => ({
    commands: {
      elements: [
        {
          seq: 18,
          command: 'python analysis.py --all',
          startedAt: '2026-11-23 13:57:40',
          durationMs: null,
          exitCode: null,
          isTruncated: false,
          jobId: 'job-7',
        },
        {
          seq: 17,
          command: 'pip install pandas',
          startedAt: '2026-11-23 13:56:01',
          durationMs: 12_400,
          exitCode: 0,
          stdoutTail: 'Successfully installed pandas-2.3.3',
          isTruncated: false,
        },
        {
          seq: 16,
          command: 'cat missing.csv',
          startedAt: '2026-11-23 13:55:12',
          durationMs: 40,
          exitCode: 1,
          stderrTail: 'cat: missing.csv: No such file or directory',
          isTruncated: false,
        },
      ],
    },
  }),
  events: () => ({
    sessionEvents: {
      elements: [
        { occurredAt: '2026-11-23 13:40:00', type: 'MEMORY_EXCEEDED', detail: 'a process was stopped at 1 GB' },
        { occurredAt: '2026-11-23 13:10:00', type: 'SESSION_STARTED', detail: null },
      ],
    },
  }),
  conversations: () => ({
    conversations: {
      elements: [
        { conversationId: 901, runState: 'RUNNING', purposeName: 'Report', updatedAt: '2026-11-23 13:58:00' },
        { conversationId: 877, runState: 'IDLE', purposeName: null, updatedAt: '2026-11-22 17:02:00' },
      ],
    },
  }),
  actions: () => ({
    actionLogEntries: {
      elements: [
        {
          id: 3,
          action: 'OFFLOAD',
          outcome: 'REFUSED',
          actorAccountId: 2,
          outcomeDetail: 'A turn is running on this space.',
          changeHistory: { createdTime: '2026-11-23 13:52:00' },
        },
        {
          id: 2,
          action: 'KILL_JOB',
          jobId: 'job-5',
          outcome: 'SUCCEEDED',
          forced: true,
          reason: 'stuck for 20 minutes',
          actorAccountId: 2,
          changeHistory: { createdTime: '2026-11-23 12:10:00' },
        },
      ],
    },
  }),
};
