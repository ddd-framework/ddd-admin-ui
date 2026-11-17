// Sample payloads of the ./crons endpoints (`CronsControllerTrait`): the showcase and the checks render the crons
// screens with them through `createStaticCronsApi`, and a host can use them in its own design reviews. The server's
// clock stands at 2026-01-31 10:00:00.
import type { StaticCronsData } from '../crons/api.ts';
import type {
  CronDetailResponse,
  CronExecutionOverview,
  CronExecutionsListArg,
  CronExecutionsListResponse,
  CronOverview,
  CronsListResponse,
  CronsTimelineResponse,
  CronStatus,
} from '../crons/types.ts';
import { staticQueryFailure } from '../logic/pure/injectedApi.ts';

const NOW_MS = Date.UTC(2026, 0, 31, 10, 0, 0);
const pad = (value: number) => String(value).padStart(2, '0');
/** A time on the server's clock, `Y-m-d H:i:s`. */
const serverTime = (ms: number): string => {
  const date = new Date(ms);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
};
const MINUTE = 60_000;

interface CronSeed {
  id: number;
  name: string;
  description: string;
  schedule: string;
  commandName: string;
  arguments: string | null;
  isActive: boolean;
  status: CronStatus;
  everyMinutes: number;
  durationMs: number;
  /** Indices (0 = newest) of failed runs. */
  failed: readonly number[];
  nextInMs: number;
  running?: boolean;
  commandExists?: boolean;
}

const SEEDS: readonly CronSeed[] = [
  {
    id: 1, name: 'send-reminders', description: 'Sends the reminder mails of appointments due tomorrow', schedule: '*/5 * * * *',
    commandName: 'app:reminders:send', arguments: '--limit=500', isActive: true, status: 'OK', everyMinutes: 5, durationMs: 4200, failed: [11], nextInMs: 3 * MINUTE + 20_000,
  },
  {
    id: 2, name: 'rebuild-search-index', description: 'Rebuilds the search index of the changed items', schedule: '0 * * * *',
    commandName: 'app:search:reindex', arguments: '--changed', isActive: true, status: 'FAILING', everyMinutes: 60, durationMs: 96_000, failed: [0, 1, 4], nextInMs: 60 * MINUTE,
  },
  {
    id: 3, name: 'sync-exchange-rates', description: 'Fetches the exchange rates of the day from the provider', schedule: '0 3 * * *',
    commandName: 'app:rates:sync', arguments: null, isActive: true, status: 'RUNNING', everyMinutes: 1440, durationMs: 31_000, failed: [], nextInMs: 17 * 60 * MINUTE, running: true,
  },
  {
    id: 4, name: 'cleanup-sessions', description: 'Deletes the sessions that expired more than a week ago', schedule: '*/15 * * * *',
    commandName: 'app:sessions:cleanup', arguments: null, isActive: true, status: 'OVERDUE', everyMinutes: 15, durationMs: 800, failed: [], nextInMs: -6 * MINUTE,
  },
  {
    id: 5, name: 'sample-workers', description: 'Samples the queues and closes lost worker processes', schedule: '* * * * *',
    commandName: 'app:workers:sample', arguments: null, isActive: false, status: 'PAUSED', everyMinutes: 1, durationMs: 1500, failed: [], nextInMs: 1 * MINUTE,
  },
  {
    id: 6, name: 'export-legacy-report', description: 'Writes the nightly report of the old export format', schedule: '30 2 * * 1',
    commandName: 'app:legacy:export', arguments: '--format=csv', isActive: true, status: 'MISSING_COMMAND', everyMinutes: 10_080, durationMs: 12_000, failed: [], nextInMs: 2 * 1440 * MINUTE, commandExists: false,
  },
];

const OUTPUT_OK = 'Done: 128 processed, 0 skipped.';
const OUTPUT_FAILED = 'In SearchIndexer.php line 88: Connection refused (search backend at port 9200)';

/** The runs of one Cron, newest first: `count` ended ones (plus a running one first when it runs). */
const runsOf = (seed: CronSeed, count: number): CronExecutionOverview[] => {
  const runs: CronExecutionOverview[] = [];
  let id = seed.id * 1000;
  if (seed.running) {
    runs.push({ id: id++, cronId: seed.id, cronName: seed.name, startedAt: serverTime(NOW_MS - 20_000), endedAt: null, durationMs: null, state: 'RUNNING', executionState: null, outputPreview: null, outputLength: 0 });
  }
  const startOffset = seed.status === 'OVERDUE' ? 21 * MINUTE : 2 * MINUTE;
  for (let index = 0; index < count; index++) {
    const failed = seed.failed.includes(index);
    const startedMs = NOW_MS - startOffset - index * seed.everyMinutes * MINUTE - (seed.running ? seed.everyMinutes * MINUTE : 0);
    const durationMs = failed ? Math.round(seed.durationMs * 0.4) : Math.round(seed.durationMs * (0.7 + ((index * 37) % 60) / 100));
    runs.push({
      id: id++,
      cronId: seed.id,
      cronName: seed.name,
      startedAt: serverTime(startedMs),
      endedAt: serverTime(startedMs + durationMs),
      durationMs,
      state: 'ENDED',
      executionState: failed ? 'FAILED' : 'SUCCESSFUL',
      outputPreview: failed ? OUTPUT_FAILED : OUTPUT_OK,
      outputLength: failed ? 2400 : 180,
    });
  }
  return runs;
};

const statsOf = (runs: readonly CronExecutionOverview[]) => {
  const ended = runs.filter(run => run.state === 'ENDED');
  const failureCount = ended.filter(run => run.executionState === 'FAILED').length;
  const durations = ended.map(run => run.durationMs ?? 0);
  return {
    runCount: ended.length,
    failureCount,
    successRate: ended.length ? (ended.length - failureCount) / ended.length : null,
    averageDurationMs: durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : null,
    maxDurationMs: durations.length ? Math.max(...durations) : null,
  };
};

const cronOf = (seed: CronSeed): CronOverview => {
  const runs = seed.status === 'MISSING_COMMAND' ? runsOf(seed, 3) : runsOf(seed, 30);
  const in24h = runs.filter(run => (NOW_MS - (Date.parse(`${run.startedAt?.replace(' ', 'T')}Z`) || 0)) <= 1440 * MINUTE);
  return {
    id: seed.id,
    name: seed.name,
    description: seed.description,
    schedule: seed.schedule,
    command: [seed.commandName, seed.arguments].filter(Boolean).join(' '),
    commandName: seed.commandName,
    arguments: seed.arguments,
    isActive: seed.isActive,
    commandExists: seed.commandExists ?? true,
    commandSchedulable: seed.commandExists !== false,
    status: seed.status,
    lastExecutionStartedAt: runs[0]?.startedAt ?? null,
    nextExecutionScheduledAt: serverTime(NOW_MS + seed.nextInMs),
    created: serverTime(NOW_MS - 90 * 1440 * MINUTE),
    updated: serverTime(NOW_MS - 3 * 1440 * MINUTE),
    lastExecution: runs[0] ?? null,
    recentExecutions: { elements: runs },
    stats24h: statsOf(in24h),
  };
};

const CRONS = SEEDS.map(cronOf);

const list: CronsListResponse = {
  crons: { elements: CRONS },
  runner: {
    serverNow: serverTime(NOW_MS),
    lastRunStartedAt: serverTime(NOW_MS - 20_000),
    activeCount: CRONS.filter(cron => cron.isActive).length,
    pausedCount: CRONS.filter(cron => !cron.isActive).length,
    runningCount: 1,
    overdueCount: 1,
    failingCount: 1,
    missingCommandCount: 1,
    runCount24h: 412,
    failureCount24h: 5,
  },
};

const allRuns = CRONS.flatMap(cron => cron.recentExecutions?.elements ?? []).sort((left, right) => (right.startedAt ?? '').localeCompare(left.startedAt ?? ''));

const executions = ({ cronId, result = 'ALL', limit = 50, offset = 0 }: CronExecutionsListArg): CronExecutionsListResponse => {
  const matching = allRuns.filter(
    run =>
      (cronId === undefined || run.cronId === cronId) &&
      (result === 'ALL' || (result === 'RUNNING' ? run.state === 'RUNNING' : run.state === 'ENDED' && run.executionState === result))
  );
  return { executions: { elements: matching.slice(offset, offset + limit) }, totalCount: matching.length };
};

const timeline = ({ hours = 24 }: { hours?: number }): CronsTimelineResponse => {
  const bucketMinutes = hours <= 24 ? 15 : 60;
  const fromMs = NOW_MS - hours * 60 * MINUTE;
  return {
    from: serverTime(fromMs),
    to: serverTime(NOW_MS),
    bucketMinutes,
    lanes: {
      elements: CRONS.map(cron => {
        const buckets = new Map<number, { runCount: number; failureCount: number; maxDurationMs: number }>();
        for (const run of cron.recentExecutions?.elements ?? []) {
          const ms = Date.parse(`${run.startedAt?.replace(' ', 'T')}Z`);
          if (!(ms >= fromMs)) continue;
          const start = Math.floor(ms / (bucketMinutes * MINUTE)) * bucketMinutes * MINUTE;
          const bucket = buckets.get(start) ?? { runCount: 0, failureCount: 0, maxDurationMs: 0 };
          bucket.runCount += 1;
          if (run.executionState === 'FAILED') bucket.failureCount += 1;
          bucket.maxDurationMs = Math.max(bucket.maxDurationMs, run.durationMs ?? 0);
          buckets.set(start, bucket);
        }
        return {
          cronId: cron.id,
          cronName: cron.name,
          buckets: { elements: [...buckets.entries()].sort(([left], [right]) => left - right).map(([start, bucket]) => ({ startsAt: serverTime(start), ...bucket })) },
        };
      }),
    },
  };
};

const detail = ({ cronId }: { cronId: number }): CronDetailResponse | ReturnType<typeof staticQueryFailure> => {
  const cron = CRONS.find(candidate => candidate.id === cronId);
  if (!cron) return staticQueryFailure({ status: 404, data: { error: `No Cron ${cronId}` } });
  const seed = SEEDS.find(candidate => candidate.id === cronId);
  const ended = (cron.recentExecutions?.elements ?? []).filter(run => run.state === 'ENDED');
  const nextStart = NOW_MS + (seed?.nextInMs ?? 0);
  return {
    cron,
    nextRuns: {
      elements:
        cron.isActive && cron.status !== 'MISSING_COMMAND'
          ? Array.from({ length: 5 }, (_, index) => ({ scheduledAt: serverTime(nextStart + index * (seed?.everyMinutes ?? 60) * MINUTE) }))
          : [],
    },
    stats14d: statsOf(ended),
    durationHistory: { elements: [...ended].reverse().map(run => ({ ...run, outputPreview: null })) },
    serverNow: serverTime(NOW_MS),
  };
};

const conflict = (message: string) => ({ status: 409, data: { error: message } });

/** Sample payloads of the crons endpoints: six Crons in every status, their runs, a 24-hour timeline, the commands. */
export const showcaseCronsData: StaticCronsData = {
  list,
  executions,
  execution: ({ executionId }) => {
    const run = allRuns.find(candidate => candidate.id === executionId);
    if (!run) return staticQueryFailure({ status: 404, data: { error: `No run ${executionId}` } });
    const output =
      run.executionState === 'FAILED'
        ? `Rebuilding the search index of 3,412 changed items\n${OUTPUT_FAILED}\n\nStack trace:\n#0 src/Search/SearchIndexer.php(88): SearchClient->bulk()\n#1 src/Commands/ReindexCommand.php(41): SearchIndexer->reindexChanged()\n#2 {main}`
        : run.state === 'RUNNING'
          ? ''
          : `Starting ${run.cronName}\n${OUTPUT_OK}`;
    return { execution: run, output };
  },
  timeline,
  commands: {
    commands: {
      elements: [
        { name: 'app:issues:sync-registry-from-log-backend', description: 'Reads new error events into the issues registry', usedByCronNames: [] },
        { name: 'app:rates:sync', description: 'Fetches the exchange rates of the day', usedByCronNames: ['sync-exchange-rates'] },
        { name: 'app:reminders:send', description: 'Sends the reminder mails that are due', usedByCronNames: ['send-reminders'] },
        { name: 'app:search:reindex', description: 'Rebuilds the search index', usedByCronNames: ['rebuild-search-index'] },
        { name: 'app:sessions:cleanup', description: 'Deletes expired sessions', usedByCronNames: ['cleanup-sessions'] },
        { name: 'app:workers:sample', description: 'Samples the worker queues', usedByCronNames: ['sample-workers'] },
      ],
    },
  },
  schedulePreview: ({ schedule }) => {
    const fields = schedule.trim().split(/\s+/);
    if (fields.length !== 5) {
      return { isValid: false, error: "This isn't a valid cron expression. Use five fields: minute, hour, day of month, month, day of week.", nextRuns: { elements: [] } };
    }
    const step = /^\*\/(\d+)$/.exec(fields[0] ?? '')?.[1];
    const stepMinutes = step ? Number(step) : fields[1] === '*' ? 60 : 1440;
    const first = Math.ceil((NOW_MS + 1) / (stepMinutes * MINUTE)) * stepMinutes * MINUTE;
    return { isValid: true, error: null, nextRuns: { elements: Array.from({ length: 5 }, (_, index) => ({ scheduledAt: serverTime(first + index * stepMinutes * MINUTE) })) } };
  },
  detail,
  activate: ({ cronId }) => {
    const cron = CRONS.find(candidate => candidate.id === cronId);
    if (!cron) throw { status: 404, data: { error: `No Cron ${cronId}` } };
    return { cron: { ...cron, isActive: true, status: cron.status === 'PAUSED' ? 'OK' : cron.status } };
  },
  deactivate: ({ cronId }) => {
    const cron = CRONS.find(candidate => candidate.id === cronId);
    if (!cron) throw { status: 404, data: { error: `No Cron ${cronId}` } };
    return { cron: { ...cron, isActive: false, status: cron.status === 'MISSING_COMMAND' ? cron.status : 'PAUSED' } };
  },
  runNow: ({ cronId }) => {
    const cron = CRONS.find(candidate => candidate.id === cronId);
    if (!cron) throw { status: 404, data: { error: `No Cron ${cronId}` } };
    if (!cron.isActive) throw conflict(`The Cron ${cron.name} is switched off: switch it on to run it.`);
    if (cron.status === 'RUNNING') throw conflict(`The Cron ${cron.name} is running: wait until the run has finished.`);
    return { cron: { ...cron, nextExecutionScheduledAt: serverTime(NOW_MS) } };
  },
  remove: ({ cronId }) => {
    const cron = CRONS.find(candidate => candidate.id === cronId);
    if (cron?.status === 'RUNNING') throw conflict(`The Cron ${cron.name} is running and cannot be deleted now.`);
    return { deletedCronId: cronId };
  },
};
