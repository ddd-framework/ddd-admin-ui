import type { TranslateFn } from '../i18n/useTranslate.ts';

/** Window presets with the step the backend allows (60 / 300 / 900 / 3600 s, at most 1500 points). */
export const WORKERS_WINDOW_PRESETS = ['1h', '6h', '24h', '7d', '14d'] as const;
export type WorkersWindowPreset = (typeof WORKERS_WINDOW_PRESETS)[number];
export const DEFAULT_WORKERS_WINDOW: WorkersWindowPreset = '6h';

/** The overview's refresh: a shorter interval shows nothing new (workers write every `flushSeconds`). */
export const WORKERS_OVERVIEW_POLL_MS = 10_000;
/** Lists and the live processes of a transport. */
export const WORKERS_LIST_POLL_MS = 15_000;
/** History windows slide to "now" this often. */
export const WORKERS_HISTORY_POLL_MS = 60_000;

const HOUR_MS = 60 * 60 * 1000;

const PRESETS: Record<WorkersWindowPreset, { count: number; unit: 'hour' | 'day'; windowMs: number; stepSeconds: number }> = {
  '1h': { count: 1, unit: 'hour', windowMs: HOUR_MS, stepSeconds: 60 },
  '6h': { count: 6, unit: 'hour', windowMs: 6 * HOUR_MS, stepSeconds: 300 },
  '24h': { count: 24, unit: 'hour', windowMs: 24 * HOUR_MS, stepSeconds: 900 },
  '7d': { count: 7, unit: 'day', windowMs: 7 * 24 * HOUR_MS, stepSeconds: 3600 },
  // the monitoring keeps statistics and samples 14 days (`statRetentionDays`)
  '14d': { count: 14, unit: 'day', windowMs: 14 * 24 * HOUR_MS, stepSeconds: 3600 },
};

/** A stored or linked value as a preset; anything else is the default. */
export const toWorkersWindowPreset = (value: string | null | undefined): WorkersWindowPreset =>
  (WORKERS_WINDOW_PRESETS as readonly string[]).includes(value ?? '') ? (value as WorkersWindowPreset) : DEFAULT_WORKERS_WINDOW;

/** The window tabs, labelled in the UI language (`6 hours`, `7 Tage`). */
export const workersWindowOptions = (t: TranslateFn): { value: WorkersWindowPreset; label: string }[] =>
  WORKERS_WINDOW_PRESETS.map(preset => {
    const { count, unit } = PRESETS[preset];
    return {
      value: preset,
      label:
        unit === 'hour'
          ? t('{count, plural, one {# hour} other {# hours}}', { count })
          : t('{count, plural, one {# day} other {# days}}', { count }),
    };
  });

/** A resolved window: ISO 8601 UTC instants, the step and the length. */
export interface WorkersWindow {
  from: string;
  to: string;
  stepSeconds: number;
  windowMs: number;
}

const toIso = (ms: number): string => new Date(ms).toISOString().replace('.000Z', 'Z');

/** The minute `ms` falls in. */
export const minuteOf = (ms: number): number => Math.floor(ms / 60_000) * 60_000;

/** The window of a preset ending at `anchorMs` (a whole minute, so the request stays the same across renders). */
export const resolveWorkersWindow = (preset: WorkersWindowPreset, anchorMs: number): WorkersWindow => {
  const { windowMs, stepSeconds } = PRESETS[preset];
  return { from: toIso(anchorMs - windowMs), to: toIso(anchorMs), stepSeconds, windowMs };
};
