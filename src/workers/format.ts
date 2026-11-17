import { parseDddDateTimeMs } from '@mgamadeus/ddd-web/contract';

import { m, translateText } from '../i18n/store.ts';
import { uiDateTimeFormat, uiNumberFormat } from '../i18n/format.ts';
import type {
  DateTimeValue,
  DateTimeValueSequences,
  WorkerSequenceName,
  WorkerThroughputWindows,
  WorkerTransportHistory,
  WorkerTransportOverview,
  WorkerTransportState,
} from './types.ts';

const EMPTY_POINTS: DateTimeValue[] = [];

/** The points of one named sequence; none when the payload lacks it. */
export const sequencePoints = (sequences: DateTimeValueSequences | undefined, name: WorkerSequenceName): DateTimeValue[] =>
  sequences?.elements?.find(sequence => sequence.name === name)?.elements ?? EMPTY_POINTS;

/** One chart row per step: its start in ms and one value per series key (`null` = a gap, never 0). */
export type ChartRow = { ms: number } & Record<string, number | null>;

/** A sequence point's time (ISO 8601 with `Z`, or a DDD date-time) in ms; null when it cannot be read. */
const pointMs = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const iso = Date.parse(value);
  return Number.isNaN(iso) ? parseDddDateTimeMs(value) : iso;
};

/** Zips named series (every sequence of one response shares its steps) into rows keyed by the step's start. */
export const zipSeries = (series: Readonly<Record<string, readonly DateTimeValue[]>>): ChartRow[] => {
  const rows = new Map<number, ChartRow>();
  for (const [key, points] of Object.entries(series)) {
    for (const point of points) {
      const ms = pointMs(point.x);
      if (ms === null) continue;
      const row = rows.get(ms) ?? ({ ms } as ChartRow);
      row[key] = point.y ?? null;
      rows.set(ms, row);
    }
  }
  return [...rows.values()].sort((left, right) => left.ms - right.ms);
};

export const sumOf = (points: readonly DateTimeValue[]): number => points.reduce((total, point) => total + (point.y ?? 0), 0);

export const maxOf = (points: readonly DateTimeValue[]): number =>
  points.reduce((highest, point) => Math.max(highest, point.y ?? 0), 0);

/** Whether any row has a positive value under one of the keys. */
export const hasAnyValue = (rows: readonly ChartRow[], keys: readonly string[]): boolean =>
  rows.some(row => keys.some(key => (row[key] ?? 0) > 0));

/** `handled` includes the failed messages: succeeded = handled − failed, so stacked bars add up to handled. */
export const succeededPoints = (handled: readonly DateTimeValue[], failed: readonly DateTimeValue[]): DateTimeValue[] =>
  handled.map((point, index) => ({
    x: point.x,
    y: point.y === null || point.y === undefined ? null : Math.max(point.y - (failed[index]?.y ?? 0), 0),
  }));

/** A count in the UI locale; `—` without a value. */
export const formatCount = (value: number | null | undefined): string =>
  value === null || value === undefined ? '—' : uiNumberFormat().format(value);

/** `850 ms`, `4.2 s`, `1 min 46 s`, `2 h 5 min`; `—` without a value. */
export const formatDurationMs = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '—';
  if (value < 1000) return `${Math.round(value)} ms`;
  const seconds = value / 1000;
  if (seconds < 60) return `${seconds < 10 ? seconds.toFixed(1) : Math.round(seconds)} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    const rest = Math.round(seconds - minutes * 60);
    return rest > 0 ? `${minutes} min ${rest} s` : `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes - hours * 60;
  return restMinutes > 0 ? `${hours} h ${restMinutes} min` : `${hours} h`;
};

/** A compact axis label for milliseconds (`850ms`, `4s`, `1.5m`, `2h`). */
export const formatDurationTick = (value: number): string => {
  const compact = (amount: number) => (amount < 10 && !Number.isInteger(amount) ? amount.toFixed(1) : String(Math.round(amount)));
  if (value < 1000) return `${Math.round(value)}ms`;
  if (value < 60_000 || (value < 120_000 && value % 60_000 !== 0)) return `${compact(value / 1000)}s`;
  if (value < 3_600_000) return `${compact(Math.round(value / 6000) / 10)}m`;
  return `${compact(Math.round(value / 360_000) / 10)}h`;
};

/** `63 MB` (binary megabytes, as PHP reports memory); `—` without a value. */
export const formatBytes = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '—';
  const megabytes = value / (1024 * 1024);
  return `${megabytes < 10 ? megabytes.toFixed(1) : Math.round(megabytes)} MB`;
};

/** The pod part that tells replicas apart (`worker-x-769459868d-dg82v` → `769459868d-dg82v`). */
export const shortHost = (hostName: string | null | undefined): string =>
  hostName ? hostName.split('-').slice(-2).join('-') : translateText('unknown host');

/** The class name without its namespace. */
export const shortClassName = (className: string | null | undefined): string =>
  className ? (className.split('\\').pop() ?? className) : '';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const tickTimeFormat = () => uiDateTimeFormat({ hour: '2-digit', minute: '2-digit' });
const tickDayFormat = () => uiDateTimeFormat({ month: 'short', day: 'numeric' });
const tickDayTimeFormat = () => uiDateTimeFormat({ month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Axis tick of a step: the time of day up to a day's window, the date beyond. */
export const formatBucketTick = (ms: number, windowMs: number): string =>
  (windowMs <= ONE_DAY_MS ? tickTimeFormat() : tickDayFormat()).format(new Date(ms));

/** A step in a tooltip: its start and end (`Nov 10, 16:35 – 16:40`). */
export const formatBucketRange = (ms: number, stepSeconds: number): string =>
  `${tickDayTimeFormat().format(new Date(ms))} – ${tickTimeFormat().format(new Date(ms + stepSeconds * 1000))}`;

/** A date-time of the backend (entity `Y-m-d H:i:s` UTC or ISO 8601) in ms; null when absent or unreadable. */
export const parseWorkersTime = (value: string | null | undefined): number | null =>
  value && /[TZ+]/.test(value.slice(10)) ? pointMs(value) : parseDddDateTimeMs(value);

/** A backend date-time as a clock time with seconds (`4:43:35 PM`); null when absent. */
export const formatClockTime = (value: string | null | undefined): string | null => {
  const ms = parseWorkersTime(value);
  return ms === null ? null : uiDateTimeFormat({ timeStyle: 'medium' }).format(new Date(ms));
};

/** Transport states, most urgent first (the table's order). */
export const TRANSPORT_STATE_ORDER: readonly WorkerTransportState[] = ['NOT_CONSUMED', 'STUCK', 'UNDEFINED', 'BACKLOG', 'WORKING', 'IDLE'];

/** States that need someone to look. */
export const isAttentionState = (state: string | null | undefined): boolean =>
  state === 'NOT_CONSUMED' || state === 'STUCK' || state === 'UNDEFINED' || state === 'BACKLOG';

const stateRank = (state: string | null | undefined): number => {
  const index = (TRANSPORT_STATE_ORDER as readonly string[]).indexOf(state ?? '');
  return index === -1 ? TRANSPORT_STATE_ORDER.length : index;
};

/** By state severity, then the busier transport (processes, waiting), then the name. */
export const sortTransports = (transports: readonly WorkerTransportOverview[]): WorkerTransportOverview[] =>
  [...transports].sort(
    (left, right) =>
      stateRank(left.state) - stateRank(right.state) ||
      (right.liveProcessCount ?? 0) - (left.liveProcessCount ?? 0) ||
      (right.waiting ?? 0) - (left.waiting ?? 0) ||
      (left.transport ?? '').localeCompare(right.transport ?? '')
  );

/** The English label of a queue that could not be counted (`waiting` null is "unknown", never 0); translate it. */
export const waitingStateLabel = (waitingState: string | null | undefined): string => {
  if (waitingState === 'QUEUE_NOT_SET_UP') return m('Queue not set up');
  if (waitingState === 'UNKNOWN') return m('Unknown', { context: 'queue-count-state' });
  return m('Not counted');
};

/** The context of `waitingStateLabel`'s texts, for `t(label, …)`. */
export const waitingStateContext = (waitingState: string | null | undefined): { context: string } | undefined =>
  waitingState === 'UNKNOWN' ? { context: 'queue-count-state' } : undefined;

/** The inferred stop reason in words ("probably …": Messenger stops without telling why). */
export const STOP_REASON_LABELS: Readonly<Record<string, string>> = {
  MESSAGE_LIMIT: m('Probably message limit'),
  TIME_LIMIT: m('Probably time limit'),
  MEMORY_LIMIT: m('Probably memory limit'),
  FAILURE_LIMIT: m('Probably failure limit'),
  RESTART_REQUESTED: m('Restart requested'),
  SIGNAL: m('Received a signal'),
  OTHER: m('Other', { context: 'stop-reason' }),
  LOST: m('Lost (no stop reported)'),
};

/** The translated stop reason; null without one. */
export const stopReasonLabel = (stopReason: string | null | undefined): string | null => {
  if (!stopReason) return null;
  const label = STOP_REASON_LABELS[stopReason];
  if (!label) return stopReason;
  return translateText(label, stopReason === 'OTHER' ? { context: 'stop-reason' } : undefined);
};

/** Where a message was dispatched from: the route of the request or the console command. */
export const dispatchOrigin = (run: { dispatchedFromRoute?: string | null; dispatchedFromCommand?: string | null }): string | null =>
  run.dispatchedFromRoute ?? run.dispatchedFromCommand ?? null;

/** Finished messages of one throughput window, with its length and the minutes workers ran in it. */
export interface WorkersWindowCount {
  handled: number;
  failed: number;
  minutes: number;
  workerMinutes: number;
}

/** The window of `windowSeconds` out of the throughput windows (300 / 900 / 3600 / 86400 s). */
export const throughputWindowOf = (windows: WorkerThroughputWindows | undefined, windowSeconds: number): WorkersWindowCount => {
  const found = windows?.elements?.find(entry => entry.windowSeconds === windowSeconds);
  return {
    handled: found?.handledCount ?? 0,
    failed: found?.failedCount ?? 0,
    minutes: windowSeconds / 60,
    workerMinutes: (found?.workerSeconds ?? 0) / 60,
  };
};

/** Messages one worker finished per minute it ran; null when no worker ran in the window. */
export const perWorkerMinute = (count: WorkersWindowCount): number | null =>
  count.workerMinutes > 0 ? count.handled / count.workerMinutes : null;

/** Milliseconds until the queue is empty at the rate of a window; null when nothing finished in it. */
export const drainMs = (waiting: number, window: WorkersWindowCount): number | null => {
  const perMinute = window.handled / window.minutes;
  return perMinute > 0 ? (waiting / perMinute) * 60_000 : null;
};

/** Named categorical slots of the per-transport charts before the rest folds into "Other". */
export const NAMED_TRANSPORT_SLOTS = 7;

/**
 * The categorical colours of the per-transport charts: the colour roles of the host contract (`tokens.json`), so a
 * host's theme applies; "Other" is the input role.
 */
export const TRANSPORT_SERIES_COLORS: readonly string[] = [
  'var(--primary)',
  'var(--info)',
  'var(--warning)',
  'var(--success)',
  'var(--brand)',
  'var(--muted-foreground)',
  'var(--brand-emphasis)',
];
export const OTHER_SERIES_COLOR = 'var(--input)';

/** One transport of the per-transport charts: its key, label and colour, and its sequences. */
export interface RankedTransport {
  key: string;
  label: string;
  color: string;
  processes: DateTimeValue[];
  processStarts: DateTimeValue[];
  waiting: DateTimeValue[];
  handled: DateTimeValue[];
}

const sumPoints = (pointLists: readonly (readonly DateTimeValue[])[]): DateTimeValue[] =>
  (pointLists[0] ?? []).map((point, index) => ({
    x: point.x,
    y: pointLists.reduce((total, points) => total + (points[index]?.y ?? 0), 0),
  }));

/**
 * The transports with any activity in the window, the busiest first (peak processes), the first seven by name and
 * colour, the rest summed into one "Other" entry (labelled by `otherLabel(count)`). A transport keeps its colour across
 * the charts of one window.
 */
export const rankTransports = (
  histories: readonly WorkerTransportHistory[],
  otherLabel: (count: number) => string
): RankedTransport[] => {
  const ranked = histories
    .map(history => ({
      transport: history.transport ?? '',
      processes: sequencePoints(history.sequences, 'processes'),
      processStarts: sequencePoints(history.sequences, 'processStarts'),
      waiting: sequencePoints(history.sequences, 'waiting'),
      handled: sequencePoints(history.sequences, 'handled'),
    }))
    .map(entry => ({ ...entry, peak: maxOf(entry.processes) }))
    .filter(entry => entry.peak > 0 || maxOf(entry.processStarts) > 0 || maxOf(entry.waiting) > 0 || maxOf(entry.handled) > 0)
    .sort((left, right) => right.peak - left.peak || left.transport.localeCompare(right.transport));
  const folds = ranked.length > NAMED_TRANSPORT_SLOTS + 1;
  const named = folds ? ranked.slice(0, NAMED_TRANSPORT_SLOTS) : ranked;
  const rest = folds ? ranked.slice(NAMED_TRANSPORT_SLOTS) : [];
  const result: RankedTransport[] = named.map((entry, index) => ({
    key: `s${index}`,
    label: entry.transport,
    color: TRANSPORT_SERIES_COLORS[index % TRANSPORT_SERIES_COLORS.length] ?? OTHER_SERIES_COLOR,
    processes: entry.processes,
    processStarts: entry.processStarts,
    waiting: entry.waiting,
    handled: entry.handled,
  }));
  if (rest.length > 0) {
    result.push({
      key: 'other',
      label: otherLabel(rest.length),
      color: OTHER_SERIES_COLOR,
      processes: sumPoints(rest.map(entry => entry.processes)),
      processStarts: sumPoints(rest.map(entry => entry.processStarts)),
      waiting: sumPoints(rest.map(entry => entry.waiting)),
      handled: sumPoints(rest.map(entry => entry.handled)),
    });
  }
  return result;
};

/** A maximum that dwarfs the typical average (20×) wants a logarithmic axis, else the average is a flat line. */
export const wantsLogScale = (rows: readonly ChartRow[], averageKey: string, maximumKey: string): boolean => {
  const averages = rows
    .map(row => row[averageKey])
    .filter((value): value is number => value !== null && value !== undefined && value > 0)
    .sort((left, right) => left - right);
  if (averages.length === 0) return false;
  const median = averages[Math.floor(averages.length / 2)] ?? 0;
  const highest = rows.reduce((top, row) => Math.max(top, row[maximumKey] ?? 0), 0);
  return highest > median * 20;
};
