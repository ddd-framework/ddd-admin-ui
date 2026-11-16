/**
 * Values of native `<input type="date">` (`YYYY-MM-DD`) and `<input type="datetime-local">` (`YYYY-MM-DDTHH:mm`, with
 * `:ss` when the seconds are not zero) to and from a `Date`, in an explicit zone: `'local'` reads and writes the
 * browser's wall clock, `'utc'` the UTC clock. No arithmetic: a value names a calendar day or a wall-clock time, and the
 * helpers only translate between that text and an instant.
 *
 * Empty or invalid input: `''` towards the input, `null` from it. A `datetime-local` value that does not exist on the
 * local clock (the hour skipped when the clocks go forward) becomes the instant the platform resolves it to (one hour
 * later); a value that exists twice (the hour repeated when the clocks go back) becomes its first occurrence.
 */

/** The zone a date input's value is read in. */
export type DateInputZone = 'local' | 'utc';

const pad = (value: number, length = 2) => String(value).padStart(length, '0');

interface Parts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const partsOf = (date: Date, zone: DateInputZone): Parts =>
  zone === 'utc'
    ? {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate(),
        hour: date.getUTCHours(),
        minute: date.getUTCMinutes(),
        second: date.getUTCSeconds(),
      }
    : {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        hour: date.getHours(),
        minute: date.getMinutes(),
        second: date.getSeconds(),
      };

const isValidDate = (date: Date | null | undefined): date is Date => date instanceof Date && !Number.isNaN(date.getTime());

const dayText = ({ year, month, day }: Parts) => `${pad(year, 4)}-${pad(month)}-${pad(day)}`;

/** `Date` → the value of a `type="date"` input (`YYYY-MM-DD`): the calendar day of the instant in `zone`. */
export const toDateInputValue = (date: Date | null | undefined, zone: DateInputZone): string =>
  isValidDate(date) ? dayText(partsOf(date, zone)) : '';

/** `Date` → the value of a `type="datetime-local"` input (`YYYY-MM-DDTHH:mm`, `:ss` when not zero) in `zone`. */
export const toDateTimeInputValue = (date: Date | null | undefined, zone: DateInputZone): string => {
  if (!isValidDate(date)) return '';
  const parts = partsOf(date, zone);
  return `${dayText(parts)}T${pad(parts.hour)}:${pad(parts.minute)}${parts.second ? `:${pad(parts.second)}` : ''}`;
};

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?$/;

/** Builds the instant of wall-clock parts in `zone`; `null` when a part is out of range (31 Feb, 25:00). */
const instantOf = (parts: Parts, zone: DateInputZone): Date | null => {
  const { year, month, day, hour, minute, second } = parts;
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) return null;
  const date =
    zone === 'utc'
      ? new Date(Date.UTC(year, month - 1, day, hour, minute, second))
      : new Date(year, month - 1, day, hour, minute, second);
  if (zone === 'utc') date.setUTCFullYear(year);
  else date.setFullYear(year, month - 1, day);
  // a day that does not exist in its month rolls over (31 Feb → 3 Mar): refuse it
  const check = partsOf(date, zone);
  return check.year === year && check.month === month && check.day === day ? date : null;
};

/** The value of a `type="date"` input → the instant of midnight of that day in `zone`; `null` when empty or invalid. */
export const fromDateInputValue = (value: string | null | undefined, zone: DateInputZone): Date | null => {
  const match = value ? DATE.exec(value.trim()) : null;
  if (!match) return null;
  return instantOf({ year: Number(match[1]), month: Number(match[2]), day: Number(match[3]), hour: 0, minute: 0, second: 0 }, zone);
};

/** The value of a `type="datetime-local"` input → its instant in `zone`; `null` when empty or invalid. */
export const fromDateTimeInputValue = (value: string | null | undefined, zone: DateInputZone): Date | null => {
  const match = value ? DATE_TIME.exec(value.trim()) : null;
  if (!match) return null;
  return instantOf(
    {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
      hour: Number(match[4]),
      minute: Number(match[5]),
      second: Number(match[6] ?? 0),
    },
    zone
  );
};
