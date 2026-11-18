// The workers entry: the screens of Core's worker monitoring (`WorkersControllerTrait`) on the host's RTK Query api
// (`createWorkersApi`), their parts, the payload types, the status maps and the pure helpers. Charts are SVG, no peer.

// API
export { buildWorkersRequests, createStaticWorkersApi, createWorkersApi, WORKERS_TAG, workersEndpointDefinitions } from './api.ts';
export type { CreateWorkersApiOptions, StaticWorkersData, WorkersApi } from './api.ts';
export type * from './types.ts';

// Screens
export { WorkersOverviewScreen } from './WorkersOverviewScreen.tsx';
export type {
  WorkersOverviewScreenProps,
  WorkersOverviewSectionId,
  WorkersOverviewSectionState,
  WorkersSectionRenderer,
} from './WorkersOverviewScreen.tsx';
export { WORKER_TRANSPORT_TABS, WorkerTransportFacts, WorkerTransportScreen, workerTransportDefinitionText } from './WorkerTransportScreen.tsx';
export type {
  WorkerTransportFactsProps,
  WorkerTransportScreenProps,
  WorkerTransportSectionId,
  WorkerTransportSectionState,
} from './WorkerTransportScreen.tsx';

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
  WORKER_LIST_MAX_TOP,
  workerMessageRunColumns,
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
export { ChartBody, ChartLegend, niceTicks, WorkerChartCard, WorkerChartSyncGroup, WorkerSparkline, WorkerTimeChart } from './charts.tsx';
export { countTicks, DURATION_TICK_STEPS_MS, durationTicks } from './ticks.ts';
export type { NiceTicksOptions, WorkerTickGenerator } from './ticks.ts';
export { WorkerHint, WorkerTruncatedText } from './hint.tsx';
export type { WorkerHintProps } from './hint.tsx';
export type {
  ChartBodyProps,
  WorkerChartSyncGroupProps,
  ChartLegendItem,
  WorkerChartCardProps,
  WorkerChartReferenceLine,
  WorkerChartSeries,
  WorkerSparklineProps,
  WorkerTimeChartProps,
} from './charts.tsx';

// Status maps and helpers
export {
  rawStatusValue,
  toWorkerMessageOutcome,
  toWorkerProcessState,
  toWorkerTransportState,
  WORKER_MESSAGE_OUTCOME,
  WORKER_PROCESS_STATE,
  WORKER_TRANSPORT_STATE,
} from './status.ts';
export {
  axisNeedsDate,
  dispatchOrigin,
  drainMs,
  formatBytes,
  formatClockTime,
  formatCount,
  formatDurationMs,
  formatDurationTick,
  formatPercentNumber,
  formatRate,
  formatTimelineTick,
  formatWindowLength,
  inWindowText,
  isAttentionState,
  isProcessStillLive,
  parseWorkersTime,
  perWorkerMinute,
  rankTransports,
  sequencePoints,
  shortClassName,
  shortHost,
  sortMessageClasses,
  sortTransports,
  stopReasonLabel,
  succeededPoints,
  sumPoints,
  throughputWindowOf,
  sequenceLabelText,
  throughputDescriptionText,
  throughputWindowSeconds,
  TRANSPORT_STATE_ORDER,
  windowHeaderText,
  workerLastErrorText,
  zipSeries,
} from './format.ts';
export type { ChartRow, RankedTransport, WorkerSequenceLabelKind, WorkersWindowCount } from './format.ts';
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
