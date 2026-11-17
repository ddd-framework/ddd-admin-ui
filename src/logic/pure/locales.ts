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
  /**
   * Tab model `language` only: the other stored keys of this language (`de::INFORMAL` next to an edited `de::FORMAL`).
   * They are not edited in this tab and go back in the payload unchanged.
   */
  otherKeys?: readonly string[];
}

/** The language part of a key, without the writing style: `de`, `de:at`. */
export const translationLanguageOf = (key: string): string => {
  const parts = parseTranslationKey(key);
  if (!parts) return key;
  return parts.countryCode ? `${parts.languageCode}:${parts.countryCode}` : parts.languageCode;
};

export interface LanguageTabsOptions {
  /**
   * Which writing style a language tab edits when the language has several (or none yet), in order. Default: the
   * default locale's style, then `FORMAL`, then `INFORMAL`.
   */
  styleOrder?: readonly WritingStyle[];
}

/**
 * Tab model `language`: one tab per language (`de`, `de:at`), each editing exactly one full key, chosen the same way
 * every time: the default locale for its own language; otherwise a stored key before an offered one, in `styleOrder`;
 * a language with no key yet edits `<language>::<first style>`. The tab label names the edited style when it is not
 * FORMAL (`DE · Informal`); the other stored keys of the language stay in the value and in the payload. Order: the
 * default language, the offered order, then further stored languages alphabetically.
 */
export const mergeLanguageTabs = (
  defaultLocale: string,
  offered: readonly string[],
  stored: readonly string[],
  options: LanguageTabsOptions = {}
): TranslatableLocale[] => {
  const defaultStyle = parseTranslationKey(defaultLocale)?.writingStyle ?? 'FORMAL';
  const order: WritingStyle[] = [...(options.styleOrder ?? [defaultStyle, 'FORMAL', 'INFORMAL'])];
  for (const style of ['FORMAL', 'INFORMAL'] as WritingStyle[]) if (!order.includes(style)) order.push(style);
  const rank = (key: string) => {
    const style = parseTranslationKey(key)?.writingStyle ?? 'FORMAL';
    const index = order.indexOf(style);
    return index === -1 ? order.length : index;
  };
  const byRank = (left: string, right: string) => rank(left) - rank(right) || left.localeCompare(right);

  const languages: string[] = [translationLanguageOf(defaultLocale)];
  for (const key of offered) if (!languages.includes(translationLanguageOf(key))) languages.push(translationLanguageOf(key));
  const extra = [...new Set(stored.map(translationLanguageOf))].filter(language => !languages.includes(language)).sort();
  languages.push(...extra);

  return languages.map(language => {
    const storedKeys = stored.filter(key => translationLanguageOf(key) === language).sort(byRank);
    const offeredKeys = offered.filter(key => translationLanguageOf(key) === language).sort(byRank);
    const edited =
      language === translationLanguageOf(defaultLocale)
        ? defaultLocale
        : (storedKeys[0] ?? offeredKeys[0] ?? `${language.includes(':') ? language : `${language}:`}:${order[0]}`);
    const tab = toTranslatableLocale(edited);
    const otherKeys = storedKeys.filter(key => key !== edited);
    return otherKeys.length > 0 ? { ...tab, otherKeys } : tab;
  });
};

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
