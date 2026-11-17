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
import { cn } from '../primitives/cn.ts';
import type { WorkersApi } from './api.ts';
import { formatClockTime, parseWorkersTime, sortTransports } from './format.ts';
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
import { DEFAULT_WORKERS_WINDOW, toWorkersWindowPreset, WORKERS_OVERVIEW_POLL_MS } from './window.ts';

const LIST_KEYS = ['window', 'q'] as const;

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
}

/**
 * The workers of the application, read from the worker monitoring (`WorkersControllerTrait`): totals as tiles, two
 * banners (monitoring off, sampler not running), the live row per transport with its processes, the throughput table,
 * the history of every transport over a window, every transport with its state and the loops of the worker list. The
 * overview refreshes every 10 s and the history every minute while the tab is visible. The only action is the restart
 * request; there are no scaling controls.
 */
export const WorkersOverviewScreen = ({
  api,
  transportHref,
  urlStateAdapter,
  title,
  description,
  pollingIntervalMs = WORKERS_OVERVIEW_POLL_MS,
  historyAnchorMs,
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

  return (
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
        actions={<WorkerRestartButton api={api} liveProcessCount={overview?.totals?.liveProcessCount} monitoringEnabled={monitoringEnabled} />}
      />

      <PageSections>
        <div className="space-y-4">
          {overviewError && !overview && (
            <StatusCallout
              tone="destructive"
              title={t('The worker overview could not be loaded.')}
              description={overviewError}
              actions={<StatusCalloutAction onClick={() => void overviewQuery.refetch()}>{t('Retry')}</StatusCalloutAction>}
            />
          )}
          {overview && overview.monitoringEnabled === false && (
            <StatusCallout
              tone="warning"
              title={t('The worker monitoring is off')}
              description={t('Only the worker list and the live queue counts are shown: no processes, history or message runs. Switch it on and restart the workers.')}
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

        {overview && (
          <section>
            <SectionHeader
              title={t('Live', { context: 'workers-section' })}
              description={t('Workers running against the configured range, messages in work and waiting.')}
            />
            <WorkersLivePanel
              transports={allTransports}
              processes={overview.processes?.elements ?? []}
              nowMs={nowMs}
              showProcesses={monitoringEnabled}
              transportHref={transportHref}
            />
          </section>
        )}

        {overview?.monitoringEnabled && (
          <section>
            <SectionHeader
              title={t('Throughput')}
              description={t('Messages finished per transport in the last 5 and 15 minutes, the last hour and the last 24 hours, with the rate and what one worker finished per minute.')}
            />
            <WorkersThroughputTable transports={allTransports} totals={overview.totals} transportHref={transportHref} />
          </section>
        )}

        {monitoringEnabled && (
          <section>
            <SectionHeader
              title={t('History', { context: 'workers-section' })}
              description={t('Every transport over the window; point at a chart to read one step.')}
              actions={<WorkersWindowSwitch value={windowPreset} onChange={preset => setValue('window', preset === DEFAULT_WORKERS_WINDOW ? '' : preset)} />}
            />
            <WorkersHistoryCharts api={api} window={workersWindow} />
          </section>
        )}

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
              isLoading={overviewQuery.isLoading}
              error={overview ? undefined : overviewError}
              monitoringEnabled={monitoringEnabled}
              isSearchActive={Boolean(search)}
              onClearSearch={() => setValue('q', '')}
              transportHref={transportHref}
            />
          </EntityListCard>
        </section>

        {overview && <WorkerLoopsCard loops={overview.loops?.elements ?? []} />}
      </PageSections>
    </div>
  );
};
