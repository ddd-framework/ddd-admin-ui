'use client';

import { useMemo } from 'react';

import type { AdminLocale } from './adminTypes.ts';
import type { TranslationsApi } from './api.ts';
import { CONTENT_LOCALES_ARG } from './appTranslationsList.ts';

/** The content locale keys of active locales: one `<languageCode>::<style>` per language, in the order given. */
export const toContentLocaleKeys = (locales: readonly AdminLocale[], writingStyle: 'FORMAL' | 'INFORMAL'): string[] => {
  const keys: string[] = [];
  for (const locale of locales) {
    const key = locale.languageCode ? `${locale.languageCode}::${writingStyle}` : null;
    if (key && !keys.includes(key)) keys.push(key);
  }
  return keys;
};

export interface UseContentLocalesOptions {
  /** Used while the list loads, when it fails or when no locale is active (e.g. `['en::FORMAL', 'de::FORMAL']`). */
  fallback?: readonly string[];
  /** The writing style of the keys (default `FORMAL`). */
  writingStyle?: 'FORMAL' | 'INFORMAL';
}

const NO_LOCALES: readonly string[] = [];

/**
 * The content locales an entity form offers, as full keys (`de::FORMAL`), loaded from the active locales
 * (`GET …/locales/list`). Stored keys beyond these (`de::INFORMAL`) are added by `useEntityTranslations` from the
 * loaded entity.
 */
export const useContentLocales = (api: TranslationsApi, { fallback = NO_LOCALES, writingStyle = 'FORMAL' }: UseContentLocalesOptions = {}): readonly string[] => {
  const { data } = api.useLocalesQuery(CONTENT_LOCALES_ARG);
  const elements = data?.locales.elements;
  return useMemo(() => {
    const keys = toContentLocaleKeys(elements ?? [], writingStyle);
    return keys.length > 0 ? keys : fallback;
  }, [elements, writingStyle, fallback]);
};

const NO_LOCALE_ROWS: readonly AdminLocale[] = [];

/**
 * The active locales as rows (`id`, `languageCode`, `countryShortCode`), from the same request and cache entry as
 * `useContentLocales`: a form that needs both asks once. Empty while loading or after a failure.
 */
export const useActiveLocales = (api: TranslationsApi): readonly AdminLocale[] => api.useLocalesQuery(CONTENT_LOCALES_ARG).data?.locales.elements ?? NO_LOCALE_ROWS;
