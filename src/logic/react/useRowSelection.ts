'use client';

import { useCallback, useMemo, useState } from 'react';

/** What `EntityListTable` needs to draw the checkbox column (the `selection` prop). */
export interface EntityListSelection<TItem> {
  isItemSelected: (item: TItem) => boolean;
  /** False for a row without a usable key (it gets no checkbox) or one `isSelectable` refuses. */
  isItemSelectable: (item: TItem) => boolean;
  /**
   * True for a row with a key that `isSelectable` refuses: the table draws its checkbox disabled (a row without a key
   * still gets none). Absent: no such rows.
   */
  isItemSelectionDisabled?: (item: TItem) => boolean;
  setItemSelected: (item: TItem, selected: boolean) => void;
  /** The header checkbox: every loaded row, some of them, or none. */
  allLoadedState: boolean | 'indeterminate';
  setAllLoadedSelected: (selected: boolean) => void;
  /** Locks every checkbox (a bulk action is running). */
  disabled?: boolean;
  /** Accessible name of a row's checkbox (default `Select row <key>`). */
  rowLabel?: (item: TItem) => string;
}

export interface UseRowSelectionOptions<TItem, TKey extends string | number> {
  /** The loaded rows (`useGrowingWindowList().items`). Only loaded rows can be selected or count. */
  items: readonly TItem[];
  /** The row's id, `null` / `undefined` when the row has none (not selectable). */
  getKey: (item: TItem) => TKey | null | undefined;
  /** A change (the filter string) drops the selection, so a bulk action never hits rows the list no longer shows. */
  resetKey?: string;
  disabled?: boolean;
  rowLabel?: (item: TItem) => string;
  /**
   * False for a row that cannot be selected now (e.g. one without the right to delete): its checkbox is disabled, and
   * "Select all loaded", the header state and the count take only selectable rows. Keep it stable (`useCallback`).
   */
  isSelectable?: (item: TItem) => boolean;
}

export interface RowSelection<TItem, TKey extends string | number> extends EntityListSelection<TItem> {
  /** Selected keys among the loaded rows, in list order — what a bulk action runs on. */
  selectedKeys: TKey[];
  selectedItems: TItem[];
  count: number;
  isSelected: (key: TKey) => boolean;
  setSelected: (key: TKey, selected: boolean) => void;
  clear: () => void;
}

const EMPTY: ReadonlySet<never> = new Set();

/**
 * Row selection of a list (one pattern everywhere): checkbox column via
 * `EntityListTable.selection`, "Select all loaded" in the header, count + bulk actions in `EntityListBulkBar`. Keys
 * outside the loaded rows never count; a new `resetKey` starts empty (derived, no effect).
 */
export const useRowSelection = <TItem, TKey extends string | number>({
  items,
  getKey,
  resetKey = '',
  disabled,
  rowLabel,
  isSelectable,
}: UseRowSelectionOptions<TItem, TKey>): RowSelection<TItem, TKey> => {
  const [state, setState] = useState<{ resetKey: string; keys: ReadonlySet<TKey> }>({ resetKey, keys: EMPTY });
  const keys = state.resetKey === resetKey ? state.keys : (EMPTY as ReadonlySet<TKey>);

  const update = useCallback(
    (change: (previous: ReadonlySet<TKey>) => ReadonlySet<TKey>) =>
      setState(previous => ({
        resetKey,
        keys: change(previous.resetKey === resetKey ? previous.keys : (EMPTY as ReadonlySet<TKey>)),
      })),
    [resetKey]
  );

  const loadedKeys = useMemo(() => {
    const list: TKey[] = [];
    for (const item of items) {
      const key = getKey(item);
      if (key !== null && key !== undefined && key !== '' && (isSelectable?.(item) ?? true)) list.push(key);
    }
    return list;
  }, [items, getKey, isSelectable]);

  const selectedKeys = useMemo(() => loadedKeys.filter(key => keys.has(key)), [loadedKeys, keys]);
  const selectedItems = useMemo(
    () =>
      items.filter(item => {
        const key = getKey(item);
        return key !== null && key !== undefined && keys.has(key) && (isSelectable?.(item) ?? true);
      }),
    [items, getKey, keys, isSelectable]
  );

  const setSelected = useCallback(
    (key: TKey, selected: boolean) =>
      update(previous => {
        if (previous.has(key) === selected) return previous;
        const next = new Set(previous);
        if (selected) next.add(key);
        else next.delete(key);
        return next;
      }),
    [update]
  );
  const clear = useCallback(() => update(() => EMPTY as ReadonlySet<TKey>), [update]);
  const setAllLoadedSelected = useCallback(
    (selected: boolean) => update(() => (selected ? new Set(loadedKeys) : (EMPTY as ReadonlySet<TKey>))),
    [update, loadedKeys]
  );

  const count = selectedKeys.length;
  const allLoadedState: boolean | 'indeterminate' =
    count === 0 ? false : count === loadedKeys.length ? true : 'indeterminate';

  return {
    selectedKeys,
    selectedItems,
    count,
    isSelected: key => keys.has(key),
    setSelected,
    clear,
    isItemSelected: item => {
      const key = getKey(item);
      return key !== null && key !== undefined && keys.has(key) && (isSelectable?.(item) ?? true);
    },
    isItemSelectable: item => {
      const key = getKey(item);
      return key !== null && key !== undefined && key !== '' && (isSelectable?.(item) ?? true);
    },
    ...(isSelectable
      ? {
          isItemSelectionDisabled: (item: TItem) => {
            const key = getKey(item);
            return key !== null && key !== undefined && key !== '' && !isSelectable(item);
          },
        }
      : {}),
    setItemSelected: (item, selected) => {
      const key = getKey(item);
      if (key !== null && key !== undefined && key !== '' && (isSelectable?.(item) ?? true)) setSelected(key, selected);
    },
    allLoadedState,
    setAllLoadedSelected,
    disabled,
    rowLabel,
  };
};
