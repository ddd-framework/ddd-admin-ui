import { translateText, type TranslateOptions } from './store.ts';

/**
 * Translates a text outside React: server components, `export const metadata`, schemas, event handlers.
 * Same lookup as {@link translateText}; the name marks the call for the translation-key manifest.
 */
export const m = (text: string, options?: TranslateOptions): string => translateText(text, options);
