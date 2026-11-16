'use client';

// @translations-ignore-file — the doc examples below are not UI texts

import { useCallback, useSyncExternalStore } from 'react';

import { getTranslationState, subscribeTranslations, type TranslateOptions, translateText } from './store.ts';

export type TranslateFn = (text: string, options?: TranslateOptions) => string;

const serverState = () => getTranslationState();

/**
 * `t()` bound to the active language; the component re-renders when the language or its bundle changes.
 *
 * @example
 * const { t } = useTranslate();
 * t('Save changes');
 * t('Open', { context: 'ticket-status' });
 * t('%count% winners', { count: total });            // or an ICU plural message
 * t('Hello %name%', { replacements: { name } });
 */
export const useTranslate = (): { t: TranslateFn; languageCode: string } => {
  const translationState = useSyncExternalStore(subscribeTranslations, getTranslationState, serverState);
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new bundle (version) must give a new t()
  const t = useCallback<TranslateFn>((text, options) => translateText(text, options), [translationState.version]);
  return { t, languageCode: translationState.languageCode };
};
