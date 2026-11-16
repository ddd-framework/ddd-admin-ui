/**
 * Locale-bound `Intl` formatters, cached per locale and options (pure: no store, testable under plain Node). The app
 * calls the UI-language wrappers in `./format` instead.
 */

/** The `Intl` locale of a UI language code: English prints as `en-GB` (24-hour clock, day before month). */
export const toIntlLocale = (languageCode: string | null | undefined): string => {
  const code = (languageCode ?? '').trim();
  if (!code || code === 'en') return 'en-GB';
  try {
    return Intl.getCanonicalLocales(code)[0] ?? 'en-GB';
  } catch {
    return 'en-GB';
  }
};

const cache = new Map<string, Intl.DateTimeFormat | Intl.NumberFormat | Intl.RelativeTimeFormat>();

const cached = <TFormat extends Intl.DateTimeFormat | Intl.NumberFormat | Intl.RelativeTimeFormat>(
  kind: string,
  locale: string,
  options: object,
  create: (locale: string) => TFormat
): TFormat => {
  const key = `${kind}|${locale}|${JSON.stringify(options)}`;
  const existing = cache.get(key);
  if (existing) return existing as TFormat;
  let format: TFormat;
  try {
    format = create(locale);
  } catch {
    format = create('en-GB');
  }
  cache.set(key, format);
  return format;
};

export const dateTimeFormatFor = (locale: string, options: Intl.DateTimeFormatOptions = {}): Intl.DateTimeFormat =>
  cached('date', locale, options, target => new Intl.DateTimeFormat(target, options));

export const numberFormatFor = (locale: string, options: Intl.NumberFormatOptions = {}): Intl.NumberFormat =>
  cached('number', locale, options, target => new Intl.NumberFormat(target, options));

export const relativeTimeFormatFor = (
  locale: string,
  options: Intl.RelativeTimeFormatOptions = {}
): Intl.RelativeTimeFormat => cached('relative', locale, options, target => new Intl.RelativeTimeFormat(target, options));
