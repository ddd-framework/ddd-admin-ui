import { m } from '../../i18n/store.ts';
import { toDateInputValue } from './dateInput.ts';

/** Two calendar-day bounds (`YYYY-MM-DD`, `''` = open), the value of a date range filter. */
export interface DateRange {
  from: string;
  to: string;
}

/**
 * A preset of a date range filter. `resolve` turns the local day into the bounds (the same `YYYY-MM-DD` values typed
 * dates give); a preset without `resolve` is the custom range (the two date fields).
 */
export interface DateRangePreset {
  id: string;
  /** English UI text, translated by the filter (`m()` for extraction). */
  label: string;
  /** Translation context of `label` (also passed to `m()` as a literal). */
  context?: string;
  resolve?: (today: string) => DateRange;
}

/** The id of the preset that shows the two date fields. */
export const CUSTOM_DATE_RANGE_PRESET = 'custom';

const DAY_MS = 24 * 60 * 60 * 1000;
const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** `day` moved by `days` calendar days (no clock involved, so no daylight-saving shift); `''` for an invalid day. */
export const addCalendarDays = (day: string, days: number): string => {
  const match = DAY.exec(day);
  if (!match) return '';
  const time = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) + days * DAY_MS;
  return new Date(time).toISOString().slice(0, 10);
};

/** The local calendar day of `now` (the viewer's clock), as a date input holds it. */
export const localToday = (now: Date = new Date()): string => toDateInputValue(now, 'local');

/** The last `days` days up to and including today. */
const lastDays = (days: number) => (today: string): DateRange => ({ from: addCalendarDays(today, -(days - 1)), to: today });

/** All time, today, the last 7 and 30 days (today included), custom. */
export const DEFAULT_DATE_RANGE_PRESETS: readonly DateRangePreset[] = [
  { id: 'all', label: m('All time'), resolve: () => ({ from: '', to: '' }) },
  { id: 'today', label: m('Today'), resolve: today => ({ from: today, to: today }) },
  { id: 'last7', label: m('Last 7 days'), resolve: lastDays(7) },
  { id: 'last30', label: m('Last 30 days'), resolve: lastDays(30) },
  { id: CUSTOM_DATE_RANGE_PRESET, label: m('Custom', { context: 'date-range' }), context: 'date-range' },
];

/** The bounds of `presetId` on `today`; `null` for the custom preset or an unknown id. */
export const resolveDateRangePreset = (
  presetId: string,
  presets: readonly DateRangePreset[] = DEFAULT_DATE_RANGE_PRESETS,
  today: string = localToday()
): DateRange | null => presets.find(preset => preset.id === presetId)?.resolve?.(today) ?? null;

/**
 * The preset a stored range stands for on `today` (a range from the URL or after "Clear filters"): the first preset
 * whose bounds equal it, else the custom preset. An empty range is the preset that resolves to it (`all`).
 */
export const dateRangePresetOf = (
  range: DateRange,
  presets: readonly DateRangePreset[] = DEFAULT_DATE_RANGE_PRESETS,
  today: string = localToday()
): string => {
  for (const preset of presets) {
    const resolved = preset.resolve?.(today);
    if (resolved && resolved.from === range.from && resolved.to === range.to) return preset.id;
  }
  return presets.find(preset => !preset.resolve)?.id ?? CUSTOM_DATE_RANGE_PRESET;
};
