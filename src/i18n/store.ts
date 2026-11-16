// The package's one translation store (module state). It must exist exactly once in a host bundle:
// every entry imports it from here, and scripts/check-package.mjs fails when a second copy appears.

export type WritingStyle = 'FORMAL' | 'INFORMAL';

export interface TranslationsSnapshot {
  languageCode: string;
  writingStyle: WritingStyle;
  /** Key = `<text>` or `<text>__<context>` (see {@link translationKeyOf}). */
  translations: Readonly<Record<string, string>>;
}

export interface TranslateOptions {
  /** Disambiguates equal texts with different meanings. */
  context?: string;
  /** Replaces `%name%` placeholders. */
  replacements?: Readonly<Record<string, string | number>>;
}

let snapshot: TranslationsSnapshot = { languageCode: 'en', writingStyle: 'FORMAL', translations: {} };
const listeners = new Set<() => void>();

/** The store key of a text: the text itself, or `<text>__<context>`. */
export const translationKeyOf = (text: string, context?: string): string => (context ? `${text}__${context}` : text);

/** Replaces the active language and its translations; notifies every subscriber. */
export const setTranslations = (
  languageCode: string,
  writingStyle: WritingStyle,
  translations: Readonly<Record<string, string>>,
): void => {
  snapshot = { languageCode, writingStyle, translations };
  for (const listener of listeners) listener();
};

/** The current language, writing style and translations. Stable identity until the next {@link setTranslations}. */
export const getTranslationsSnapshot = (): TranslationsSnapshot => snapshot;

/** Subscribes to store changes; returns the unsubscribe function. */
export const subscribeTranslations = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Translates a text with the active translations; an untranslated text is returned as written. */
export const translateText = (text: string, options: TranslateOptions = {}): string => {
  const message = snapshot.translations[translationKeyOf(text, options.context)] ?? text;
  const replacements = options.replacements;
  if (!replacements) return message;
  return message.replace(/%([A-Za-z_]\w*)%/g, (match, name: string) =>
    name in replacements ? String(replacements[name]) : match,
  );
};
