import { m } from '../i18n/store.ts';
import type { AdminLanguage, AppTranslationContext, AppTranslationValue, AppTranslationWritingStyle, LanguageWritingStyles } from './adminTypes.ts';

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
