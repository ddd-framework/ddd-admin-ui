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

/** `31 Jan, 10:00` on the server's wall clock, in the UI language (`seconds` adds them); `—` without a value. */
export const formatCronDateTime = (value: string | number | null | undefined, options: { seconds?: boolean; year?: boolean } = {}): string => {
  const ms = typeof value === 'number' ? value : parseCronTime(value);
  if (ms === null) return '—';
  return new Intl.DateTimeFormat(getUiLocale(), {
    day: 'numeric',
    month: 'short',
    ...(options.year ? { year: 'numeric' } : {}),
    hour: '2-digit',
    minute: '2-digit',
    ...(options.seconds ? { second: '2-digit' } : {}),
    timeZone: 'UTC',
  }).format(new Date(ms));
};

/** `10:00` on the server's wall clock. */
export const formatCronClock = (ms: number): string =>
  new Intl.DateTimeFormat(getUiLocale(), { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }).format(new Date(ms));

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
