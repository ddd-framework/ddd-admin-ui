import {
  normalizeTranslationsStore,
  type PropertyTranslations,
  parseTranslationKey,
  type TranslationInfos,
  type TranslationsStore,
} from '@mgamadeus/ddd-web/contract';

/**
 * The pure half of `useEntityTranslations` (no React): hydration, payload and merge of a translations store, keyed
 * by the FULL `locale::style` key throughout. Kept separate so the lossless round trip can be checked without a DOM.
 */

export const TRANSLATION_INFOS_OBJECT_TYPE = 'DDD\\Domain\\Base\\Entities\\Translatable\\TranslationInfos';

export type FieldTranslations<F extends string> = Record<F, PropertyTranslations>;

export interface HydratedTranslations<F extends string> {
  translations: FieldTranslations<F>;
  /** Store entries of translatable properties outside `fields`: sent back unchanged. */
  passthrough: TranslationsStore;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const blankTranslations = <F extends string>(fields: readonly F[]): FieldTranslations<F> => {
  const out = {} as FieldTranslations<F>;
  for (const field of fields) out[field] = {};
  return out;
};

export const nonBlankEntries = (map: PropertyTranslations): PropertyTranslations =>
  Object.fromEntries(Object.entries(map).filter(([, text]) => text.trim() !== ''));

/**
 * Reads an entity as loaded: every `field × locale::style` of its store, untouched (collapsing keys to the language
 * with `split('::')[0]` would drop the style variants). A field with an empty store falls back to the plain property under the default
 * locale (legacy rows that never had translations), so its text is not cleared by the next save.
 */
export const hydrateTranslations = <F extends string>(
  entity: unknown,
  fields: readonly F[],
  defaultLocale: string
): HydratedTranslations<F> => {
  const record = isRecord(entity) ? entity : {};
  const infos = isRecord(record.translationInfos) ? record.translationInfos : {};
  const store = normalizeTranslationsStore(infos.translationsStore);

  const translations = blankTranslations(fields);
  for (const field of fields) {
    const stored = store[field] ?? {};
    if (Object.keys(stored).length > 0) {
      translations[field] = { ...stored };
    } else {
      const plain = record[field];
      translations[field] = typeof plain === 'string' && plain !== '' ? { [defaultLocale]: plain } : {};
    }
  }
  const passthrough: TranslationsStore = {};
  for (const [property, map] of Object.entries(store)) {
    if (!(fields as readonly string[]).includes(property)) passthrough[property] = map;
  }
  return { translations, passthrough };
};

/**
 * The `translationInfos` of a save: the passthrough store plus every non-blank `field × locale::style` the state
 * holds (blank = cleared by the user). Meta: current and default language/style from
 * the default locale, `replaceExistingTranslations: true`. `availableTranslations` is left out (server-computed).
 */
export const buildTranslationInfos = <F extends string>(
  translations: FieldTranslations<F>,
  passthrough: TranslationsStore,
  fields: readonly F[],
  defaultLocale: string
): TranslationInfos => {
  const store: TranslationsStore = { ...passthrough };
  for (const field of fields) {
    const entries = nonBlankEntries(translations[field] ?? {});
    if (Object.keys(entries).length > 0) store[field] = entries;
    else delete store[field];
  }
  const parts = parseTranslationKey(defaultLocale);
  const languageCode = parts?.languageCode ?? defaultLocale;
  const writingStyle = parts?.writingStyle ?? 'FORMAL';
  return {
    objectType: TRANSLATION_INFOS_OBJECT_TYPE,
    translationsStore: store,
    currentLanguageCode: languageCode,
    currentWritingStyle: writingStyle,
    defaultLanguageCode: languageCode,
    defaultWritingStyle: writingStyle,
    hasTranslationForCurrentLanguageCode: true,
    hasTranslationForCurrentCountryCode: false,
    hasTranslationForCurrentWritingStyle: true,
    replaceExistingTranslations: true,
  };
};

/** Merges translated texts into the state, filling only blank entries (never what the user typed meanwhile). */
export const mergeTranslatedStore = <F extends string>(
  previous: FieldTranslations<F>,
  store: TranslationsStore,
  fields: readonly F[]
): FieldTranslations<F> => {
  const next = { ...previous };
  for (const field of fields) {
    const incoming = store[field];
    if (!incoming) continue;
    const merged: PropertyTranslations = { ...(previous[field] ?? {}) };
    for (const [key, text] of Object.entries(incoming)) {
      if (!(merged[key] ?? '').trim()) merged[key] = text;
    }
    next[field] = merged;
  }
  return next;
};
