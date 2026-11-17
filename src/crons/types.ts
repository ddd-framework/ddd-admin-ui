/**
 * The payloads of Core's `CronsControllerTrait` (`DDD\Presentation\Api\Admin\Common\Crons`), written from the DTOs and
 * value objects of mgamadeus/ddd 3.35.1 (`DDD\Domain\Common\Entities\Crons`). Every set serialises as
 * `{ elements: [...] }`. Date-times are the framework's `Y-m-d H:i:s` on the server's clock (the PHP default time zone
 * the runner evaluates the schedules in), without a zone: compare them with each other (`runner.serverNow`), never
 * with the browser clock.
 */

export interface CronsSet<TElement> {
  elements?: TElement[];
}

/** `CronOverview::STATUS_*`, the first that applies. */
export type CronStatus = 'MISSING_COMMAND' | 'PAUSED' | 'RUNNING' | 'OVERDUE' | 'FAILING' | 'OK';
/** `CronExecution::STATE_*`. */
export type CronExecutionState = 'RUNNING' | 'ENDED';
/** `CronExecution::EXECUTION_STATE_*` (null while running). */
export type CronExecutionResult = 'SUCCESSFUL' | 'FAILED';
/** The result filter of the runs list (`CronExecutionsPage::RESULT_*`). */
export type CronExecutionsResultFilter = 'ALL' | 'SUCCESSFUL' | 'FAILED' | 'RUNNING';

/** One run (`CronExecutionOverview`). */
export interface CronExecutionOverview {
  id: number;
  cronId: number;
  cronName?: string;
  startedAt?: string | null;
  endedAt?: string | null;
  durationMs?: number | null;
  state?: CronExecutionState | string;
  executionState?: CronExecutionResult | string | null;
  /** The first non-empty output line, at most 200 characters. */
  outputPreview?: string | null;
  outputLength?: number;
}

export type CronExecutionOverviews = CronsSet<CronExecutionOverview>;

/** Ended runs of a period (`CronRunStatistics`). */
export interface CronRunStatistics {
  runCount?: number;
  failureCount?: number;
  /** 0–1; null without runs. */
  successRate?: number | null;
  averageDurationMs?: number | null;
  maxDurationMs?: number | null;
}

/** One Cron with its health (`CronOverview`): one row of `/list` and the answer of every write. */
export interface CronOverview {
  id: number;
  name: string;
  description?: string;
  schedule: string;
  /** The stored command line (`commandName arguments`). */
  command?: string;
  commandName?: string;
  arguments?: string | null;
  isActive: boolean;
  /** Whether the console of this build knows the command (`MISSING_COMMAND` otherwise). */
  commandExists?: boolean;
  /** Whether the command may be scheduled from the admin (`#[CronSchedulable]`). */
  commandSchedulable?: boolean;
  status: CronStatus | string;
  lastExecutionStartedAt?: string | null;
  nextExecutionScheduledAt?: string | null;
  created?: string | null;
  updated?: string | null;
  lastExecution?: CronExecutionOverview | null;
  /** The newest 30 runs, newest first. */
  recentExecutions?: CronExecutionOverviews;
  stats24h?: CronRunStatistics;
}

export type CronOverviews = CronsSet<CronOverview>;

/** The runner's summary (`CronRunnerSummary`). */
export interface CronRunnerSummary {
  serverNow: string;
  lastRunStartedAt?: string | null;
  activeCount?: number;
  pausedCount?: number;
  runningCount?: number;
  overdueCount?: number;
  /** By the last ended run, not by status. */
  failingCount?: number;
  missingCommandCount?: number;
  runCount24h?: number;
  failureCount24h?: number;
}

export interface CronScheduledRun {
  scheduledAt?: string | null;
}

export type CronScheduledRuns = CronsSet<CronScheduledRun>;

export interface CronTimelineBucket {
  startsAt?: string | null;
  runCount?: number;
  failureCount?: number;
  maxDurationMs?: number | null;
}

export interface CronTimelineLane {
  cronId: number;
  cronName?: string;
  /** Only the buckets with runs; a lane without buckets is an idle Cron. */
  buckets?: CronsSet<CronTimelineBucket>;
}

export interface CronSchedulableCommand {
  name: string;
  description?: string;
  usedByCronNames?: string[];
}

// ── responses ───────────────────────────────────────────────────────────────────────────────────────────────────────

/** `GET /list` (`CronsListGetResponseDto`). */
export interface CronsListResponse {
  crons: CronOverviews;
  runner: CronRunnerSummary;
}

/** `GET /executions/list` (`CronExecutionsListGetResponseDto`). */
export interface CronExecutionsListResponse {
  executions: CronExecutionOverviews;
  totalCount: number;
}

/** `GET /executions/{executionId}` (`CronExecutionDetailGetResponseDto`). */
export interface CronExecutionDetailResponse {
  execution: CronExecutionOverview;
  /** The full output (stdout, stderr, the executor's reason); empty when the run wrote none. */
  output: string;
}

/** `GET /timeline` (`CronsTimelineGetResponseDto`). */
export interface CronsTimelineResponse {
  from: string;
  to: string;
  /** 15 up to 24 hours, 60 above. */
  bucketMinutes: number;
  lanes: CronsSet<CronTimelineLane>;
}

/** `GET /commands` (`CronSchedulableCommandsGetResponseDto`). */
export interface CronSchedulableCommandsResponse {
  commands: CronsSet<CronSchedulableCommand>;
}

/** `GET /schedule-preview` (`CronSchedulePreviewGetResponseDto`): an invalid expression is a 200 with `isValid` false. */
export interface CronSchedulePreviewResponse {
  isValid: boolean;
  error?: string | null;
  nextRuns: CronScheduledRuns;
}

/** `GET /{cronId}` (`CronDetailGetResponseDto`). */
export interface CronDetailResponse {
  cron: CronOverview;
  /** The next 5 slots; empty when paused or the command is missing. */
  nextRuns: CronScheduledRuns;
  stats14d: CronRunStatistics;
  /** The last 100 ended runs, oldest first, without output preview. */
  durationHistory: CronExecutionOverviews;
  serverNow: string;
}

/** Every write but delete (`CronGetResponseDto`): the Cron as it is now. */
export interface CronResponse {
  cron: CronOverview;
}

/** `DELETE /{cronId}` (`CronDeleteResponseDto`). */
export interface CronDeleteResponse {
  deletedCronId: number;
}

// ── arguments ───────────────────────────────────────────────────────────────────────────────────────────────────────

export interface CronExecutionsListArg {
  cronId?: number;
  result?: CronExecutionsResultFilter;
  /** 1–200, default 50. */
  limit?: number;
  offset?: number;
}

export interface CronExecutionArg {
  executionId: number;
}

export interface CronsTimelineArg {
  /** 1–168, default 24. */
  hours?: number;
}

export interface CronSchedulePreviewArg {
  schedule: string;
}

export interface CronIdArg {
  cronId: number;
}

/** `POST ''` (`CronCreateRequestDto`). */
export interface CronCreateBody {
  name: string;
  description: string;
  schedule: string;
  commandName: string;
  arguments?: string | null;
  isActive?: boolean;
}

/** `PATCH /{cronId}` (`CronUpdateRequestDto`): only the sent fields change; `arguments: ''` clears them. */
export interface CronUpdateBody {
  name?: string;
  description?: string;
  schedule?: string;
  commandName?: string;
  arguments?: string;
  isActive?: boolean;
}

export interface CronUpdateArg extends CronUpdateBody {
  cronId: number;
}
