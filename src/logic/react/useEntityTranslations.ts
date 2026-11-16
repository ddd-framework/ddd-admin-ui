'use client';

import type { TranslationInfos, TranslationsStore } from '@mgamadeus/ddd-web/contract';
import { useCallback, useMemo, useRef, useState } from 'react';

import { mergeLocaleKeys, type TranslatableLocale } from '../pure/locales.ts';
import {
  blankTranslations,
  buildTranslationInfos,
  type FieldTranslations,
  hydrateTranslations,
  mergeTranslatedStore,
} from '../pure/translationState.ts';

export interface UseEntityTranslationsOptions<F extends string> {
  /** The `#[Translatable]` properties this form edits: a module-level `as const` tuple (stable identity). */
  fields: readonly F[];
  /** Content locales offered as tabs (full keys, e.g. `en::FORMAL`), from the app's locale adapter; memoised. */
  locales: readonly string[];
  /**
   * The locale new text starts in and the plain property mirrors (the app's default content locale, e.g.
   * `en::FORMAL`). Also written as `default/currentLanguageCode` + `…WritingStyle` into the payload.
   */
  defaultLocale: string;
}

/** The tab state every translatable field of one form shares (pass it to `FormTranslatableInput`). */
export interface TranslationTabs {
  /** Tabs: offered locales ∪ keys the loaded entity has, default first. */
  locales: TranslatableLocale[];
  /** The tab every translatable input of this form shows (one selection per form). */
  activeLocale: string;
  setActiveLocale: (key: string) => void;
}

export interface UseEntityTranslationsReturn<F extends string> extends TranslationTabs {
  defaultLocale: string;
  fields: readonly F[];
  /** Blank maps for every field: the `translations` value of a create form's `defaultValues`. */
  empty: () => FieldTranslations<F>;
  /**
   * The edit form's hydration, inside its `reset` effect: `reset({ …, translations: hydrate(entity) })`. Keeps every
   * `field × locale::style` the entity has (a field with an empty store falls back to the plain property under the
   * default locale), remembers the store of the fields this form does not edit, and adds the stored keys as tabs.
   */
  hydrate: (entity: unknown) => FieldTranslations<F>;
  /**
   * The `translationInfos` of the save, from the form's `translations` value: every non-blank `field × locale::style`
   * plus the remembered store of other fields, so `replaceExistingTranslations: true` deletes nothing the user did
   * not clear.
   */
  buildPayload: (translations: FieldTranslations<F>) => TranslationInfos;
  /** Merges translated texts (an AI result) into `current`, filling blank entries only (pure; `setValue` it). */
  mergeTranslated: (current: FieldTranslations<F>, store: TranslationsStore) => FieldTranslations<F>;
  /** A field's text in the default locale (the plain property's value). */
  defaultValue: (translations: FieldTranslations<F>, field: F) => string;
  /** Whether any locale of the field has non-blank text. */
  hasContent: (translations: FieldTranslations<F>, field: F) => boolean;
}

/**
 * Locale tabs, hydration and payload of a form's translatable fields on react-hook-form, without a key collapse:
 * mapping stored keys to the language (`split('::')[0]`) and writing back only `<lang>::FORMAL` with
 * `replaceExistingTranslations: true` would delete every `INFORMAL` text. Here the texts are an RHF value (`translations: { [field]: { 'locale::style': text } }`, edited by
 * `FormTranslatableInput`), keyed by the full key end to end; dirty state, touched and validation are RHF's.
 *
 * The locale list and the default locale come from the app (adapter); AI translation is a separate, optional slot
 * (`useTranslationRunner` + `mergeTranslated`).
 */
export const useEntityTranslations = <F extends string>({
  fields,
  locales: offeredLocales,
  defaultLocale,
}: UseEntityTranslationsOptions<F>): UseEntityTranslationsReturn<F> => {
  /** Store entries of translatable properties this form does not edit: sent back unchanged. */
  const passthroughRef = useRef<TranslationsStore>({});
  const [storedKeys, setStoredKeys] = useState<string[]>([]);
  const [selectedLocale, setActiveLocale] = useState<string | null>(null);

  const locales = useMemo(
    () => mergeLocaleKeys(defaultLocale, offeredLocales, storedKeys),
    [defaultLocale, offeredLocales, storedKeys]
  );
  const activeLocale =
    selectedLocale && locales.some(locale => locale.key === selectedLocale) ? selectedLocale : defaultLocale;

  const empty = useCallback(() => blankTranslations(fields), [fields]);

  const hydrate = useCallback(
    (entity: unknown) => {
      const hydrated = hydrateTranslations(entity, fields, defaultLocale);
      passthroughRef.current = hydrated.passthrough;
      const keys = new Set<string>();
      for (const field of fields) for (const key of Object.keys(hydrated.translations[field])) keys.add(key);
      setStoredKeys([...keys]);
      return hydrated.translations;
    },
    [fields, defaultLocale]
  );

  const buildPayload = useCallback(
    (translations: FieldTranslations<F>) =>
      buildTranslationInfos(translations, passthroughRef.current, fields, defaultLocale),
    [fields, defaultLocale]
  );

  const mergeTranslated = useCallback(
    (current: FieldTranslations<F>, store: TranslationsStore) => mergeTranslatedStore(current, store, fields),
    [fields]
  );

  const defaultValue = useCallback(
    (translations: FieldTranslations<F>, field: F) => translations[field]?.[defaultLocale] ?? '',
    [defaultLocale]
  );

  const hasContent = useCallback(
    (translations: FieldTranslations<F>, field: F) =>
      Object.values(translations[field] ?? {}).some(text => text.trim() !== ''),
    []
  );

  return {
    defaultLocale,
    fields,
    locales,
    activeLocale,
    setActiveLocale,
    empty,
    hydrate,
    buildPayload,
    mergeTranslated,
    defaultValue,
    hasContent,
  };
};
