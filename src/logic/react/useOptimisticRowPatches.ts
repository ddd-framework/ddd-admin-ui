'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface RowPatch<TItem> {
  patch: Partial<TItem>;
  /** Saved: dropped as soon as the rows arrive again (the refetch carries the stored value). */
  committed: boolean;
}

export interface OptimisticRowPatches<TItem> {
  /** The rows with every pending patch applied. */
  displayed: TItem[];
  /** Shows `patch` on the row at once (before the save answers). */
  begin: (id: string, patch: Partial<TItem>) => void;
  /** The save succeeded: the patch stays until the next rows arrive. */
  succeed: (id: string) => void;
  /** The save failed: the row shows its loaded values again. */
  rollback: (id: string) => void;
}

/**
 * In-place edits of list rows (a switch in a cell): the change shows at once, a failed save rolls it back, a saved one
 * stays until the refetched rows carry it. `getId` must give the id `begin` was called with.
 */
export const useOptimisticRowPatches = <TItem extends object>(
  items: readonly TItem[],
  getId: (item: TItem) => string
): OptimisticRowPatches<TItem> => {
  const [patches, setPatches] = useState<Readonly<Record<string, RowPatch<TItem>>>>({});
  const previousItems = useRef(items);

  useEffect(() => {
    if (previousItems.current === items) return;
    previousItems.current = items;
    setPatches(current => {
      const kept = Object.entries(current).filter(([, entry]) => !entry.committed);
      return kept.length === Object.keys(current).length ? current : Object.fromEntries(kept);
    });
  }, [items]);

  const displayed = useMemo(
    () =>
      items.map(item => {
        const entry = patches[getId(item)];
        return entry ? { ...item, ...entry.patch } : item;
      }),
    [items, patches, getId]
  );

  const begin = useCallback((id: string, patch: Partial<TItem>) => {
    setPatches(current => ({ ...current, [id]: { patch: { ...current[id]?.patch, ...patch }, committed: false } }));
  }, []);
  const succeed = useCallback((id: string) => {
    setPatches(current => (current[id] ? { ...current, [id]: { ...current[id], committed: true } } : current));
  }, []);
  const rollback = useCallback((id: string) => {
    setPatches(current => {
      if (!current[id]) return current;
      const { [id]: _removed, ...rest } = current;
      return rest;
    });
  }, []);

  return { displayed, begin, succeed, rollback };
};
