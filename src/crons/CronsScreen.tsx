'use client';

import { normalizeDddError } from '@mgamadeus/ddd-web/contract';
import { RefreshCw } from 'lucide-react';
import { type ReactNode, useMemo } from 'react';

import { m } from '../i18n/store.ts';
import { useTranslate } from '../i18n/useTranslate.ts';
import { EntityListCard } from '../list/EntityListCard.tsx';
import { EntityListToolbar } from '../list/EntityListToolbar.tsx';
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
import { formatCronDateTime } from './format.ts';
import { CronActionErrorCallout, CronRunnerBanner, CronsTable, CronSummaryTiles } from './parts.tsx';
import { CRONS_POLL_MS, CronRunsView } from './runs.tsx';
import { toCronRunResultFilter } from './status.ts';
import { useCronActions } from './useCronActions.ts';
import { useCronsPageVisible } from './useServerClock.ts';

const LIST_KEYS = ['view', 'q', 'result', 'hours'] as const;

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
}

/** The timeline (`GET /timeline?hours`) with its window switch. */
export const CronTimelineCard = ({ api, hours, onHoursChange }: CronTimelineCardProps) => {
  const { t } = useTranslate();
  const query = api.useCronsTimelineQuery({ hours: Number(hours) });
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
}

/**
 * The Crons of the application on `CronsControllerTrait`: the runner's summary and its banner, every Cron with its
 * status, schedule, next run (against the server's clock), last run, newest runs and 24-hour success rate, with Run now,
 * on / off, edit and delete; the details drawer; the runs with their output and the timeline; the create and edit form.
 * The list refreshes every 30 s while the tab is visible and after every write. Writes follow `WriteAccessProvider`.
 */
export const CronsScreen = ({ api, urlStateAdapter, drawerUrlAdapter, title, description, pollingIntervalMs = CRONS_POLL_MS, tick = true }: CronsScreenProps) => {
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
  const shown = useMemo(
    () =>
      search
        ? crons.filter(cron => [cron.name, cron.description, cron.command, cron.commandName].some(text => (text ?? '').toLowerCase().includes(search)))
        : crons,
    [crons, search]
  );
  const editId = formDrawer.shown?.mode === 'edit' ? Number(formDrawer.shown.id) : undefined;
  const editedCron = editId === undefined ? undefined : crons.find(cron => cron.id === editId);
  const detailsId = details.shown?.mode === 'edit' ? Number(details.shown.id) : null;
  const listError = listQuery.isError ? normalizeDddError(listQuery.error, t('The Crons could not be loaded.')).message : undefined;

  return (
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
                isSearchActive={Boolean(search)}
                onClearSearch={() => setValue('q', '')}
              />
            </EntityListCard>
          ) : (
            <div className="space-y-8">
              <CronTimelineCard api={api} hours={toTimelineWindow(values.hours)} onHoursChange={hours => setValue('hours', hours === '24' ? '' : hours)} />
              <CronRunsView
                api={api}
                result={toCronRunResultFilter(values.result)}
                onResultChange={result => setValue('result', result === 'ALL' ? '' : result)}
                pollingIntervalMs={pollingIntervalMs}
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
      />
      <CronFormDrawer
        api={api}
        open={formDrawer.isOpen && (formDrawer.isCreate || editedCron !== undefined)}
        cron={editedCron}
        formKey={drawerKey(formDrawer.shown)}
        onClose={formDrawer.close}
      />
    </div>
  );
};
