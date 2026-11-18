// The crons entry: the screens of Core's crons admin (`CronsControllerTrait`) on the host's RTK Query api
// (`createCronsApi`), their parts, the payload types, the status maps and the pure helpers. Charts are SVG, no peer.

// API
export { buildCronsRequests, createCronsApi, createStaticCronsApi, CRONS_TAG, cronsEndpointDefinitions } from './api.ts';
export type { CreateCronsApiOptions, CronsApi, StaticCronsData } from './api.ts';
export type * from './types.ts';

// Screens and parts
export { CRON_TIMELINE_WINDOWS, CronsScreen, CronTimelineCard } from './CronsScreen.tsx';
export type { CronsScreenProps, CronTimelineCardProps, CronTimelineWindow } from './CronsScreen.tsx';
export { CronDetailsDrawer } from './CronDetailsDrawer.tsx';
export type { CronDetailsDrawerProps } from './CronDetailsDrawer.tsx';
export { CRON_SCHEDULE_PREVIEW_DEBOUNCE_MS, CronFormDrawer, CronSchedulePreview } from './CronFormDrawer.tsx';
export type { CronFormDrawerProps, CronSchedulePreviewProps } from './CronFormDrawer.tsx';
export { CRON_RUNS_PAGE_SIZE, CRONS_POLL_MS, CronExecutionDialog, CronRunsView } from './runs.tsx';
export type { CronExecutionDialogProps, CronRunsViewProps } from './runs.tsx';
export { CronDurationChart, CronTimeline } from './charts.tsx';
export type { CronDurationChartProps, CronTimelineProps } from './charts.tsx';
export {
  CronActionErrorCallout,
  CronLastRun,
  CronNextRun,
  CronRowActions,
  CronRunnerBanner,
  CronRunStrip,
  CronScheduleText,
  CronsTable,
  CronSummaryTiles,
} from './parts.tsx';
export type { CronRowActionsProps, CronsTableProps } from './parts.tsx';
export { CRON_CONFLICT_RETRY_MS, isCronRunQueued, useCronActions } from './useCronActions.ts';
export type { CronActionError, CronActions, CronQueuedRuns } from './useCronActions.ts';
export { useCronsPageVisible, useCronsRefreshWhileVisible, useServerClock } from './useServerClock.ts';
export { CronTimeDisplayContext, CronTimeDisplayProvider, useCronTimeFormat } from './timeDisplay.ts';
export type { CronTimeDisplay, CronTimeDisplayProviderProps, CronTimeZoneMode } from './timeDisplay.ts';

// Status maps and helpers
export { CRON_EXECUTION_RESULT, CRON_RUN_RESULT_FILTERS, CRON_STATUS, cronRunResultOf, toCronRunResultFilter, toCronStatus } from './status.ts';
export type { CronRunResult } from './status.ts';
export {
  changedCronFields,
  composeCronCommandLine,
  CRON_ATTENTION_STATUSES,
  CRON_SCHEDULE_PRESETS,
  CRON_STATUS_SEVERITY,
  cronStatusRank,
  cronNextRunState,
  deleteBlockedReason,
  describeCronSchedule,
  EMPTY_CRON_FORM,
  estimateCronServerOffsetMs,
  formatCronClock,
  formatCronCount,
  formatCronDateTime,
  formatCronDuration,
  formatCronRate,
  formatCronRelative,
  isCronArguments,
  isCronName,
  isLegacyCronName,
  lockedCronCommandReason,
  matchesCronStatusFilter,
  normalizeCronName,
  isRunnerStalled,
  parseCronTime,
  recentRunsOf,
  runNowBlockedReason,
  sortCrons,
  toCronCreateBody,
  toCronFormValues,
  toCronStatusFilter,
} from './format.ts';
export type { CronFormValues, CronListSort, CronNextRunState, CronStatusFilter } from './format.ts';
