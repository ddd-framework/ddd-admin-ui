// The workers entry: the screens of Core's worker monitoring (`WorkersControllerTrait`) on the host's RTK Query api
// (`createWorkersApi`), their parts, the payload types, the status maps and the pure helpers. Charts are SVG, no peer.

// API
export { buildWorkersRequests, createStaticWorkersApi, createWorkersApi, WORKERS_TAG, workersEndpointDefinitions } from './api.ts';
export type { CreateWorkersApiOptions, StaticWorkersData, WorkersApi } from './api.ts';
export type * from './types.ts';

// Screens
export { WorkersOverviewScreen } from './WorkersOverviewScreen.tsx';
export type { WorkersOverviewScreenProps } from './WorkersOverviewScreen.tsx';
export { WorkerTransportScreen } from './WorkerTransportScreen.tsx';
export type { WorkerTransportScreenProps } from './WorkerTransportScreen.tsx';

// Parts
export {
  WorkerKpiTiles,
  WorkerKpiTilesSkeleton,
  WorkerLoopsCard,
  WorkerProcessRange,
  WorkersLivePanel,
  WorkersThroughputTable,
  WorkerTransportsTable,
} from './overview.tsx';
export type {
  WorkerProcessRangeProps,
  WorkersLivePanelProps,
  WorkersThroughputTableProps,
  WorkerTransportHref,
  WorkerTransportsTableProps,
  WorkerTransportTab,
} from './overview.tsx';
export { WorkersHistoryCharts, WorkersWindowSwitch } from './history.tsx';
export type { WorkersHistoryChartsProps, WorkersWindowSwitchProps } from './history.tsx';
export {
  toWorkerProcessFilter,
  toWorkerRunOutcomeFilter,
  WORKER_PROCESS_FILTERS,
  WORKER_RUN_OUTCOME_FILTERS,
  WorkerMessageClassesTable,
  WorkerMessageRunsTab,
  WorkerProcessesTab,
  WorkerProcessesTable,
  WorkerProcessTimeline,
  workerProcessFilterString,
  workerRunOutcomeFilterString,
  WorkerTransportCharts,
} from './transport.tsx';
export type {
  WorkerMessageRunsTabProps,
  WorkerProcessesTableProps,
  WorkerProcessesTabProps,
  WorkerProcessFilter,
  WorkerRunOutcomeFilter,
  WorkerTransportChartsProps,
} from './transport.tsx';
export { WorkerRestartButton } from './WorkerRestartButton.tsx';
export type { WorkerRestartButtonProps } from './WorkerRestartButton.tsx';
export { ChartBody, ChartLegend, niceTicks, WorkerChartCard, WorkerSparkline, WorkerTimeChart } from './charts.tsx';
export type {
  ChartBodyProps,
  ChartLegendItem,
  WorkerChartCardProps,
  WorkerChartReferenceLine,
  WorkerChartSeries,
  WorkerSparklineProps,
  WorkerTimeChartProps,
} from './charts.tsx';

// Status maps and helpers
export {
  toWorkerMessageOutcome,
  toWorkerProcessState,
  toWorkerTransportState,
  WORKER_MESSAGE_OUTCOME,
  WORKER_PROCESS_STATE,
  WORKER_TRANSPORT_STATE,
} from './status.ts';
export {
  dispatchOrigin,
  drainMs,
  formatBytes,
  formatClockTime,
  formatCount,
  formatDurationMs,
  formatDurationTick,
  isAttentionState,
  parseWorkersTime,
  perWorkerMinute,
  rankTransports,
  sequencePoints,
  shortClassName,
  shortHost,
  sortTransports,
  stopReasonLabel,
  succeededPoints,
  throughputWindowOf,
  TRANSPORT_STATE_ORDER,
  zipSeries,
} from './format.ts';
export type { ChartRow, RankedTransport, WorkersWindowCount } from './format.ts';
export {
  DEFAULT_WORKERS_WINDOW,
  resolveWorkersWindow,
  toWorkersWindowPreset,
  WORKERS_HISTORY_POLL_MS,
  WORKERS_LIST_POLL_MS,
  WORKERS_OVERVIEW_POLL_MS,
  WORKERS_WINDOW_PRESETS,
} from './window.ts';
export type { WorkersWindow, WorkersWindowPreset } from './window.ts';
export { usePageVisible, useRefreshWhileVisible, useWorkersWindow } from './useWorkersWindow.ts';
