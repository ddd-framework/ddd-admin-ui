'use client';

import { normalizeDddError } from '@mgamadeus/ddd-web/contract';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { m } from '../i18n/store.ts';
import { useTranslate } from '../i18n/useTranslate.ts';
import { CopyButton } from '../list/CopyButton.tsx';
import { EntityListCard } from '../list/EntityListCard.tsx';
import { EntityListTable } from '../list/EntityListTable.tsx';
import type { EntityListColumn } from '../list/EntityListTable.tsx';
import { EntityListToolbar } from '../list/EntityListToolbar.tsx';
import { FilterPanel, FilterSelect } from '../list/filters.tsx';
import { StatusBadge } from '../list/StatusBadge.tsx';
import { Button } from '../primitives/button.tsx';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../primitives/dialog.tsx';
import { Hint } from '../primitives/hint.tsx';
import { SegmentedControl } from '../primitives/segmented-control.tsx';
import { Skeleton } from '../primitives/skeleton.tsx';
import type { CronsApi } from './api.ts';
import { formatCronCount, formatCronDuration } from './format.ts';
import { CRON_EXECUTION_RESULT, CRON_RUN_RESULT_FILTERS, cronRunResultOf } from './status.ts';
import type { CronExecutionOverview, CronExecutionsResultFilter } from './types.ts';
import { useCronTimeFormat } from './timeDisplay.ts';
import { useCronsRefreshWhileVisible } from './useServerClock.ts';

/** Runs per page of the runs view. */
export const CRON_RUNS_PAGE_SIZE = 50;
/** Refresh of the first runs page while the tab is visible. */
export const CRONS_POLL_MS = 30_000;

export interface CronExecutionDialogProps {
  api: CronsApi;
  /** The run to show; `null` closes the dialog. */
  executionId: number | null;
  onClose: () => void;
  /** Refresh of a running run's output in ms while the dialog is open (default 0 = off; an ended run never refreshes). */
  pollingIntervalMs?: number;
}

/** One run with its full output (`GET /executions/{executionId}`) in a monospace panel of capped height. */
export const CronExecutionDialog = ({ api, executionId, onClose, pollingIntervalMs = 0 }: CronExecutionDialogProps) => {
  const { t } = useTranslate();
  const { dateTime, viewerTime } = useCronTimeFormat();
  const [stillRunning, setStillRunning] = useState(false);
  const query = api.useCronExecutionQuery(
    { executionId: executionId ?? 0 },
    { skip: executionId === null, ...(pollingIntervalMs > 0 && stillRunning ? { pollingInterval: pollingIntervalMs } : {}) }
  );
  const detail = executionId === null ? undefined : query.currentData;
  const execution = detail?.execution;
  const result = execution ? cronRunResultOf(execution) : null;
  useEffect(() => setStillRunning(result === 'RUNNING'), [result]);
  const startedText = execution
    ? (viewerTime ? t('Started %start% (your time) · %duration%', { replacements: { start: dateTime(execution.startedAt, { seconds: true }), duration: formatCronDuration(execution.durationMs) } }) : null)
    : null;
  return (
    <Dialog open={executionId !== null} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl" data-slot="cron-execution-dialog">
        <DialogHeader>
          <DialogTitle>
            {execution ? t('Run of %name%', { replacements: { name: execution.cronName ?? '' } }) : t('Run #%id%', { replacements: { id: String(executionId ?? '') } })}
          </DialogTitle>
          <DialogDescription>
            {execution
              ? (startedText ??
                t('Started %start% (server time) · %duration%', {
                  replacements: { start: dateTime(execution.startedAt, { seconds: true }), duration: formatCronDuration(execution.durationMs) },
                }))
              : t('Loading the output…')}
          </DialogDescription>
        </DialogHeader>
        {result && <StatusBadge value={result} map={CRON_EXECUTION_RESULT} />}
        {query.isError && !detail ? (
          <p className="text-sm text-destructive">{normalizeDddError(query.error, t('The run could not be loaded.')).message}</p>
        ) : !detail ? (
          <Skeleton className="h-48 rounded-xl" />
        ) : detail.output === '' ? (
          <p className="text-sm text-muted-foreground">{t('The run wrote no output.')}</p>
        ) : (
          <div className="relative min-w-0">
            <pre data-slot="cron-execution-output" className="max-h-[60vh] overflow-auto rounded-xl bg-tint p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words">
              {detail.output}
            </pre>
            <span className="absolute top-2 right-2">
              <CopyButton value={detail.output} label={m('Copy the output')} />
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export interface CronRunsViewProps {
  api: CronsApi;
  /** Only the runs of this Cron (the details drawer); all Crons without it. */
  cronId?: number;
  result: CronExecutionsResultFilter;
  onResultChange: (result: CronExecutionsResultFilter) => void;
  pageSize?: number;
  /** Refresh of the first page in ms while the tab is visible (default 30 s; 0 = off). */
  pollingIntervalMs?: number;
  /** `compact`: no Cron column (one Cron's runs). */
  compact?: boolean;
  /**
   * The Crons a "Cron" filter offers (the runs of all Crons only; with `onCronFilterChange`): picking one shows only its
   * runs. Names are shown as given.
   */
  cronOptions?: readonly { id: number; name: string }[];
  /** The Cron the filter shows (`null` / absent: all). */
  cronFilterId?: number | null;
  onCronFilterChange?: (cronId: number | null) => void;
  /** Refresh of an open run's output while it runs, in ms (default 0 = off). */
  outputPollingIntervalMs?: number;
}

/**
 * The runs (`GET /executions/list`), newest first, by result (all, failed, running, successful), paged by the total;
 * a row opens the run's full output.
 */
export const CronRunsView = ({
  api,
  cronId,
  result,
  onResultChange,
  pageSize = CRON_RUNS_PAGE_SIZE,
  pollingIntervalMs = CRONS_POLL_MS,
  compact = false,
  cronOptions,
  cronFilterId,
  onCronFilterChange,
  outputPollingIntervalMs = 0,
}: CronRunsViewProps) => {
  const { t } = useTranslate();
  const { dateTime } = useCronTimeFormat();
  const [offset, setOffset] = useState(0);
  const [openExecutionId, setOpenExecutionId] = useState<number | null>(null);
  const filterable = cronId === undefined && cronOptions !== undefined && onCronFilterChange !== undefined;
  const shownCronId = cronId ?? (filterable && cronFilterId !== null ? cronFilterId : undefined);
  useEffect(() => setOffset(0), [result, shownCronId]);
  const arg = useMemo(() => ({ cronId: shownCronId, result, limit: pageSize, offset }), [shownCronId, result, pageSize, offset]);
  const query = api.useCronExecutionsQuery(arg);
  useCronsRefreshWhileVisible(query.refetch, offset === 0 ? pollingIntervalMs : 0);
  const executions = query.data?.executions.elements ?? [];
  const total = query.data?.totalCount ?? 0;

  const columns: EntityListColumn<CronExecutionOverview>[] = [
    {
      id: 'started',
      header: m('Started'),
      cell: run => <span className="text-sm whitespace-nowrap tabular-nums">{dateTime(run.startedAt, { seconds: true })}</span>,
      className: 'w-40',
    },
    ...(compact ? [] : [{ id: 'cron', header: m('Cron'), cell: (run: CronExecutionOverview) => <span className="font-medium">{run.cronName}</span> }]),
    { id: 'result', header: m('Result'), cell: run => <StatusBadge value={cronRunResultOf(run)} map={CRON_EXECUTION_RESULT} />, className: 'w-32' },
    {
      id: 'duration',
      header: m('Duration'),
      align: 'end',
      cell: run => <span className="text-sm whitespace-nowrap tabular-nums">{formatCronDuration(run.durationMs)}</span>,
      className: 'w-24',
    },
    {
      id: 'output',
      header: m('Output'),
      cell: run =>
        run.outputPreview ? (
          <Hint content={run.outputPreview} className="block max-w-96 truncate font-mono text-xs text-muted-foreground">
            {run.outputPreview}
          </Hint>
        ) : (
          <span className="text-xs text-muted-foreground">{t('no output')}</span>
        ),
    },
  ];

  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + executions.length, total);
  return (
    <div data-slot="cron-runs-view">
      <EntityListCard
        label={m('Runs')}
        isRefetching={query.isFetching && !query.isLoading}
        toolbar={
          <EntityListToolbar
            {...(filterable
              ? {
                  filters: (
                    <FilterPanel>
                      <FilterSelect
                        label={t('Cron')}
                        value={shownCronId === undefined ? '' : String(shownCronId)}
                        onChange={value => onCronFilterChange(value === '' ? null : Number(value))}
                        options={cronOptions.map(option => ({ value: String(option.id), label: option.name }))}
                        allLabel={t('All Crons')}
                        searchPlaceholder={t('Search Crons…')}
                      />
                    </FilterPanel>
                  ),
                  activeFilterCount: shownCronId === undefined ? 0 : 1,
                  onClearFilters: () => onCronFilterChange(null),
                }
              : {})}
            trailing={
              <SegmentedControl<CronExecutionsResultFilter>
                aria-label={t('Result', { context: 'cron-run-filter' })}
                value={result}
                onValueChange={onResultChange}
                options={CRON_RUN_RESULT_FILTERS.map(filter => ({ value: filter.value, label: filter.label, context: 'cron-run-filter' }))}
              />
            }
          />
        }
      >
        <EntityListTable
          columns={columns}
          items={executions}
          getRowKey={run => String(run.id)}
          isLoading={query.isLoading}
          error={query.isError && !query.data ? normalizeDddError(query.error, t('The runs could not be loaded.')).message : undefined}
          rowAction={run => () => setOpenExecutionId(run.id)}
          rowKeyboardActivation
          emptyMessage={t('No run in the retention period (14 days).')}
          noResultsMessage={t('No run with this result.')}
          isSearchActive={result !== 'ALL' || (filterable && shownCronId !== undefined)}
          onClearSearch={() => {
            onResultChange('ALL');
            if (filterable) onCronFilterChange(null);
          }}
          loadingMessage={t('Loading runs')}
        />
        {total > pageSize && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2 text-sm" data-slot="cron-runs-pager">
            <span className="text-muted-foreground tabular-nums">
              {t('%from%–%to% of %total%', { replacements: { from: formatCronCount(from), to: formatCronCount(to), total: formatCronCount(total) } })}
            </span>
            <span className="flex gap-1">
              <Button type="button" variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - pageSize))}>
                <ChevronLeft aria-hidden />
                {t('Newer')}
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={offset + pageSize >= total} onClick={() => setOffset(offset + pageSize)}>
                {t('Older')}
                <ChevronRight aria-hidden />
              </Button>
            </span>
          </div>
        )}
      </EntityListCard>
      <CronExecutionDialog api={api} executionId={openExecutionId} onClose={() => setOpenExecutionId(null)} pollingIntervalMs={outputPollingIntervalMs} />
    </div>
  );
};
