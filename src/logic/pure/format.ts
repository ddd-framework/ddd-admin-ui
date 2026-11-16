import { getTranslationsSnapshot } from '../../i18n/store.ts';

export interface FormatOptions {
  /** BCP 47 locale; default: the active language of the translation store. */
  locale?: string;
  /** IANA time zone; default: the runtime's. Pass one for output that is equal on server and client. */
  timeZone?: string;
}

const toDate = (value: Date | string | number): Date => (value instanceof Date ? value : new Date(value));

const activeLocale = (options: FormatOptions): string => options.locale ?? getTranslationsSnapshot().languageCode;

/** A date as `dd.mm.yyyy` / `mm/dd/yyyy` … in the active (or given) locale. Empty for an invalid value. */
export const formatDate = (value: Date | string | number, options: FormatOptions = {}): string => {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(activeLocale(options), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(options.timeZone ? { timeZone: options.timeZone } : {}),
  }).format(date);
};

/** A date with hours and minutes in the active (or given) locale. Empty for an invalid value. */
export const formatDateTime = (value: Date | string | number, options: FormatOptions = {}): string => {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(activeLocale(options), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...(options.timeZone ? { timeZone: options.timeZone } : {}),
  }).format(date);
};

/** A number with the grouping and decimal separator of the active (or given) locale. */
export const formatUiNumber = (value: number, options: FormatOptions & { maximumFractionDigits?: number } = {}): string =>
  new Intl.NumberFormat(activeLocale(options), { maximumFractionDigits: options.maximumFractionDigits ?? 2 }).format(
    value,
  );
