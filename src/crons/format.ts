import { m } from '../i18n/store.ts';
import { getUiLocale, uiNumberFormat, uiRelativeTimeFormat } from '../i18n/format.ts';
import type { TranslateFn } from '../i18n/useTranslate.ts';
import type { CronCreateBody, CronExecutionOverview, CronOverview, CronUpdateBody } from './types.ts';

/**
 * Pure helpers of the crons screens. The API's date-times are wall-clock text on the server's clock
 * (`2026-01-31 10:00:00`, no zone): they are read as if they were UTC, so two of them subtract to the right span, and
 * shown in UTC, so the text is the server's wall clock again. Countdowns subtract from `runner.serverNow`, never from
 * the browser clock.
 */

const WALL_CLOCK = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/;

/** A server date-time as ms of its wall clock (read as UTC); `null` when it cannot be read. */
export const parseCronTime = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const match = WALL_CLOCK.exec(value.trim());
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match;
  const ms = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second ?? 0));
  return Number.isNaN(ms) ? null : ms;
};

/**
 * `31 Jan, 10:00` on the server's wall clock, in the UI language (`seconds` adds them); `—` without a value. With
 * `viewerOffsetMs` (how far the server clock runs ahead of UTC, `estimateCronServerOffsetMs`) the time is converted to
 * and shown in the viewer's own time zone instead.
 */
export const formatCronDateTime = (
  value: string | number | null | undefined,
  options: { seconds?: boolean; year?: boolean; viewerOffsetMs?: number | null } = {}
): string => {
  const ms = typeof value === 'number' ? value : parseCronTime(value);
  if (ms === null) return '—';
  const viewerOffsetMs = options.viewerOffsetMs;
  const viewer = typeof viewerOffsetMs === 'number';
  return new Intl.DateTimeFormat(getUiLocale(), {
    day: 'numeric',
    month: 'short',
    ...(options.year ? { year: 'numeric' } : {}),
    hour: '2-digit',
    minute: '2-digit',
    ...(options.seconds ? { second: '2-digit' } : {}),
    ...(viewer ? {} : { timeZone: 'UTC' }),
  }).format(new Date(viewer ? ms - viewerOffsetMs : ms));
};

/** `10:00` on the server's wall clock (with `viewerOffsetMs`: in the viewer's time zone). */
export const formatCronClock = (ms: number, viewerOffsetMs?: number | null): string =>
  typeof viewerOffsetMs === 'number'
    ? new Intl.DateTimeFormat(getUiLocale(), { hour: '2-digit', minute: '2-digit' }).format(new Date(ms - viewerOffsetMs))
    : new Intl.DateTimeFormat(getUiLocale(), { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }).format(new Date(ms));

/** Every time zone in use is a multiple of 15 minutes off UTC. */
const OFFSET_STEP_MS = 15 * 60_000;

/**
 * How far the server's wall clock runs ahead of UTC, in ms (`3_600_000` for a server on UTC+1): its `serverNow`
 * against the browser's clock when the answer arrived, rounded to 15 minutes (latency and a little clock skew do not
 * count). `null` without a readable `serverNow`.
 */
export const estimateCronServerOffsetMs = (serverNow: string | null | undefined, browserNowMs: number): number | null => {
  const serverMs = parseCronTime(serverNow);
  if (serverMs === null) return null;
  return Math.round((serverMs - browserNowMs) / OFFSET_STEP_MS) * OFFSET_STEP_MS || 0;
};

/** `< 1 s`, `12 s`, `2 min 5 s`, `1 h 5 min` (the server measures whole seconds); `—` without a value. */
export const formatCronDuration = (durationMs: number | null | undefined): string => {
  if (durationMs === null || durationMs === undefined) return '—';
  if (durationMs < 1000) return '< 1 s';
  const seconds = Math.round(durationMs / 1000);
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds - minutes * 60;
  if (minutes < 60) return restSeconds > 0 ? `${minutes} min ${restSeconds} s` : `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes - hours * 60;
  return restMinutes > 0 ? `${hours} h ${restMinutes} min` : `${hours} h`;
};

const RELATIVE_UNITS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
  ['second', 1000],
];

/** `in 4 min` / `5 min ago` for `targetMs` against `nowMs` (both on the server's clock), in the UI language. */
export const formatCronRelative = (targetMs: number, nowMs: number): string => {
  const formatter = uiRelativeTimeFormat({ numeric: 'auto', style: 'short' });
  const diff = targetMs - nowMs;
  for (const [unit, size] of RELATIVE_UNITS) {
    if (Math.abs(diff) >= size) return formatter.format(Math.round(diff / size), unit);
  }
  return formatter.format(0, 'second');
};

/** What the next-run cell says. */
export type CronNextRunState =
  | { kind: 'paused' }
  | { kind: 'missingCommand' }
  | { kind: 'running' }
  | { kind: 'unknown' }
  | { kind: 'due'; atMs: number; inMs: number };

/**
 * The next run of a Cron against the server's clock: none while paused or its command is missing, `running` while a run
 * is in progress, else the slot and the time to it (negative: overdue).
 */
export const cronNextRunState = (cron: Pick<CronOverview, 'status' | 'isActive' | 'nextExecutionScheduledAt'>, serverNowMs: number | null): CronNextRunState => {
  if (cron.status === 'MISSING_COMMAND') return { kind: 'missingCommand' };
  if (!cron.isActive || cron.status === 'PAUSED') return { kind: 'paused' };
  if (cron.status === 'RUNNING') return { kind: 'running' };
  const atMs = parseCronTime(cron.nextExecutionScheduledAt);
  if (atMs === null || serverNowMs === null) return { kind: 'unknown' };
  return { kind: 'due', atMs, inMs: atMs - serverNowMs };
};

/** A share 0–1 as `97 %` in the UI language; `—` without a value. */
export const formatCronRate = (rate: number | null | undefined): string =>
  rate === null || rate === undefined ? '—' : uiNumberFormat({ style: 'percent', maximumFractionDigits: rate > 0.99 && rate < 1 ? 1 : 0 }).format(rate);

/** A count in the UI language; `—` without a value. */
export const formatCronCount = (value: number | null | undefined): string =>
  value === null || value === undefined ? '—' : uiNumberFormat().format(value);

// ── schedules ───────────────────────────────────────────────────────────────────────────────────────────────────────

/** One-click schedules of the form. */
export const CRON_SCHEDULE_PRESETS: readonly { expression: string; label: string }[] = [
  { expression: '*/5 * * * *', label: m('Every 5 minutes') },
  { expression: '*/15 * * * *', label: m('Every 15 minutes') },
  { expression: '0 * * * *', label: m('Hourly') },
  { expression: '0 3 * * *', label: m('Daily at 03:00') },
  { expression: '0 6 * * 1', label: m('Mondays at 06:00') },
];

const isInteger = (value: string) => /^\d+$/.test(value);
const inRange = (value: string, min: number, max: number) => isInteger(value) && Number(value) >= min && Number(value) <= max;
const pad = (value: number) => String(value).padStart(2, '0');

const weekdayName = (dayOfWeek: number): string =>
  // 7 January 2024 is a Sunday: day N of that week has weekday N (cron: 0 and 7 are Sunday)
  new Intl.DateTimeFormat(getUiLocale(), { weekday: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, 7 + (dayOfWeek % 7))));

/**
 * The common cron shapes as a sentence in the UI language, on the server's clock (`Daily at 03:00`); anything else is
 * `Custom schedule` (the expression stays visible beside it). `*\/N` reads "every N" only when N divides the unit.
 */
export const describeCronSchedule = (expression: string, t: TranslateFn): string => {
  const fields = expression.trim().split(/\s+/);
  const custom = t('Custom schedule');
  if (fields.length !== 5) return custom;
  const [minute = '', hour = '', dayOfMonth = '', month = '', dayOfWeek = ''] = fields;
  if (month !== '*') return custom;
  if (minute === '*' && hour === '*' && dayOfMonth === '*' && dayOfWeek === '*') return t('Every minute');

  const everyMinutes = /^\*\/(\d+)$/.exec(minute);
  if (everyMinutes && hour === '*' && dayOfMonth === '*' && dayOfWeek === '*') {
    const count = Number(everyMinutes[1]);
    if (count === 1) return t('Every minute');
    return count > 1 && count < 60 && 60 % count === 0 ? t('{count, plural, one {Every # minute} other {Every # minutes}}', { count }) : custom;
  }
  if (inRange(minute, 0, 59) && dayOfMonth === '*' && dayOfWeek === '*') {
    if (hour === '*') return t('Hourly at :%minute%', { replacements: { minute: pad(Number(minute)) } });
    const everyHours = /^\*\/(\d+)$/.exec(hour);
    if (everyHours) {
      const count = Number(everyHours[1]);
      return minute === '0' && count > 1 && count < 24 && 24 % count === 0
        ? t('{count, plural, one {Every # hour} other {Every # hours}}', { count })
        : custom;
    }
  }
  if (!inRange(minute, 0, 59) || !inRange(hour, 0, 23)) return custom;
  const time = `${pad(Number(hour))}:${pad(Number(minute))}`;
  if (dayOfMonth === '*' && dayOfWeek === '*') return t('Daily at %time%', { replacements: { time } });
  if (dayOfMonth === '*' && inRange(dayOfWeek, 0, 7)) {
    return t('Weekly on %weekday% at %time%', { replacements: { weekday: weekdayName(Number(dayOfWeek)), time } });
  }
  if (dayOfWeek === '*' && inRange(dayOfMonth, 1, 31)) return t('Monthly on day %day% at %time%', { replacements: { day: dayOfMonth, time } });
  return custom;
};

// ── commands and writes ─────────────────────────────────────────────────────────────────────────────────────────────

/** The command line the runner executes: the command name and the arguments, whitespace collapsed. */
export const composeCronCommandLine = (commandName: string, args: string | null | undefined): string =>
  [commandName.trim(), (args ?? '').trim().replace(/\s+/g, ' ')].filter(Boolean).join(' ');

/** The form's values of a Cron (all strings, `isActive` a flag). */
export interface CronFormValues {
  name: string;
  description: string;
  schedule: string;
  commandName: string;
  arguments: string;
  isActive: boolean;
}

export const EMPTY_CRON_FORM: CronFormValues = { name: '', description: '', schedule: '', commandName: '', arguments: '', isActive: true };

/** The form's values of a stored Cron. */
export const toCronFormValues = (cron: CronOverview): CronFormValues => ({
  name: cron.name,
  description: cron.description ?? '',
  schedule: cron.schedule,
  commandName: cron.commandName ?? '',
  arguments: cron.arguments ?? '',
  isActive: cron.isActive,
});

/** The create body of the form's values (trimmed; no arguments → `null`). */
export const toCronCreateBody = (values: CronFormValues): CronCreateBody => ({
  name: values.name.trim(),
  description: values.description.trim(),
  schedule: values.schedule.trim(),
  commandName: values.commandName,
  arguments: values.arguments.trim() === '' ? null : values.arguments.trim(),
  isActive: values.isActive,
});

/**
 * The PATCH body of an edit: only the fields that differ from the stored Cron (trimmed; cleared arguments are `''`,
 * which clears them on the server). An empty object means nothing changed.
 */
export const changedCronFields = (baseline: CronFormValues, values: CronFormValues): CronUpdateBody => {
  const changes: CronUpdateBody = {};
  for (const field of ['name', 'description', 'schedule', 'commandName', 'arguments'] as const) {
    const next = values[field].trim();
    if (next !== baseline[field].trim()) changes[field] = next;
  }
  if (values.isActive !== baseline.isActive) changes.isActive = values.isActive;
  return changes;
};

/** Kebab-case of the API: 3 to 80 lowercase letters, digits and single hyphens. */
export const isCronName = (name: string): boolean => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) && name.length >= 3 && name.length <= 80;

/** Arguments the API takes: one line, no quote characters. */
export const isCronArguments = (args: string): boolean => !/["'`\r\n]/.test(args);

/** Why Run now is not offered, as a sentence; `null` when it is. */
export const runNowBlockedReason = (cron: Pick<CronOverview, 'status' | 'isActive' | 'commandExists'>, t: TranslateFn): string | null => {
  if (cron.status === 'MISSING_COMMAND' || cron.commandExists === false) return t('This build does not have its command.');
  if (!cron.isActive) return t('Switch it on first.');
  if (cron.status === 'RUNNING') return t('It is running now.');
  return null;
};

/** Why Delete is not offered, as a sentence; `null` when it is. */
export const deleteBlockedReason = (cron: Pick<CronOverview, 'status'>, t: TranslateFn): string | null =>
  cron.status === 'RUNNING' ? t('Wait for the run to finish.') : null;

/** The runs of a Cron's strip, newest first, at most `limit` (the API sends the newest 30). */
export const recentRunsOf = (cron: Pick<CronOverview, 'recentExecutions'>, limit = 30): CronExecutionOverview[] =>
  (cron.recentExecutions?.elements ?? []).slice(0, limit);

/** True when every active Cron is overdue: the runner (`app:crons:execute` every minute) does not tick. */
export const isRunnerStalled = (runner: { activeCount?: number; overdueCount?: number }): boolean =>
  (runner.overdueCount ?? 0) > 0 && (runner.overdueCount ?? 0) >= (runner.activeCount ?? 0);

// ── names, order, filters, locked commands ──────────────────────────────────────────────────────────────────────────

/**
 * A Cron name in one comparable form: lower case, word breaks of camelCase and runs of `_`, `.`, `:`, spaces and
 * hyphens as one hyphen (`Nightly_Cleanup`, `nightlyCleanup` and `nightly-cleanup` match). Names stored before the
 * kebab-case rule keep their spelling; compare names with this, never with `===`.
 */
export const normalizeCronName = (name: string | null | undefined): string =>
  (name ?? '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[\s_.:-]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** A stored name from before the kebab-case rule (`Nightly_Cleanup`): an edit keeps it unless the name is changed. */
export const isLegacyCronName = (name: string): boolean => name !== '' && !isCronName(name);

/** The statuses from the worst to the best: what needs a hand first, a paused Cron last. */
export const CRON_STATUS_SEVERITY: readonly string[] = ['MISSING_COMMAND', 'FAILING', 'OVERDUE', 'RUNNING', 'OK', 'PAUSED'];

/** The rank of a status in `CRON_STATUS_SEVERITY` (an unknown status after the known ones). */
export const cronStatusRank = (status: string): number => {
  const index = CRON_STATUS_SEVERITY.indexOf(status);
  return index === -1 ? CRON_STATUS_SEVERITY.length : index;
};

/**
 * The order of the Crons list: `name` as the API sends them (by name), `severity` the worst status first, within a
 * status the most recent failure first, then the most recent run, then by name (`compareCronsBySeverity`).
 */
export type CronListSort = 'name' | 'severity';

/** The fields of a Cron the severity order reads. */
export type CronSeverityFields = Pick<CronOverview, 'name' | 'status'> &
  Partial<Pick<CronOverview, 'lastExecution' | 'lastExecutionStartedAt' | 'recentExecutions'>>;

/**
 * A host's order for `sort="severity"` (`CronsScreen.severityCompare`): gets the package's comparator to fall back on
 * or to wrap (`(left, right, compare) => hostRank(left) - hostRank(right) || compare(left, right)`).
 */
export type CronSeverityCompare<TCron extends CronSeverityFields = CronOverview> = (
  left: TCron,
  right: TCron,
  defaultCompare: (left: TCron, right: TCron) => number
) => number;

/**
 * The start of a Cron's most recent failed run (`Y-m-d H:i:s`, server clock), `null` without one: the last run when it
 * failed, else the newest failed run of `recentExecutions`.
 */
export const cronLastFailureAt = (cron: CronSeverityFields): string | null => {
  const runs = [...(cron.lastExecution ? [cron.lastExecution] : []), ...(cron.recentExecutions?.elements ?? [])];
  let latest: string | null = null;
  for (const run of runs) {
    if (run.executionState !== 'FAILED' || !run.startedAt) continue;
    if (latest === null || run.startedAt > latest) latest = run.startedAt;
  }
  return latest;
};

/** The start of a Cron's last run (`lastExecutionStartedAt`, else the last run's `startedAt`), `null` without one. */
export const cronLastRunAt = (cron: CronSeverityFields): string | null => cron.lastExecutionStartedAt || cron.lastExecution?.startedAt || null;

/** Newer first, a missing time last (the server's `Y-m-d H:i:s` sorts as text). */
const compareNewestFirst = (left: string | null, right: string | null): number =>
  left === right ? 0 : left === null ? 1 : right === null ? -1 : left > right ? -1 : 1;

/**
 * The package's severity order of two Crons: the worse status first (`CRON_STATUS_SEVERITY`), then the most recent
 * failure, then the most recent run, then by name.
 */
export const compareCronsBySeverity = (left: CronSeverityFields, right: CronSeverityFields): number =>
  cronStatusRank(left.status) - cronStatusRank(right.status) ||
  compareNewestFirst(cronLastFailureAt(left), cronLastFailureAt(right)) ||
  compareNewestFirst(cronLastRunAt(left), cronLastRunAt(right)) ||
  left.name.localeCompare(right.name);

/** The Crons in the given order (a new array); `severityCompare` replaces the package's comparator for `severity`. */
export const sortCrons = <TCron extends CronSeverityFields>(
  crons: readonly TCron[],
  sort: CronListSort,
  severityCompare?: CronSeverityCompare<TCron>
): TCron[] => {
  if (sort !== 'severity') return [...crons];
  const compare: (left: TCron, right: TCron) => number = compareCronsBySeverity;
  return [...crons].sort(severityCompare ? (left, right) => severityCompare(left, right, compare) : compare);
};

/**
 * A refresh interval in ms (`CronsScreen.detailsPollingIntervalMs`): a number, or a function of the shown Cron (fast
 * while a run is active). Without a loaded Cron the function form answers 0; a negative, fractional or non-finite
 * answer counts as 0 or is rounded down.
 */
export type CronPollingInterval = number | ((cron: CronOverview) => number);

/** The interval in ms for the Cron shown (0 = off). */
export const resolveCronPollingInterval = (interval: CronPollingInterval | undefined, cron: CronOverview | undefined): number => {
  const value = typeof interval === 'function' ? (cron ? interval(cron) : 0) : (interval ?? 0);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
};

/** The status filter of the Crons list: every status, the ones that need attention, or one status. */
export type CronStatusFilter = 'ALL' | 'ATTENTION' | 'MISSING_COMMAND' | 'PAUSED' | 'RUNNING' | 'OVERDUE' | 'FAILING' | 'OK';

/** The statuses "Need attention" covers (the summary tile's sum). */
export const CRON_ATTENTION_STATUSES: readonly string[] = ['MISSING_COMMAND', 'FAILING', 'OVERDUE'];

const STATUS_FILTER_VALUES: readonly CronStatusFilter[] = ['ATTENTION', 'MISSING_COMMAND', 'FAILING', 'OVERDUE', 'RUNNING', 'OK', 'PAUSED'];

/** Whether a Cron passes the status filter. */
export const matchesCronStatusFilter = (cron: Pick<CronOverview, 'status'>, filter: CronStatusFilter): boolean =>
  filter === 'ALL' ? true : filter === 'ATTENTION' ? CRON_ATTENTION_STATUSES.includes(cron.status) : cron.status === filter;

/** A status filter from the URL (`ALL` for anything else). */
export const toCronStatusFilter = (value: string | null | undefined): CronStatusFilter =>
  STATUS_FILTER_VALUES.find(filter => filter === value) ?? 'ALL';

/**
 * Why the edit form keeps a stored Cron's command as it is (read-only, with this reason): the command is missing from
 * this build, or it may not be scheduled from the admin (no `#[CronSchedulable]`, so the command list does not offer
 * it). `null` when it can be picked from the list.
 */
export const lockedCronCommandReason = (
  cron: Pick<CronOverview, 'commandName' | 'commandSchedulable' | 'commandExists'> | undefined,
  schedulableNames: readonly string[] | null,
  t: TranslateFn
): string | null => {
  if (!cron?.commandName) return null;
  if (cron.commandExists === false) return t('This build does not have this command; it is kept as stored.');
  const notSchedulable = cron.commandSchedulable === false || (schedulableNames !== null && !schedulableNames.includes(cron.commandName));
  return notSchedulable ? t('This command cannot be scheduled here; it is kept as stored.') : null;
};
