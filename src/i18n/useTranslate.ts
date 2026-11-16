'use client';

import { useCallback, useSyncExternalStore } from 'react';
import {
  getTranslationsSnapshot,
  subscribeTranslations,
  translateText,
  type TranslateOptions,
  type WritingStyle,
} from './store.ts';

export interface UseTranslateResult {
  t: (text: string, options?: TranslateOptions) => string;
  languageCode: string;
  writingStyle: WritingStyle;
}

/** Re-renders when the active language or its translations change. */
export const useTranslate = (): UseTranslateResult => {
  const snapshot = useSyncExternalStore(subscribeTranslations, getTranslationsSnapshot, getTranslationsSnapshot);
  // `snapshot` is a dependency on purpose: a new snapshot must give a new `t`.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const t = useCallback((text: string, options?: TranslateOptions) => translateText(text, options), [snapshot]);
  return { t, languageCode: snapshot.languageCode, writingStyle: snapshot.writingStyle };
};
