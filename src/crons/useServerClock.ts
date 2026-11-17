'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

import { parseCronTime } from './format.ts';

const subscribeVisibility = (onChange: () => void) => {
  document.addEventListener('visibilitychange', onChange);
  return () => document.removeEventListener('visibilitychange', onChange);
};

/** True while the tab is visible (the server render counts as visible). */
export const useCronsPageVisible = (): boolean =>
  useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState !== 'hidden',
    () => true
  );

/** Calls `refresh` every `intervalMs` while the tab is visible (0: never). */
export const useCronsRefreshWhileVisible = (refresh: () => void, intervalMs: number): void => {
  const visible = useCronsPageVisible();
  useEffect(() => {
    if (!visible || intervalMs <= 0) return;
    const timer = window.setInterval(refresh, intervalMs);
    return () => window.clearInterval(timer);
  }, [visible, refresh, intervalMs]);
};

/**
 * "Now" on the server's clock in ms (its wall clock read as UTC, like every time of the crons payloads): the response's
 * `serverNow` plus the time this browser has waited since it arrived, ticking every second. The server render and the
 * first client render show `serverNow` itself, so they agree; `tick: false` keeps it still (a showcase, a test).
 * `null` without a `serverNow`.
 */
export const useServerClock = (serverNow: string | null | undefined, { tick = true }: { tick?: boolean } = {}): number | null => {
  const serverMs = parseCronTime(serverNow);
  const [received, setReceived] = useState<{ serverMs: number; atMs: number } | null>(null);
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    if (serverMs === null || !tick) return;
    setReceived({ serverMs, atMs: Date.now() });
    setNowMs(Date.now());
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [serverMs, tick]);

  if (serverMs === null) return null;
  if (!received || received.serverMs !== serverMs || nowMs === null) return serverMs;
  return serverMs + Math.max(0, nowMs - received.atMs);
};
