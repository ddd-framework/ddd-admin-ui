'use client';

import { buildFieldFilter } from '@mgamadeus/ddd-web/query';
import { useMemo } from 'react';

import type { AdminLocale, TranslationsListArg } from './adminTypes.ts';
import type { TranslationsApi } from './api.ts';

const ACTIVE_LOCALES_ARG: TranslationsListArg = {
  select: 'id,languageCode,countryShortCode,isActive',
  filters: buildFieldFilter('isActive', '1'),
  top: 500,
};

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
  const { data } = api.useLocalesQuery(ACTIVE_LOCALES_ARG);
  const elements = data?.locales.elements;
  return useMemo(() => {
    const keys = toContentLocaleKeys(elements ?? [], writingStyle);
    return keys.length > 0 ? keys : fallback;
  }, [elements, writingStyle, fallback]);
};
