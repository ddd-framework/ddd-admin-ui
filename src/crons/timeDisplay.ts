'use client';

import { createContext, createElement, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { estimateCronServerOffsetMs, formatCronClock, formatCronDateTime } from './format.ts';

/** Where the crons screens show their times: `server` the server's wall clock (default), `viewer` the viewer's own zone. */
export type CronTimeZoneMode = 'server' | 'viewer';

/** The time display of the crons screens (set by `CronsScreen`, or `CronTimeDisplayProvider` around the parts). */
export interface CronTimeDisplay {
  mode: CronTimeZoneMode;
  /**
   * How far the server's wall clock runs ahead of UTC, in ms; `null` while unknown (the server render, before the first
   * answer): the times then stay on the server clock.
   */
  serverOffsetMs: number | null;
}

export const CronTimeDisplayContext = createContext<CronTimeDisplay>({ mode: 'server', serverOffsetMs: null });

export interface CronTimeDisplayProviderProps {
  mode?: CronTimeZoneMode;
  /** The server's offset from UTC in minutes (`60` for UTC+1) when the host knows it; else estimated from `serverNow`. */
  serverUtcOffsetMinutes?: number;
  /** The newest `serverNow` of the payloads (the estimate's input). */
  serverNow?: string | null;
  children: ReactNode;
}

/**
 * The time display of the crons parts: `mode="viewer"` converts every time from the server's wall clock into the
 * viewer's zone, by the server's offset (`serverUtcOffsetMinutes`, else estimated after hydration from `serverNow`
 * against the browser clock, to 15 minutes). The server render and the hydration render show the server clock.
 */
export const CronTimeDisplayProvider = ({ mode = 'server', serverUtcOffsetMinutes, serverNow, children }: CronTimeDisplayProviderProps) => {
  const [estimatedOffsetMs, setEstimatedOffsetMs] = useState<number | null>(null);
  useEffect(() => {
    if (mode !== 'viewer' || serverUtcOffsetMinutes !== undefined) return;
    const estimate = estimateCronServerOffsetMs(serverNow, Date.now());
    if (estimate !== null) setEstimatedOffsetMs(estimate);
  }, [mode, serverUtcOffsetMinutes, serverNow]);
  const serverOffsetMs = mode !== 'viewer' ? null : serverUtcOffsetMinutes !== undefined ? serverUtcOffsetMinutes * 60_000 : estimatedOffsetMs;
  const value = useMemo<CronTimeDisplay>(() => ({ mode, serverOffsetMs }), [mode, serverOffsetMs]);
  return createElement(CronTimeDisplayContext.Provider, { value }, children);
};

/** The formatters of the current time display: server wall clock, or (mode `viewer`, offset known) the viewer's zone. */
export const useCronTimeFormat = () => {
  const { mode, serverOffsetMs } = useContext(CronTimeDisplayContext);
  const viewerOffsetMs = mode === 'viewer' ? serverOffsetMs : null;
  const dateTime = useCallback(
    (value: string | number | null | undefined, options: { seconds?: boolean; year?: boolean } = {}) =>
      formatCronDateTime(value, { ...options, viewerOffsetMs }),
    [viewerOffsetMs]
  );
  const clock = useCallback((ms: number) => formatCronClock(ms, viewerOffsetMs), [viewerOffsetMs]);
  return { dateTime, clock, viewerTime: viewerOffsetMs !== null };
};
