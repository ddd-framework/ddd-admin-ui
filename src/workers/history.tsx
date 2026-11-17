'use client';

import { useMemo } from 'react';

import { m } from '../i18n/store.ts';
import { useTranslate } from '../i18n/useTranslate.ts';
import { CardGrid } from '../page/PageLayout.tsx';
import { StatusCallout } from '../page/StatusCallout.tsx';
import { SegmentedControl } from '../primitives/segmented-control.tsx';
import type { WorkersApi } from './api.ts';
import { ChartBody, type ChartLegendItem, type WorkerChartSeries, WorkerChartCard, WorkerTimeChart } from './charts.tsx';
import { hasAnyValue, rankTransports, sequencePoints, succeededPoints, sumOf, zipSeries } from './format.ts';
import { type WorkersWindow, type WorkersWindowPreset, workersWindowOptions } from './window.ts';

export interface WorkersWindowSwitchProps {
  value: WorkersWindowPreset;
  onChange: (preset: WorkersWindowPreset) => void;
}

/** The window of the workers charts (1 hour to 14 days). A change loads the charts again: arrows move, Enter selects. */
export const WorkersWindowSwitch = ({ value, onChange }: WorkersWindowSwitchProps) => {
  const { t } = useTranslate();
  return (
    <SegmentedControl<WorkersWindowPreset>
      aria-label={m('Time window')}
      activation="manual"
      value={value}
      onValueChange={onChange}
      // counted labels ("6 hours") are translated here
      options={workersWindowOptions(t).map(option => ({ ...option, translate: false }))}
    />
  );
};

export interface WorkersHistoryChartsProps {
  api: WorkersApi;
  /** The window (`useWorkersWindow`): it slides every minute while the tab is visible, which refreshes the history. */
  window: WorkersWindow;
}

/**
 * The history of every transport over the window (`GET /history`): how many workers of which kind ran when (stacked
 * processes per transport, process starts below on the same time axis), messages waiting and finished per transport,
 * and the queue and throughput of every transport together (the backend's totals, never a client sum).
 */
export const WorkersHistoryCharts = ({ api, window: workersWindow }: WorkersHistoryChartsProps) => {
  const { t } = useTranslate();
  const query = api.useHistoryQuery({ from: workersWindow.from, to: workersWindow.to, stepSeconds: workersWindow.stepSeconds });
  // keep the previous window drawn while the next one loads
  const history = query.currentData?.workersHistory ?? query.data?.workersHistory;
  const stepSeconds = history?.stepSeconds ?? workersWindow.stepSeconds;
  const isRefreshing = query.isFetching && !query.isLoading;

  const charts = useMemo(() => {
    const ranked = rankTransports(history?.transports?.elements ?? [], count => t('Other (%count%)', { replacements: { count } }));
    const legend: ChartLegendItem[] = ranked.map(entry => ({ key: entry.key, label: entry.label, color: entry.color }));
    const stacked = (stackId: string, kind: WorkerChartSeries['kind']): WorkerChartSeries[] =>
      ranked.map(entry => ({ key: entry.key, label: entry.label, color: entry.color, kind, stackId, curve: 'step' }));
    const rowsOf = (pick: (entry: (typeof ranked)[number]) => (typeof ranked)[number]['processes']) =>
      zipSeries(Object.fromEntries(ranked.map(entry => [entry.key, pick(entry)])));
    const totals = history?.totals?.sequences;
    const handled = sequencePoints(totals, 'handled');
    const failed = sequencePoints(totals, 'failed');
    const workerRows = rowsOf(entry => entry.processes);
    return {
      ranked,
      legend,
      workerRows,
      workerSeries: stacked('workers', 'area'),
      startRows: rowsOf(entry => entry.processStarts),
      startSeries: stacked('starts', 'bar'),
      waitingRows: rowsOf(entry => entry.waiting),
      waitingSeries: stacked('waiting', 'area'),
      handledRows: rowsOf(entry => entry.handled),
      handledSeries: stacked('handled', 'bar'),
      queueRows: zipSeries({ waiting: sequencePoints(totals, 'waiting'), inFlight: sequencePoints(totals, 'inFlight') }),
      throughputRows: zipSeries({ succeeded: succeededPoints(handled, failed), failed }),
      totalStarts: sumOf(sequencePoints(totals, 'processStarts')),
      peakTotal: Math.max(0, ...sequencePoints(totals, 'processes').map(point => point.y ?? 0)),
    };
  }, [history, t]);

  if (query.isError && !history) {
    return <StatusCallout tone="destructive" title={t('The worker history could not be loaded.')} />;
  }
  const keys = charts.ranked.map(entry => entry.key);
  const common = { windowMs: workersWindow.windowMs, stepSeconds };
  const waitingLabel = t('Waiting', { context: 'chart-series' });
  const inWorkLabel = t('In work', { context: 'chart-series' });
  const succeededLabel = t('Succeeded', { context: 'chart-series' });
  const failedLabel = t('Failed', { context: 'chart-series' });

  return (
    <div className="space-y-4">
      <WorkerChartCard
        title={t('Workers over time')}
        description={
          history
            ? t('Live processes per transport; at most %peak% at once. A process counts from the moment its worker registers: container start and image pull are not visible.', {
                replacements: { peak: charts.peakTotal },
              })
            : t('Live processes per transport.')
        }
        legend={charts.legend}
      >
        <ChartBody height={240} isLoading={!history} isEmpty={!hasAnyValue(charts.workerRows, keys)} emptyMessage={t('No worker process ran in this window')} isRefreshing={isRefreshing}>
          <WorkerTimeChart rows={charts.workerRows} series={charts.workerSeries} height={240} showTotal ariaLabel={t('Live worker processes per transport over the window')} {...common} />
        </ChartBody>
        <div className="space-y-1.5 border-t pt-3">
          <p className="text-xs text-muted-foreground">
            {t('{count, plural, one {# process start in this window, per transport} other {# process starts in this window, per transport}}', { count: charts.totalStarts })}
          </p>
          <ChartBody height={110} isLoading={!history} isEmpty={!hasAnyValue(charts.startRows, keys)} emptyMessage={t('No process started in this window')} isRefreshing={isRefreshing}>
            <WorkerTimeChart rows={charts.startRows} series={charts.startSeries} height={110} showTotal ariaLabel={t('Worker process starts per transport over the window')} {...common} />
          </ChartBody>
        </div>
      </WorkerChartCard>

      <CardGrid>
        <WorkerChartCard title={t('Messages waiting per transport')} description={t('The queue of every transport, stacked (highest sample per step).')} legend={charts.legend}>
          <ChartBody height={200} isLoading={!history} isEmpty={!hasAnyValue(charts.waitingRows, keys)} emptyMessage={t('No message waited in this window')} isRefreshing={isRefreshing}>
            <WorkerTimeChart rows={charts.waitingRows} series={charts.waitingSeries} height={200} showTotal ariaLabel={t('Messages waiting per transport over the window')} {...common} />
          </ChartBody>
        </WorkerChartCard>
        <WorkerChartCard title={t('Messages finished per transport')} description={t('Finished messages per step and transport, failed ones included.')} legend={charts.legend}>
          <ChartBody height={200} isLoading={!history} isEmpty={!hasAnyValue(charts.handledRows, keys)} emptyMessage={t('No message finished in this window')} isRefreshing={isRefreshing}>
            <WorkerTimeChart rows={charts.handledRows} series={charts.handledSeries} height={200} showTotal ariaLabel={t('Finished messages per transport over the window')} {...common} />
          </ChartBody>
        </WorkerChartCard>
        <WorkerChartCard
          title={t('Queue, all transports')}
          description={t('Messages waiting and in work, every transport together (highest sample per step).')}
          legend={[
            { key: 'waiting', label: waitingLabel, color: 'var(--warning)' },
            { key: 'inFlight', label: inWorkLabel, color: 'var(--primary)', shape: 'line' },
          ]}
        >
          <ChartBody height={200} isLoading={!history} isEmpty={!hasAnyValue(charts.queueRows, ['waiting', 'inFlight'])} emptyMessage={t('No message waited or was in work')} isRefreshing={isRefreshing}>
            <WorkerTimeChart
              rows={charts.queueRows}
              series={[
                { key: 'waiting', label: waitingLabel, color: 'var(--warning)', kind: 'area', curve: 'step' },
                { key: 'inFlight', label: inWorkLabel, color: 'var(--primary)', kind: 'line', curve: 'step' },
              ]}
              height={200}
              ariaLabel={t('Messages waiting and in work over the window')}
              {...common}
            />
          </ChartBody>
        </WorkerChartCard>
        <WorkerChartCard
          title={t('Throughput, all transports')}
          description={t('Finished messages per step, every transport together.')}
          legend={[
            { key: 'succeeded', label: succeededLabel, color: 'var(--success)' },
            { key: 'failed', label: failedLabel, color: 'var(--destructive)' },
          ]}
        >
          <ChartBody height={200} isLoading={!history} isEmpty={!hasAnyValue(charts.throughputRows, ['succeeded', 'failed'])} emptyMessage={t('No message finished in this window')} isRefreshing={isRefreshing}>
            <WorkerTimeChart
              rows={charts.throughputRows}
              series={[
                { key: 'succeeded', label: succeededLabel, color: 'var(--success)', kind: 'bar', stackId: 'throughput' },
                { key: 'failed', label: failedLabel, color: 'var(--destructive)', kind: 'bar', stackId: 'throughput' },
              ]}
              height={200}
              showTotal
              ariaLabel={t('Succeeded and failed messages over the window')}
              {...common}
            />
          </ChartBody>
        </WorkerChartCard>
      </CardGrid>
    </div>
  );
};
