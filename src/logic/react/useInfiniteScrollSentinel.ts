'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * Ref callback for an element at the end of a list: calls `onReach` whenever it scrolls into view (with a generous
 * `rootMargin`, so the next page is requested before the user hits the bottom).
 */
export const useInfiniteScrollSentinel = (onReach: () => void, rootMargin = '2000px') => {
  const onReachRef = useRef(onReach);
  onReachRef.current = onReach;
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => () => observerRef.current?.disconnect(), []);

  return useCallback(
    (node: HTMLElement | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      if (!node) return;
      observerRef.current = new IntersectionObserver(
        entries => {
          if (entries[0]?.isIntersecting) onReachRef.current();
        },
        { rootMargin }
      );
      observerRef.current.observe(node);
    },
    [rootMargin]
  );
};
