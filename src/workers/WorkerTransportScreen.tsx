'use client';

import { getErrorStatus, normalizeDddError } from '@mgamadeus/ddd-web/contract';
import type { ReactNode } from 'react';

import { m } from '../i18n/store.ts';
import { type TranslateFn, useTranslate } from '../i18n/useTranslate.ts';
import { EntityListCard } from '../list/EntityListCard.tsx';
import { StatusBadge } from '../list/StatusBadge.tsx';
import type { UrlStateAdapter } from '../logic/pure/urlListState.ts';
import { useMemoryUrlState } from '../logic/react/useMemoryUrlState.ts';
import { useUrlListState } from '../logic/react/useUrlListState.ts';
import { DefinitionList } from '../page/DefinitionList.tsx';
import { EntityDetailShell } from '../page/EntityDetailShell.tsx';
import { EntityTabs } from '../page/EntityTabs.tsx';
import { SectionHeader } from '../page/SectionHeader.tsx';
import { StatusCallout } from '../page/StatusCallout.tsx';
import { Card, CardContent } from '../primitives/card.tsx';
import { LinkComponentProvider, type PageLinkComponent } from '../primitives/link.tsx';
import { Skeleton } from '../primitives/skeleton.tsx';
import type { WorkersApi } from './api.ts';
import { formatClockTime, formatCount, formatDurationMs, shortClassName, waitingStateContext, waitingStateLabel } from './format.ts';
import { WorkersWindowSwitch } from './history.tsx';
import { type WorkerTransportTab, WorkerProcessRange } from './overview.tsx';
import { rawStatusValue, WORKER_TRANSPORT_STATE } from './status.ts';
import {
  toWorkerProcessFilter,
  toWorkerRunOutcomeFilter,
  WorkerMessageClassesTable,
  WorkerMessageRunsTab,
  WorkerProcessesTab,
  WorkerProcessesTable,
  WorkerTransportCharts,
} from './transport.tsx';
import type { WorkerTransportOverview, WorkerTransportState } from './types.ts';
import { usePageVisible, useWorkersWindow } from './useWorkersWindow.ts';
import { WorkerRestartButton } from './WorkerRestartButton.tsx';
import type { WorkersSectionRenderer } from './WorkersOverviewScreen.tsx';
import { DEFAULT_WORKERS_WINDOW, toWorkersWindowPreset, WORKERS_LIST_POLL_MS } from './window.ts';

/** The tabs of `WorkerTransportScreen` in their order, with their labels (marked texts; translate with `t`): e.g. a host breadcrumb. */
export const WORKER_TRANSPORT_TABS: readonly { readonly id: WorkerTransportTab; readonly label: string }[] = [
  { id: 'overview', label: m('Overview') },
  { id: 'runs', label: m('Message runs') },
  { id: 'processes', label: m('Processes') },
];

/** The sections of `WorkerTransportScreen` (`renderSection`): the Overview tab's four, and the two other tabs. */
export type WorkerTransportSectionId = 'facts' | 'history' | 'messageClasses' | 'liveProcesses' | 'runs' | 'processes';

const toTransportTab = (value: string): WorkerTransportTab => (value === 'runs' || value === 'processes' ? value : 'overview');

const LIST_KEYS = ['window', 'tab', 'outcome', 'process'] as const;

/** One line of the worker list entry: scaling, limits, scale-down, message log (the transport page's description). */
export const workerTransportDefinitionText = (overview: WorkerTransportOverview | undefined, t: TranslateFn): string | null => {
  if (!overview) return null;
  const definition = overview.definition;
  if (!overview.isDefined || !definition) return t('No entry in the worker list');
  return [
    overview.isAutoscaled
      ? t('Autoscaled %min%–%max%', { replacements: { min: overview.effectiveMin ?? 0, max: overview.effectiveMax ?? '?' } })
      : t('Fixed at %max%', { replacements: { max: overview.effectiveMax ?? definition.replicas ?? '?' } }),
    definition.limit ? t('restarts after %count% messages', { replacements: { count: formatCount(definition.limit) } }) : null,
    definition.memoryLimit ? t('memory limit %limit%', { replacements: { limit: definition.memoryLimit } }) : null,
    definition.scaleDownAfter ? t('scales down after %seconds% s idle', { replacements: { seconds: definition.scaleDownAfter } }) : null,
    definition.messageLog ? t('message log: %value%', { replacements: { value: definition.messageLog } }) : null,
  ]
    .filter((part): part is string => Boolean(part))
    .join(' · ');
};

export interface WorkerTransportFactsProps {
  overview: WorkerTransportOverview;
  /** Seconds the counts and averages cover (`recentWindowSeconds`; default 900). */
  recentWindowSeconds?: number;
  /** False while the monitoring is off: the process count is unknown, only the configured range shows. */
  monitoringEnabled?: boolean;
}

/** The facts of one transport: state, queue, in work, processes against the range, the recent counts and averages, the last error. */
export const WorkerTransportFacts = ({ overview, recentWindowSeconds = 900, monitoringEnabled = true }: WorkerTransportFactsProps) => {
  const { t } = useTranslate();
  const failed = (overview.thrownCount ?? 0) + (overview.caughtCount ?? 0);
  const minutes = Math.round(recentWindowSeconds / 60);
  return (
    <Card className="gap-0 py-0">
      <CardContent className="p-4 sm:p-6">
        <DefinitionList
          columns={4}
          items={[
            {
              label: m('State'),
              value: <StatusBadge value={rawStatusValue<WorkerTransportState>(overview.state)} map={WORKER_TRANSPORT_STATE} />,
              hint: overview.stuckSince ? t('Stuck since %time%', { replacements: { time: formatClockTime(overview.stuckSince) ?? '' } }) : undefined,
            },
            {
              label: t('Waiting', { context: 'live-stat' }),
              value:
                overview.waiting === null || overview.waiting === undefined
                  ? t(waitingStateLabel(overview.waitingState), waitingStateContext(overview.waitingState))
                  : formatCount(overview.waiting),
              hint: overview.waitingSampledAt ? t('Counted at %time%', { replacements: { time: formatClockTime(overview.waitingSampledAt) ?? '' } }) : undefined,
            },
            { label: t('In work', { context: 'live-stat' }), value: formatCount(overview.inFlight ?? 0) },
            {
              label: m('Processes'),
              value: (
                <WorkerProcessRange
                  live={overview.liveProcessCount ?? 0}
                  min={overview.effectiveMin}
                  max={overview.effectiveMax}
                  isAutoscaled={overview.isAutoscaled ?? false}
                  monitoringEnabled={monitoringEnabled}
                />
              ),
            },
            { label: t('Handled (%minutes% min)', { replacements: { minutes } }), value: formatCount(overview.handledCount ?? 0) },
            {
              label: t('Failed (%minutes% min)', { replacements: { minutes } }),
              value: formatCount(failed),
              hint:
                failed > 0
                  ? t('%thrown% thrown · %caught% caught', { replacements: { thrown: formatCount(overview.thrownCount), caught: formatCount(overview.caughtCount) } })
                  : undefined,
            },
            { label: t('Avg duration (%minutes% min)', { replacements: { minutes } }), value: formatDurationMs(overview.durationAverageMs) },
            {
              label: t('Avg wait (%minutes% min)', { replacements: { minutes } }),
              value: formatDurationMs(overview.waitAverageMs),
              hint: overview.waitAverageMs === null || overview.waitAverageMs === undefined ? t('no dispatch times') : undefined,
            },
            ...(overview.lastErrorClass
              ? [
                  {
                    label: m('Last error'),
                    wide: true,
                    value: (
                      <span className="text-sm">
                        <span className="font-medium text-destructive">{shortClassName(overview.lastErrorClass)}</span>
                        {overview.lastErrorMessage ? ` · ${overview.lastErrorMessage}` : ''}
                      </span>
                    ),
                    hint: overview.lastErrorAt ? t('at %time%', { replacements: { time: formatClockTime(overview.lastErrorAt) ?? '' } }) : undefined,
                  },
                ]
              : []),
          ]}
        />
      </CardContent>
    </Card>
  );
};

export interface WorkerTransportScreenProps {
  api: WorkersApi;
  /** The Messenger transport name (the host's route parameter, decoded). */
  transport: string;
  /** The workers overview (the back link). */
  backHref: string;
  /** Where window, tab and filters live (`window`, `tab`, `outcome`, `process`); without one they live in component state. */
  urlStateAdapter?: UrlStateAdapter;
  /** The first tab without an adapter (`processes` for a link from the live panel). */
  initialTab?: WorkerTransportTab;
  /** Live data refresh in ms while the tab is visible (default 15 s; 0 = off). */
  pollingIntervalMs?: number;
  /** Pins the end of the chart window (a showcase, a test). */
  historyAnchorMs?: number;
  /**
   * Whether the worker monitoring is on (`workersOverview.monitoringEnabled`): off disables the restart and shows the
   * configured range instead of a process count. Default: read from the overview query (one request, shared with the
   * overview screen's cache entry).
   */
  monitoringEnabled?: boolean;
  /** The host's actions in the header, before the restart button. */
  headerActions?: ReactNode;
  /** The router link of the screen's links (back link). Default: the provider's (`AdminUiProvider.linkComponent`). */
  linkComponent?: PageLinkComponent;
  /** Keeps, replaces or leaves out a section (`facts`, `history`, `messageClasses`, `liveProcesses`, `runs`, `processes`). */
  renderSection?: WorkersSectionRenderer<WorkerTransportSectionId>;
}

/**
 * One transport: state and worker list entry, the restart request, and three tabs — Overview (facts, charts over a
 * window, message classes, live processes), Message runs and Processes. With a URL adapter every view is a link.
 */
export const WorkerTransportScreen = ({
  api,
  transport,
  backHref,
  urlStateAdapter,
  initialTab,
  pollingIntervalMs = WORKERS_LIST_POLL_MS,
  historyAnchorMs,
  monitoringEnabled: monitoringEnabledProp,
  headerActions,
  linkComponent,
  renderSection,
}: WorkerTransportScreenProps) => {
  const { t } = useTranslate();
  const visible = usePageVisible();
  const memory = useMemoryUrlState(initialTab && initialTab !== 'overview' ? { tab: initialTab } : {});
  const { values, setValue } = useUrlListState(LIST_KEYS, { adapter: urlStateAdapter ?? memory.urlStateAdapter, uncounted: LIST_KEYS });
  const tab = toTransportTab(values.tab);
  const windowPreset = toWorkersWindowPreset(values.window);
  const workersWindow = useWorkersWindow(windowPreset, historyAnchorMs);

  const detailQuery = api.useTransportDetailQuery(
    { transport, from: workersWindow.from, to: workersWindow.to, stepSeconds: workersWindow.stepSeconds },
    { skip: !transport, pollingInterval: visible ? pollingIntervalMs : 0 }
  );
  const detail = detailQuery.currentData?.workerTransportDetail ?? detailQuery.data?.workerTransportDetail;
  const overview = detail?.transport;
  // the detail does not say whether the monitoring is on: the overview does (skipped when the host passes it)
  const monitoringQuery = api.useOverviewQuery(undefined, { skip: monitoringEnabledProp !== undefined });
  const monitoringEnabled = monitoringEnabledProp ?? monitoringQuery.data?.workersOverview?.monitoringEnabled ?? true;
  const liveProcesses = detail?.processes?.elements;
  const section = (id: WorkerTransportSectionId, node: ReactNode) => (renderSection ? renderSection(id, node) : node);
  const shellError =
    detailQuery.isError && !detail
      ? getErrorStatus(detailQuery.error) === 404
        ? t('There is no transport “%transport%”.', { replacements: { transport } })
        : normalizeDddError(detailQuery.error, t('The transport could not be loaded.')).message
      : undefined;

  const factsSection = overview ? (
    <WorkerTransportFacts overview={overview} recentWindowSeconds={detail?.recentWindowSeconds ?? 900} monitoringEnabled={monitoringEnabled} />
  ) : (
    <Skeleton className="h-40 rounded-2xl" />
  );

  const historySection = (
    <section>
      <SectionHeader
        title={t('History', { context: 'workers-section' })}
        description={t('The transport over the window; point at a chart to read one step.')}
        actions={<WorkersWindowSwitch value={windowPreset} onChange={preset => setValue('window', preset === DEFAULT_WORKERS_WINDOW ? '' : preset)} />}
      />
      {detail ? (
        <WorkerTransportCharts detail={detail} windowMs={workersWindow.windowMs} isRefreshing={detailQuery.isFetching && !detailQuery.isLoading} />
      ) : detailQuery.isError ? (
        <StatusCallout tone="destructive" title={t('The history could not be loaded.')} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
            <Skeleton key={index} className="h-[290px] rounded-2xl" />
          ))}
        </div>
      )}
    </section>
  );

  const messageClassesSection = (
    <section>
      <SectionHeader title={t('Message classes')} description={t('What the workers did per message class in the window.')} />
      <EntityListCard label={m('Message classes')}>
        {detail ? <WorkerMessageClassesTable messageClasses={detail.messageClasses?.elements ?? []} /> : <Skeleton className="m-4 h-24 rounded-xl" />}
      </EntityListCard>
    </section>
  );

  const liveProcessesSection = (
    <section>
      <SectionHeader title={t('Live processes')} description={t('Running or busy now. A busy process is inside a handler and cannot report until it returns.')} />
      <EntityListCard label={m('Live processes')}>
        <WorkerProcessesTable processes={detail?.processes?.elements ?? []} isLoading={!detail} emptyMessage={t('No live process right now.')} live />
      </EntityListCard>
    </section>
  );

  const screen = (
    <div data-slot="worker-transport-screen">
      <EntityDetailShell
        title={transport}
        fallbackTitle={t('Transport')}
        description={workerTransportDefinitionText(overview, t)}
        back={{ href: backHref, label: t('Back to workers') }}
        isLoading={!detail && !shellError}
        error={shellError}
        actions={
          <>
            {headerActions}
            <WorkerRestartButton
              api={api}
              transport={transport}
              liveProcessCount={overview?.liveProcessCount}
              monitoringEnabled={monitoringEnabled}
              liveProcesses={liveProcesses}
            />
          </>
        }
      >
        <EntityTabs
          aria-label={t('Transport sections')}
          tabs={WORKER_TRANSPORT_TABS}
          activeId={tab}
          onSelect={id => setValue('tab', id === 'overview' ? '' : id)}
          align="center"
          className="mb-6"
        />

        {tab === 'overview' && (
          <div className="space-y-10">
            {section('facts', factsSection)}
            {section('history', historySection)}
            {section('messageClasses', messageClassesSection)}
            {section('liveProcesses', liveProcessesSection)}
          </div>
        )}

        {tab === 'runs' &&
          section(
            'runs',
            <WorkerMessageRunsTab
              api={api}
              transport={transport}
              outcome={toWorkerRunOutcomeFilter(values.outcome)}
              onOutcomeChange={outcome => setValue('outcome', outcome)}
              messageLog={overview?.definition?.messageLog}
            />
          )}

        {tab === 'processes' &&
          section(
            'processes',
            <WorkerProcessesTab api={api} transport={transport} filter={toWorkerProcessFilter(values.process)} onFilterChange={filter => setValue('process', filter)} />
          )}
      </EntityDetailShell>
    </div>
  );

  return linkComponent ? <LinkComponentProvider linkComponent={linkComponent}>{screen}</LinkComponentProvider> : screen;
};
