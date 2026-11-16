import { parseTranslationKey, type WritingStyle } from '@mgamadeus/ddd-web/contract';

/**
 * One tab of a translatable field. `key` is the FULL translation key as the backend stores it (`en::FORMAL`,
 * `de::INFORMAL`, `de:at:FORMAL`) — never collapsed to the language: `de::FORMAL` and `de::INFORMAL` are two texts.
 */
export interface TranslatableLocale {
  key: string;
  languageCode: string;
  writingStyle: WritingStyle;
  /** Short tab label: `DE`, `DE-AT`, `DE · Informal`. */
  label: string;
}

/** Splits a full key; a key that is not `<language>:<country>:<style>` is kept as a FORMAL entry of its own text. */
export const toTranslatableLocale = (key: string): TranslatableLocale => {
  const parts = parseTranslationKey(key);
  if (!parts) return { key, languageCode: key, writingStyle: 'FORMAL', label: key.toUpperCase() };
  const language = parts.countryCode
    ? `${parts.languageCode}-${parts.countryCode}`.toUpperCase()
    : parts.languageCode.toUpperCase();
  return {
    key,
    languageCode: parts.languageCode,
    writingStyle: parts.writingStyle,
    label: parts.writingStyle === 'INFORMAL' ? `${language} · Informal` : language,
  };
};

/**
 * The tabs a form shows: every offered locale plus every key the loaded entity already has (so a stored
 * `de::INFORMAL` text is visible and editable, and never silently dropped), the default locale first, then the
 * offered order, then extra stored keys alphabetically.
 */
export const mergeLocaleKeys = (
  defaultLocale: string,
  offered: readonly string[],
  stored: readonly string[]
): TranslatableLocale[] => {
  const keys: string[] = [defaultLocale];
  for (const key of offered) if (!keys.includes(key)) keys.push(key);
  for (const key of [...stored].sort()) if (!keys.includes(key)) keys.push(key);
  return keys.map(toTranslatableLocale);
};

/**
 * The spelled-out name of a translation key for tooltips, in the UI language: `de::INFORMAL` → "Deutsch · Informell"
 * (UI German), `de:at:FORMAL` → "German (Austria)". The writing style is named only for INFORMAL (FORMAL is the default
 * of every content text). `informalLabel` is "Informal" (the caller passes its `t`).
 */
export const localeDisplayName = (key: string, uiLanguageCode: string, informalLabel: string): string => {
  const parts = parseTranslationKey(key);
  const languageCode = parts?.languageCode ?? key.split(':')[0];
  let name = languageCode.toUpperCase();
  try {
    name =
      new Intl.DisplayNames([uiLanguageCode], { type: 'language' }).of(
        parts?.countryCode ? `${languageCode}-${parts.countryCode.toUpperCase()}` : languageCode
      ) ?? name;
  } catch {
    // an unknown code: the short label stays
  }
  return parts?.writingStyle === 'INFORMAL' ? `${name} · ${informalLabel}` : name;
};
