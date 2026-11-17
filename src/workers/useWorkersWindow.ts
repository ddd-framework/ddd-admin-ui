'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { minuteOf, resolveWorkersWindow, WORKERS_HISTORY_POLL_MS, type WorkersWindow, type WorkersWindowPreset } from './window.ts';

const subscribeVisibility = (onChange: () => void) => {
  document.addEventListener('visibilitychange', onChange);
  return () => document.removeEventListener('visibilitychange', onChange);
};

/** True while the tab is visible (the server render and a document without the API count as visible). */
export const usePageVisible = (): boolean =>
  useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState !== 'hidden',
    () => true
  );

/** Calls `refresh` every `intervalMs` while the tab is visible. */
export const useRefreshWhileVisible = (refresh: () => void, intervalMs: number): void => {
  const visible = usePageVisible();
  useEffect(() => {
    if (!visible || intervalMs <= 0) return;
    const timer = window.setInterval(refresh, intervalMs);
    return () => window.clearInterval(timer);
  }, [visible, refresh, intervalMs]);
};

/**
 * The resolved window of a preset, anchored at the current minute. While the tab is visible the anchor moves every
 * minute (the history refreshes by sliding its window); returning to the tab moves it at once. `anchorMs` pins it (a
 * showcase, a test).
 */
export const useWorkersWindow = (preset: WorkersWindowPreset, anchorMs?: number): WorkersWindow => {
  const visible = usePageVisible();
  const [anchor, setAnchor] = useState(() => anchorMs ?? minuteOf(Date.now()));

  useEffect(() => {
    if (anchorMs !== undefined || !visible) return;
    setAnchor(minuteOf(Date.now()));
    const timer = window.setInterval(() => setAnchor(minuteOf(Date.now())), WORKERS_HISTORY_POLL_MS);
    return () => window.clearInterval(timer);
  }, [visible, anchorMs]);

  const effectiveAnchor = anchorMs ?? anchor;
  return useMemo(() => resolveWorkersWindow(preset, effectiveAnchor), [preset, effectiveAnchor]);
};
