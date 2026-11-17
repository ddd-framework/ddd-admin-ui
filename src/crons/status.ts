import { AlarmClockOff, CircleCheck, CircleOff, CirclePause, CircleX, Loader } from 'lucide-react';

import { m } from '../i18n/store.ts';
import { defineStatusMap } from '../logic/pure/status.ts';
import type { CronExecutionResult, CronExecutionsResultFilter, CronStatus } from './types.ts';

/** `CronOverview.status`, the first that applies (Core's `CronOverview::resolveStatus()`). */
export const CRON_STATUS = defineStatusMap<CronStatus>(
  {
    MISSING_COMMAND: {
      label: m('Command missing', { context: 'cron-status' }),
      tone: 'danger',
      icon: CircleOff,
      description: m('The console of this build does not know the command: edit it or delete the Cron', { context: 'cron-status' }),
    },
    PAUSED: {
      label: m('Paused', { context: 'cron-status' }),
      tone: 'neutral',
      icon: CirclePause,
      description: m('Switched off: the runner skips it', { context: 'cron-status' }),
    },
    RUNNING: {
      label: m('Running', { context: 'cron-status' }),
      tone: 'info',
      icon: Loader,
      description: m('A run is in progress', { context: 'cron-status' }),
    },
    OVERDUE: {
      label: m('Overdue', { context: 'cron-status' }),
      tone: 'warning',
      icon: AlarmClockOff,
      description: m('Its slot passed more than two minutes ago: the runner does not tick', { context: 'cron-status' }),
    },
    FAILING: {
      label: m('Failing', { context: 'cron-status' }),
      tone: 'danger',
      icon: CircleX,
      description: m('The last ended run failed', { context: 'cron-status' }),
    },
    OK: {
      label: m('OK', { context: 'cron-status' }),
      tone: 'success',
      icon: CircleCheck,
      description: m('Active, the last run succeeded or none ended yet', { context: 'cron-status' }),
    },
  },
  { context: 'cron-status' }
);

/** The result of a run: `SUCCESSFUL` / `FAILED` when ended, `RUNNING` while it runs. */
export type CronRunResult = CronExecutionResult | 'RUNNING';

export const CRON_EXECUTION_RESULT = defineStatusMap<CronRunResult>(
  {
    SUCCESSFUL: { label: m('Successful', { context: 'cron-run-result' }), tone: 'success', icon: CircleCheck },
    FAILED: { label: m('Failed', { context: 'cron-run-result' }), tone: 'danger', icon: CircleX },
    RUNNING: { label: m('Running', { context: 'cron-run-result' }), tone: 'info', icon: Loader },
  },
  { context: 'cron-run-result' }
);

/** The tabs of the runs view, in order (`result` of `/executions/list`). */
export const CRON_RUN_RESULT_FILTERS: readonly { value: CronExecutionsResultFilter; label: string }[] = [
  { value: 'ALL', label: m('All', { context: 'cron-run-filter' }) },
  { value: 'FAILED', label: m('Failed', { context: 'cron-run-filter' }) },
  { value: 'RUNNING', label: m('Running', { context: 'cron-run-filter' }) },
  { value: 'SUCCESSFUL', label: m('Successful', { context: 'cron-run-filter' }) },
];

const STATUSES = Object.keys(CRON_STATUS) as CronStatus[];

/** A status of the payload, or `null` for an unknown one. */
export const toCronStatus = (value: string | null | undefined): CronStatus | null =>
  (STATUSES as readonly string[]).includes(value ?? '') ? (value as CronStatus) : null;

/** The result of one run (`RUNNING` while its state is not ENDED); `null` for an ended run without a result. */
export const cronRunResultOf = (execution: { state?: string | null; executionState?: string | null }): CronRunResult | null => {
  if (execution.state !== 'ENDED') return 'RUNNING';
  return execution.executionState === 'SUCCESSFUL' || execution.executionState === 'FAILED' ? execution.executionState : null;
};

/** A runs filter from the URL (`ALL` for anything else). */
export const toCronRunResultFilter = (value: string | null | undefined): CronExecutionsResultFilter =>
  CRON_RUN_RESULT_FILTERS.some(filter => filter.value === value) ? (value as CronExecutionsResultFilter) : 'ALL';
