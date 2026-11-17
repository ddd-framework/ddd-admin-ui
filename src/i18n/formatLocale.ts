'use client';

import { createContext, useContext } from 'react';

/**
 * The `Intl` locale date and number cells format in (`de-CH`, `en-US`), set by `AdminUiProvider.formatLocale`.
 * `undefined`: the UI language's locale (`getUiLocale()`).
 */
export const FormatLocaleContext = createContext<string | undefined>(undefined);

/** The provider's format locale, `undefined` without one (then blocks format in the UI language). */
export const useFormatLocale = (): string | undefined => useContext(FormatLocaleContext);
