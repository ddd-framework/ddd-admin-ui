/** Direction of a list sort. */
export type ListSortDirection = 'asc' | 'desc';

/** One sort of a list: the column's `sortKey` and its direction. A list sorts by at most one key at a time. */
export interface EntityListSort {
  key: string;
  direction: ListSortDirection;
}

/** How one column's sort cycles. */
export interface ListSortCycle {
  /** The first direction when the column becomes sorted (default `'asc'`). */
  start?: ListSortDirection;
  /** Never unsorted: after the second direction the cycle returns to the first one instead of `null`. */
  required?: boolean;
}

/**
 * The sort after a click on the header of `key`: not sorted → `start` (default ascending) → the other direction → not
 * sorted (`null`: the host applies its default order), or back to `start` with `required`. A click on another column
 * starts that column with its `start` direction.
 */
export const nextListSort = (
  current: EntityListSort | null | undefined,
  key: string,
  cycle: ListSortCycle = {}
): EntityListSort | null => {
  const start = cycle.start ?? 'asc';
  if (!current || current.key !== key) return { key, direction: start };
  if (current.direction === start) return { key, direction: start === 'asc' ? 'desc' : 'asc' };
  return cycle.required ? { key, direction: start } : null;
};

/**
 * Reads a sort written by `formatListSort` (`name:asc`, `createdTime:desc`) back, e.g. from a URL parameter. Anything
 * else — empty, no direction, an unknown direction, a key outside `allowedKeys` when given — is `null`, so a stale
 * link falls back to the default order.
 */
export const parseListSort = (
  text: string | null | undefined,
  allowedKeys?: readonly string[]
): EntityListSort | null => {
  if (!text) return null;
  const separator = text.lastIndexOf(':');
  if (separator <= 0) return null;
  const key = text.slice(0, separator);
  const direction = text.slice(separator + 1);
  if (direction !== 'asc' && direction !== 'desc') return null;
  if (allowedKeys && !allowedKeys.includes(key)) return null;
  return { key, direction };
};

/** Writes a sort as one text, `key:asc` / `key:desc`; no sort is `''` (an empty URL parameter is removed). */
export const formatListSort = (sort: EntityListSort | null | undefined): string =>
  sort ? `${sort.key}:${sort.direction}` : '';
