'use client';

import type { LucideIcon } from 'lucide-react';
import { Activity, ChevronRight, CircleCheck, CircleX, Hourglass, Layers, Repeat, RotateCcw, Server, Siren } from 'lucide-react';
import { type ReactNode, useCallback, useMemo, useRef } from 'react';

import { m } from '../i18n/store.ts';
import { type TranslateFn, useTranslate } from '../i18n/useTranslate.ts';
import { EmptyValue } from '../list/EmptyValue.tsx';
import { type EntityListColumn, EntityListTable } from '../list/EntityListTable.tsx';
import { StatusBadge } from '../list/StatusBadge.tsx';
import { Tag } from '../list/Tag.tsx';
import { SectionHeader } from '../page/SectionHeader.tsx';
import { Card, CardContent } from '../primitives/card.tsx';
import { cn } from '../primitives/cn.ts';
import { useLinkComponent } from '../primitives/link.tsx';
import { Skeleton } from '../primitives/skeleton.tsx';
import type { WorkersApi } from './api.ts';
import { WorkerSparkline } from './charts.tsx';
import {
  drainMs,
  formatClockTime,
  formatCount,
  formatDurationMs,
  formatPercentNumber,
  formatRate,
  formatWindowLength,
  workerLastErrorText,
  inWindowText,
  isAttentionState,
  parseWorkersTime,
  perWorkerMinute,
  sequencePoints,
  shortClassName,
  shortHost,
  throughputWindowOf,
  sequenceLabelText,
  throughputWindowSeconds,
  windowHeaderText,
  type WorkersWindowCount,
  waitingStateContext,
  waitingStateLabel,
  zipSeries,
} from './format.ts';
import { WorkerHint, WorkerTruncatedText } from './hint.tsx';
import { rawStatusValue, WORKER_PROCESS_STATE, WORKER_TRANSPORT_STATE } from './status.ts';
import type {
  WorkerLoopDefinition,
  WorkerProcess,
  WorkerProcessDisplayState,
  WorkersOverview,
  WorkersTotals,
  WorkerTransportOverview,
  WorkerTransportState,
  WorkerSequenceName,
} from './types.ts';
import { WorkerRestartButton } from './WorkerRestartButton.tsx';

/** The tab of a transport page a link opens. */
export type WorkerTransportTab = 'overview' | 'runs' | 'processes';

/** The link of a transport's page (`/maintenance/workers/<transport>?tab=processes`). */
export type WorkerTransportHref = (transport: string, tab?: WorkerTransportTab) => string;

const TILE_GRID_CLASS = 'grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6';

interface KpiTileProps {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  /** The icon's ink: a status only where the number means one. */
  iconClassName?: string;
  spark?: { key: WorkerSequenceName; color: string; label: string };
  totals: WorkersTotals | undefined;
  stepSeconds?: number;
}

const KpiTile = ({ label, value, hint, icon: Icon, iconClassName, spark, totals, stepSeconds }: KpiTileProps) => {
  const rows = useMemo(() => (spark ? zipSeries({ [spark.key]: sequencePoints(totals?.sequences, spark.key) }) : []), [spark, totals?.sequences]);
  return (
    <Card className="gap-0 py-0" data-slot="worker-kpi-tile">
      <CardContent className="flex h-full flex-col p-4">
        <p className="flex items-center gap-1.5 text-[11.5px] font-bold tracking-[0.06em] text-muted-foreground uppercase">
          <Icon className={cn('size-3.5 shrink-0', iconClassName)} aria-hidden />
          <span className="line-clamp-2">{label}</span>
        </p>
        <p className="mt-1.5 text-[26px] leading-8 font-semibold tracking-tight tabular-nums">{value}</p>
        <p className="line-clamp-2 text-xs text-muted-foreground">{hint}</p>
        {spark && (
          <div className="mt-auto pt-2">
            <WorkerSparkline rows={rows} valueKey={spark.key} color={spark.color} label={spark.label} stepSeconds={stepSeconds} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/** Placeholders of the tiles while the overview loads. */
export const WorkerKpiTilesSkeleton = () => (
  <div className={TILE_GRID_CLASS} aria-hidden>
    {Array.from({ length: 6 }, (_, index) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
      <Skeleton key={index} className="h-[132px] rounded-2xl" />
    ))}
  </div>
);

/**
 * The totals as tiles: what runs now and what happened in the sequence window (`sequenceWindowSeconds`, the last
 * hour), with that window as a sparkline (pointing at it reads one step). While the monitoring is off, nothing is
 * measured: the measured tiles (workers, in work, handled, failed) say "not measured" instead of a 0.
 */
export const WorkerKpiTiles = ({ overview }: { overview: WorkersOverview }) => {
  const { t } = useTranslate();
  const totals = overview.totals;
  const transports = overview.transports?.elements ?? [];
  const measured = overview.monitoringEnabled !== false;
  const attention = transports.filter(transport => isAttentionState(transport.state));
  const stuckCount = transports.filter(transport => transport.state === 'STUCK').length;
  const failed = totals?.failedCountLastHour ?? 0;
  const handled = totals?.handledCountLastHour ?? 0;
  const waiting = totals?.waiting;
  const uncounted = transports.filter(transport => transport.waiting === null || transport.waiting === undefined).length;
  const notMeasured = t('not measured');
  const sequenceSeconds = overview.sequenceWindowSeconds ?? 3600;
  const windowText = inWindowText(sequenceSeconds, t);
  const common = { totals, stepSeconds: overview.stepSeconds };

  return (
    <div className={TILE_GRID_CLASS}>
      <KpiTile
        {...common}
        label={t('Running now')}
        value={measured ? formatCount(totals?.liveProcessCount ?? 0) : '—'}
        hint={
          measured
            ? t('workers on %count% transports', {
                replacements: { count: formatCount(transports.filter(transport => (transport.liveProcessCount ?? 0) > 0).length) },
              })
            : notMeasured
        }
        icon={Server}
        spark={measured ? { key: 'processes', color: 'var(--info)', label: sequenceLabelText('processes', sequenceSeconds, t) } : undefined}
      />
      <KpiTile
        {...common}
        label={t('Waiting now')}
        value={waiting === null || waiting === undefined ? '?' : formatCount(waiting)}
        hint={
          uncounted > 0
            ? t('{count, plural, one {# queue not counted} other {# queues not counted}}', { count: uncounted })
            : t('in every queue')
        }
        icon={Hourglass}
        spark={{ key: 'waiting', color: 'var(--warning)', label: sequenceLabelText('waiting', sequenceSeconds, t) }}
      />
      <KpiTile
        {...common}
        label={t('In work now')}
        value={measured ? formatCount(totals?.inFlight ?? 0) : '—'}
        hint={measured ? t('messages being handled') : notMeasured}
        icon={Activity}
        spark={measured ? { key: 'inFlight', color: 'var(--primary)', label: sequenceLabelText('inFlight', sequenceSeconds, t) } : undefined}
      />
      <KpiTile
        {...common}
        label={t('Handled', { context: 'workers-kpi' })}
        value={measured ? formatCount(handled) : '—'}
        hint={measured ? windowText : notMeasured}
        icon={CircleCheck}
        spark={measured ? { key: 'handled', color: 'var(--success)', label: sequenceLabelText('handled', sequenceSeconds, t) } : undefined}
      />
      <KpiTile
        {...common}
        label={t('Failed', { context: 'workers-kpi' })}
        value={measured ? formatCount(failed) : '—'}
        hint={
          !measured
            ? notMeasured
            : handled > 0
              ? (overview.sequenceWindowSeconds ?? 3600) === 3600
                ? t('%percent% % of the last hour', { replacements: { percent: formatPercentNumber(failed / handled) } })
                : t('%percent% % of the last %window%', {
                    replacements: { percent: formatPercentNumber(failed / handled), window: formatWindowLength(overview.sequenceWindowSeconds ?? 3600, t) },
                  })
              : windowText
        }
        icon={CircleX}
        iconClassName={failed > 0 ? 'text-destructive' : undefined}
        spark={measured ? { key: 'failed', color: 'var(--destructive)', label: sequenceLabelText('failed', sequenceSeconds, t) } : undefined}
      />
      <KpiTile
        {...common}
        label={t('Need attention')}
        value={formatCount(attention.length)}
        hint={
          attention.length === 0
            ? t('every transport is fine')
            : stuckCount > 0
              ? t('%count% stuck', { replacements: { count: formatCount(stuckCount) } })
              : t('backlog, undefined or not consumed')
        }
        icon={attention.length > 0 ? Siren : Layers}
        iconClassName={stuckCount > 0 ? 'text-destructive' : attention.length > 0 ? 'text-warning' : undefined}
      />
    </div>
  );
};

// ── live panel ─────────────────────────────────────────────────────────────────────────────────────────────────────

const isWaitingKnown = (transport: WorkerTransportOverview): boolean => transport.waiting !== null && transport.waiting !== undefined;

/** `0–8` for an autoscaled consumer, `fixed 2` for a fixed one, null without a worker list entry. */
const configuredRange = (transport: WorkerTransportOverview, t: TranslateFn): string | null => {
  if (transport.effectiveMax === null || transport.effectiveMax === undefined) return null;
  return transport.isAutoscaled
    ? `${transport.effectiveMin ?? 0}–${transport.effectiveMax}`
    : t('fixed %max%', { replacements: { max: transport.effectiveMax } });
};

/** `17:35:07 · 12 min` (clock time and how long ago). */
const sinceText = (value: string | null | undefined, nowMs: number): string | null => {
  const ms = parseWorkersTime(value);
  return ms === null ? null : `${formatClockTime(value)} · ${formatDurationMs(Math.max(nowMs - ms, 0))}`;
};

/** Why a queue has no count, with its state code (`UNKNOWN`, `QUEUE_NOT_SET_UP`). */
const uncountedReason = (transport: WorkerTransportOverview, t: TranslateFn): string =>
  `${t('The queue could not be counted.')}${transport.waitingState ? ` (${transport.waitingState})` : ''}`;

const LiveProcessRow = ({ process, nowMs }: { process: WorkerProcess; nowMs: number }) => {
  const { t } = useTranslate();
  const runningSince = sinceText(process.startedAt, nowMs);
  const messageSince = sinceText(process.currentMessageSince, nowMs);
  return (
    <li className="space-y-1 py-2 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <StatusBadge value={rawStatusValue<WorkerProcessDisplayState>(process.displayState ?? process.state)} map={WORKER_PROCESS_STATE} />
        <WorkerTruncatedText full={process.processKey} className="truncate font-mono text-xs">
          {shortHost(process.hostName)} · {process.processId}
        </WorkerTruncatedText>
        {runningSince && <span className="text-xs text-muted-foreground">{t('running since %time%', { replacements: { time: runningSince } })}</span>}
        {process.restartRequestedAt && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <RotateCcw className="size-3 text-warning" aria-hidden />
            {t('restart requested %time%', { replacements: { time: formatClockTime(process.restartRequestedAt) ?? '' } })}
          </span>
        )}
      </div>
      {process.currentMessageClass ? (
        <WorkerTruncatedText full={process.currentMessageClass} className="block truncate pl-1 text-xs text-muted-foreground">
          {messageSince
            ? t('working on %messageClass% since %since%', {
                replacements: { messageClass: shortClassName(process.currentMessageClass), since: messageSince },
              })
            : t('working on %messageClass%', { replacements: { messageClass: shortClassName(process.currentMessageClass) } })}
        </WorkerTruncatedText>
      ) : (
        <p className="pl-1 text-xs text-muted-foreground">{t('idle, waiting for a message')}</p>
      )}
    </li>
  );
};

interface LiveStatProps {
  label: string;
  value: ReactNode;
  unit: string;
  hint?: ReactNode;
  isActive: boolean;
}

/** One labelled number of a live row: what it counts, the number, its unit and the configured frame. */
const LiveStat = ({ label, value, unit, hint, isActive }: LiveStatProps) => (
  <div className="min-w-0 sm:w-36">
    <div className="text-[10px] font-bold tracking-[0.08em] text-muted-foreground uppercase">{label}</div>
    <div className="flex items-baseline gap-1.5 tabular-nums">
      <span className={cn('text-xl leading-7 font-semibold', !isActive && 'text-muted-foreground')}>{value}</span>
      <span className="truncate text-xs text-muted-foreground">{unit}</span>
    </div>
    {hint && <div className="truncate text-[11px] text-muted-foreground">{hint}</div>}
  </div>
);

interface LiveTransportRowProps {
  transport: WorkerTransportOverview;
  processes: WorkerProcess[];
  nowMs: number;
  showProcesses: boolean;
  monitoringEnabled: boolean;
  transportHref: WorkerTransportHref;
}

const LiveTransportRow = ({ transport, processes, nowMs, showProcesses, monitoringEnabled, transportHref }: LiveTransportRowProps) => {
  const { t } = useTranslate();
  const Link = useLinkComponent();
  const name = transport.transport ?? '';
  const live = transport.liveProcessCount ?? 0;
  const inFlight = transport.inFlight ?? 0;
  const range = configuredRange(transport, t);
  const isAboveRange = monitoringEnabled && live > (transport.effectiveMax ?? Number.POSITIVE_INFINITY);
  const messages = (count: number) => t('{count, plural, one {message} other {messages}}', { count });
  const monitoringOff = t('monitoring is off');

  return (
    <li className="space-y-2.5 px-4 py-3.5 sm:px-5">
      <div className="flex flex-col gap-x-6 gap-y-2 sm:flex-row sm:items-start sm:justify-between">
        <Link
          href={transportHref(name, 'processes')}
          className="group inline-flex min-w-0 items-center gap-1 font-mono text-[13px] font-medium hover:text-brand-emphasis focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:pt-4"
        >
          <span className="truncate">{name}</span>
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        </Link>
        <div className="grid shrink-0 grid-cols-3 gap-x-4 sm:flex sm:gap-x-6">
          <LiveStat
            label={t('Workers', { context: 'live-stat' })}
            value={monitoringEnabled ? formatCount(live) : '?'}
            unit={t('running', { context: 'live-stat' })}
            hint={
              !range ? (
                t('no worker list entry')
              ) : isAboveRange ? (
                <WorkerHint content={t('A stopping process and its successor overlap, or the range changed')} className="font-medium text-warning">
                  {t('configured %range% · above range', { replacements: { range } })}
                </WorkerHint>
              ) : (
                t('configured %range%', { replacements: { range } })
              )
            }
            isActive={monitoringEnabled && live > 0}
          />
          <LiveStat
            label={t('In work', { context: 'live-stat' })}
            value={monitoringEnabled ? formatCount(inFlight) : '?'}
            unit={messages(monitoringEnabled ? inFlight : 0)}
            hint={monitoringEnabled ? t('being handled') : monitoringOff}
            isActive={monitoringEnabled && inFlight > 0}
          />
          {isWaitingKnown(transport) ? (
            <LiveStat
              label={t('Waiting', { context: 'live-stat' })}
              value={formatCount(transport.waiting ?? 0)}
              unit={messages(transport.waiting ?? 0)}
              hint={t('in the queue')}
              isActive={(transport.waiting ?? 0) > 0}
            />
          ) : (
            <LiveStat
              label={t('Waiting', { context: 'live-stat' })}
              value="?"
              unit={messages(0)}
              hint={
                <WorkerHint content={uncountedReason(transport, t)}>
                  {t(waitingStateLabel(transport.waitingState), waitingStateContext(transport.waitingState))}
                </WorkerHint>
              }
              isActive
            />
          )}
        </div>
      </div>
      {showProcesses && monitoringEnabled && live > 0 && (
        processes.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t('The process list has no running process yet.')}</p>
        ) : (
          <ul className="divide-y rounded-xl bg-tint px-3 py-2">
            {processes.map(process => (
              <LiveProcessRow key={process.processKey ?? String(process.id)} process={process} nowMs={nowMs} />
            ))}
          </ul>
        )
      )}
    </li>
  );
};

export interface WorkersLivePanelProps {
  transports: readonly WorkerTransportOverview[];
  /** The live processes of every transport (`workersOverview.processes`). */
  processes: readonly WorkerProcess[];
  /** "Now" of the durations: the overview's `generatedAt`. */
  nowMs: number;
  /** False hides the process list below each row (by default also when the monitoring is off). */
  showProcesses?: boolean;
  /**
   * False while the monitoring is off: worker and in-work counts are unknown then ("?"), only the queue counts exist.
   * Default: `showProcesses`.
   */
  monitoringEnabled?: boolean;
  /**
   * The backend's totals (`workersOverview.totals`) for the header line; without them the rows are added up (an
   * uncounted queue then reads as "+").
   */
  totals?: WorkersTotals;
  transportHref: WorkerTransportHref;
}

/**
 * The live section: every transport with a worker running, a message in work, a message waiting or a queue that could
 * not be counted, as three labelled numbers (workers against the configured range, in work, waiting) and its live
 * processes below. Idle transports with an empty queue fold into one line.
 */
export const WorkersLivePanel = ({
  transports,
  processes,
  nowMs,
  showProcesses = true,
  monitoringEnabled = showProcesses,
  totals,
  transportHref,
}: WorkersLivePanelProps) => {
  const { t } = useTranslate();
  const processesByTransport = useMemo(() => {
    const byTransport = new Map<string, WorkerProcess[]>();
    for (const process of processes) {
      for (const name of (process.transport ?? '').split(',').map(part => part.trim())) {
        byTransport.set(name, [...(byTransport.get(name) ?? []), process]);
      }
    }
    return byTransport;
  }, [processes]);
  const active = useMemo(
    () =>
      transports
        .filter(
          transport => (transport.liveProcessCount ?? 0) > 0 || (transport.inFlight ?? 0) > 0 || (transport.waiting ?? 0) > 0 || !isWaitingKnown(transport)
        )
        .sort(
          (left, right) =>
            (right.waiting ?? 0) - (left.waiting ?? 0) ||
            (right.inFlight ?? 0) - (left.inFlight ?? 0) ||
            (right.liveProcessCount ?? 0) - (left.liveProcessCount ?? 0) ||
            (left.transport ?? '').localeCompare(right.transport ?? '')
        ),
    [transports]
  );
  const liveTotal = totals?.liveProcessCount ?? transports.reduce((sum, transport) => sum + (transport.liveProcessCount ?? 0), 0);
  const inFlightTotal = totals?.inFlight ?? transports.reduce((sum, transport) => sum + (transport.inFlight ?? 0), 0);
  const waitingSum = transports.reduce((sum, transport) => sum + (transport.waiting ?? 0), 0);
  const hasUnknown = transports.some(transport => !isWaitingKnown(transport));
  const quietCount = transports.length - active.length;
  const waitingText = totals
    ? totals.waiting === null || totals.waiting === undefined
      ? t('waiting messages unknown')
      : t('%count% waiting', { replacements: { count: formatCount(totals.waiting) } })
    : t('%count% waiting', { replacements: { count: `${formatCount(waitingSum)}${hasUnknown ? '+' : ''}` } });

  return (
    <Card className="gap-0 py-0" data-slot="workers-live-panel">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b px-4 py-3 sm:px-5">
        <h3 className="flex items-center gap-2 text-xs font-bold tracking-[0.08em] text-muted-foreground uppercase">
          <Activity className="size-4" aria-hidden />
          {t('Right now, per transport')}
        </h3>
        <span className="text-xs text-muted-foreground tabular-nums">
          {monitoringEnabled && (
            <>
              {t('{count, plural, one {# worker running} other {# workers running}}', { count: liveTotal })} ·{' '}
              {t('{count, plural, one {# message in work} other {# messages in work}}', { count: inFlightTotal })} ·{' '}
            </>
          )}
          {waitingText}
        </span>
      </div>
      {active.length === 0 ? (
        <CardContent className="p-6 text-center text-sm text-muted-foreground">{t('No worker is running and every queue is empty.')}</CardContent>
      ) : (
        <ul className="divide-y">
          {active.map(transport => (
            <LiveTransportRow
              key={transport.transport}
              transport={transport}
              processes={processesByTransport.get(transport.transport ?? '') ?? []}
              nowMs={nowMs}
              showProcesses={showProcesses}
              monitoringEnabled={monitoringEnabled}
              transportHref={transportHref}
            />
          ))}
        </ul>
      )}
      {active.length > 0 && quietCount > 0 && (
        <p className="border-t px-4 py-2.5 text-xs text-muted-foreground sm:px-5">
          {t('{count, plural, one {# more transport: no worker running, queue empty.} other {# more transports: no worker running, queue empty.}}', {
            count: quietCount,
          })}
        </p>
      )}
    </Card>
  );
};

// ── throughput ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** The windows of Core's payload (5 and 15 minutes, an hour, 24 hours), when a payload names none. */
const DEFAULT_THROUGHPUT_WINDOWS: readonly number[] = [300, 900, 3600, 86400];

interface ThroughputRow {
  key: string;
  /** Null for the row of every transport together. */
  transport: string | null;
  waiting: number | null;
  inFlight: number;
  /** Per window length (s). */
  windows: ReadonlyMap<number, WorkersWindowCount>;
}

const ALL_TRANSPORTS_KEY = '__all';

const toThroughputRow = (
  key: string,
  transport: string | null,
  waiting: number | null,
  inFlight: number,
  windows: WorkerTransportOverview['throughputWindows'],
  windowSeconds: readonly number[]
): ThroughputRow => ({
  key,
  transport,
  waiting,
  inFlight,
  windows: new Map(windowSeconds.map(seconds => [seconds, throughputWindowOf(windows, seconds)])),
});

const countOf = (row: ThroughputRow, seconds: number): WorkersWindowCount =>
  row.windows.get(seconds) ?? { handled: 0, failed: 0, minutes: seconds / 60, workerMinutes: 0 };

/** The window of `wanted` seconds, else the one closest to it. */
const closestWindow = (windowSeconds: readonly number[], wanted: number): number =>
  windowSeconds.reduce((best, seconds) => (Math.abs(seconds - wanted) < Math.abs(best - wanted) ? seconds : best), windowSeconds[0] ?? wanted);

const WindowCell = ({ count }: { count: WorkersWindowCount }) => {
  const { t } = useTranslate();
  if (count.handled === 0) return <span className="text-sm text-muted-foreground tabular-nums">0</span>;
  return (
    <div className="tabular-nums">
      <div className="text-sm">
        <span className="font-semibold">{formatCount(count.handled)}</span>
        <span className="text-xs text-muted-foreground"> · {formatRate(count.handled / count.minutes, t)}</span>
      </div>
      {count.failed > 0 && (
        <div className="text-[11px] font-medium text-destructive">{t('%count% failed', { replacements: { count: formatCount(count.failed) } })}</div>
      )}
    </div>
  );
};

const ThroughputWaitingCell = ({ row, drainWindowSeconds }: { row: ThroughputRow; drainWindowSeconds: number }) => {
  const { t } = useTranslate();
  if (row.waiting === null) return <span className="text-sm font-semibold">?</span>;
  const drain = drainMs(row.waiting, countOf(row, drainWindowSeconds));
  const windowLength = formatWindowLength(drainWindowSeconds, t);
  return (
    <div className="tabular-nums">
      <div className={row.waiting > 0 ? 'text-sm font-semibold' : 'text-sm text-muted-foreground'}>{formatCount(row.waiting)}</div>
      {row.waiting > 0 && (
        <div className="text-[11px] text-muted-foreground">
          {drain !== null ? (
            <WorkerHint content={t('At the rate of the last %window%', { replacements: { window: windowLength } })}>
              {t('≈ %duration% at this rate', { replacements: { duration: formatDurationMs(drain) } })}
            </WorkerHint>
          ) : drainWindowSeconds === 300 ? (
            t('nothing finished in 5 min')
          ) : (
            t('nothing finished in %window%', { replacements: { window: windowLength } })
          )}
        </div>
      )}
    </div>
  );
};

export interface WorkersThroughputTableProps {
  transports: readonly WorkerTransportOverview[];
  totals: WorkersTotals | undefined;
  transportHref: WorkerTransportHref;
  /** The window of the per-worker rate (`recentWindowSeconds`; default 900, else the closest window of the payload). */
  recentWindowSeconds?: number;
}

/**
 * Throughput per transport: waiting and in work now, the messages finished in each window of the payload (5 and 15
 * minutes, the last hour and the last 24 hours by default) with their rates, and what one worker finished per minute
 * it ran in the recent window. The drain estimate uses the shortest window. The first row is every transport together
 * (counted by the backend); a transport without a message in the longest window and an empty queue is left out.
 */
export const WorkersThroughputTable = ({ transports, totals, transportHref, recentWindowSeconds = 900 }: WorkersThroughputTableProps) => {
  const { t } = useTranslate();
  const Link = useLinkComponent();
  const windowSeconds = useMemo(() => {
    const found = [...new Set([totals?.throughputWindows, ...transports.map(transport => transport.throughputWindows)].flatMap(throughputWindowSeconds))].sort(
      (left, right) => left - right
    );
    return found.length > 0 ? found : [...DEFAULT_THROUGHPUT_WINDOWS];
  }, [transports, totals]);
  const shortest = windowSeconds[0] ?? 300;
  const longest = windowSeconds[windowSeconds.length - 1] ?? 86400;
  const sortWindow = windowSeconds.includes(3600) ? 3600 : longest;
  const perWorkerWindow = closestWindow(windowSeconds, recentWindowSeconds);

  const rows = useMemo<ThroughputRow[]>(() => {
    const perTransport = transports
      .map(transport =>
        toThroughputRow(
          transport.transport ?? '',
          transport.transport ?? '',
          transport.waiting ?? null,
          transport.inFlight ?? 0,
          transport.throughputWindows,
          windowSeconds
        )
      )
      .filter(row => countOf(row, longest).handled > 0 || (row.waiting ?? 1) > 0 || row.inFlight > 0)
      .sort(
        (left, right) =>
          (right.waiting ?? 0) - (left.waiting ?? 0) ||
          countOf(right, sortWindow).handled - countOf(left, sortWindow).handled ||
          countOf(right, longest).handled - countOf(left, longest).handled ||
          (left.transport ?? '').localeCompare(right.transport ?? '')
      );
    if (perTransport.length === 0) return [];
    return [
      toThroughputRow(ALL_TRANSPORTS_KEY, null, totals?.waiting ?? null, totals?.inFlight ?? 0, totals?.throughputWindows, windowSeconds),
      ...perTransport,
    ];
  }, [transports, totals, windowSeconds, longest, sortWindow]);

  const columns: EntityListColumn<ThroughputRow>[] = [
    {
      id: 'transport',
      header: m('Transport'),
      cell: row =>
        row.transport === null ? (
          <span className="text-sm font-semibold">{t('All transports')}</span>
        ) : (
          <Link href={transportHref(row.transport)} className="block max-w-72 truncate font-mono text-[13px] font-medium hover:text-brand-emphasis">
            {row.transport}
          </Link>
        ),
      className: 'min-w-56',
    },
    { id: 'waiting', header: m('Waiting now'), cell: row => <ThroughputWaitingCell row={row} drainWindowSeconds={shortest} />, className: 'w-44' },
    {
      id: 'inFlight',
      header: m('In work now'),
      cell: row => (
        <span className={row.inFlight > 0 ? 'text-sm font-semibold tabular-nums' : 'text-sm text-muted-foreground tabular-nums'}>{formatCount(row.inFlight)}</span>
      ),
      className: 'w-28',
    },
    ...windowSeconds.map(
      (seconds): EntityListColumn<ThroughputRow> => ({
        // the ids of Core's default windows stay as before (`last5`, `last15`, `last60`, `last24h`)
        id: seconds === 300 ? 'last5' : seconds === 900 ? 'last15' : seconds === 3600 ? 'last60' : seconds === 86400 ? 'last24h' : `last${seconds}s`,
        header: windowHeaderText(seconds, t),
        cell: row => <WindowCell count={countOf(row, seconds)} />,
        className: 'w-36',
      })
    ),
    {
      id: 'perWorker',
      header: m('Per worker'),
      cell: row => {
        const rate = perWorkerMinute(countOf(row, perWorkerWindow));
        return rate === null ? (
          <EmptyValue />
        ) : (
          <div className="tabular-nums">
            <div className="text-sm font-semibold">{formatRate(rate, t)}</div>
            <div className="text-[11px] text-muted-foreground">
              {perWorkerWindow === 900 ? t('last 15 min') : t('last %window%', { replacements: { window: formatWindowLength(perWorkerWindow, t) } })}
            </div>
          </div>
        );
      },
      className: 'w-32',
    },
  ];

  return (
    <EntityListTable
      columns={columns}
      items={rows}
      getRowKey={row => row.key}
      emptyMessage={
        longest === 86400
          ? t('No message finished in the last 24 hours and every queue is empty.')
          : t('No message finished in the last %window% and every queue is empty.', { replacements: { window: formatWindowLength(longest, t) } })
      }
      className="md:flex-none"
    />
  );
};

// ── transports table ───────────────────────────────────────────────────────────────────────────────────────────────

export interface WorkerProcessRangeProps {
  live: number;
  min: number | null | undefined;
  max: number | null | undefined;
  isAutoscaled: boolean;
  /** False while the monitoring is off: the live count is unknown, only the configured range shows. */
  monitoringEnabled?: boolean;
}

/**
 * Processes now against the definition's range: the count, `min–max`, a bar filled to now with a tick at `min`; above
 * the maximum the bar turns to the warning colour. While the monitoring is off only the configured range shows.
 */
export const WorkerProcessRange = ({ live, min, max, isAutoscaled, monitoringEnabled = true }: WorkerProcessRangeProps) => {
  const { t } = useTranslate();
  if (max === null || max === undefined) {
    return (
      <span className="text-sm tabular-nums">
        <span className="font-semibold">{monitoringEnabled ? formatCount(live) : '?'}</span>{' '}
        <span className="text-xs text-muted-foreground">{t('no worker list entry')}</span>
      </span>
    );
  }
  const lower = min ?? 0;
  const rangeText = isAutoscaled ? `${lower}–${max}` : t('fixed %max%', { replacements: { max } });
  const description = isAutoscaled
    ? t('Autoscaled between %min% and %max%', { replacements: { min: lower, max } })
    : t('Fixed at %max%', { replacements: { max } });
  if (!monitoringEnabled) {
    return (
      <div className="w-28 text-sm tabular-nums" data-slot="worker-process-range">
        <WorkerHint content={`${description} · ${t('monitoring is off')}`}>
          <span className="text-xs text-muted-foreground">{t('configured %range%', { replacements: { range: rangeText } })}</span>
        </WorkerHint>
      </div>
    );
  }
  const scale = Math.max(max, live, 1);
  const isAboveMaximum = live > max;
  return (
    <div className="w-28" data-slot="worker-process-range" data-above-maximum={isAboveMaximum ? '' : undefined}>
      <WorkerHint content={description} className="block">
        <div className="flex items-baseline justify-between gap-2 text-sm tabular-nums">
          <span className={cn('font-semibold', isAboveMaximum && 'text-warning')}>{formatCount(live)}</span>
          <span className="text-xs text-muted-foreground">{rangeText}</span>
        </div>
        <div className="relative mt-1 h-1.5 rounded-full bg-tint">
          <div
            className={cn('absolute inset-y-0 left-0 rounded-full', isAboveMaximum ? 'bg-warning' : 'bg-primary')}
            style={{ width: `${(Math.min(live, scale) / scale) * 100}%` }}
          />
          {lower > 0 && (
            <div aria-hidden className="absolute -top-0.5 h-2.5 w-0.5 rounded-full bg-foreground/50" style={{ left: `calc(${(lower / scale) * 100}% - 1px)` }} />
          )}
          {isAboveMaximum && (
            <div aria-hidden className="absolute -top-0.5 h-2.5 w-0.5 rounded-full bg-foreground/50" style={{ left: `calc(${(max / scale) * 100}% - 1px)` }} />
          )}
        </div>
      </WorkerHint>
    </div>
  );
};

export interface WorkerTransportsTableProps {
  api: WorkersApi;
  transports: readonly WorkerTransportOverview[];
  /** Seconds the counts and averages cover (`recentWindowSeconds`, 900). */
  recentWindowSeconds?: number;
  /** Seconds of the sparkline's sequences (`sequenceWindowSeconds`, 3600): the column header. */
  sequenceWindowSeconds?: number;
  /** Seconds per step of the sparkline (`stepSeconds`): its readout's step range. */
  stepSeconds?: number;
  isLoading?: boolean;
  error?: string;
  monitoringEnabled: boolean;
  isSearchActive?: boolean;
  onClearSearch?: () => void;
  transportHref: WorkerTransportHref;
  /**
   * The live processes of every transport (`workersOverview.processes`): a row's restart result follows its asked
   * processes against them.
   */
  liveProcesses?: readonly WorkerProcess[];
  /**
   * Opens a transport when its row is clicked or activated by keyboard (Enter / Space on the focused row). Default:
   * the row's transport link is followed (through the link component, so the host's router handles it).
   */
  onOpenTransport?: (transport: string) => void;
}

/**
 * One row per transport, in the order given (sort with `sortTransports`): state badge, queue, processes against the
 * definition, the recent counts and averages, the sequence window of handled messages, the restart request. A row
 * opens its transport by pointer or keyboard (a tab stop; Enter or Space).
 */
export const WorkerTransportsTable = ({
  api,
  transports,
  recentWindowSeconds = 900,
  sequenceWindowSeconds = 3600,
  stepSeconds,
  isLoading = false,
  error,
  monitoringEnabled,
  isSearchActive,
  onClearSearch,
  transportHref,
  liveProcesses,
  onOpenTransport,
}: WorkerTransportsTableProps) => {
  const { t } = useTranslate();
  const Link = useLinkComponent();
  const tableRef = useRef<HTMLDivElement | null>(null);
  const recentLabel = t('Last %minutes% min', { replacements: { minutes: Math.round(recentWindowSeconds / 60) } });
  const processesOf = (name: string) =>
    liveProcesses?.filter(process => (process.transport ?? '').split(',').some(part => part.trim() === name));

  const rowAction = useCallback(
    (transport: WorkerTransportOverview) => {
      const name = transport.transport;
      if (!name) return null;
      return () => {
        if (onOpenTransport) {
          onOpenTransport(name);
          return;
        }
        // follow the row's own link: the host's link component (a router link) handles the click
        const marker = [...(tableRef.current?.querySelectorAll<HTMLElement>('[data-worker-transport-link]') ?? [])].find(
          element => element.dataset.workerTransportLink === name
        );
        marker?.closest('a')?.click();
      };
    },
    [onOpenTransport]
  );

  const columns: EntityListColumn<WorkerTransportOverview>[] = [
    {
      id: 'transport',
      header: m('Transport'),
      cell: transport => (
        <div className="flex min-w-0 flex-col gap-1 py-0.5">
          <div className="flex min-w-0 items-center gap-2">
            <Link href={transportHref(transport.transport ?? '')} className="truncate font-mono text-[13px] font-medium hover:text-brand-emphasis">
              <span data-worker-transport-link={transport.transport ?? ''}>{transport.transport}</span>
            </Link>
            {transport.restartPending && (
              <StatusBadge tone="warning" icon={RotateCcw} label={t('Restart requested')} title={t('A restart was requested; a live process has not stopped for it yet')} />
            )}
            {transport.definition?.devOnly && <Tag size="sm">{t('Dev only')}</Tag>}
          </div>
          {transport.lastErrorClass && (
            <WorkerHint content={workerLastErrorText(transport, t)} className="block max-w-80 truncate text-xs text-muted-foreground">
              <span className="font-medium text-destructive">{shortClassName(transport.lastErrorClass)}</span>
              {transport.lastErrorMessage ? ` · ${transport.lastErrorMessage}` : ''}
            </WorkerHint>
          )}
        </div>
      ),
      className: 'min-w-56',
    },
    {
      id: 'state',
      header: m('State'),
      cell: transport => (
        <div className="flex flex-col gap-0.5">
          <StatusBadge value={rawStatusValue<WorkerTransportState>(transport.state)} map={WORKER_TRANSPORT_STATE} />
          {transport.stuckSince && (
            <span className="text-[11px] text-muted-foreground">{t('since %time%', { replacements: { time: formatClockTime(transport.stuckSince) ?? '' } })}</span>
          )}
        </div>
      ),
      className: 'w-32',
    },
    {
      id: 'queue',
      header: m('Queue'),
      cell: transport => (
        <div className="flex flex-col gap-0.5">
          {isWaitingKnown(transport) ? (
            <span
              className={transport.waiting === 0 ? 'text-sm text-muted-foreground tabular-nums' : 'text-sm font-semibold tabular-nums'}
              title={transport.waitingSampledAt ? t('Counted at %time%', { replacements: { time: formatClockTime(transport.waitingSampledAt) ?? '' } }) : undefined}
            >
              {formatCount(transport.waiting)}
            </span>
          ) : (
            <WorkerHint content={uncountedReason(transport, t)} className="text-xs text-muted-foreground">
              {t(waitingStateLabel(transport.waitingState), waitingStateContext(transport.waitingState))}
            </WorkerHint>
          )}
          <span className="text-[11px] whitespace-nowrap text-muted-foreground tabular-nums">
            {monitoringEnabled
              ? t('%count% in work', { replacements: { count: formatCount(transport.inFlight ?? 0) } })
              : t('%count% in work', { replacements: { count: '?' } })}
          </span>
        </div>
      ),
      className: 'w-28',
    },
    {
      id: 'processes',
      header: m('Processes'),
      cell: transport => {
        const definition = transport.definition;
        const limits = [
          definition?.limit ? t('limit %count%', { replacements: { count: formatCount(definition.limit) } }) : null,
          definition?.memoryLimit ?? null,
        ].filter((part): part is string => Boolean(part));
        return (
          <div className="flex flex-col gap-1">
            <WorkerProcessRange
              live={transport.liveProcessCount ?? 0}
              min={transport.effectiveMin}
              max={transport.effectiveMax}
              isAutoscaled={transport.isAutoscaled ?? false}
              monitoringEnabled={monitoringEnabled}
            />
            {limits.length > 0 && <span className="text-[11px] whitespace-nowrap text-muted-foreground">{limits.join(' · ')}</span>}
          </div>
        );
      },
      className: 'w-44',
    },
    {
      id: 'recent',
      header: <span>{recentLabel}</span>,
      cell: transport => {
        if (!monitoringEnabled) return <span className="text-xs text-muted-foreground">{t('not measured')}</span>;
        const failed = (transport.thrownCount ?? 0) + (transport.caughtCount ?? 0);
        return (
          <div className="flex flex-col gap-0.5 whitespace-nowrap">
            <span className={transport.handledCount ? 'text-sm tabular-nums' : 'text-sm text-muted-foreground tabular-nums'}>
              {t('%count% handled', { replacements: { count: formatCount(transport.handledCount ?? 0) } })}
            </span>
            <span className={failed > 0 ? 'text-[11px] font-semibold text-destructive tabular-nums' : 'text-[11px] text-muted-foreground tabular-nums'}>
              {t('%count% failed', { replacements: { count: formatCount(failed) } })}
            </span>
          </div>
        );
      },
      className: 'w-28',
    },
    {
      id: 'timing',
      header: m('Avg duration · wait'),
      cell: transport =>
        transport.durationAverageMs === null || transport.durationAverageMs === undefined ? (
          <EmptyValue />
        ) : (
          <div className="flex flex-col gap-0.5 whitespace-nowrap tabular-nums">
            <span className="text-sm">{formatDurationMs(transport.durationAverageMs)}</span>
            <span className="text-[11px] text-muted-foreground">
              {transport.waitAverageMs === null || transport.waitAverageMs === undefined
                ? t('wait unknown')
                : t('wait %duration%', { replacements: { duration: formatDurationMs(transport.waitAverageMs) } })}
            </span>
          </div>
        ),
      className: 'w-36',
    },
    {
      id: 'activity',
      header: <span>{windowHeaderText(sequenceWindowSeconds, t)}</span>,
      cell: transport => {
        const rows = zipSeries({ handled: sequencePoints(transport.sequences, 'handled') });
        if (!rows.some(row => (row.handled ?? 0) > 0)) return <span className="text-xs text-muted-foreground">{t('No messages')}</span>;
        return (
          <div className="w-28" data-row-action-ignore>
            <WorkerSparkline
              rows={rows}
              valueKey="handled"
              color="var(--success)"
              label={sequenceLabelText('handled', sequenceWindowSeconds, t)}
              height={32}
              stepSeconds={stepSeconds}
            />
          </div>
        );
      },
      className: 'w-32',
    },
    {
      id: 'actions',
      header: <span className="sr-only">{t('Actions', { context: 'table-column' })}</span>,
      cell: transport =>
        transport.transport ? (
          <WorkerRestartButton
            api={api}
            variant="icon"
            transport={transport.transport}
            liveProcessCount={transport.liveProcessCount}
            monitoringEnabled={monitoringEnabled}
            liveProcesses={processesOf(transport.transport)}
          />
        ) : null,
      className: 'w-14',
    },
  ];

  return (
    <div ref={tableRef} className="contents" data-slot="worker-transports-table">
      <EntityListTable
        columns={columns}
        items={[...transports]}
        getRowKey={transport => transport.transport ?? ''}
        rowAction={rowAction}
        rowKeyboardActivation
        isLoading={isLoading}
        skeletonRows={6}
        error={error}
        emptyMessage={t('No transport is configured.')}
        noResultsMessage={t('No transport matches your search.')}
        isSearchActive={isSearchActive}
        onClearSearch={onClearSearch}
        loadingMessage={t('Loading transports')}
        className="md:flex-none"
      />
    </div>
  );
};

// ── loops ──────────────────────────────────────────────────────────────────────────────────────────────────────────

/** The loops of the worker list (console commands in a loop): listed, not monitored. Nothing without loops. */
export const WorkerLoopsCard = ({ loops }: { loops: readonly WorkerLoopDefinition[] }) => {
  const { t } = useTranslate();
  if (loops.length === 0) return null;
  const sleepText = (sleepSeconds: number | null | undefined): string => {
    if (!sleepSeconds) return t('loops by itself');
    if (sleepSeconds < 60) return t('every %seconds% s', { replacements: { seconds: sleepSeconds } });
    if (sleepSeconds % 60 === 0) return t('every %minutes% min', { replacements: { minutes: sleepSeconds / 60 } });
    return t('every %duration%', { replacements: { duration: formatDurationMs(sleepSeconds * 1000) } });
  };
  return (
    <section>
      <SectionHeader title={t('Loops')} description={t('Console commands the cluster runs in a loop. Listed from the worker list, not monitored.')} />
      <Card className="gap-0 py-0">
        <CardContent className="divide-y p-0">
          {loops.map(loop => (
            <div key={loop.name} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3 sm:px-6">
              <Repeat className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1 basis-48">
                <p className="text-sm font-semibold break-words">{loop.name}</p>
                <p className="font-mono text-xs break-all text-muted-foreground">{loop.args}</p>
              </div>
              <span className="text-xs whitespace-nowrap text-muted-foreground">{sleepText(loop.sleepSeconds)}</span>
              {loop.prodOnly && <Tag size="sm">{t('Production only')}</Tag>}
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
};
