'use client';

import type { PropertyTranslations, WritingStyle } from '@mgamadeus/ddd-web/contract';
import { useMemo, useRef } from 'react';

import {
  DEFAULT_STYLE_ORDER,
  languageFieldTabs,
  languagesOfStore,
  languageTextsOf,
  storeWithLanguageTexts,
  translationKeyOf,
  translationLanguageOf,
} from '../logic/pure/locales.ts';
import type { TranslatableLocale } from '../logic/pure/locales.ts';
import type { TranslatableChangeMeta, TranslatableChangeReason, TranslatableFieldBaseProps } from './TranslatableField.tsx';
import { TranslatableInput, type TranslatableInputProps } from './TranslatableInput.tsx';
import { TranslatableMarkdown, type TranslatableMarkdownProps } from './TranslatableMarkdown.tsx';

/** What `TranslatableLanguageInput` reports on every edit. */
export interface LanguageTextsChange {
  /**
   * One text per language (`de`, `en`): the text each language's edited key holds now, for every offered language and
   * every language of the store (a cleared language maps to `''`). A text is reported as typed (a leading space too).
   */
  texts: Record<string, string>;
  /** The field's full store (every `locale::style` key, blank entries dropped): what goes back to the server. */
  store: PropertyTranslations;
  /**
   * Why it changed: typing (`edit`), "Clear all" (`clear-all`), "Clear other languages" (`clear-others`). Always set by
   * the input (optional in the type for objects a host builds itself).
   */
  reason?: TranslatableChangeReason;
}

/** The props of one-text-per-language editing, shared by the input and the markdown variant. */
export interface LanguageTextsBindingProps {
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

export interface TranslatableLanguageInputProps
  extends Omit<TranslatableInputProps, 'value' | 'onChange' | 'locales' | 'activeLocale' | 'onActiveLocaleChange'>,
    LanguageTextsBindingProps {}

export interface TranslatableLanguageMarkdownProps
  extends Omit<TranslatableMarkdownProps, 'value' | 'onChange' | 'locales' | 'activeLocale' | 'onActiveLocaleChange'>,
    LanguageTextsBindingProps {}

type BoundFieldProps = Pick<TranslatableFieldBaseProps, 'value' | 'onChange' | 'locales' | 'activeLocale' | 'onActiveLocaleChange'>;

/**
 * The binding of one text per language to a translatable field: the tabs (one per language), the field value (the
 * store with the texts written in, blank texts kept so they stay typable) and the change handler (`{ texts, store,
 * reason }`, blank entries dropped from `store` only). A language keeps the key it was typed in while mounted.
 */
const useLanguageTextsBinding = ({
  texts,
  store,
  onChange,
  languages,
  activeLanguage,
  onActiveLanguageChange,
  styleOrder = DEFAULT_STYLE_ORDER,
}: LanguageTextsBindingProps): BoundFieldProps => {
  const styleSignature = styleOrder.join('|');
  const languageSignature = languages.join('|');
  // the key a language was typed in: it stays that language's key while mounted (no FORMAL → INFORMAL switch)
  const editedKeys = useRef<Record<string, string>>({});
  // biome-ignore lint/correctness/useExhaustiveDependencies: the signatures stand for the (often inline) arrays
  const tabs = useMemo<TranslatableLocale[]>(() => languageFieldTabs(languages, styleOrder), [languageSignature, styleSignature]);
  const value = storeWithLanguageTexts(store ?? {}, texts, styleOrder, { editedKeys: editedKeys.current, keepBlank: true });
  const activeTab = tabs.find(tab => translationLanguageOf(tab.key) === translationLanguageOf(activeLanguage));
  return {
    value,
    onChange: (next: PropertyTranslations, meta?: TranslatableChangeMeta) => {
      const reason = meta?.reason ?? 'edit';
      if (reason === 'edit') {
        for (const key of Object.keys(next)) if (next[key] !== value[key]) editedKeys.current[translationLanguageOf(key)] = key;
      }
      const nextStore = Object.fromEntries(Object.entries(next).filter(([, text]) => text.trim() !== ''));
      const named = [
        ...new Set([
          ...languages.map(translationLanguageOf),
          ...languagesOfStore(store ?? {}),
          ...Object.keys(texts).map(translationLanguageOf),
          ...languagesOfStore(next),
        ]),
      ];
      onChange({ texts: languageTextsOf(next, named, styleOrder, { editedKeys: editedKeys.current }), store: nextStore, reason });
    },
    locales: tabs,
    activeLocale: activeTab?.key ?? translationKeyOf(translationLanguageOf(activeLanguage), styleOrder[0] ?? 'FORMAL'),
    onActiveLocaleChange: key => onActiveLanguageChange(translationLanguageOf(key)),
  };
};

/**
 * `TranslatableInput` for call sites that keep one text per language plus the field's full store: one tab per offered
 * language, each editing the key that holds the field's text (FORMAL, else INFORMAL when only that exists; a language
 * without text starts in the first style; once typed in, a language keeps that key while mounted). Every edit reports
 * both shapes and the reason (`{ texts, store, reason }`); stored keys the tab does not edit (another style, a language
 * not offered) stay in the store.
 */
export const TranslatableLanguageInput = ({
  texts,
  store,
  onChange,
  languages,
  activeLanguage,
  onActiveLanguageChange,
  styleOrder,
  ...inputProps
}: TranslatableLanguageInputProps) => {
  const bound = useLanguageTextsBinding({ texts, store, onChange, languages, activeLanguage, onActiveLanguageChange, styleOrder });
  return <TranslatableInput {...inputProps} {...bound} />;
};

/** `TranslatableMarkdown` with one text per language plus the store: the same tabs and reports as `TranslatableLanguageInput`. */
export const TranslatableLanguageMarkdown = ({
  texts,
  store,
  onChange,
  languages,
  activeLanguage,
  onActiveLanguageChange,
  styleOrder,
  ...markdownProps
}: TranslatableLanguageMarkdownProps) => {
  const bound = useLanguageTextsBinding({ texts, store, onChange, languages, activeLanguage, onActiveLanguageChange, styleOrder });
  return <TranslatableMarkdown {...markdownProps} {...bound} />;
};
