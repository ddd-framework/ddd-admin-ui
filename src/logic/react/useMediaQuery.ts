'use client';

import { useCallback, useSyncExternalStore } from 'react';

/** Min-width queries of the Tailwind breakpoints the blocks switch at. */
export const BREAKPOINT_QUERIES = {
  sm: '(min-width: 40rem)',
  md: '(min-width: 48rem)',
  lg: '(min-width: 64rem)',
  xl: '(min-width: 80rem)',
} as const;

export type BreakpointName = keyof typeof BREAKPOINT_QUERIES;

/**
 * Whether a media query matches, kept current. The server render and the hydration render answer `false` (no window);
 * the real answer follows right after hydration, so markup that depends on it must look acceptable either way.
 */
export const useMediaQuery = (query: string): boolean => {
  const subscribe = useCallback(
    (notify: () => void) => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
      const list = window.matchMedia(query);
      list.addEventListener('change', notify);
      return () => list.removeEventListener('change', notify);
    },
    [query]
  );
  return useSyncExternalStore(
    subscribe,
    () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches,
    () => false
  );
};
