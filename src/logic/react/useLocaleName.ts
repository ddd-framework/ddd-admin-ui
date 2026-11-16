'use client';

import { useCallback } from 'react';

import { useTranslate } from '../../i18n/useTranslate.ts';
import { localeDisplayName } from '../pure/locales.ts';

/** `nameOf(key)`: the spelled-out language of a translation key (`de::FORMAL` → "Deutsch") in the UI language. */
export const useLocaleName = (): ((key: string) => string) => {
  const { t, languageCode } = useTranslate();
  return useCallback(
    (key: string) => localeDisplayName(key, languageCode, t('Informal', { context: 'writing-style' })),
    [t, languageCode]
  );
};
