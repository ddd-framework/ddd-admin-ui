'use client';

import { CalendarClock, CircleAlert, CirclePause, CircleX, Pencil, Play, Power, Timer, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { MetricGrid } from '../data/MetricGrid.tsx';
import { MetricTile } from '../data/MetricTile.tsx';
import { m } from '../i18n/store.ts';
import { useTranslate } from '../i18n/useTranslate.ts';
import { EmptyValue } from '../list/EmptyValue.tsx';
import { EntityListTable } from '../list/EntityListTable.tsx';
import type { EntityListColumn } from '../list/EntityListTable.tsx';
import { StatusBadge } from '../list/StatusBadge.tsx';
import { useWriteAccess } from '../logic/react/writeAccess.ts';
import { StatusCallout } from '../page/StatusCallout.tsx';
import { Button } from '../primitives/button.tsx';
import { cn } from '../primitives/cn.ts';
import { Switch } from '../primitives/switch.tsx';
import {
  cronNextRunState,
  deleteBlockedReason,
  describeCronSchedule,
  formatCronClock,
  formatCronCount,
  formatCronDateTime,
  formatCronDuration,
  formatCronRate,
  formatCronRelative,
  isRunnerStalled,
  parseCronTime,
  recentRunsOf,
  runNowBlockedReason,
} from './format.ts';
import { CRON_EXECUTION_RESULT, CRON_STATUS, cronRunResultOf, toCronStatus } from './status.ts';
import type { CronExecutionOverview, CronOverview, CronRunnerSummary, CronStatus } from './types.ts';
import { type CronActions, isCronRunQueued } from './useCronActions.ts';
import { useServerClock } from './useServerClock.ts';

/** The runner's summary as tiles: active, paused, running, overdue, failing, missing command, the last 24 hours, the last run. */
export const CronSummaryTiles = ({ runner, isLoading = false }: { runner?: CronRunnerSummary; isLoading?: boolean }) => {
  const { t } = useTranslate();
  const lastRunMs = parseCronTime(runner?.lastRunStartedAt);
  const serverMs = parseCronTime(runner?.serverNow);
  return (
    <div data-slot="cron-summary-tiles">
      <MetricGrid columns={4} isLoading={isLoading && !runner} skeletonCount={4} size="compact">
        {runner && (
          <>
            <MetricTile
              size="compact"
              label={t('Active', { context: 'cron-summary' })}
              icon={<Power aria-hidden />}
              value={formatCronCount(runner.activeCount)}
              hint={t('%paused% paused · %running% running', {
                replacements: { paused: formatCronCount(runner.pausedCount), running: formatCronCount(runner.runningCount) },
              })}
            />
            <MetricTile
              size="compact"
              label={t('Need attention')}
              icon={<CircleAlert aria-hidden />}
              value={formatCronCount((runner.overdueCount ?? 0) + (runner.failingCount ?? 0) + (runner.missingCommandCount ?? 0))}
              hint={t('%overdue% overdue · %failing% failing · %missing% command missing', {
                replacements: {
                  overdue: formatCronCount(runner.overdueCount),
                  failing: formatCronCount(runner.failingCount),
                  missing: formatCronCount(runner.missingCommandCount),
                },
              })}
            />
            <MetricTile
              size="compact"
              label={t('Runs in 24 h')}
              icon={<Timer aria-hidden />}
              value={formatCronCount(runner.runCount24h)}
              hint={t('%failures% failed', { replacements: { failures: formatCronCount(runner.failureCount24h) } })}
            />
            <MetricTile
              size="compact"
              label={t('Last run started')}
              icon={<CalendarClock aria-hidden />}
              value={lastRunMs === null ? <EmptyValue /> : formatCronDateTime(lastRunMs)}
              hint={lastRunMs !== null && serverMs !== null ? formatCronRelative(lastRunMs, serverMs) : t('No run yet')}
            />
          </>
        )}
      </MetricGrid>
    </div>
  );
};

/** The banner when every active Cron is overdue: the runner (`app:crons:execute` every minute) is not running. */
export const CronRunnerBanner = ({ runner }: { runner?: CronRunnerSummary }) => {
  const { t } = useTranslate();
  if (!runner || !isRunnerStalled(runner)) return null;
  return (
    <div data-slot="cron-runner-banner">
      <StatusCallout
        tone="warning"
        title={t('The runner is not running')}
        description={t('Every active Cron is overdue. app:crons:execute must run every minute on one host; nothing runs until it does.')}
      />
    </div>
  );
};

/** The schedule as a sentence on the server's clock, the expression beside it. */
export const CronScheduleText = ({ schedule, className }: { schedule: string; className?: string }) => {
  const { t } = useTranslate();
  return (
    <span className={cn('flex min-w-0 flex-col gap-0.5', className)}>
      <span className="text-sm">{describeCronSchedule(schedule, t)}</span>
      <code className="font-mono text-xs text-muted-foreground">{schedule}</code>
    </span>
  );
};

/** The next run of a Cron, counted down against the server's clock (`serverNow`, ticking); none while paused. */
export const CronNextRun = ({ cron, serverNow, tick = true, queued = false }: { cron: CronOverview; serverNow?: string | null; tick?: boolean; queued?: boolean }) => {
  const { t } = useTranslate();
  const serverMs = useServerClock(serverNow, { tick });
  const state = cronNextRunState(cron, serverMs);
  if (queued) {
    return (
      <span data-slot="cron-next-run" data-cron-queued="" className="text-sm text-info">
        {t('Queued: starts within a minute')}
      </span>
    );
  }
  if (state.kind === 'paused' || state.kind === 'missingCommand') {
    return (
      <span data-slot="cron-next-run" data-cron-next="none" className="text-xs text-muted-foreground">
        {state.kind === 'paused' ? t('Paused: no next run') : t('No next run')}
      </span>
    );
  }
  if (state.kind === 'running') {
    return (
      <span data-slot="cron-next-run" data-cron-next="running" className="text-sm text-info">
        {t('Running now')}
      </span>
    );
  }
  if (state.kind === 'unknown') return <EmptyValue />;
  return (
    <span data-slot="cron-next-run" data-cron-next="due" className="flex flex-col gap-0.5" title={formatCronDateTime(state.atMs, { seconds: true })}>
      <span className={cn('text-sm tabular-nums', state.inMs < -120_000 && 'text-warning')}>
        {state.inMs < 0 ? t('due %relative%', { replacements: { relative: formatCronRelative(state.atMs, state.atMs - state.inMs) } }) : formatCronRelative(state.atMs, state.atMs - state.inMs)}
      </span>
      <span className="text-xs text-muted-foreground tabular-nums">{formatCronClock(state.atMs)}</span>
    </span>
  );
};

/** The last run: result, start, duration and the first output line. */
export const CronLastRun = ({ execution }: { execution?: CronExecutionOverview | null }) => {
  const { t } = useTranslate();
  if (!execution) return <span className="text-xs text-muted-foreground">{t('Never ran')}</span>;
  const result = cronRunResultOf(execution);
  return (
    <span className="flex max-w-72 min-w-0 flex-col gap-0.5">
      <span className="flex flex-wrap items-center gap-1.5">
        <StatusBadge value={result} map={CRON_EXECUTION_RESULT} />
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatCronDateTime(execution.startedAt)} · {formatCronDuration(execution.durationMs)}
        </span>
      </span>
      {execution.outputPreview && (
        <span className="truncate font-mono text-xs text-muted-foreground" title={execution.outputPreview}>
          {execution.outputPreview}
        </span>
      )}
    </span>
  );
};

const RUN_BAR_CLASS = { SUCCESSFUL: 'bg-success', FAILED: 'bg-destructive', RUNNING: 'bg-info' } as const;

/**
 * The newest runs as a strip of bars, drawn right to left (the newest at the right end, like a timeline); the height
 * follows the duration, a failed run is full height in the danger colour.
 */
export const CronRunStrip = ({ runs, slots = 30 }: { runs: readonly CronExecutionOverview[]; slots?: number }) => {
  const { t } = useTranslate();
  if (runs.length === 0) return <span className="text-xs text-muted-foreground">{t('No runs')}</span>;
  const longest = Math.max(1, ...runs.map(run => run.durationMs ?? 0));
  const ordered = [...runs.slice(0, slots)].reverse();
  const failed = runs.filter(run => cronRunResultOf(run) === 'FAILED').length;
  return (
    <span
      data-slot="cron-run-strip"
      role="img"
      aria-label={t('%runs% newest runs, %failed% failed', { replacements: { runs: String(Math.min(runs.length, slots)), failed: String(failed) } })}
      className="flex h-6 w-36 items-end justify-end gap-px"
    >
      {ordered.map(run => {
        const result = cronRunResultOf(run) ?? 'SUCCESSFUL';
        const share = result === 'FAILED' ? 1 : Math.max(0.25, (run.durationMs ?? 0) / longest);
        return (
          <span
            key={run.id}
            title={`${formatCronDateTime(run.startedAt)} · ${t(CRON_EXECUTION_RESULT[result].label, { context: 'cron-run-result' })} · ${formatCronDuration(run.durationMs)}`}
            className={cn('w-1 shrink-0 rounded-[1px]', RUN_BAR_CLASS[result])}
            style={{ height: `${Math.round(share * 100)}%` }}
          />
        );
      })}
    </span>
  );
};

export interface CronRowActionsProps {
  cron: CronOverview;
  actions: CronActions;
  onEdit?: (cron: CronOverview) => void;
  /** `false` hides Edit and Delete (the details drawer shows them elsewhere). */
  showManage?: boolean;
}

/** Run now, the on / off switch, Edit and Delete of one Cron; each says why it is off. */
export const CronRowActions = ({ cron, actions, onEdit, showManage = true }: CronRowActionsProps) => {
  const { t } = useTranslate();
  const writeAccess = useWriteAccess();
  const writeReason = writeAccess.allowed ? null : (writeAccess.reason ?? t('Writes are switched off'));
  const conflict = (actions.conflictUntil[cron.id] ?? 0) > Date.now();
  const runReason = writeReason ?? runNowBlockedReason(cron, t) ?? (conflict ? t('Refused a moment ago: try again in a minute.') : null);
  const deleteReason = writeReason ?? deleteBlockedReason(cron, t);
  const pending = actions.pendingCronId === cron.id;
  const showRunNow = cron.status !== 'MISSING_COMMAND';
  return (
    // the row's own click opens the details: the actions keep their clicks
    // biome-ignore lint/a11y/noStaticElementInteractions: no interaction of its own, only a bubbling boundary
    // biome-ignore lint/a11y/useKeyWithClickEvents: no interaction of its own, only a bubbling boundary
    <span className="flex items-center justify-end gap-1" data-row-action-ignore onClick={event => event.stopPropagation()}>
      {showRunNow && (
        <span className="inline-flex" title={runReason ?? t('Run now: the runner starts it within a minute')}>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t('Run %name% now', { replacements: { name: cron.name } })}
            disabled={Boolean(runReason) || pending}
            onClick={() => void actions.runNow(cron)}
          >
            <Play />
          </Button>
        </span>
      )}
      <span className="inline-flex px-1" title={writeReason ?? (cron.isActive ? t('Switch off') : t('Switch on'))}>
        <Switch
          size="sm"
          checked={cron.isActive}
          aria-label={t('%name% is active', { replacements: { name: cron.name } })}
          disabled={Boolean(writeReason) || pending}
          onCheckedChange={checked => void actions.setActive(cron, checked)}
        />
      </span>
      {showManage && (
        <>
          <span className="inline-flex" title={writeReason ?? t('Edit', { context: 'action' })}>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t('Edit %name%', { replacements: { name: cron.name } })}
              disabled={Boolean(writeReason) || !onEdit}
              onClick={() => onEdit?.(cron)}
            >
              <Pencil />
            </Button>
          </span>
          <span className="inline-flex" title={deleteReason ?? t('Delete', { context: 'action' })}>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-destructive"
              aria-label={t('Delete %name%', { replacements: { name: cron.name } })}
              disabled={Boolean(deleteReason) || pending}
              onClick={() => void actions.remove(cron)}
            >
              <Trash2 />
            </Button>
          </span>
        </>
      )}
    </span>
  );
};

/** The refusal of the last action (a 409 says to retry after a minute). */
export const CronActionErrorCallout = ({ actions }: { actions: CronActions }) => {
  const { t } = useTranslate();
  if (!actions.error) return null;
  return (
    <div data-slot="cron-action-error">
      <StatusCallout
        tone={actions.error.isConflict ? 'warning' : 'destructive'}
        size="compact"
        icon={actions.error.isConflict ? CirclePause : CircleX}
        title={t('%name%: %message%', { replacements: { name: actions.error.cronName, message: actions.error.message } })}
        description={actions.error.isConflict ? t('The Cron is running or switched off. Try again in a minute.') : undefined}
        actions={
          <Button type="button" variant="ghost" size="sm" onClick={actions.dismissError}>
            {t('Dismiss')}
          </Button>
        }
      />
    </div>
  );
};

export interface CronsTableProps {
  crons: readonly CronOverview[];
  runner?: CronRunnerSummary;
  actions: CronActions;
  isLoading?: boolean;
  error?: ReactNode;
  onOpen?: (cron: CronOverview) => void;
  onEdit?: (cron: CronOverview) => void;
  /** `false` stops the countdowns (a showcase, a test). */
  tick?: boolean;
  isSearchActive?: boolean;
  onClearSearch?: () => void;
}

/**
 * One row per Cron (sorted by name, as the API sends them): status, name and description, schedule, command, the next
 * run counted down against the server's clock, the last run, the newest runs, the 24-hour success rate, the actions.
 */
export const CronsTable = ({ crons, runner, actions, isLoading, error, onOpen, onEdit, tick = true, isSearchActive, onClearSearch }: CronsTableProps) => {
  const { t } = useTranslate();
  const columns: EntityListColumn<CronOverview>[] = [
    {
      id: 'status',
      header: m('Status'),
      cell: cron => <StatusBadge value={(toCronStatus(cron.status) ?? cron.status) as CronStatus} map={CRON_STATUS} />,
      className: 'w-32',
    },
    {
      id: 'name',
      header: m('Name'),
      cell: cron => (
        <span className="flex max-w-72 min-w-40 flex-col gap-0.5">
          <span className="font-medium">{cron.name}</span>
          {cron.description && (
            <span className="line-clamp-2 text-xs text-muted-foreground" title={cron.description}>
              {cron.description}
            </span>
          )}
        </span>
      ),
    },
    { id: 'schedule', header: m('Schedule'), cell: cron => <CronScheduleText schedule={cron.schedule} />, className: 'min-w-36' },
    {
      id: 'command',
      header: m('Command'),
      cell: cron => (
        <code className="block max-w-56 truncate font-mono text-xs" title={cron.command ?? cron.commandName}>
          {cron.command || cron.commandName || '—'}
        </code>
      ),
    },
    {
      id: 'next',
      header: m('Next run'),
      cell: cron => <CronNextRun cron={cron} serverNow={runner?.serverNow} tick={tick} queued={isCronRunQueued(actions.queued, cron)} />,
      className: 'w-32',
    },
    { id: 'last', header: m('Last run'), cell: cron => <CronLastRun execution={cron.lastExecution} /> },
    { id: 'runs', header: m('Recent runs'), cell: cron => <CronRunStrip runs={recentRunsOf(cron)} />, className: 'w-40' },
    {
      id: 'rate',
      header: m('24 h'),
      align: 'end',
      cell: cron => (
        <span className="flex flex-col items-end gap-0.5 tabular-nums" title={t('Success rate of the runs that ended in the last 24 hours')}>
          <span className="text-sm">{formatCronRate(cron.stats24h?.successRate)}</span>
          <span className="text-xs text-muted-foreground">
            {t('{count, plural, one {# run} other {# runs}}', { count: cron.stats24h?.runCount ?? 0 })}
          </span>
        </span>
      ),
      className: 'w-20',
    },
    {
      id: 'actions',
      header: <span className="sr-only">{t('Actions', { context: 'table-column' })}</span>,
      align: 'end',
      cell: cron => <CronRowActions cron={cron} actions={actions} onEdit={onEdit} />,
      className: 'w-40',
    },
  ];
  return (
    <div data-slot="crons-table">
      <EntityListTable
        columns={columns}
        items={[...crons]}
        getRowKey={cron => String(cron.id)}
        isLoading={isLoading}
        error={error}
        rowAction={onOpen ? cron => () => onOpen(cron) : undefined}
        emptyMessage={t('No Cron yet. Schedule a command with Add Cron.')}
        noResultsMessage={t('No Cron matches the search.')}
        isSearchActive={isSearchActive}
        onClearSearch={onClearSearch}
        loadingMessage={t('Loading Crons')}
      />
    </div>
  );
};

