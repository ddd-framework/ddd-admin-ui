'use client';

import { normalizeDddError } from '@mgamadeus/ddd-web/contract';
import { RefreshCw } from 'lucide-react';
import { type ReactNode, useMemo } from 'react';

import { m } from '../i18n/store.ts';
import { useTranslate } from '../i18n/useTranslate.ts';
import { EntityListCard } from '../list/EntityListCard.tsx';
import { EntityListToolbar } from '../list/EntityListToolbar.tsx';
import type { UrlStateAdapter } from '../logic/pure/urlListState.ts';
import { useMemoryUrlState } from '../logic/react/useMemoryUrlState.ts';
import { useUrlListState } from '../logic/react/useUrlListState.ts';
import { PageSections } from '../page/PageLayout.tsx';
import { PageHeader } from '../page/PageHeader.tsx';
import { SectionHeader } from '../page/SectionHeader.tsx';
import { StatusCallout, StatusCalloutAction } from '../page/StatusCallout.tsx';
import { Button } from '../primitives/button.tsx';
import { cn } from '../primitives/cn.ts';
import { LinkComponentProvider, type PageLinkComponent } from '../primitives/link.tsx';
import type { WorkersApi } from './api.ts';
import { formatClockTime, formatCount, parseWorkersTime, sortTransports, throughputDescriptionText, throughputWindowSeconds } from './format.ts';
import { WorkersHistoryCharts, WorkersWindowSwitch } from './history.tsx';
import {
  WorkerKpiTiles,
  WorkerKpiTilesSkeleton,
  WorkerLoopsCard,
  WorkersLivePanel,
  WorkersThroughputTable,
  type WorkerTransportHref,
  WorkerTransportsTable,
} from './overview.tsx';
import { usePageVisible, useWorkersWindow } from './useWorkersWindow.ts';
import { WorkerRestartButton } from './WorkerRestartButton.tsx';
import type { WorkersOverview } from './types.ts';
import { DEFAULT_WORKERS_WINDOW, toWorkersWindowPreset, WORKERS_OVERVIEW_POLL_MS, type WorkersWindowPreset } from './window.ts';

const LIST_KEYS = ['window', 'q'] as const;

/** The sections of `WorkersOverviewScreen`, in their order (`renderSection`). */
export type WorkersOverviewSectionId = 'status' | 'live' | 'throughput' | 'history' | 'transports' | 'loops';

/**
 * Draws one section of a workers screen: return `section` to keep it, `null` to leave it out, or the host's own node
 * in its place (`section` is null where the screen draws nothing there, e.g. the history while the monitoring is off).
 * `state`: the screen's state the section is drawn with (window, search or filters, monitoring), for a host section
 * that follows it.
 */
export type WorkersSectionRenderer<TSectionId extends string, TState = unknown> = (id: TSectionId, section: ReactNode, state: TState) => ReactNode;

/** The third argument of `WorkersOverviewScreen.renderSection`. */
export interface WorkersOverviewSectionState {
  /** The history window (`window`). */
  window: WorkersWindowPreset;
  /** The transport search as typed (`q`). */
  search: string;
  monitoringEnabled: boolean;
  /** The overview has not loaded yet. */
  isLoading: boolean;
  /** A refresh failed; the last data is shown. */
  isStale: boolean;
  /** The overview payload, once loaded. */
  overview?: WorkersOverview;
}

export interface WorkersOverviewScreenProps {
  /** The hooks of `createWorkersApi`. */
  api: WorkersApi;
  /** The link of a transport's page (the host's route of `WorkerTransportScreen`). */
  transportHref: WorkerTransportHref;
  /**
   * Where the window and the transport search live (`window`, `q`): the host's URL adapter, e.g.
   * `useNextUrlStateAdapter({ listId: 'workers' })`. Without one they live in component state.
   */
  urlStateAdapter?: UrlStateAdapter;
  title?: ReactNode;
  description?: ReactNode;
  /** Overview refresh in ms while the tab is visible (default 10 s; 0 = off). */
  pollingIntervalMs?: number;
  /** Pins the end of the history window (a showcase, a test); default: the current minute, sliding. */
  historyAnchorMs?: number;
  /** The host's actions in the header, before the refresh and the restart buttons. */
  headerActions?: ReactNode;
  /** Shows the manual refresh button in the header (default true). */
  showRefreshButton?: boolean;
  /**
   * The router link of the screen's links (transports, tabs). Default: the provider's (`AdminUiProvider.linkComponent`);
   * without either a plain `<a>` (a full page load).
   */
  linkComponent?: PageLinkComponent;
  /** Keeps, replaces or leaves out a section (`status`, `live`, `throughput`, `history`, `transports`, `loops`). */
  renderSection?: WorkersSectionRenderer<WorkersOverviewSectionId, WorkersOverviewSectionState>;
  /** Opens a transport from a row of the transports table (default: its link is followed). */
  onOpenTransport?: (transport: string) => void;
}

/**
 * The workers of the application, read from the worker monitoring (`WorkersControllerTrait`): totals as tiles, two
 * banners (monitoring off, sampler not running), the live row per transport with its processes, the throughput table,
 * the history of every transport over a window, every transport with its state and the loops of the worker list. The
 * overview refreshes every 10 s (and on the refresh button) and the history every minute while the tab is visible; a
 * failed refresh keeps the last data with a warning. The only action is the restart request; there are no scaling
 * controls. `renderSection` keeps, replaces or leaves out a section; `headerActions` adds the host's buttons.
 */
export const WorkersOverviewScreen = ({
  api,
  transportHref,
  urlStateAdapter,
  title,
  description,
  pollingIntervalMs = WORKERS_OVERVIEW_POLL_MS,
  historyAnchorMs,
  headerActions,
  showRefreshButton = true,
  linkComponent,
  renderSection,
  onOpenTransport,
}: WorkersOverviewScreenProps) => {
  const { t } = useTranslate();
  const visible = usePageVisible();
  const memory = useMemoryUrlState();
  const listState = useUrlListState(LIST_KEYS, { adapter: urlStateAdapter ?? memory.urlStateAdapter, uncounted: LIST_KEYS });
  const { values, debounced, setValue } = listState;
  const windowPreset = toWorkersWindowPreset(values.window);
  const workersWindow = useWorkersWindow(windowPreset, historyAnchorMs);

  const overviewQuery = api.useOverviewQuery(undefined, {
    pollingInterval: visible ? pollingIntervalMs : 0,
    refetchOnMountOrArgChange: true,
  });
  const overview = overviewQuery.data?.workersOverview;
  const monitoringEnabled = overview?.monitoringEnabled ?? true;
  const allTransports = useMemo(() => overview?.transports?.elements ?? [], [overview?.transports?.elements]);

  const search = debounced.q.trim().toLowerCase();
  const transports = useMemo(() => {
    const sorted = sortTransports(allTransports);
    return search ? sorted.filter(transport => (transport.transport ?? '').toLowerCase().includes(search)) : sorted;
  }, [allTransports, search]);

  const updatedAt = formatClockTime(overview?.generatedAt);
  const nowMs = parseWorkersTime(overview?.generatedAt) ?? 0;
  const overviewError = overviewQuery.isError ? normalizeDddError(overviewQuery.error, t('The worker overview could not be loaded.')).message : undefined;

  const liveProcesses = overview?.processes?.elements;
  const isStale = Boolean(overview) && overviewQuery.isError;
  const sectionState: WorkersOverviewSectionState = {
    window: windowPreset,
    search: values.q,
    monitoringEnabled,
    isLoading: overviewQuery.isLoading,
    isStale,
    overview,
  };
  const section = (id: WorkersOverviewSectionId, node: ReactNode) => (renderSection ? renderSection(id, node, sectionState) : node);

  const statusSection = (
    <div className="space-y-4">
      {overviewError && !overview && (
        <StatusCallout
          tone="destructive"
          title={t('The worker overview could not be loaded.')}
          description={overviewError}
          actions={<StatusCalloutAction onClick={() => void overviewQuery.refetch()}>{t('Retry')}</StatusCalloutAction>}
        />
      )}
      {isStale && (
        <StatusCallout
          tone="warning"
          title={t('The worker overview could not be refreshed.')}
          description={
            updatedAt ? t('Showing the data of %time%.', { replacements: { time: updatedAt } }) : t('Showing the last data that loaded.')
          }
          actions={<StatusCalloutAction onClick={() => void overviewQuery.refetch()}>{t('Retry')}</StatusCalloutAction>}
        />
      )}
      {overview && overview.monitoringEnabled === false && (
        <StatusCallout
          tone="warning"
          title={t('The worker monitoring is off')}
          description={`${t('Only the worker list and the live queue counts are shown: no processes, history or message runs. Switch it on and restart the workers.')} ${t(
            'Setting: %setting%.',
            { replacements: { setting: 'Common.Workers enabled (WORKERS_ENABLED=1)' } }
          )}`}
        />
      )}
      {overview?.monitoringEnabled && overview.samplerActive === false && (
        <StatusCallout
          tone="warning"
          title={t('The sampler is not running')}
          description={t('The queue history has holes and lost processes are closed late. app:workers:sample must run every minute.')}
        />
      )}
      {overview ? <WorkerKpiTiles overview={overview} /> : !overviewError && <WorkerKpiTilesSkeleton />}
    </div>
  );

  const liveDescription =
    pollingIntervalMs > 0
      ? `${t('Workers running against the configured range, messages in work and waiting.')} ${t('Refreshed every %seconds% s.', {
          replacements: { seconds: formatCount(Math.round(pollingIntervalMs / 1000)) },
        })}`
      : t('Workers running against the configured range, messages in work and waiting.');

  const liveSection = overview ? (
    <section>
      <SectionHeader title={t('Live', { context: 'workers-section' })} description={liveDescription} />
      <WorkersLivePanel
        transports={allTransports}
        processes={overview.processes?.elements ?? []}
        nowMs={nowMs}
        showProcesses={monitoringEnabled}
        monitoringEnabled={monitoringEnabled}
        totals={overview.totals}
        transportHref={transportHref}
      />
    </section>
  ) : null;

  const throughputWindows = [
    ...new Set([overview?.totals?.throughputWindows, ...allTransports.map(transport => transport.throughputWindows)].flatMap(throughputWindowSeconds)),
  ].sort((left, right) => left - right);
  const throughputSection = overview?.monitoringEnabled ? (
    <section>
      <SectionHeader
        title={t('Throughput')}
        description={throughputDescriptionText(throughputWindows, t)}
      />
      <WorkersThroughputTable
        transports={allTransports}
        totals={overview.totals}
        transportHref={transportHref}
        recentWindowSeconds={overview.recentWindowSeconds}
      />
    </section>
  ) : null;

  const historySection = monitoringEnabled ? (
    <section>
      <SectionHeader
        title={t('History', { context: 'workers-section' })}
        description={t('Every transport over the window; point at a chart to read one step.')}
        actions={<WorkersWindowSwitch value={windowPreset} onChange={preset => setValue('window', preset === DEFAULT_WORKERS_WINDOW ? '' : preset)} />}
      />
      <WorkersHistoryCharts api={api} window={workersWindow} />
    </section>
  ) : null;

  const transportsSection = (
    <section>
      <SectionHeader
        title={t('Transports')}
        description={t('Most urgent first. Open a transport for its history, message runs and processes.')}
      />
      <EntityListCard
        label={m('Transports')}
        isRefetching={overviewQuery.isFetching && !overviewQuery.isLoading}
        toolbar={
          <EntityListToolbar
            search={{
              value: values.q,
              onChange: value => setValue('q', value),
              placeholder: t('Search transports…'),
              'aria-label': t('Search transports'),
            }}
          />
        }
      >
        <WorkerTransportsTable
          api={api}
          transports={transports}
          recentWindowSeconds={overview?.recentWindowSeconds}
          sequenceWindowSeconds={overview?.sequenceWindowSeconds}
          stepSeconds={overview?.stepSeconds}
          isLoading={overviewQuery.isLoading}
          error={overview ? undefined : overviewError}
          monitoringEnabled={monitoringEnabled}
          isSearchActive={Boolean(search)}
          onClearSearch={() => setValue('q', '')}
          transportHref={transportHref}
          liveProcesses={liveProcesses}
          onOpenTransport={onOpenTransport}
        />
      </EntityListCard>
    </section>
  );

  const loopsSection = overview ? <WorkerLoopsCard loops={overview.loops?.elements ?? []} /> : null;

  const screen = (
    <div data-slot="workers-overview-screen">
      <PageHeader
        title={title ?? t('Workers')}
        description={
          <>
            {description ?? t('Messenger workers: queues, processes and message runs.')}
            {updatedAt && (
              <span className="ml-2 inline-flex items-center gap-1 whitespace-nowrap">
                <RefreshCw className={cn('size-3', overviewQuery.isFetching && 'animate-spin motion-reduce:animate-none')} aria-hidden />
                {t('Updated %time%', { replacements: { time: updatedAt } })}
              </span>
            )}
          </>
        }
        actions={
          <>
            {headerActions}
            {showRefreshButton && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={t('Refresh now')}
                disabled={overviewQuery.isFetching}
                onClick={() => void overviewQuery.refetch()}
                data-slot="workers-refresh"
              >
                <RefreshCw className={cn(overviewQuery.isFetching && 'animate-spin motion-reduce:animate-none')} aria-hidden />
              </Button>
            )}
            <WorkerRestartButton
              api={api}
              liveProcessCount={overview?.totals?.liveProcessCount}
              monitoringEnabled={monitoringEnabled}
              liveProcesses={liveProcesses}
            />
          </>
        }
      />

      <PageSections>
        {section('status', statusSection)}
        {section('live', liveSection)}
        {section('throughput', throughputSection)}
        {section('history', historySection)}
        {section('transports', transportsSection)}
        {section('loops', loopsSection)}
      </PageSections>
    </div>
  );

  return linkComponent ? <LinkComponentProvider linkComponent={linkComponent}>{screen}</LinkComponentProvider> : screen;
};
