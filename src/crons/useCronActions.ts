'use client';

import { getErrorStatus, normalizeDddError } from '@mgamadeus/ddd-web/contract';
import { useCallback, useEffect, useState } from 'react';

import { useTranslate } from '../i18n/useTranslate.ts';
import { notify } from '../logic/pure/notify.ts';
import { useConfirm } from '../logic/react/useConfirm.ts';
import { useWriteAccess } from '../logic/react/writeAccess.ts';
import type { CronsApi } from './api.ts';
import type { CronOverview } from './types.ts';

/** How long Run now stays off after a 409 (the runner may have started meanwhile: retry after a minute). */
export const CRON_CONFLICT_RETRY_MS = 60_000;

/** The refusal of the last action, shown above the list until dismissed or the next action. */
export interface CronActionError {
  cronId: number;
  cronName: string;
  message: string;
  /** A 409: the Cron runs or is switched off; the action may work in a minute. */
  isConflict: boolean;
}

/** Run now asked, and the last run start the list showed then: the row says "queued" until a new run appears. */
export type CronQueuedRuns = Readonly<Record<number, string | null>>;

export interface CronActions {
  setActive: (cron: CronOverview, isActive: boolean) => Promise<CronOverview | null>;
  runNow: (cron: CronOverview) => Promise<CronOverview | null>;
  /** Asks first (the Cron's name typed); `true` once deleted. */
  remove: (cron: CronOverview) => Promise<boolean>;
  /** Cron ids whose Run now was refused with a 409 in the last minute. */
  conflictUntil: Readonly<Record<number, number>>;
  queued: CronQueuedRuns;
  error: CronActionError | null;
  dismissError: () => void;
  pendingCronId: number | null;
}

/**
 * The writes of a Cron row and its drawer: switch on / off, Run now, delete. Each write answers the Cron as it is now
 * (the list and details refetch through their tags). A 409 is shown as its message and keeps Run now off for a minute.
 * Every write checks `WriteAccessProvider` itself; the server checks again.
 */
export const useCronActions = (api: CronsApi): CronActions => {
  const { t } = useTranslate();
  const writeAccess = useWriteAccess();
  const confirm = useConfirm();
  const [activate] = api.useActivateCronMutation();
  const [deactivate] = api.useDeactivateCronMutation();
  const [runCronNow] = api.useRunCronNowMutation();
  const [deleteCron] = api.useDeleteCronMutation();
  const [error, setError] = useState<CronActionError | null>(null);
  const [conflictUntil, setConflictUntil] = useState<Record<number, number>>({});
  const [queued, setQueued] = useState<Record<number, string | null>>({});
  const [pendingCronId, setPendingCronId] = useState<number | null>(null);

  // a refused Run now turns on again after its minute
  useEffect(() => {
    const ends = Object.values(conflictUntil);
    if (ends.length === 0) return;
    const timer = window.setTimeout(() => {
      const now = Date.now();
      setConflictUntil(current => Object.fromEntries(Object.entries(current).filter(([, until]) => until > now)));
    }, Math.max(0, Math.min(...ends) - Date.now()) + 50);
    return () => window.clearTimeout(timer);
  }, [conflictUntil]);

  const fail = useCallback(
    (cron: CronOverview, failure: unknown, fallback: string) => {
      const isConflict = getErrorStatus(failure) === 409;
      const message = normalizeDddError(failure, fallback).message;
      setError({ cronId: cron.id, cronName: cron.name, message, isConflict });
      notify.error(isConflict ? `${message} ${t('Try again in a minute.')}` : message);
      return isConflict;
    },
    [t]
  );

  const setActive = useCallback(
    async (cron: CronOverview, isActive: boolean) => {
      if (!writeAccess.allowed) return null;
      setError(null);
      setPendingCronId(cron.id);
      try {
        const { cron: saved } = await (isActive ? activate : deactivate)({ cronId: cron.id }).unwrap();
        notify.success(isActive ? t('Switched on %name%', { replacements: { name: cron.name } }) : t('Paused %name%', { replacements: { name: cron.name } }));
        return saved;
      } catch (failure) {
        fail(cron, failure, t('The Cron could not be switched.'));
        return null;
      } finally {
        setPendingCronId(null);
      }
    },
    [activate, deactivate, fail, t, writeAccess.allowed]
  );

  const runNow = useCallback(
    async (cron: CronOverview) => {
      if (!writeAccess.allowed) return null;
      setError(null);
      setPendingCronId(cron.id);
      try {
        const { cron: saved } = await runCronNow({ cronId: cron.id }).unwrap();
        setQueued(current => ({ ...current, [cron.id]: cron.lastExecutionStartedAt ?? null }));
        notify.success(t('%name% is queued: it starts within a minute.', { replacements: { name: cron.name } }));
        return saved;
      } catch (failure) {
        if (fail(cron, failure, t('The run could not be queued.'))) {
          setConflictUntil(current => ({ ...current, [cron.id]: Date.now() + CRON_CONFLICT_RETRY_MS }));
        }
        return null;
      } finally {
        setPendingCronId(null);
      }
    },
    [fail, runCronNow, t, writeAccess.allowed]
  );

  const remove = useCallback(
    async (cron: CronOverview) => {
      if (!writeAccess.allowed) return false;
      const confirmed = await confirm({
        title: t('Delete %name%?', { replacements: { name: cron.name } }),
        description: t('The Cron and its whole run history are deleted. This cannot be undone.'),
        confirmLabel: t('Delete', { context: 'action' }),
        confirmVariant: 'destructive',
        requirePhrase: cron.name,
      });
      if (!confirmed) return false;
      setError(null);
      setPendingCronId(cron.id);
      try {
        await deleteCron({ cronId: cron.id }).unwrap();
        notify.success(t('Deleted %name%', { replacements: { name: cron.name } }));
        return true;
      } catch (failure) {
        fail(cron, failure, t('The Cron could not be deleted.'));
        return false;
      } finally {
        setPendingCronId(null);
      }
    },
    [confirm, deleteCron, fail, t, writeAccess.allowed]
  );

  return { setActive, runNow, remove, conflictUntil, queued, error, dismissError: () => setError(null), pendingCronId };
};

/** Whether a queued Run now still waits: the list shows the same last run start as when it was asked. */
export const isCronRunQueued = (queued: CronQueuedRuns, cron: CronOverview): boolean =>
  cron.id in queued && cron.status !== 'RUNNING' && (cron.lastExecutionStartedAt ?? null) === queued[cron.id];
