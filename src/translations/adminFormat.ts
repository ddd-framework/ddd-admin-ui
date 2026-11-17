import { m } from '../i18n/store.ts';
import type {
  AdminLanguage,
  AppTranslationContext,
  AppTranslationKey,
  AppTranslationValue,
  AppTranslationWritingStyle,
  LanguageWritingStyles,
} from './adminTypes.ts';

/** Language id → language code; `?` is shown for an id the map lacks. */
export type LanguageCodeMap = Readonly<Record<string, string>>;

export const toLanguageCodeMap = (languages: readonly AdminLanguage[]): LanguageCodeMap => {
  const map: Record<string, string> = {};
  for (const language of languages) {
    if (language.id !== null && language.id !== undefined && language.languageCode) map[String(language.id)] = language.languageCode;
  }
  return map;
};

/** A value's content locale as a full key (`de::INFORMAL`); `?::…` for a language the map lacks. */
export const appTranslationValueLocaleKey = (value: AppTranslationValue, languageCodes: LanguageCodeMap): string =>
  `${languageCodes[String(value.languageId)] ?? '?'}::${value.writingStyle ?? 'INFORMAL'}`;

/** A key's values, English first, then by language code, informal before formal, singular before plural. */
export const sortAppTranslationValues = (values: readonly AppTranslationValue[], languageCodes: LanguageCodeMap): AppTranslationValue[] => {
  const rank = (value: AppTranslationValue) => {
    const code = languageCodes[String(value.languageId)] ?? '~';
    return `${code === 'en' ? '0' : '1'}${code}|${value.writingStyle === 'FORMAL' ? 1 : 0}|${value.context === 'MANY' ? 1 : 0}`;
  };
  return [...values].sort((left, right) => (rank(left) < rank(right) ? -1 : rank(left) > rank(right) ? 1 : 0));
};

export const APP_TRANSLATION_CONTEXT_OPTIONS: readonly { value: AppTranslationContext; label: string }[] = [
  { value: 'ONE', label: m('Singular') },
  { value: 'MANY', label: m('Plural') },
];

export const APP_TRANSLATION_WRITING_STYLE_OPTIONS: readonly { value: AppTranslationWritingStyle; label: string }[] = [
  { value: 'INFORMAL', label: m('Informal') },
  { value: 'FORMAL', label: m('Formal') },
];

export const LANGUAGE_WRITING_STYLES_OPTIONS: readonly { value: LanguageWritingStyles; label: string }[] = [
  { value: 'INFORMAL', label: m('Informal') },
  { value: 'FORMAL', label: m('Formal') },
  { value: 'FORMAL_AND_INFORMAL', label: m('Formal and informal') },
];

export const TEXT_DIRECTION_OPTIONS: readonly { value: string; label: string }[] = [
  { value: 'LTR', label: m('Left to right') },
  { value: 'RTL', label: m('Right to left') },
];

/** Completeness in percent (0 without keys). */
export const completenessPercent = (count: number, total: number): number => (total > 0 ? Math.round((count / total) * 100) : 0);

/** The writing styles a language supports (`supportedWritingStyles`); a language without a setting supports both. */
export const supportedWritingStylesOf = (language: AdminLanguage | null | undefined): AppTranslationWritingStyle[] => {
  const supported = language?.supportedWritingStyles;
  if (supported === 'INFORMAL') return ['INFORMAL'];
  if (supported === 'FORMAL') return ['FORMAL'];
  return ['INFORMAL', 'FORMAL'];
};

/** What makes a value unique within its key: language, country (none = every country), writing style, context. */
export const appTranslationValueCombination = (value: Pick<AppTranslationValue, 'languageId' | 'countryId' | 'writingStyle' | 'context'>): string =>
  `${value.languageId ?? ''}|${value.countryId ?? ''}|${value.writingStyle ?? 'INFORMAL'}|${value.context ?? 'ONE'}`;

/** Country id → country short code (from the locales); used to tell values apart that differ only by country. */
export type CountryCodeMap = Readonly<Record<string, string>>;

export const toCountryCodeMap = (locales: readonly { countryId?: number | null; countryShortCode?: string | null }[]): CountryCodeMap => {
  const map: Record<string, string> = {};
  for (const locale of locales) {
    if (locale.countryId !== null && locale.countryId !== undefined && locale.countryShortCode) map[String(locale.countryId)] = locale.countryShortCode;
  }
  return map;
};

/** The country of a value as its short code (`AT`); null for a value of every country. */
export const appTranslationValueCountryCode = (value: Pick<AppTranslationValue, 'countryId'>, countryCodes: CountryCodeMap): string | null =>
  value.countryId === null || value.countryId === undefined ? null : (countryCodes[String(value.countryId)] ?? `#${value.countryId}`);

/** How a key's values are narrowed in its drawer: a text (value, language code or name), a writing style, a context. */
export interface AppTranslationValuesFilter {
  search?: string;
  writingStyle?: AppTranslationWritingStyle | '';
  context?: AppTranslationContext | '';
}

/** The values matching the filter (case-insensitive text in the value, the language code or the language name). */
export const filterAppTranslationValues = (
  values: readonly AppTranslationValue[],
  filter: AppTranslationValuesFilter,
  languages: readonly AdminLanguage[]
): AppTranslationValue[] => {
  const search = (filter.search ?? '').trim().toLowerCase();
  const languageById = new Map(languages.map(language => [String(language.id), language]));
  return values.filter(value => {
    if (filter.writingStyle && (value.writingStyle ?? 'INFORMAL') !== filter.writingStyle) return false;
    if (filter.context && (value.context ?? 'ONE') !== filter.context) return false;
    if (!search) return true;
    const language = languageById.get(String(value.languageId));
    return [value.translation, language?.languageCode, language?.name, language?.nativeName].some(text => (text ?? '').toLowerCase().includes(search));
  });
};

/** A key's values by language (`sortAppTranslationValues`) or by id, ascending or descending. */
export const sortAppTranslationValuesBy = (
  values: readonly AppTranslationValue[],
  languageCodes: LanguageCodeMap,
  by: 'language' | 'id',
  direction: 'asc' | 'desc' = 'asc'
): AppTranslationValue[] => {
  const sorted = by === 'language' ? sortAppTranslationValues(values, languageCodes) : [...values].sort((left, right) => Number(left.id ?? 0) - Number(right.id ?? 0));
  return direction === 'desc' ? sorted.reverse() : sorted;
};

/** The own fields of a key as the drawer sends them: the key as typed, an empty template or hint as `null`, the hint trimmed. */
export const toAppTranslationKeyBody = (values: {
  key: string;
  translationTemplate: string;
  translationHint: string;
  requiresContext: boolean;
  doNotTranslateAutomatically: boolean;
  reTranslate: boolean;
}): Pick<AppTranslationKey, 'key' | 'translationTemplate' | 'translationHint' | 'requiresContext' | 'doNotTranslateAutomatically' | 'reTranslate'> => ({
  key: values.key,
  translationTemplate: values.translationTemplate.trim() === '' ? null : values.translationTemplate,
  translationHint: values.translationHint.trim() === '' ? null : values.translationHint.trim(),
  requiresContext: values.requiresContext,
  doNotTranslateAutomatically: values.doNotTranslateAutomatically,
  reTranslate: values.reTranslate,
});

/** The label of a writing style (`Informal` / `Formal`, marked texts: translate with `t`). */
export const writingStyleLabel = (style: string | null | undefined): string => (style === 'FORMAL' ? m('Formal') : m('Informal'));
