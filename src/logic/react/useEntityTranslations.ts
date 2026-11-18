'use client';

import type { TranslationInfos, TranslationsStore } from '@mgamadeus/ddd-web/contract';
import { useCallback, useMemo, useRef, useState } from 'react';

import type { WritingStyle } from '@mgamadeus/ddd-web/contract';

import { mergeLanguageTabs, mergeLocaleKeys, type TranslatableLocale, translationLanguageOf } from '../pure/locales.ts';
import {
  blankTranslations,
  buildTranslationInfos,
  type FieldTranslations,
  hydrateTranslations,
  mergeTranslatedStore,
  translationsChanged,
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
  /**
   * `key` (default): one tab per full `locale::style` key. `language`: one tab per language, each editing one key
   * chosen deterministically (`mergeLanguageTabs`: the default locale for its language, else a stored key before an
   * offered one, in `styleOrder`) and named on the tab when it is not FORMAL; the language's other keys stay in the
   * value and go back in the payload. Either way every loaded key is sent back and a cleared text removes only its key.
   */
  tabModel?: 'key' | 'language';
  /** Tab model `language`: the writing style a language tab edits first (default: the default locale's, then FORMAL). */
  styleOrder?: readonly WritingStyle[];
  /**
   * The tab the form opens on when it is offered: a full key or a language (`de`, the editor's UI language); else the
   * default locale.
   */
  initialLocale?: string;
  /**
   * Tabs for the default and the offered locales only (default `false`): a stored key, region or language that is not
   * offered gets no tab. Its texts are still hydrated, kept in the value and sent back in the payload.
   */
  offeredTabsOnly?: boolean;
  /**
   * Tab model `language`: the edited key is chosen per field, not per form (default `false`). Each tab carries
   * `fieldKeys`; a field edits the first key of the language with text in that field in `styleOrder` (FORMAL, else
   * INFORMAL when only that exists), so one form can edit `de::INFORMAL` in one field and `de::FORMAL` in the next.
   */
  editedKeyPerField?: boolean;
  /**
   * The active tab, controlled (a full key or a language, resolved like `initialLocale`): the host keeps it (in the
   * URL, shared across forms) and `setActiveLocale` calls `onActiveLocaleChange` instead of keeping its own state.
   */
  activeLocale?: string | null;
  /** Called with the chosen tab's key (with or without a controlled `activeLocale`). */
  onActiveLocaleChange?: (key: string) => void;
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
  /**
   * `buildPayload`, or `undefined` when no non-blank text differs from the last `hydrate` (blank maps before one): a
   * partial update leaves `translationInfos` out when nothing changed.
   */
  buildChangedPayload: (translations: FieldTranslations<F>) => TranslationInfos | undefined;
  /** Merges translated texts (an AI result) into `current`, filling blank entries only, skipping blank incoming texts (pure; `setValue` it). */
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
  tabModel = 'key',
  styleOrder,
  initialLocale,
  offeredTabsOnly = false,
  editedKeyPerField = false,
  activeLocale: controlledLocale,
  onActiveLocaleChange,
}: UseEntityTranslationsOptions<F>): UseEntityTranslationsReturn<F> => {
  /** Store entries of translatable properties this form does not edit: sent back unchanged. */
  const passthroughRef = useRef<TranslationsStore>({});
  /** The texts of the last hydration (`buildChangedPayload` compares against them). */
  const hydratedRef = useRef<FieldTranslations<F> | null>(null);
  const [storedKeys, setStoredKeys] = useState<string[]>([]);
  const [ownLocale, setOwnLocale] = useState<string | null>(null);
  const controlled = controlledLocale !== undefined;
  const selectedLocale = controlled ? controlledLocale : ownLocale;
  const onActiveLocaleChangeRef = useRef(onActiveLocaleChange);
  onActiveLocaleChangeRef.current = onActiveLocaleChange;
  const setActiveLocale = useCallback(
    (key: string) => {
      if (!controlled) setOwnLocale(key);
      onActiveLocaleChangeRef.current?.(key);
    },
    [controlled]
  );

  const styleSignature = styleOrder?.join('|') ?? '';
  // biome-ignore lint/correctness/useExhaustiveDependencies: styleSignature stands for styleOrder (an inline array)
  const locales = useMemo(
    () =>
      tabModel === 'language'
        ? mergeLanguageTabs(defaultLocale, offeredLocales, storedKeys, { styleOrder, offeredOnly: offeredTabsOnly, editedKeyPerField })
        : mergeLocaleKeys(defaultLocale, offeredLocales, storedKeys, { offeredOnly: offeredTabsOnly }),
    [tabModel, defaultLocale, offeredLocales, storedKeys, styleSignature, offeredTabsOnly, editedKeyPerField]
  );
  /** The tab of a key or a language: the exact key, else (tab model `language`) the tab of its language. */
  const tabOf = (wanted: string | null | undefined) => {
    if (!wanted) return undefined;
    const exact = locales.find(locale => locale.key === wanted);
    if (exact) return exact.key;
    const language = wanted.includes(':') ? translationLanguageOf(wanted) : wanted;
    return tabModel === 'language' ? locales.find(locale => translationLanguageOf(locale.key) === language)?.key : undefined;
  };
  const activeLocale = tabOf(selectedLocale) ?? tabOf(initialLocale) ?? tabOf(defaultLocale) ?? defaultLocale;

  const empty = useCallback(() => blankTranslations(fields), [fields]);

  const hydrate = useCallback(
    (entity: unknown) => {
      const hydrated = hydrateTranslations(entity, fields, defaultLocale);
      passthroughRef.current = hydrated.passthrough;
      hydratedRef.current = hydrated.translations;
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

  const buildChangedPayload = useCallback(
    (translations: FieldTranslations<F>) =>
      translationsChanged(translations, hydratedRef.current ?? blankTranslations(fields), fields)
        ? buildTranslationInfos(translations, passthroughRef.current, fields, defaultLocale)
        : undefined,
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
    buildChangedPayload,
    mergeTranslated,
    defaultValue,
    hasContent,
  };
};
