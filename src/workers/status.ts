import {
  Ban,
  CircleAlert,
  CircleCheck,
  CircleDot,
  CirclePlay,
  CircleX,
  Hourglass,
  Layers,
  Loader,
  Siren,
  Square,
  TriangleAlert,
} from 'lucide-react';

import { m } from '../i18n/store.ts';
import { defineStatusMap } from '../logic/pure/status.ts';
import type { WorkerMessageOutcome, WorkerProcessDisplayState, WorkerTransportState } from './types.ts';

/** `WorkerTransportOverview.state`, the first that applies. */
export const WORKER_TRANSPORT_STATE = defineStatusMap<WorkerTransportState>(
  {
    NOT_CONSUMED: {
      label: m('Not consumed', { context: 'worker-transport-state' }),
      tone: 'danger',
      icon: Ban,
      description: m('The worker list has a consumer for it, but Messenger does not consume this transport', {
        context: 'worker-transport-state',
      }),
    },
    STUCK: {
      label: m('Stuck', { context: 'worker-transport-state' }),
      tone: 'danger',
      icon: Siren,
      description: m('Messages wait and no worker process has run for a while', { context: 'worker-transport-state' }),
    },
    UNDEFINED: {
      label: m('Undefined', { context: 'worker-transport-state' }),
      tone: 'warning',
      icon: CircleAlert,
      description: m('Messenger consumes it, but the worker list has no entry: nobody may start a worker', {
        context: 'worker-transport-state',
      }),
    },
    BACKLOG: {
      label: m('Backlog', { context: 'worker-transport-state' }),
      tone: 'warning',
      icon: Layers,
      description: m('Messages wait while every process works', { context: 'worker-transport-state' }),
    },
    WORKING: {
      label: m('Working', { context: 'worker-transport-state' }),
      tone: 'success',
      icon: Loader,
      description: m('Messages are in work', { context: 'worker-transport-state' }),
    },
    IDLE: {
      label: m('Idle', { context: 'worker-transport-state' }),
      tone: 'neutral',
      icon: CircleDot,
      description: m('Nothing to do', { context: 'worker-transport-state' }),
    },
  },
  { context: 'worker-transport-state' }
);

/** `WorkerProcess.displayState`: `BUSY` is a process inside a handler (it cannot report then), not a lost one. */
export const WORKER_PROCESS_STATE = defineStatusMap<WorkerProcessDisplayState>(
  {
    RUNNING: {
      label: m('Running', { context: 'worker-process-state' }),
      tone: 'success',
      icon: CirclePlay,
      description: m('Alive, waiting for messages', { context: 'worker-process-state' }),
    },
    BUSY: {
      label: m('Busy', { context: 'worker-process-state' }),
      tone: 'info',
      icon: Loader,
      description: m('Handling a message', { context: 'worker-process-state' }),
    },
    STOPPING: {
      label: m('Stopping', { context: 'worker-process-state' }),
      tone: 'warning',
      icon: Hourglass,
      description: m('Stops after its current message', { context: 'worker-process-state' }),
    },
    SILENT: {
      label: m('Silent', { context: 'worker-process-state' }),
      tone: 'warning',
      icon: TriangleAlert,
      description: m('Its current message runs longer than the busy limit', { context: 'worker-process-state' }),
    },
    STOPPED: {
      label: m('Stopped', { context: 'worker-process-state' }),
      tone: 'neutral',
      icon: Square,
      description: m('Ended and reported its stop', { context: 'worker-process-state' }),
    },
    LOST: {
      label: m('Lost', { context: 'worker-process-state' }),
      tone: 'danger',
      icon: CircleAlert,
      description: m('No stop reported and no heartbeat: killed, out of memory or host gone', { context: 'worker-process-state' }),
    },
  },
  { context: 'worker-process-state' }
);

/** `WorkerMessageRun.outcome`. */
export const WORKER_MESSAGE_OUTCOME = defineStatusMap<WorkerMessageOutcome>(
  {
    HANDLED: { label: m('Handled', { context: 'worker-message-outcome' }), tone: 'success', icon: CircleCheck },
    CAUGHT: {
      label: m('Caught', { context: 'worker-message-outcome' }),
      tone: 'warning',
      icon: TriangleAlert,
      description: m('The handler logged an error and returned', { context: 'worker-message-outcome' }),
    },
    THROWN: {
      label: m('Thrown', { context: 'worker-message-outcome' }),
      tone: 'danger',
      icon: CircleX,
      description: m('An exception left the handler', { context: 'worker-message-outcome' }),
    },
  },
  { context: 'worker-message-outcome' }
);

const pick = <TValue extends string>(values: readonly TValue[], value: string | null | undefined): TValue | null =>
  (values as readonly string[]).includes(value ?? '') ? (value as TValue) : null;

export const toWorkerTransportState = (value: string | null | undefined): WorkerTransportState | null =>
  pick(Object.keys(WORKER_TRANSPORT_STATE) as WorkerTransportState[], value);

export const toWorkerProcessState = (value: string | null | undefined): WorkerProcessDisplayState | null =>
  pick(Object.keys(WORKER_PROCESS_STATE) as WorkerProcessDisplayState[], value);

export const toWorkerMessageOutcome = (value: string | null | undefined): WorkerMessageOutcome | null =>
  pick(Object.keys(WORKER_MESSAGE_OUTCOME) as WorkerMessageOutcome[], value);

/**
 * A payload value for `StatusBadge` with one of these maps: a known value gets its definition, an unknown one (a
 * state a newer backend sends) shows as itself in a neutral badge instead of an empty dash.
 */
export const rawStatusValue = <TValue extends string>(value: string | null | undefined): TValue | null =>
  value === null || value === undefined || value === '' ? null : (value as TValue);
