'use client';

import { normalizeDddError } from '@mgamadeus/ddd-web/contract';
import { RefreshCw } from 'lucide-react';
import { type ReactNode, useMemo } from 'react';

import { m } from '../i18n/store.ts';
import { useTranslate } from '../i18n/useTranslate.ts';
import { EntityListCard } from '../list/EntityListCard.tsx';
import { EntityListToolbar } from '../list/EntityListToolbar.tsx';
import { FilterPanel, FilterSelect } from '../list/filters.tsx';
import { drawerKey, type EntityDrawerUrlAdapter } from '../logic/pure/entityDrawer.ts';
import type { UrlStateAdapter } from '../logic/pure/urlListState.ts';
import { useEntityDrawer } from '../logic/react/useEntityDrawer.ts';
import { useMemoryUrlState } from '../logic/react/useMemoryUrlState.ts';
import { useUrlListState } from '../logic/react/useUrlListState.ts';
import { PageSections } from '../page/PageLayout.tsx';
import { PageHeader } from '../page/PageHeader.tsx';
import { AddEntityButton } from '../page/PageToolbar.tsx';
import { SectionHeader } from '../page/SectionHeader.tsx';
import { StatusCallout, StatusCalloutAction } from '../page/StatusCallout.tsx';
import { cn } from '../primitives/cn.ts';
import { SegmentedControl } from '../primitives/segmented-control.tsx';
import { Skeleton } from '../primitives/skeleton.tsx';
import type { CronsApi } from './api.ts';
import { CronTimeline } from './charts.tsx';
import { CronDetailsDrawer } from './CronDetailsDrawer.tsx';
import { CronFormDrawer } from './CronFormDrawer.tsx';
import {
  type CronListSort,
  type CronPollingInterval,
  type CronSeverityCompare,
  type CronStatusFilter,
  formatCronDateTime,
  matchesCronStatusFilter,
  normalizeCronName,
  sortCrons,
  toCronStatusFilter,
} from './format.ts';
import { CronActionErrorCallout, CronRunnerBanner, CronsTable, CronSummaryTiles } from './parts.tsx';
import { CRONS_POLL_MS, CronRunsView } from './runs.tsx';
import { CRON_STATUS, toCronRunResultFilter } from './status.ts';
import { type CronTimeZoneMode, CronTimeDisplayProvider } from './timeDisplay.ts';
import { useCronActions } from './useCronActions.ts';
import { useCronsPageVisible } from './useServerClock.ts';

const LIST_KEYS = ['view', 'q', 'result', 'hours', 'status', 'runsCron'] as const;

/** The windows of the timeline in hours (the API takes 1 to 168). */
export const CRON_TIMELINE_WINDOWS = [
  { value: '24', label: m('24 hours') },
  { value: '72', label: m('3 days') },
  { value: '168', label: m('7 days') },
] as const;

export type CronTimelineWindow = (typeof CRON_TIMELINE_WINDOWS)[number]['value'];

const toTimelineWindow = (value: string): CronTimelineWindow => (CRON_TIMELINE_WINDOWS.some(window => window.value === value) ? (value as CronTimelineWindow) : '24');

export interface CronTimelineCardProps {
  api: CronsApi;
  hours: CronTimelineWindow;
  onHoursChange: (hours: CronTimelineWindow) => void;
  /** Refresh of the timeline in ms while the tab is visible (default 0 = off). */
  pollingIntervalMs?: number;
}

/** The timeline (`GET /timeline?hours`) with its window switch. */
export const CronTimelineCard = ({ api, hours, onHoursChange, pollingIntervalMs = 0 }: CronTimelineCardProps) => {
  const { t } = useTranslate();
  const visible = useCronsPageVisible();
  const query = api.useCronsTimelineQuery({ hours: Number(hours) }, pollingIntervalMs > 0 && visible ? { pollingInterval: pollingIntervalMs } : undefined);
  return (
    <section>
      <SectionHeader
        title={t('Timeline')}
        description={t('Runs per Cron and time bucket, on the server clock. Red: every run failed, amber: some failed.')}
        actions={
          <SegmentedControl<CronTimelineWindow>
            aria-label={t('Timeline window')}
            value={hours}
            onValueChange={onHoursChange}
            options={CRON_TIMELINE_WINDOWS.map(window => ({ value: window.value, label: window.label }))}
          />
        }
      />
      <div className="surface min-w-0 rounded-2xl p-4">
        {query.isError && !query.data ? (
          <p className="text-sm text-destructive">{normalizeDddError(query.error, t('The timeline could not be loaded.')).message}</p>
        ) : query.data ? (
          <CronTimeline timeline={query.data} />
        ) : (
          <Skeleton className="h-32 rounded-xl" />
        )}
      </div>
    </section>
  );
};

export interface CronsScreenProps {
  /** The hooks of `createCronsApi`. */
  api: CronsApi;
  /**
   * Where the view, the search, the runs filter and the timeline window live (`view`, `q`, `result`, `hours`): the
   * host's URL adapter, e.g. `useNextUrlStateAdapter({ listId: 'crons' })`. Without one they live in component state.
   */
  urlStateAdapter?: UrlStateAdapter;
  /** Where the drawers live (`?cron=<id>` details, `?edit=<id>` / `?create=1` the form): `useNextDrawerUrlAdapter()`. */
  drawerUrlAdapter?: EntityDrawerUrlAdapter;
  title?: ReactNode;
  description?: ReactNode;
  /** List refresh in ms while the tab is visible (default 30 s; 0 = off). */
  pollingIntervalMs?: number;
  /** `false` stops the countdowns (a showcase, a test). */
  tick?: boolean;
  /**
   * The order of the Crons list: `name` (default, as the API sends them) or `severity` (the worst status first; within
   * a status by name, or with `severityTieBreak="recent"` the most recent failure, then the most recent run first).
   */
  sort?: CronListSort;
  /** `sort="severity"`: the statuses from the worst to the best (default `CRON_STATUS_SEVERITY`). A stable array. */
  severityStatusOrder?: readonly string[];
  /**
   * `sort="severity"` within one status: `name` (default) by name, so rows keep their places between refreshes; `recent`
   * the most recent failure, then the most recent run first (the default of 0.3.7 and 0.3.8).
   */
  severityTieBreak?: 'name' | 'recent';
  /** The host's comparator for `sort="severity"`; gets the package's as its third argument (`compareCronsBySeverity`). */
  severityCompare?: CronSeverityCompare;
  /** A status filter in the toolbar's Filters panel (URL key `status`; default `true`). */
  statusFilter?: boolean;
  /** A "Cron" filter on the runs of all Crons (URL key `runsCron`; default `true`). */
  runsCronFilter?: boolean;
  /**
   * Refresh of the open details drawer in ms while it is open (default 0 = off), or a function of the shown Cron
   * (`cron => cron.status === 'RUNNING' ? 2000 : 30000`).
   */
  detailsPollingIntervalMs?: CronPollingInterval;
  /** Refresh of the timeline in ms while the tab is visible (default 0 = off). */
  timelinePollingIntervalMs?: number;
  /** Refresh of an open run's output while the run is still running, in ms (default 0 = off). */
  outputPollingIntervalMs?: number;
  /**
   * Where times show: `server` (default) the server's wall clock, the zone the schedules run in; `viewer` the viewer's
   * own time zone (converted by `serverUtcOffsetMinutes`, else by the offset estimated from the server's clock).
   */
  timeZone?: CronTimeZoneMode;
  /** The server's offset from UTC in minutes (`60` for UTC+1), when the host knows it (`timeZone="viewer"`). */
  serverUtcOffsetMinutes?: number;
}

/**
 * The Crons of the application on `CronsControllerTrait`: the runner's summary and its banner, every Cron with its
 * status, schedule, next run (against the server's clock), last run, newest runs and 24-hour success rate, with Run now,
 * on / off, edit and delete; the details drawer; the runs with their output and the timeline; the create and edit form.
 * The list refreshes every 30 s while the tab is visible and after every write. Writes follow `WriteAccessProvider`.
 */
export const CronsScreen = ({
  api,
  urlStateAdapter,
  drawerUrlAdapter,
  title,
  description,
  pollingIntervalMs = CRONS_POLL_MS,
  tick = true,
  sort = 'name',
  severityCompare,
  severityStatusOrder,
  severityTieBreak = 'name',
  statusFilter: showStatusFilter = true,
  runsCronFilter = true,
  detailsPollingIntervalMs = 0,
  timelinePollingIntervalMs = 0,
  outputPollingIntervalMs = 0,
  timeZone = 'server',
  serverUtcOffsetMinutes,
}: CronsScreenProps) => {
  const { t } = useTranslate();
  const visible = useCronsPageVisible();
  const memory = useMemoryUrlState();
  const listState = useUrlListState(LIST_KEYS, { adapter: urlStateAdapter ?? memory.urlStateAdapter, uncounted: LIST_KEYS });
  const { values, debounced, setValue } = listState;
  const view = values.view === 'runs' ? 'runs' : 'crons';
  const drawerAdapter = drawerUrlAdapter ?? memory.drawerUrlAdapter;
  const details = useEntityDrawer({ adapter: drawerAdapter, editKey: 'cron', createKey: 'cronDetails' });
  const formDrawer = useEntityDrawer({ adapter: drawerAdapter });

  const listQuery = api.useCronsListQuery(undefined, { pollingInterval: visible ? pollingIntervalMs : 0, refetchOnMountOrArgChange: true });
  const crons = useMemo(() => listQuery.data?.crons.elements ?? [], [listQuery.data]);
  const runner = listQuery.data?.runner;
  const actions = useCronActions(api);

  const search = debounced.q.trim().toLowerCase();
  const normalizedSearch = normalizeCronName(search);
  const statusFilter: CronStatusFilter = showStatusFilter ? toCronStatusFilter(values.status) : 'ALL';
  const shown = useMemo(() => {
    const matching = crons.filter(
      cron =>
        matchesCronStatusFilter(cron, statusFilter) &&
        (!search ||
          [cron.name, cron.description, cron.command, cron.commandName].some(text => (text ?? '').toLowerCase().includes(search)) ||
          // a stored name of another spelling (`Nightly_Cleanup`) is found by its kebab-case form and the other way round
          (normalizedSearch !== '' && normalizeCronName(cron.name).includes(normalizedSearch)))
    );
    return sortCrons(matching, sort, severityCompare, { statusOrder: severityStatusOrder, tieBreak: severityTieBreak });
  }, [crons, search, normalizedSearch, statusFilter, sort, severityCompare, severityStatusOrder, severityTieBreak]);
  const statusOptions = [
    { value: 'ATTENTION', label: t('Need attention') },
    ...Object.entries(CRON_STATUS).map(([value, definition]) => ({ value, label: t(definition.label, { context: definition.context }) })),
  ];
  const runsCronId = Number.parseInt(values.runsCron, 10);
  const cronOptions = useMemo(() => crons.map(cron => ({ id: cron.id, name: cron.name })), [crons]);
  const editId = formDrawer.shown?.mode === 'edit' ? Number(formDrawer.shown.id) : undefined;
  const editedCron = editId === undefined ? undefined : crons.find(cron => cron.id === editId);
  const detailsId = details.shown?.mode === 'edit' ? Number(details.shown.id) : null;
  const listError = listQuery.isError ? normalizeDddError(listQuery.error, t('The Crons could not be loaded.')).message : undefined;

  return (
    <CronTimeDisplayProvider mode={timeZone} serverUtcOffsetMinutes={serverUtcOffsetMinutes} serverNow={runner?.serverNow}>
    <div data-slot="crons-screen">
      <PageHeader
        title={title ?? t('Crons')}
        description={
          <>
            {description ?? t('Scheduled console commands: their health, runs and schedule.')}
            {runner?.serverNow && (
              <span className="ml-2 inline-flex items-center gap-1 whitespace-nowrap">
                <RefreshCw className={cn('size-3', listQuery.isFetching && 'animate-spin motion-reduce:animate-none')} aria-hidden />
                {t('Server time %time%', { replacements: { time: formatCronDateTime(runner.serverNow, { seconds: true }) } })}
              </span>
            )}
          </>
        }
        actions={<AddEntityButton label={t('Add Cron')} onClick={formDrawer.openCreate} />}
      />

      <PageSections>
        <div className="space-y-4">
          {listError && !listQuery.data && (
            <StatusCallout
              tone="destructive"
              title={t('The Crons could not be loaded.')}
              description={listError}
              actions={<StatusCalloutAction onClick={() => void listQuery.refetch()}>{t('Retry')}</StatusCalloutAction>}
            />
          )}
          <CronRunnerBanner runner={runner} />
          <CronActionErrorCallout actions={actions} />
          <CronSummaryTiles runner={runner} isLoading={listQuery.isLoading} />
        </div>

        <section>
          <SectionHeader
            title={view === 'runs' ? t('Runs') : t('Crons')}
            description={
              view === 'runs'
                ? t('Every run of the last 14 days, newest first. Open one for its full output.')
                : t('Run now queues the Cron: the runner starts it within a minute. Open a Cron for its next slots and run history.')
            }
            tabs={[
              { id: 'crons', label: m('Crons'), count: crons.length || null },
              { id: 'runs', label: m('Runs') },
            ]}
            activeTab={view}
            onTabSelect={id => setValue('view', id === 'crons' ? '' : id)}
            tabsLabel={t('Crons views')}
          />
          {view === 'crons' ? (
            <EntityListCard
              label={m('Crons')}
              isRefetching={listQuery.isFetching && !listQuery.isLoading}
              toolbar={
                <EntityListToolbar
                  search={{
                    value: values.q,
                    onChange: value => setValue('q', value),
                    placeholder: t('Search name, description or command…'),
                    'aria-label': t('Search Crons'),
                  }}
                  {...(showStatusFilter
                    ? {
                        filters: (
                          <FilterPanel>
                            <FilterSelect
                              label={t('Status')}
                              value={statusFilter === 'ALL' ? '' : statusFilter}
                              onChange={value => setValue('status', value)}
                              options={statusOptions}
                              allLabel={t('All statuses')}
                            />
                          </FilterPanel>
                        ),
                        activeFilterCount: statusFilter === 'ALL' ? 0 : 1,
                        onClearFilters: () => setValue('status', ''),
                      }
                    : {})}
                />
              }
            >
              <CronsTable
                crons={shown}
                runner={runner}
                actions={actions}
                tick={tick}
                isLoading={listQuery.isLoading}
                error={listQuery.data ? undefined : listError}
                onOpen={cron => details.openEdit(cron.id)}
                onEdit={cron => formDrawer.openEdit(cron.id)}
                isSearchActive={Boolean(search) || statusFilter !== 'ALL'}
                onClearSearch={() => {
                  setValue('q', '');
                  setValue('status', '');
                }}
              />
            </EntityListCard>
          ) : (
            <div className="space-y-8">
              <CronTimelineCard
                api={api}
                hours={toTimelineWindow(values.hours)}
                onHoursChange={hours => setValue('hours', hours === '24' ? '' : hours)}
                pollingIntervalMs={timelinePollingIntervalMs}
              />
              <CronRunsView
                api={api}
                result={toCronRunResultFilter(values.result)}
                onResultChange={result => setValue('result', result === 'ALL' ? '' : result)}
                pollingIntervalMs={pollingIntervalMs}
                outputPollingIntervalMs={outputPollingIntervalMs}
                {...(runsCronFilter
                  ? {
                      cronOptions,
                      cronFilterId: Number.isNaN(runsCronId) ? null : runsCronId,
                      onCronFilterChange: (cronId: number | null) => setValue('runsCron', cronId === null ? '' : String(cronId)),
                    }
                  : {})}
              />
            </div>
          )}
        </section>
      </PageSections>

      <CronDetailsDrawer
        api={api}
        open={details.isOpen}
        cronId={detailsId}
        onClose={details.close}
        actions={actions}
        tick={tick}
        onEdit={cron => formDrawer.openEdit(cron.id)}
        pollingIntervalMs={detailsPollingIntervalMs}
        outputPollingIntervalMs={outputPollingIntervalMs}
      />
      <CronFormDrawer
        api={api}
        open={formDrawer.isOpen && (formDrawer.isCreate || editedCron !== undefined)}
        cron={editedCron}
        formKey={drawerKey(formDrawer.shown)}
        onClose={formDrawer.close}
      />
    </div>
    </CronTimeDisplayProvider>
  );
};
