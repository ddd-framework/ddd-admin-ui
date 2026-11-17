/**
 * The payloads of Core's `WorkersControllerTrait` (`DDD\Presentation\Api\Admin\Common\Workers`), written from the DTOs
 * and entities of mgamadeus/ddd 3.23.1 and later (`DDD\Domain\Common\Entities\Workers`). Every set serialises as
 * `{ elements: [...] }`. Window and sequence date-times are ISO 8601 UTC (`2026-01-31T10:00:00Z`); entity date-times
 * are `Y-m-d H:i:s` in UTC (parse them with `parseDddDateTimeMs` of `@mgamadeus/ddd-web/contract`).
 */

export interface WorkersSet<TElement> {
  elements?: TElement[];
}

/** Transport states, the first that applies (`WorkerTransportOverview::STATE_*`). */
export type WorkerTransportState = 'NOT_CONSUMED' | 'STUCK' | 'UNDEFINED' | 'BACKLOG' | 'WORKING' | 'IDLE';
/** Whether the queue could be counted (`waiting` is null unless `COUNTED`). */
export type WorkerWaitingState = 'COUNTED' | 'UNKNOWN' | 'QUEUE_NOT_SET_UP';
/** Display state of a process: `BUSY` is inside a handler (it cannot report then), never lost. */
export type WorkerProcessDisplayState = 'RUNNING' | 'STOPPING' | 'BUSY' | 'SILENT' | 'STOPPED' | 'LOST';
export type WorkerMessageOutcome = 'HANDLED' | 'CAUGHT' | 'THROWN';

/** The sequence names of the workers endpoints (`WorkerTransportHistory::SEQUENCE_*`). */
export type WorkerSequenceName =
  | 'handled'
  | 'thrown'
  | 'caught'
  | 'failed'
  | 'redelivered'
  | 'durationAverageMs'
  | 'durationMaxMs'
  | 'waitAverageMs'
  | 'waitMaxMs'
  | 'waiting'
  | 'inFlight'
  | 'processes'
  | 'processStarts';

/** One point of a sequence: `x` the step's start (ISO 8601 UTC), `y` 0 for a count without an event, null for a gap. */
export interface DateTimeValue {
  x?: string | null;
  y?: number | null;
}

export interface DateTimeValueSequence extends WorkersSet<DateTimeValue> {
  name?: string | null;
}

export type DateTimeValueSequences = WorkersSet<DateTimeValueSequence>;

/** The finished messages of one window (`windowSeconds` 300, 900, 3600, 86400). */
export interface WorkerThroughputWindow {
  windowSeconds?: number;
  /** Finished messages, failed ones included. */
  handledCount?: number;
  failedCount?: number;
  /** Seconds worker processes were running in the window, added up. */
  workerSeconds?: number;
}

export type WorkerThroughputWindows = WorkersSet<WorkerThroughputWindow>;

/** One consumer of the worker list (`workers.yaml`). */
export interface WorkerConsumerDefinition {
  transport?: string;
  replicas?: number | null;
  min?: number | null;
  max?: number | null;
  scaleDownAfter?: number | null;
  limit?: number | null;
  memoryLimit?: string | null;
  devOnly?: boolean;
  messageLog?: string | null;
  busySilentSeconds?: number | null;
}

/** One transport of the overview. Counts and averages cover `recentWindowSeconds`; the sequences the last hour. */
export interface WorkerTransportOverview {
  transport?: string;
  isDefined?: boolean;
  definition?: WorkerConsumerDefinition | null;
  isAutoscaled?: boolean;
  effectiveMin?: number | null;
  effectiveMax?: number | null;
  waitingState?: WorkerWaitingState | string | null;
  /** null: the queue could not be counted ("unknown", never 0). */
  waiting?: number | null;
  waitingSampledAt?: string | null;
  inFlight?: number;
  liveProcessCount?: number;
  state?: WorkerTransportState | string | null;
  stuckSince?: string | null;
  restartPending?: boolean;
  handledCount?: number;
  thrownCount?: number;
  caughtCount?: number;
  durationAverageMs?: number | null;
  waitAverageMs?: number | null;
  lastErrorClass?: string | null;
  lastErrorMessage?: string | null;
  lastErrorAt?: string | null;
  throughputWindows?: WorkerThroughputWindows;
  sequences?: DateTimeValueSequences;
}

/** A worker process (`WorkerProcess`); `transport` is comma-separated when a process consumes several. */
export interface WorkerProcess {
  id?: number | string | null;
  processKey?: string | null;
  hostName?: string | null;
  processId?: number | null;
  transport?: string | null;
  startedAt?: string | null;
  firstMessageAt?: string | null;
  lastSeenAt?: string | null;
  state?: string | null;
  displayState?: WorkerProcessDisplayState | string | null;
  handledCount?: number;
  failedCount?: number;
  memoryBytes?: number | null;
  memoryPeakBytes?: number | null;
  currentMessageClass?: string | null;
  currentMessageSince?: string | null;
  stoppedAt?: string | null;
  /** Inferred: `MESSAGE_LIMIT`, `TIME_LIMIT`, `MEMORY_LIMIT`, `FAILURE_LIMIT`, `RESTART_REQUESTED`, `SIGNAL`, `OTHER`, `LOST`. */
  stopReason?: string | null;
  restartRequestedAt?: string | null;
}

export type WorkerProcesses = WorkersSet<WorkerProcess>;

/** A loop of the worker list: listed, not monitored. */
export interface WorkerLoopDefinition {
  name?: string;
  args?: string | null;
  sleepSeconds?: number | null;
  prodOnly?: boolean;
}

export interface WorkersTotals {
  /** null: not every queue could be counted. */
  waiting?: number | null;
  inFlight?: number;
  liveProcessCount?: number;
  handledCountLastHour?: number;
  failedCountLastHour?: number;
  sequences?: DateTimeValueSequences;
  throughputWindows?: WorkerThroughputWindows;
}

export interface WorkersOverview {
  generatedAt?: string | null;
  monitoringEnabled?: boolean;
  samplerActive?: boolean;
  sequenceWindowSeconds?: number;
  stepSeconds?: number;
  recentWindowSeconds?: number;
  totals?: WorkersTotals;
  transports?: WorkersSet<WorkerTransportOverview>;
  /** The live processes of every transport, each with its display state. */
  processes?: WorkerProcesses;
  loops?: WorkersSet<WorkerLoopDefinition>;
}

/** What the workers of one transport did per message class in the window. */
export interface WorkerMessageClassStat {
  messageClass?: string;
  handledCount?: number;
  thrownCount?: number;
  caughtCount?: number;
  redeliveredCount?: number;
  durationAverageMs?: number | null;
  durationMaxMs?: number | null;
  waitAverageMs?: number | null;
  waitMaxMs?: number | null;
  lastErrorClass?: string | null;
  lastErrorMessage?: string | null;
  lastErrorAt?: string | null;
}

/** A window (`UtcTimeInterval`): `startDate` and `endDate` as ISO 8601 UTC. */
export interface WorkersInterval {
  startDate?: string | null;
  endDate?: string | null;
}

export interface WorkerTransportDetail {
  transport?: WorkerTransportOverview;
  recentWindowSeconds?: number;
  interval?: WorkersInterval | null;
  stepSeconds?: number;
  sequences?: DateTimeValueSequences;
  messageClasses?: WorkersSet<WorkerMessageClassStat>;
  /** The live processes of the transport. */
  processes?: WorkerProcesses;
}

export interface WorkerTransportHistory {
  /** Empty in `totals`. */
  transport?: string;
  sequences?: DateTimeValueSequences;
}

export interface WorkersHistory {
  interval?: WorkersInterval | null;
  stepSeconds?: number;
  transports?: WorkersSet<WorkerTransportHistory>;
  /** Every transport together, counted by the backend (never sum the transports in the client). */
  totals?: WorkerTransportHistory;
}

export interface WorkerMessageRun {
  id?: number | string | null;
  transport?: string | null;
  messageClass?: string | null;
  processKey?: string | null;
  dispatchedAt?: string | null;
  dispatchedFromRoute?: string | null;
  dispatchedFromCommand?: string | null;
  startedAt?: string | null;
  durationMs?: number | null;
  /** null: the message carried no dispatch time. */
  waitMs?: number | null;
  outcome?: WorkerMessageOutcome | string | null;
  attempt?: number | null;
  willRetry?: boolean | null;
  errorClass?: string | null;
  errorMessage?: string | null;
  issueGroupHash?: string | null;
}

// ── request arguments and responses ─────────────────────────────────────────────────────────────────────────────────

/** A chart window: `from` / `to` UTC (ISO 8601 or `Y-m-d H:i:s`), `stepSeconds` 60, 300, 900 or 3600. */
export interface WorkersWindowArg {
  from?: string;
  to?: string;
  stepSeconds?: number;
}

export interface WorkerTransportArg extends WorkersWindowArg {
  transport: string;
}

/** A paged list of one transport (QueryOptions: `filters`, `orderBy`, `top`, `skip`). */
export interface WorkerTransportListArg {
  transport: string;
  filters?: string;
  orderBy?: string;
  top?: number;
  skip?: number;
}

/** `{}` asks every live process; `{ transport }` those of one transport. */
export interface WorkersRestartArg {
  transport?: string;
}

export interface WorkersOverviewResponse {
  workersOverview: WorkersOverview;
}

export interface WorkersHistoryResponse {
  workersHistory: WorkersHistory;
}

export interface WorkerTransportDetailResponse {
  workerTransportDetail: WorkerTransportDetail;
}

export interface WorkerMessageRunsResponse {
  workerMessageRuns: WorkersSet<WorkerMessageRun>;
}

export interface WorkerProcessesResponse {
  workerProcesses: WorkerProcesses;
}

export interface WorkersRestartResponse {
  requestedProcessCount: number;
  workerProcesses: WorkerProcesses;
}
