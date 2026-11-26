'use client';

import { useEffect, useState } from 'react';

/**
 * `value`, settled for `delayMs` (list filters debounce 350 ms before they reach the query). With `isImmediate` the
 * value passes at once: a change nobody typed (the URL changed from outside) has nothing to wait for.
 */
export const useDebouncedValue = <T,>(value: T, delayMs = 350, isImmediate = false): T => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    if (isImmediate) {
      // kept in step, so the next typed change starts from this value and not from the one before it
      setDebounced(value);
      return;
    }
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs, isImmediate]);
  return isImmediate ? value : debounced;
};
