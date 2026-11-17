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
  /**
   * Tab model `language` with `editedKeyPerField`: every key of this language in edit order (`de::FORMAL`,
   * `de::INFORMAL`). Each field edits the first of them that holds text in that field, else `key`
   * (`translationFieldKey`), so one field edits its only INFORMAL text while the next one edits FORMAL.
   */
  fieldKeys?: readonly string[];
}

/**
 * The key a field edits under a tab: with `fieldKeys` (tab model `language`, `editedKeyPerField`) the first of them
 * with non-blank text in `value`, else the tab's `key`.
 */
export const translationFieldKey = (tab: Pick<TranslatableLocale, 'key' | 'fieldKeys'>, value: Readonly<Record<string, string>>): string =>
  tab.fieldKeys?.find(key => (value[key] ?? '').trim() !== '') ?? tab.key;

/** The full key of a language (`de`, `de:at`) in one writing style: `de::FORMAL`, `de:at:INFORMAL`. */
export const translationKeyOf = (language: string, writingStyle: WritingStyle): string =>
  `${language.includes(':') ? language : `${language}:`}:${writingStyle}`;

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
  /**
   * Tabs for the default and the offered languages only: a stored language (or region, `de:at`) that is not offered
   * gets no tab; its texts stay in the value and in the payload. Default `false` (every stored language is a tab).
   */
  offeredOnly?: boolean;
  /**
   * The edited key is chosen per field, not per form: every tab carries `fieldKeys` (the language's keys in
   * `styleOrder`) and its `key` is the language in the first style; a field edits the first key with text in that
   * field (FORMAL, else INFORMAL when only that exists), see `translationFieldKey`. Default `false`.
   */
  editedKeyPerField?: boolean;
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
  if (!options.offeredOnly) {
    const extra = [...new Set(stored.map(translationLanguageOf))].filter(language => !languages.includes(language)).sort();
    languages.push(...extra);
  }

  return languages.map(language => {
    if (options.editedKeyPerField) {
      const isDefaultLanguage = language === translationLanguageOf(defaultLocale);
      const key = isDefaultLanguage ? defaultLocale : translationKeyOf(language, order[0] as WritingStyle);
      const fieldKeys = [key, ...order.map(style => translationKeyOf(language, style))].filter(
        (candidate, index, all) => all.indexOf(candidate) === index
      );
      for (const storedKey of stored.filter(candidate => translationLanguageOf(candidate) === language).sort(byRank)) {
        if (!fieldKeys.includes(storedKey)) fieldKeys.push(storedKey);
      }
      return { ...toTranslatableLocale(key), fieldKeys };
    }
    const storedKeys = stored.filter(key => translationLanguageOf(key) === language).sort(byRank);
    const offeredKeys = offered.filter(key => translationLanguageOf(key) === language).sort(byRank);
    const edited =
      language === translationLanguageOf(defaultLocale)
        ? defaultLocale
        : (storedKeys[0] ?? offeredKeys[0] ?? translationKeyOf(language, order[0] as WritingStyle));
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

export interface LocaleKeyTabsOptions {
  /** Tabs for the default and the offered keys only; stored keys beyond them stay in the value and the payload. */
  offeredOnly?: boolean;
}

/**
 * The tabs a form shows: every offered locale plus every key the loaded entity already has (so a stored
 * `de::INFORMAL` text is visible and editable, and never silently dropped), the default locale first, then the
 * offered order, then extra stored keys alphabetically. With `offeredOnly` the stored extra keys get no tab (they are
 * still kept and sent back).
 */
export const mergeLocaleKeys = (
  defaultLocale: string,
  offered: readonly string[],
  stored: readonly string[],
  options: LocaleKeyTabsOptions = {}
): TranslatableLocale[] => {
  const keys: string[] = [defaultLocale];
  for (const key of offered) if (!keys.includes(key)) keys.push(key);
  if (!options.offeredOnly) for (const key of [...stored].sort()) if (!keys.includes(key)) keys.push(key);
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

/** The default edit order of the writing styles of one language: FORMAL, else INFORMAL. */
export const DEFAULT_STYLE_ORDER: readonly WritingStyle[] = ['FORMAL', 'INFORMAL'];

const completeStyleOrder = (styleOrder: readonly WritingStyle[] = DEFAULT_STYLE_ORDER): WritingStyle[] => {
  const order = [...styleOrder];
  for (const style of DEFAULT_STYLE_ORDER) if (!order.includes(style)) order.push(style);
  return order;
};

/** The keys of one language in edit order: every style of `styleOrder`, then further stored keys of the language. */
const languageKeysOf = (language: string, store: Readonly<Record<string, string>>, order: readonly WritingStyle[]): string[] => {
  const keys = order.map(style => translationKeyOf(language, style));
  for (const key of Object.keys(store).sort()) if (translationLanguageOf(key) === language && !keys.includes(key)) keys.push(key);
  return keys;
};

/**
 * The key one language edits in a store: the first key of the language with non-blank text, in `styleOrder` (default
 * FORMAL, then INFORMAL), else the language in the first style (`de::FORMAL`).
 */
export const languageEditedKey = (
  store: Readonly<Record<string, string>>,
  language: string,
  styleOrder?: readonly WritingStyle[]
): string => {
  const order = completeStyleOrder(styleOrder);
  return languageKeysOf(language, store, order).find(key => (store[key] ?? '').trim() !== '') ?? translationKeyOf(language, order[0] as WritingStyle);
};

/**
 * One text per language from a field's full store (`{ 'de::INFORMAL': 'Hallo', 'en::FORMAL': 'Hello' }` →
 * `{ de: 'Hallo', en: 'Hello' }`): the text of each language's edited key (`languageEditedKey`). `languages`: the
 * languages to read (`de`, `de:at`; a full key counts as its language); default every language of the store. A
 * language without text maps to `''`.
 */
export const languageTextsOf = (
  store: Readonly<Record<string, string>>,
  languages?: readonly string[],
  styleOrder?: readonly WritingStyle[]
): Record<string, string> => {
  const wanted = languages ? languages.map(translationLanguageOf) : [...new Set(Object.keys(store).map(translationLanguageOf))];
  const texts: Record<string, string> = {};
  for (const language of wanted) texts[language] = store[languageEditedKey(store, language, styleOrder)] ?? '';
  return texts;
};

/**
 * A field's full store with one text per language written in (`texts`: language → text): each text goes to the
 * language's edited key (`languageEditedKey`), every other key stays as it is, and blank entries are dropped. A
 * language missing from `texts` is left untouched.
 */
export const storeWithLanguageTexts = (
  store: Readonly<Record<string, string>>,
  texts: Readonly<Record<string, string>>,
  styleOrder?: readonly WritingStyle[]
): Record<string, string> => {
  const next: Record<string, string> = { ...store };
  for (const [language, text] of Object.entries(texts)) next[languageEditedKey(store, translationLanguageOf(language), styleOrder)] = text;
  return Object.fromEntries(Object.entries(next).filter(([, text]) => text.trim() !== ''));
};

/**
 * The tabs of one-text-per-language editing (`TranslatableLanguageInput`): one tab per language, its `key` the
 * language in the first style and its `fieldKeys` every key of the language in `styleOrder`, so each field edits the
 * key that holds its text (`translationFieldKey`).
 */
export const languageFieldTabs = (languages: readonly string[], styleOrder?: readonly WritingStyle[]): TranslatableLocale[] => {
  const order = completeStyleOrder(styleOrder);
  const seen = new Set<string>();
  const tabs: TranslatableLocale[] = [];
  for (const language of languages.map(translationLanguageOf)) {
    if (seen.has(language)) continue;
    seen.add(language);
    const key = translationKeyOf(language, order[0] as WritingStyle);
    tabs.push({ ...toTranslatableLocale(key), fieldKeys: order.map(style => translationKeyOf(language, style)) });
  }
  return tabs;
};
