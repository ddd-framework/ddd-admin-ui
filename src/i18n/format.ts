import { dateTimeFormatFor, numberFormatFor, relativeTimeFormatFor, toIntlLocale } from './localeFormat.ts';
import { getTranslationState } from './store.ts';

/**
 * Date, number and relative-time formatting in the active UI language (not the browser locale). Call these at render
 * time — never keep the result in a module constant — so a language switch (which re-renders through `useTranslate`)
 * formats in the new language.
 */

/** The `Intl` locale of the active UI language (`de`, `en-GB` for English, …). */
export const getUiLocale = (): string => toIntlLocale(getTranslationState().languageCode);

export const uiDateTimeFormat = (options: Intl.DateTimeFormatOptions = {}): Intl.DateTimeFormat =>
  dateTimeFormatFor(getUiLocale(), options);

export const uiNumberFormat = (options: Intl.NumberFormatOptions = {}): Intl.NumberFormat =>
  numberFormatFor(getUiLocale(), options);

export const uiRelativeTimeFormat = (options: Intl.RelativeTimeFormatOptions = {}): Intl.RelativeTimeFormat =>
  relativeTimeFormatFor(getUiLocale(), options);

/** A number in the UI language (`1.234,5` in German, `1,234.5` in English). */
export const formatUiNumber = (value: number, options: Intl.NumberFormatOptions = {}): string =>
  uiNumberFormat(options).format(value);
