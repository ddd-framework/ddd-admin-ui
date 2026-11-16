'use client';

import { useEffect, useState } from 'react';

/** `value`, settled for `delayMs` (list filters debounce 350 ms before they reach the query). */
export const useDebouncedValue = <T,>(value: T, delayMs = 350): T => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
};
