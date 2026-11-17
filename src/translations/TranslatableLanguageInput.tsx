'use client';

import type { PropertyTranslations, WritingStyle } from '@mgamadeus/ddd-web/contract';
import { useMemo } from 'react';

import {
  languageFieldTabs,
  languageTextsOf,
  storeWithLanguageTexts,
  translationKeyOf,
  translationLanguageOf,
  DEFAULT_STYLE_ORDER,
} from '../logic/pure/locales.ts';
import { TranslatableInput, type TranslatableInputProps } from './TranslatableInput.tsx';

/** What `TranslatableLanguageInput` reports on every edit. */
export interface LanguageTextsChange {
  /** One text per language (`de`, `en`): the text each language's edited key holds now. */
  texts: Record<string, string>;
  /** The field's full store (every `locale::style` key, blank entries dropped): what goes back to the server. */
  store: PropertyTranslations;
}

export interface TranslatableLanguageInputProps
  extends Omit<TranslatableInputProps, 'value' | 'onChange' | 'locales' | 'activeLocale' | 'onActiveLocaleChange'> {
  /** One text per language (`{ de: 'Hallo', en: 'Hello' }`); wins over the store for the language's edited key. */
  texts: Readonly<Record<string, string>>;
  /** The field's full store (`{ 'de::INFORMAL': 'Hallo' }`): keys the texts do not touch are kept. Optional. */
  store?: Readonly<PropertyTranslations>;
  onChange: (change: LanguageTextsChange) => void;
  /** The languages offered as tabs, in order (`de`, `en`, `de:at`; a full key counts as its language). */
  languages: readonly string[];
  /** The language of the active tab (`de`); usually form-wide. */
  activeLanguage: string;
  onActiveLanguageChange: (language: string) => void;
  /** Which style a language edits when it has several, in order (default FORMAL, then INFORMAL). */
  styleOrder?: readonly WritingStyle[];
}

/**
 * `TranslatableInput` for call sites that keep one text per language plus the field's full store: one tab per offered
 * language, each editing the key that holds the field's text (FORMAL, else INFORMAL when only that exists; a language
 * without text starts in the first style). Every edit reports both shapes (`{ texts, store }`); stored keys the tab
 * does not edit (another style, a language not offered) stay in the store.
 */
export const TranslatableLanguageInput = ({
  texts,
  store,
  onChange,
  languages,
  activeLanguage,
  onActiveLanguageChange,
  styleOrder = DEFAULT_STYLE_ORDER,
  ...inputProps
}: TranslatableLanguageInputProps) => {
  const styleSignature = styleOrder.join('|');
  const languageSignature = languages.join('|');
  // biome-ignore lint/correctness/useExhaustiveDependencies: the signatures stand for the (often inline) arrays
  const tabs = useMemo(() => languageFieldTabs(languages, styleOrder), [languageSignature, styleSignature]);
  const value = useMemo(() => storeWithLanguageTexts(store ?? {}, texts, styleOrder), [store, texts, styleOrder]);
  const activeTab = tabs.find(tab => translationLanguageOf(tab.key) === translationLanguageOf(activeLanguage));
  return (
    <TranslatableInput
      {...inputProps}
      value={value}
      onChange={next => {
        const nextStore = storeWithLanguageTexts(next, {}, styleOrder);
        onChange({ texts: languageTextsOf(nextStore, languages, styleOrder), store: nextStore });
      }}
      locales={tabs}
      activeLocale={activeTab?.key ?? translationKeyOf(translationLanguageOf(activeLanguage), styleOrder[0] ?? 'FORMAL')}
      onActiveLocaleChange={key => onActiveLanguageChange(translationLanguageOf(key))}
    />
  );
};
