import { parseDddDateTime } from '@mgamadeus/ddd-web/contract';

import { uiDateTimeFormat, uiRelativeTimeFormat } from '../../i18n/format.ts';

/** The one empty marker of every cell, metadata item and definition list. */
export const EMPTY_MARKER = '—';

/** A DDD date (`Y-m-d`): a calendar day, not an instant — formatted in UTC so it never shifts by a day. */
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Formatters in the UI language, fetched at format time so a language switch takes effect (cached per locale).
const dateTimeFormat = () => uiDateTimeFormat({ dateStyle: 'medium', timeStyle: 'short' });
const dateFormat = () => uiDateTimeFormat({ dateStyle: 'medium' });
const calendarDayFormat = () => uiDateTimeFormat({ dateStyle: 'medium', timeZone: 'UTC' });
const relativeFormat = () => uiRelativeTimeFormat({ numeric: 'auto' });

const RELATIVE_STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];

/** True for a value that carries a date only (`Y-m-d`), so a cell shows no time for it. */
export const isDddDateOnly = (value: string | null | undefined): boolean => !!value && DATE_ONLY_PATTERN.test(value);

/**
 * A backend date-time (offsetless UTC `Y-m-d H:i:s`) as `Nov 1, 2026, 2:03 PM` in the UI language and the viewer's zone — the
 * `EntityMetadata` format, used by every date column. A plain date (`Y-m-d`) prints without a time. Empty → the
 * fallback (`—`); an unparsable value is shown as stored, never hidden.
 */
export const formatDateTime = (value: string | null | undefined, fallback: string = EMPTY_MARKER): string => {
  if (!value) return fallback;
  if (isDddDateOnly(value)) return formatDate(value, fallback);
  const date = parseDddDateTime(value);
  return date ? dateTimeFormat().format(date) : value;
};

/** The day of a backend date or date-time (`Nov 1, 2026`); a plain `Y-m-d` is the calendar day as stored. */
export const formatDate = (value: string | null | undefined, fallback: string = EMPTY_MARKER): string => {
  if (!value) return fallback;
  const date = parseDddDateTime(value);
  if (!date) return value;
  return isDddDateOnly(value) ? calendarDayFormat().format(date) : dateFormat().format(date);
};

/** `in 3 days`, `2 hours ago`, `now` (the hover text of date cells and `EntityMetadata`). */
export const formatRelativeTime = (date: Date, now: number = Date.now()): string => {
  const seconds = Math.round((date.getTime() - now) / 1000);
  for (const [unit, size] of RELATIVE_STEPS) {
    if (Math.abs(seconds) >= size) return relativeFormat().format(Math.round(seconds / size), unit);
  }
  return relativeFormat().format(0, 'minute');
};
