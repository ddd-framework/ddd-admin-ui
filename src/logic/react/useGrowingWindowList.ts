'use client';

import { useCallback, useMemo, useState } from 'react';

/** The part of a generated RTK Query list hook this block uses. */
export interface ListQueryResult<TData> {
  data?: TData;
  currentData?: TData;
  isFetching: boolean;
  isError: boolean;
  error?: unknown;
  refetch: () => unknown;
}

export type ListQueryHook<TArgs, TData> = (args: TArgs, options?: { skip?: boolean }) => ListQueryResult<TData>;

export interface UseGrowingWindowListOptions<TArgs extends { top?: number; skip?: number }, TData, TItem> {
  /** A generated list hook, e.g. `useGetApiAdminCommonBikeTypesListQuery`. */
  useListQuery: ListQueryHook<TArgs, TData>;
  /** Query arguments without `top` / `skip` (filters, orderBy, expand, …); keep it memoised. */
  args: Omit<TArgs, 'top' | 'skip'>;
  extractItems: (data: TData) => TItem[];
  pageSize?: number;
  /** Upper bound of `top` the backend accepts; "load more" stops there. */
  maxTop?: number;
  /** Changes whenever the result set changes meaning (filters, sort, scope): the window shrinks back to one page. */
  resetKey: string;
  skip?: boolean;
}

export interface GrowingWindowList<TItem> {
  items: TItem[];
  /** No rows to show yet for the current arguments. */
  isLoading: boolean;
  /** A wider window is loading; the rows of the narrower one stay visible. */
  isFetchingMore: boolean;
  isError: boolean;
  error: unknown;
  hasMore: boolean;
  loadMore: () => void;
  refetch: () => void;
}

const EMPTY: never[] = [];

/**
 * "Load more" as ONE growing request (`skip: 0`, `top: pageSize × pages`) instead of N stitched pages: a single
 * cache entry holds every visible row, so a LIST invalidation after a write
 * refetches all of them. A new `resetKey` starts again at one page.
 */
export const useGrowingWindowList = <TArgs extends { top?: number; skip?: number }, TData, TItem>({
  useListQuery,
  args,
  extractItems,
  pageSize = 50,
  maxTop = 1000,
  resetKey,
  skip,
}: UseGrowingWindowListOptions<TArgs, TData, TItem>): GrowingWindowList<TItem> => {
  const [windowState, setWindowState] = useState({ key: resetKey, pages: 1 });
  // Derived in render, so the first request after a reset already uses one page (no stale wide request).
  const pages = windowState.key === resetKey ? windowState.pages : 1;
  const top = Math.min(pageSize * pages, maxTop);

  const queryArgs = useMemo(() => ({ ...args, top, skip: 0 }) as TArgs, [args, top]);
  const result = useListQuery(queryArgs, { skip });

  // While the window widens, `currentData` is empty and `data` still holds the narrower window of the same key.
  const isWidening = pages > 1 && !result.currentData;
  const source = result.currentData ?? (isWidening ? result.data : undefined);
  const items = useMemo(() => (source ? extractItems(source) : EMPTY), [source, extractItems]);

  const hasMore = !!result.currentData && items.length >= top && top < maxTop;

  const loadMore = useCallback(() => {
    if (!hasMore || result.isFetching) return;
    setWindowState({ key: resetKey, pages: pages + 1 });
  }, [hasMore, result.isFetching, resetKey, pages]);

  const { refetch } = result;
  return {
    items,
    isLoading: !source && !result.isError && !skip,
    isFetchingMore: isWidening && result.isFetching,
    isError: result.isError,
    error: result.error,
    hasMore,
    loadMore,
    refetch: useCallback(() => void refetch(), [refetch]),
  };
};
