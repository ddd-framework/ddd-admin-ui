'use client';

import { buildFieldFilter, buildInFilter } from '@mgamadeus/ddd-web/query';
import { RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { m } from '../i18n/store.ts';
import { useTranslate } from '../i18n/useTranslate.ts';
import { DateCell } from '../list/cells.tsx';
import { ChipToggleGroup } from '../list/ChipToggleGroup.tsx';
import { CopyButton } from '../list/CopyButton.tsx';
import { EmptyValue } from '../list/EmptyValue.tsx';
import { EntityListCard } from '../list/EntityListCard.tsx';
import { type EntityListColumn, EntityListTable } from '../list/EntityListTable.tsx';
import { EntityListToolbar } from '../list/EntityListToolbar.tsx';
import { StatusBadge } from '../list/StatusBadge.tsx';
import { useGrowingWindowList } from '../logic/react/useGrowingWindowList.ts';
import { CardGrid } from '../page/PageLayout.tsx';
import { cn } from '../primitives/cn.ts';
import type { WorkersApi } from './api.ts';
import { ChartBody, ChartLegend, WorkerChartCard, WorkerTimeChart } from './charts.tsx';
import {
  dispatchOrigin,
  formatBytes,
  formatClockTime,
  formatCount,
  formatDurationMs,
  formatDurationTick,
  hasAnyValue,
  parseWorkersTime,
  sequencePoints,
  shortClassName,
  shortHost,
  stopReasonLabel,
  succeededPoints,
  sumOf,
  wantsLogScale,
  zipSeries,
} from './format.ts';
import { toWorkerMessageOutcome, toWorkerProcessState, WORKER_MESSAGE_OUTCOME, WORKER_PROCESS_STATE } from './status.ts';
import type {
  WorkerMessageClassStat,
  WorkerMessageRun,
  WorkerMessageRunsResponse,
  WorkerProcess,
  WorkerProcessesResponse,
  WorkerTransportDetail,
  WorkerTransportListArg,
} from './types.ts';
import { useRefreshWhileVisible } from './useWorkersWindow.ts';
import { WORKERS_LIST_POLL_MS } from './window.ts';

const CHART_HEIGHT = 200;

export interface WorkerTransportChartsProps {
  detail: WorkerTransportDetail;
  windowMs: number;
  isRefreshing?: boolean;
}

/**
 * The charts of one transport over the window: queue and workers (the definition's range as dashed lines), throughput
 * (succeeded, failed, redelivered), duration and queue wait (average and maximum; a logarithmic axis when the maximum
 * dwarfs the average). A step without a reading is a gap.
 */
export const WorkerTransportCharts = ({ detail, windowMs, isRefreshing = false }: WorkerTransportChartsProps) => {
  const { t } = useTranslate();
  const sequences = detail.sequences;
  const stepSeconds = detail.stepSeconds ?? 60;
  const overview = detail.transport;

  const rows = useMemo(() => {
    const handled = sequencePoints(sequences, 'handled');
    const failed = sequencePoints(sequences, 'failed');
    return zipSeries({
      handled,
      failed,
      succeeded: succeededPoints(handled, failed),
      redelivered: sequencePoints(sequences, 'redelivered'),
      durationAverageMs: sequencePoints(sequences, 'durationAverageMs'),
      durationMaxMs: sequencePoints(sequences, 'durationMaxMs'),
      waitAverageMs: sequencePoints(sequences, 'waitAverageMs'),
      waitMaxMs: sequencePoints(sequences, 'waitMaxMs'),
      waiting: sequencePoints(sequences, 'waiting'),
      inFlight: sequencePoints(sequences, 'inFlight'),
      processes: sequencePoints(sequences, 'processes'),
      processStarts: sequencePoints(sequences, 'processStarts'),
    });
  }, [sequences]);

  const durationLog = wantsLogScale(rows, 'durationAverageMs', 'durationMaxMs');
  const waitLog = wantsLogScale(rows, 'waitAverageMs', 'waitMaxMs');
  const totalStarts = sumOf(sequencePoints(sequences, 'processStarts'));
  const referenceLines = [
    ...(overview?.effectiveMax !== null && overview?.effectiveMax !== undefined
      ? [{ y: overview.effectiveMax, label: t('max %value%', { replacements: { value: overview.effectiveMax } }) }]
      : []),
    ...(overview?.effectiveMin ? [{ y: overview.effectiveMin, label: t('min %value%', { replacements: { value: overview.effectiveMin } }) }] : []),
  ];
  const common = { windowMs, stepSeconds, height: CHART_HEIGHT };
  const labels = {
    waiting: t('Waiting', { context: 'chart-series' }),
    inFlight: t('In work', { context: 'chart-series' }),
    processes: t('Processes', { context: 'chart-series' }),
    starts: t('Starts', { context: 'chart-series' }),
    succeeded: t('Succeeded', { context: 'chart-series' }),
    failed: t('Failed', { context: 'chart-series' }),
    redelivered: t('Redelivered', { context: 'chart-series' }),
    average: t('Average', { context: 'chart-series' }),
    maximum: t('Maximum', { context: 'chart-series' }),
  };
  const durationTicksFormat = { formatTick: formatDurationTick, formatValue: (value: number) => formatDurationMs(value) };
  const noFinished = t('No message finished in this window');

  return (
    <CardGrid>
      <WorkerChartCard
        title={t('Queue')}
        description={t('Messages waiting and in work (highest sample per step).')}
        legend={[
          { key: 'waiting', label: labels.waiting, color: 'var(--warning)' },
          { key: 'inFlight', label: labels.inFlight, color: 'var(--primary)', shape: 'line' },
        ]}
      >
        <ChartBody height={CHART_HEIGHT} isEmpty={!hasAnyValue(rows, ['waiting', 'inFlight'])} emptyMessage={t('No message waited or was in work')} isRefreshing={isRefreshing}>
          <WorkerTimeChart
            rows={rows}
            series={[
              { key: 'waiting', label: labels.waiting, color: 'var(--warning)', kind: 'area', curve: 'step' },
              { key: 'inFlight', label: labels.inFlight, color: 'var(--primary)', kind: 'line', curve: 'step' },
            ]}
            ariaLabel={t('Messages waiting and in work over the window')}
            {...common}
          />
        </ChartBody>
      </WorkerChartCard>

      <WorkerChartCard
        title={t('Workers', { context: 'chart-title' })}
        description={t('{count, plural, one {Live processes and # process start in this window; dashed: the configured range.} other {Live processes and # process starts in this window; dashed: the configured range.}}', {
          count: totalStarts,
        })}
        legend={[
          { key: 'processes', label: labels.processes, color: 'var(--info)', shape: 'line' },
          { key: 'processStarts', label: labels.starts, color: 'var(--primary)' },
        ]}
      >
        <ChartBody height={CHART_HEIGHT} isEmpty={!hasAnyValue(rows, ['processes', 'processStarts'])} emptyMessage={t('No worker process ran in this window')} isRefreshing={isRefreshing}>
          <WorkerTimeChart
            rows={rows}
            series={[
              { key: 'processStarts', label: labels.starts, color: 'var(--primary)', kind: 'bar' },
              { key: 'processes', label: labels.processes, color: 'var(--info)', kind: 'line', curve: 'step' },
            ]}
            referenceLines={referenceLines}
            ariaLabel={t('Live worker processes and process starts over the window')}
            {...common}
          />
        </ChartBody>
      </WorkerChartCard>

      <WorkerChartCard
        title={t('Throughput')}
        description={t('Finished messages per step; redelivered = retries.')}
        legend={[
          { key: 'succeeded', label: labels.succeeded, color: 'var(--success)' },
          { key: 'failed', label: labels.failed, color: 'var(--destructive)' },
          { key: 'redelivered', label: labels.redelivered, color: 'var(--warning)', shape: 'line', dashed: true },
        ]}
      >
        <ChartBody height={CHART_HEIGHT} isEmpty={!hasAnyValue(rows, ['handled'])} emptyMessage={noFinished} isRefreshing={isRefreshing}>
          <WorkerTimeChart
            rows={rows}
            series={[
              { key: 'succeeded', label: labels.succeeded, color: 'var(--success)', kind: 'bar', stackId: 'throughput' },
              { key: 'failed', label: labels.failed, color: 'var(--destructive)', kind: 'bar', stackId: 'throughput' },
              { key: 'redelivered', label: labels.redelivered, color: 'var(--warning)', kind: 'line', dashed: true },
            ]}
            ariaLabel={t('Succeeded, failed and redelivered messages over the window')}
            {...common}
          />
        </ChartBody>
      </WorkerChartCard>

      <WorkerChartCard
        title={t('Duration')}
        description={durationLog ? t('Handling time per step. Logarithmic axis: the maximum dwarfs the average.') : t('Handling time per step.')}
        legend={[
          { key: 'durationAverageMs', label: labels.average, color: 'var(--primary)', shape: 'line' },
          { key: 'durationMaxMs', label: labels.maximum, color: 'var(--warning)', shape: 'line', dashed: true },
        ]}
      >
        <ChartBody height={CHART_HEIGHT} isEmpty={!hasAnyValue(rows, ['durationMaxMs'])} emptyMessage={noFinished} isRefreshing={isRefreshing}>
          <WorkerTimeChart
            rows={rows}
            series={[
              { key: 'durationAverageMs', label: labels.average, color: 'var(--primary)', kind: 'line' },
              { key: 'durationMaxMs', label: labels.maximum, color: 'var(--warning)', kind: 'line', dashed: true },
            ]}
            logScale={durationLog}
            ariaLabel={t('Average and maximum handling time over the window')}
            {...durationTicksFormat}
            {...common}
          />
        </ChartBody>
      </WorkerChartCard>

      <WorkerChartCard
        title={t('Queue wait')}
        description={t('Dispatch to handler start per step; a message without a dispatch time has none.')}
        legend={[
          { key: 'waitAverageMs', label: labels.average, color: 'var(--primary)', shape: 'line' },
          { key: 'waitMaxMs', label: labels.maximum, color: 'var(--warning)', shape: 'line', dashed: true },
        ]}
      >
        <ChartBody height={CHART_HEIGHT} isEmpty={!hasAnyValue(rows, ['waitMaxMs'])} emptyMessage={t('No wait time in this window')} isRefreshing={isRefreshing}>
          <WorkerTimeChart
            rows={rows}
            series={[
              { key: 'waitAverageMs', label: labels.average, color: 'var(--primary)', kind: 'line' },
              { key: 'waitMaxMs', label: labels.maximum, color: 'var(--warning)', kind: 'line', dashed: true },
            ]}
            logScale={waitLog}
            ariaLabel={t('Average and maximum queue wait over the window')}
            {...durationTicksFormat}
            {...common}
          />
        </ChartBody>
      </WorkerChartCard>
    </CardGrid>
  );
};

const DurationPair = ({ average, maximum }: { average: number | null | undefined; maximum: number | null | undefined }) => {
  const { t } = useTranslate();
  if (average === null || average === undefined) return <EmptyValue />;
  return (
    <span className="text-sm whitespace-nowrap tabular-nums">
      {formatDurationMs(average)}
      <span className="text-xs text-muted-foreground"> · {t('max %duration%', { replacements: { duration: formatDurationMs(maximum) } })}</span>
    </span>
  );
};

/** What the workers of the transport did per message class in the window. */
export const WorkerMessageClassesTable = ({ messageClasses }: { messageClasses: readonly WorkerMessageClassStat[] }) => {
  const { t } = useTranslate();
  const columns: EntityListColumn<WorkerMessageClassStat>[] = [
    {
      id: 'messageClass',
      header: m('Message class'),
      cell: stat => (
        <span className="block max-w-80 truncate font-mono text-[13px]" title={stat.messageClass}>
          {shortClassName(stat.messageClass)}
        </span>
      ),
      className: 'min-w-56',
    },
    { id: 'handled', header: m('Finished'), cell: stat => <span className="text-sm tabular-nums">{formatCount(stat.handledCount)}</span>, className: 'w-24' },
    {
      id: 'failed',
      header: m('Failures'),
      cell: stat => {
        const failed = (stat.thrownCount ?? 0) + (stat.caughtCount ?? 0);
        return (
          <span className={failed > 0 ? 'text-sm font-semibold text-destructive tabular-nums' : 'text-sm text-muted-foreground tabular-nums'}>
            {formatCount(failed)}
            {failed > 0 && (
              <span className="text-xs font-normal text-muted-foreground">
                {' '}
                {t('(%thrown% thrown · %caught% caught)', { replacements: { thrown: formatCount(stat.thrownCount), caught: formatCount(stat.caughtCount) } })}
              </span>
            )}
          </span>
        );
      },
      className: 'w-44',
    },
    { id: 'redelivered', header: m('Retries'), cell: stat => <span className="text-sm text-muted-foreground tabular-nums">{formatCount(stat.redeliveredCount)}</span>, className: 'w-20' },
    { id: 'duration', header: m('Duration'), cell: stat => <DurationPair average={stat.durationAverageMs} maximum={stat.durationMaxMs} />, className: 'w-44' },
    { id: 'wait', header: m('Wait'), cell: stat => <DurationPair average={stat.waitAverageMs} maximum={stat.waitMaxMs} />, className: 'w-44' },
    {
      id: 'lastError',
      header: m('Last error'),
      cell: stat =>
        stat.lastErrorClass ? (
          <span className="block max-w-72 truncate text-xs" title={stat.lastErrorMessage ?? stat.lastErrorClass}>
            <span className="font-medium text-destructive">{shortClassName(stat.lastErrorClass)}</span>
            <span className="text-muted-foreground"> · {formatClockTime(stat.lastErrorAt)}</span>
          </span>
        ) : (
          <EmptyValue />
        ),
      className: 'min-w-48',
    },
  ];
  return (
    <EntityListTable
      columns={columns}
      items={[...messageClasses]}
      getRowKey={stat => stat.messageClass ?? ''}
      emptyMessage={t('No message finished in this window.')}
      className="md:flex-none"
    />
  );
};

/** `+3 s`: how long a fresh worker waited for its first message. */
const firstMessageDelay = (process: WorkerProcess): string | null => {
  const start = parseWorkersTime(process.startedAt);
  const first = parseWorkersTime(process.firstMessageAt);
  return start === null || first === null ? null : `+${formatDurationMs(Math.max(first - start, 0))}`;
};

export interface WorkerProcessesTableProps {
  processes: readonly WorkerProcess[];
  isLoading?: boolean;
  isFetchingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  error?: string;
  emptyMessage: string;
  isSearchActive?: boolean;
  onClearSearch?: () => void;
  /** Live processes only: no Stopped column. */
  live?: boolean;
}

/** Worker processes: display state, host and pid, lifetime (start, first message, stop), inferred stop reason, counts, memory. */
export const WorkerProcessesTable = ({
  processes,
  isLoading = false,
  isFetchingMore = false,
  hasMore = false,
  onLoadMore,
  error,
  emptyMessage,
  isSearchActive,
  onClearSearch,
  live = false,
}: WorkerProcessesTableProps) => {
  const { t } = useTranslate();
  const columns: EntityListColumn<WorkerProcess>[] = [
    {
      id: 'state',
      header: m('State'),
      cell: process => (
        <div className="flex flex-col gap-1">
          <StatusBadge value={toWorkerProcessState(process.displayState ?? process.state)} map={WORKER_PROCESS_STATE} />
          {process.restartRequestedAt && !process.stoppedAt && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <RotateCcw className="size-3" aria-hidden />
              {t('restart requested')}
            </span>
          )}
        </div>
      ),
      className: 'w-32',
    },
    {
      id: 'host',
      header: m('Host · PID'),
      cell: process => (
        <span className="block max-w-48 truncate font-mono text-xs" title={process.processKey ?? undefined}>
          {shortHost(process.hostName)} · {process.processId ?? '—'}
        </span>
      ),
      className: 'w-44',
    },
    {
      id: 'started',
      header: m('Started'),
      cell: process => {
        const delay = firstMessageDelay(process);
        return (
          <div className="flex flex-col gap-0.5">
            <DateCell value={process.startedAt} />
            <span className="text-[11px] whitespace-nowrap text-muted-foreground">
              {delay ? t('first message %delay%', { replacements: { delay } }) : t('no message yet')}
            </span>
          </div>
        );
      },
      className: 'w-44',
    },
    {
      id: 'stopped',
      header: m('Stopped'),
      cell: process => {
        if (!process.stoppedAt) return <EmptyValue />;
        const label = stopReasonLabel(process.stopReason);
        return (
          <div className="flex flex-col gap-0.5">
            <DateCell value={process.stoppedAt} />
            {label && (
              <span
                className={cn('text-[11px] whitespace-nowrap', process.stopReason === 'LOST' ? 'text-destructive' : 'text-muted-foreground')}
                title={t('Inferred: Messenger stops without a reason; a lost process reported no stop (stopped = when it was noticed)')}
              >
                {label}
              </span>
            )}
          </div>
        );
      },
      className: 'w-48',
    },
    {
      id: 'counts',
      header: m('Handled / failed'),
      cell: process => (
        <span className="text-sm whitespace-nowrap tabular-nums">
          {formatCount(process.handledCount ?? 0)}
          <span className="text-muted-foreground"> / </span>
          <span className={(process.failedCount ?? 0) > 0 ? 'font-semibold text-destructive' : 'text-muted-foreground'}>{formatCount(process.failedCount ?? 0)}</span>
        </span>
      ),
      className: 'w-32',
    },
    { id: 'memory', header: m('Memory peak'), cell: process => <span className="text-sm whitespace-nowrap tabular-nums">{formatBytes(process.memoryPeakBytes)}</span>, className: 'w-28' },
    {
      id: 'current',
      header: m('Current message'),
      cell: process =>
        process.currentMessageClass ? (
          <div className="flex max-w-52 flex-col">
            <span className="truncate font-mono text-xs" title={process.currentMessageClass}>
              {shortClassName(process.currentMessageClass)}
            </span>
            {process.currentMessageSince && <DateCell value={process.currentMessageSince} className="text-[11px] text-muted-foreground" />}
          </div>
        ) : process.stoppedAt ? (
          <EmptyValue />
        ) : (
          <span className="text-xs text-muted-foreground">{t('idle', { context: 'worker-process' })}</span>
        ),
      className: 'min-w-44',
    },
  ];
  return (
    <EntityListTable
      columns={live ? columns.filter(column => column.id !== 'stopped') : columns}
      items={[...processes]}
      getRowKey={process => process.processKey ?? String(process.id)}
      isLoading={isLoading}
      isFetchingMore={isFetchingMore}
      hasMore={hasMore}
      onLoadMore={onLoadMore}
      error={error}
      emptyMessage={emptyMessage}
      noResultsMessage={t('No process matches this filter.')}
      isSearchActive={isSearchActive}
      onClearSearch={onClearSearch}
      loadingMessage={t('Loading processes')}
      skeletonRows={5}
      className="md:flex-none"
    />
  );
};

const STATE_FILL: Readonly<Record<string, string>> = {
  RUNNING: 'bg-success',
  BUSY: 'bg-info',
  STOPPING: 'bg-warning',
  SILENT: 'bg-warning',
  STOPPED: 'bg-muted-foreground/45',
  LOST: 'bg-destructive',
};

interface Lane {
  process: WorkerProcess;
  startMs: number;
  endMs: number;
  firstMessageMs: number | null;
  isOpen: boolean;
}

/**
 * The lifetimes of the listed processes on one time axis (plain elements): one lane per process from its start to its
 * stop (or now), coloured by its display state, a tick at its first message. A lost process ends at its last
 * heartbeat. The time before a worker registers (container start, image pull) is not part of a lifetime.
 */
export const WorkerProcessTimeline = ({ processes, nowMs }: { processes: readonly WorkerProcess[]; nowMs: number }) => {
  const { t } = useTranslate();
  const { lanes, domainStart, domainEnd } = useMemo(() => {
    const parsed: Lane[] = [];
    for (const process of processes) {
      const startMs = parseWorkersTime(process.startedAt);
      if (startMs === null) continue;
      const stoppedMs = parseWorkersTime(process.stoppedAt);
      const lastSeenMs = parseWorkersTime(process.lastSeenAt);
      const endMs = process.stopReason === 'LOST' && lastSeenMs !== null ? lastSeenMs : (stoppedMs ?? nowMs);
      parsed.push({ process, startMs, endMs: Math.max(endMs, startMs), firstMessageMs: parseWorkersTime(process.firstMessageAt), isOpen: stoppedMs === null });
    }
    parsed.sort((left, right) => left.startMs - right.startMs);
    const start = parsed.reduce((earliest, lane) => Math.min(earliest, lane.startMs), nowMs);
    const end = Math.max(nowMs, ...parsed.map(lane => lane.endMs));
    return { lanes: parsed, domainStart: start, domainEnd: Math.max(end, start + 60_000) };
  }, [processes, nowMs]);

  if (lanes.length === 0) return null;
  const span = domainEnd - domainStart;
  const percent = (ms: number) => `${((ms - domainStart) / span) * 100}%`;
  const legend = [
    { key: 'RUNNING', label: t('Running', { context: 'worker-process-state' }), color: 'var(--success)' },
    { key: 'BUSY', label: t('Busy', { context: 'worker-process-state' }), color: 'var(--info)' },
    { key: 'STOPPING', label: t('Stopping or silent'), color: 'var(--warning)' },
    { key: 'STOPPED', label: t('Stopped', { context: 'worker-process-state' }), color: 'var(--muted-foreground)' },
    { key: 'LOST', label: t('Lost', { context: 'worker-process-state' }), color: 'var(--destructive)' },
  ];

  return (
    <div className="space-y-3" data-slot="worker-process-timeline">
      <ChartLegend items={legend} />
      <ul className="max-h-80 space-y-1 overflow-y-auto pr-1">
        {lanes.map(lane => {
          const state = lane.process.displayState ?? lane.process.state ?? '';
          const width = Math.max(((lane.endMs - lane.startMs) / span) * 100, 0.4);
          const stopReason = stopReasonLabel(lane.process.stopReason);
          const summary = [
            `${shortHost(lane.process.hostName)} · ${lane.process.processId ?? ''}`,
            `${formatClockTime(lane.process.startedAt) ?? ''} → ${lane.isOpen ? t('now') : (formatClockTime(lane.process.stopReason === 'LOST' ? lane.process.lastSeenAt : lane.process.stoppedAt) ?? '')} (${formatDurationMs(lane.endMs - lane.startMs)})`,
            t('%handled% handled · %failed% failed', { replacements: { handled: formatCount(lane.process.handledCount ?? 0), failed: formatCount(lane.process.failedCount ?? 0) } }),
            stopReason,
          ]
            .filter(Boolean)
            .join(' · ');
          return (
            <li key={lane.process.processKey ?? String(lane.process.id)} className="flex items-center gap-3">
              <span className="w-32 shrink-0 truncate text-right font-mono text-[11px] text-muted-foreground sm:w-44">
                {shortHost(lane.process.hostName)} · {lane.process.processId}
              </span>
              <div className="relative h-4 min-w-0 flex-1 rounded-full bg-tint" title={summary}>
                <span
                  role="img"
                  aria-label={summary}
                  className={cn('absolute inset-y-0.5 min-w-1 rounded-full', STATE_FILL[state] ?? 'bg-muted-foreground/45', lane.isOpen && 'rounded-r-none')}
                  style={{ left: percent(lane.startMs), width: `${width}%` }}
                />
                {lane.firstMessageMs !== null && (
                  <span aria-hidden className="pointer-events-none absolute inset-y-0 w-0.5 rounded-full bg-foreground/70" style={{ left: percent(lane.firstMessageMs) }} />
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="flex justify-between gap-3 pl-[8.75rem] text-[11px] text-muted-foreground tabular-nums sm:pl-[11.75rem]">
        <span>{formatClockTime(new Date(domainStart).toISOString())}</span>
        <span>{formatClockTime(new Date(domainEnd).toISOString())}</span>
      </div>
      <p className="text-xs text-muted-foreground">{t('Tick: first message of the process.')}</p>
    </div>
  );
};

/** State filter of the process history (stored `state`, `stopReason`). */
export const WORKER_PROCESS_FILTERS = ['running', 'stopped', 'lost', 'restarted'] as const;
export type WorkerProcessFilter = '' | (typeof WORKER_PROCESS_FILTERS)[number];

export const toWorkerProcessFilter = (value: string | null | undefined): WorkerProcessFilter =>
  (WORKER_PROCESS_FILTERS as readonly string[]).includes(value ?? '') ? (value as WorkerProcessFilter) : '';

/** The filter string of a process filter (`state ne 'STOPPED'`, …); undefined for every process. */
export const workerProcessFilterString = (filter: WorkerProcessFilter): string | undefined => {
  if (filter === 'running') return buildFieldFilter('state', 'STOPPED', 'ne');
  if (filter === 'stopped') return buildFieldFilter('state', 'STOPPED', 'eq');
  if (filter === 'lost') return buildFieldFilter('stopReason', 'LOST', 'eq');
  if (filter === 'restarted') return buildFieldFilter('stopReason', 'RESTART_REQUESTED', 'eq');
  return undefined;
};

/** Outcome filter of the runs: every run, the failed ones (`outcome ne 'HANDLED'`), or one outcome. */
export const WORKER_RUN_OUTCOME_FILTERS = ['failed', 'THROWN', 'CAUGHT', 'HANDLED'] as const;
export type WorkerRunOutcomeFilter = '' | (typeof WORKER_RUN_OUTCOME_FILTERS)[number];

export const toWorkerRunOutcomeFilter = (value: string | null | undefined): WorkerRunOutcomeFilter =>
  (WORKER_RUN_OUTCOME_FILTERS as readonly string[]).includes(value ?? '') ? (value as WorkerRunOutcomeFilter) : '';

/** The filter string of an outcome filter; undefined for every run. */
export const workerRunOutcomeFilterString = (filter: WorkerRunOutcomeFilter): string | undefined => {
  if (filter === '') return undefined;
  if (filter === 'failed') return buildFieldFilter('outcome', 'HANDLED', 'ne');
  return buildInFilter('outcome', [filter]);
};

const PAGE_SIZE = 50;
const MAX_TOP = 500;
const extractProcesses = (data: WorkerProcessesResponse): WorkerProcess[] => data.workerProcesses.elements ?? [];
const extractRuns = (data: WorkerMessageRunsResponse): WorkerMessageRun[] => data.workerMessageRuns.elements ?? [];

export interface WorkerProcessesTabProps {
  api: WorkersApi;
  transport: string;
  filter: WorkerProcessFilter;
  onFilterChange: (filter: WorkerProcessFilter) => void;
}

/**
 * The process history of a transport (`GET /transports/{transport}/processes`), newest first: their lifetimes on one
 * axis, then the table. Refreshes every 15 s while the tab is visible, so a restart request can be followed.
 */
export const WorkerProcessesTab = ({ api, transport, filter, onFilterChange }: WorkerProcessesTabProps) => {
  const { t } = useTranslate();
  const args = useMemo<Omit<WorkerTransportListArg, 'top' | 'skip'>>(
    () => ({ transport, filters: workerProcessFilterString(filter), orderBy: 'startedAt desc' }),
    [transport, filter]
  );
  const list = useGrowingWindowList({
    useListQuery: api.useProcessesQuery,
    args,
    extractItems: extractProcesses,
    pageSize: PAGE_SIZE,
    maxTop: MAX_TOP,
    resetKey: JSON.stringify(args),
  });
  // "now" of the timeline: the clock after hydration (the server render and the first client render use the newest
  // time in the rows, so both draw the same lanes), then the moment of every refresh
  const [clockMs, setClockMs] = useState<number | null>(null);
  useEffect(() => setClockMs(Date.now()), []);
  const nowMs = useMemo(
    () =>
      clockMs ??
      list.items.reduce(
        (latest, item) => Math.max(latest, parseWorkersTime(item.lastSeenAt) ?? 0, parseWorkersTime(item.stoppedAt) ?? 0, parseWorkersTime(item.startedAt) ?? 0),
        0
      ),
    [clockMs, list.items]
  );
  const { refetch } = list;
  const refresh = useCallback(() => {
    refetch();
    setClockMs(Date.now());
  }, [refetch]);
  useRefreshWhileVisible(refresh, WORKERS_LIST_POLL_MS);

  return (
    <div className="space-y-4">
      {list.items.length > 0 && (
        <WorkerChartCard
          title={t('Process lifetimes')}
          description={t('{count, plural, one {The # process listed below, from its start to its stop (or now).} other {The # processes listed below, from their start to their stop (or now).}}', {
            count: list.items.length,
          })}
        >
          <WorkerProcessTimeline processes={list.items} nowMs={nowMs} />
        </WorkerChartCard>
      )}
      <EntityListCard
        label={m('Processes')}
        isRefetching={list.isFetchingMore}
        toolbar={
          <EntityListToolbar
            trailing={
              <ChipToggleGroup
                mode="single"
                aria-label={t('Process state')}
                options={[
                  { value: 'running', label: m('Not stopped') },
                  { value: 'stopped', label: m('Stopped') },
                  { value: 'lost', label: m('Lost') },
                  { value: 'restarted', label: m('Restart requested') },
                ]}
                value={filter}
                onChange={value => onFilterChange(toWorkerProcessFilter(value))}
              />
            }
          />
        }
      >
        <WorkerProcessesTable
          processes={list.items}
          isLoading={list.isLoading}
          isFetchingMore={list.isFetchingMore}
          hasMore={list.hasMore}
          onLoadMore={list.loadMore}
          error={list.isError ? t('The processes could not be loaded.') : undefined}
          emptyMessage={t('No worker process of this transport is recorded.')}
          isSearchActive={filter !== ''}
          onClearSearch={() => onFilterChange('')}
        />
      </EntityListCard>
    </div>
  );
};

export interface WorkerMessageRunsTabProps {
  api: WorkersApi;
  transport: string;
  outcome: WorkerRunOutcomeFilter;
  onOutcomeChange: (outcome: WorkerRunOutcomeFilter) => void;
  /** The transport's `messageLog` setting: `failures` / `off` record fewer or no runs (the statistics stay complete). */
  messageLog?: string | null;
}

/**
 * The single messages of a transport (`GET /transports/{transport}/messageRuns`), newest first: outcome, class, where it
 * was dispatched from, queue wait, handling time, attempt, error and its issue group. Refreshes every 15 s.
 */
export const WorkerMessageRunsTab = ({ api, transport, outcome, onOutcomeChange, messageLog }: WorkerMessageRunsTabProps) => {
  const { t } = useTranslate();
  const args = useMemo<Omit<WorkerTransportListArg, 'top' | 'skip'>>(
    () => ({ transport, filters: workerRunOutcomeFilterString(outcome), orderBy: 'startedAt desc' }),
    [transport, outcome]
  );
  const list = useGrowingWindowList({
    useListQuery: api.useMessageRunsQuery,
    args,
    extractItems: extractRuns,
    pageSize: PAGE_SIZE,
    maxTop: MAX_TOP,
    resetKey: JSON.stringify(args),
  });
  useRefreshWhileVisible(list.refetch, WORKERS_LIST_POLL_MS);

  const columns: EntityListColumn<WorkerMessageRun>[] = [
    {
      id: 'started',
      header: m('Started'),
      cell: run => (
        <div className="flex flex-col gap-0.5">
          <DateCell value={run.startedAt} />
          <span className="max-w-40 truncate font-mono text-[11px] text-muted-foreground" title={run.processKey ?? undefined}>
            {run.processKey ? shortHost(run.processKey.split(':')[0]) : t('command line')}
          </span>
        </div>
      ),
      className: 'w-44',
    },
    {
      id: 'outcome',
      header: m('Outcome'),
      cell: run => <StatusBadge value={toWorkerMessageOutcome(run.outcome)} map={WORKER_MESSAGE_OUTCOME} />,
      className: 'w-28',
    },
    {
      id: 'message',
      header: m('Message'),
      cell: run => {
        const origin = dispatchOrigin(run);
        return (
          <div className="flex max-w-80 min-w-0 flex-col gap-0.5">
            <span className="truncate font-mono text-[13px]" title={run.messageClass ?? undefined}>
              {shortClassName(run.messageClass)}
            </span>
            <span className="truncate text-xs text-muted-foreground" title={origin ?? undefined}>
              {origin ? t('from %origin%', { replacements: { origin } }) : t('dispatch origin unknown')}
            </span>
          </div>
        );
      },
      className: 'min-w-56',
    },
    {
      id: 'wait',
      header: m('Wait'),
      cell: run =>
        run.waitMs === null || run.waitMs === undefined ? (
          <span className="text-xs text-muted-foreground" title={t('The message carried no dispatch time')}>
            {t('unknown', { context: 'wait-time' })}
          </span>
        ) : (
          <span className="text-sm whitespace-nowrap tabular-nums">{formatDurationMs(run.waitMs)}</span>
        ),
      className: 'w-24',
    },
    { id: 'duration', header: m('Duration'), cell: run => <span className="text-sm whitespace-nowrap tabular-nums">{formatDurationMs(run.durationMs)}</span>, className: 'w-24' },
    {
      id: 'attempt',
      header: m('Attempt'),
      cell: run => (
        <span className="text-sm whitespace-nowrap tabular-nums">
          {run.attempt}
          {run.willRetry === true && <span className="text-xs text-muted-foreground"> · {t('will retry')}</span>}
          {run.willRetry === false && run.outcome === 'THROWN' && <span className="text-xs text-destructive"> · {t('final', { context: 'attempt' })}</span>}
        </span>
      ),
      className: 'w-32',
    },
    {
      id: 'error',
      header: m('Error'),
      cell: run =>
        run.errorClass || run.errorMessage ? (
          <span className="block max-w-64 truncate text-xs" title={[run.errorClass, run.errorMessage].filter(Boolean).join('\n')}>
            <span className="font-medium text-destructive">{shortClassName(run.errorClass)}</span>
            {run.errorMessage && <span className="text-muted-foreground"> · {run.errorMessage}</span>}
          </span>
        ) : (
          <EmptyValue />
        ),
      className: 'min-w-48',
    },
    {
      id: 'issue',
      header: m('Issue group'),
      cell: run =>
        run.issueGroupHash ? (
          <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground" title={run.issueGroupHash}>
            {run.issueGroupHash.slice(0, 10)}
            <CopyButton value={run.issueGroupHash} label={m('Copy issue group hash')} />
          </span>
        ) : (
          <EmptyValue />
        ),
      className: 'w-36',
    },
  ];

  const logNote =
    messageLog === 'failures'
      ? t('This transport records only failed runs (messageLog: failures); the statistics stay complete.')
      : messageLog === 'off'
        ? t('This transport records no runs (messageLog: off); the statistics stay complete.')
        : null;

  return (
    <EntityListCard
      label={m('Message runs')}
      isRefetching={list.isFetchingMore}
      toolbar={
        <EntityListToolbar
          trailing={
            <div className="flex flex-wrap items-center gap-3">
              {logNote && <span className="text-xs text-muted-foreground">{logNote}</span>}
              <ChipToggleGroup
                mode="single"
                aria-label={t('Outcome', { context: 'filter' })}
                options={[
                  { value: 'failed', label: m('Failed') },
                  { value: 'THROWN', label: m('Thrown') },
                  { value: 'CAUGHT', label: m('Caught') },
                  { value: 'HANDLED', label: m('Handled') },
                ]}
                value={outcome}
                onChange={value => onOutcomeChange(toWorkerRunOutcomeFilter(value))}
              />
            </div>
          }
        />
      }
    >
      <EntityListTable
        columns={columns}
        items={list.items}
        getRowKey={run => String(run.id ?? `${run.processKey}-${run.startedAt}-${run.messageClass}`)}
        isLoading={list.isLoading}
        isFetchingMore={list.isFetchingMore}
        hasMore={list.hasMore}
        onLoadMore={list.loadMore}
        error={list.isError ? t('The message runs could not be loaded.') : undefined}
        emptyMessage={t('No message run recorded in the retention period.')}
        noResultsMessage={t('No message run with this outcome.')}
        isSearchActive={outcome !== ''}
        onClearSearch={() => onOutcomeChange('')}
        loadingMessage={t('Loading message runs')}
        className="md:flex-none"
      />
    </EntityListCard>
  );
};
