// @translations-ignore-file — the doc examples below are not UI texts

import { formatIcuPlural } from './plural.ts';

/**
 * UI text store: the key is the English text, an ambiguous word adds a
 * context (`Open` + `bill-status` → key `Open__bill-status`). The bundle of the active language is a flat map
 * `key → text`; a key without a translation shows its English text. Module state with subscribers, so `useTranslate`
 * re-renders on a language or bundle change.
 */

export type WritingStyle = 'FORMAL' | 'INFORMAL';

export interface TranslateOptions {
  /** Disambiguates a short word (`Open` as a status vs. as an action); the key becomes `<text>__<context>`. */
  context?: string;
  /** Selects the branch of an ICU plural message and fills `#` and `%count%`. */
  count?: number;
  /** Values for `%name%` placeholders. */
  replacements?: Record<string, string | number>;
}

/** A translate function (`useTranslate().t`, `translateText`): the English text (plus options) → the shown text. */
export type TranslateFn = (text: string, options?: TranslateOptions) => string;

interface TranslationState {
  languageCode: string;
  writingStyle: WritingStyle;
  translations: Readonly<Record<string, string>>;
  version: number;
}

let state: TranslationState = { languageCode: 'en', writingStyle: 'FORMAL', translations: {}, version: 0 };
const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) listener();
};

export const subscribeTranslations = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getTranslationState = (): TranslationState => state;

/** Replaces the active bundle (the loader calls it once the language's map arrived; English = empty map). */
export const setTranslations = (
  languageCode: string,
  writingStyle: WritingStyle,
  translations: Readonly<Record<string, string>>
): void => {
  state = { languageCode, writingStyle, translations, version: state.version + 1 };
  emit();
};

/** The store key of a text with its optional context. */
export const translationKeyOf = (text: string, context?: string): string => (context ? `${text}__${context}` : text);

const applyReplacements = (message: string, replacements: Record<string, string | number>): string =>
  message.replace(/%([A-Za-z_][\w]*)%/g, (match, name: string) =>
    name in replacements ? String(replacements[name]) : match
  );

/** Translates `text` in the active language (English text when no translation exists). */
export const translateText = (text: string, options: TranslateOptions = {}): string => {
  const { context, count, replacements } = options;
  let message = state.translations[translationKeyOf(text, context)] ?? text;
  if (typeof count === 'number') {
    message = formatIcuPlural(message, count, state.languageCode);
  }
  const values = typeof count === 'number' ? { count, ...replacements } : replacements;
  return values ? applyReplacements(message, values) : message;
};

/** Options of the `m()` marker: what text exports read next to the text. */
export interface MarkOptions {
  /** The translation context the text is rendered with (key `<text>__<context>`). */
  context?: string;
}

/**
 * Marks an English UI text that is defined outside a component (status maps, column definitions, option lists) for
 * the key export, unchanged. The component that renders it translates it with `t(value)`, or with
 * `t(value, { context })` for a text marked `m('Failed', { context: 'import-status' })`. The marker returns the text
 * only: the context reaches the renderer separately (e.g. `StatusDefinition.context`). Text exports read the text and
 * the context as literals, so write both as string literals.
 */
export const m = <TText extends string>(text: TText, _options?: MarkOptions): TText => text;
