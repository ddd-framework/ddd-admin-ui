'use client';

import { createContext, useContext } from 'react';

import type { TextLimits } from '../pure/textLimits.ts';

/**
 * The host's default length limits of text fields by kind (`AdminUiProvider.textLimits`); a field's own `maxLength`
 * wins. Empty: no limit.
 */
export const TextLimitsContext = createContext<TextLimits>({});

export const useTextLimits = (): TextLimits => useContext(TextLimitsContext);
