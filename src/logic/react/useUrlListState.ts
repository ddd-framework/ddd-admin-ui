'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { LIST_STATE_DEBOUNCE_MS, type UrlStateAdapter } from '../pure/urlListState.ts';
import { useDebouncedValue } from './useDebouncedValue.ts';
import { useHydrated } from './useHydrated.ts';

/** Separator of a multi-value parameter (`?status=RUNNING,PAUSED`); values are ids or enum names, never free text. */
const LIST_SEPARATOR = ',';
const NO_KEYS: readonly string[] = [];

export interface UseUrlListStateOptions {
  adapter: UrlStateAdapter;
  debounceMs?: number;
  /** Keys that do not count as "filters" in `activeFilterCount` (the toolbar search: its own clear button). */
  uncounted?: readonly string[];
}

export interface UrlListState<K extends string> {
  /** What the inputs show (updates on every key). */
  values: Readonly<Record<K, string>>;
  /** Settled values (`debounceMs` after the last change): build the request from these, never from `values`. */
  debounced: Readonly<Record<K, string>>;
  setValue: (key: K, value: string) => void;
  setValues: (updates: Partial<Record<K, string>>) => void;
  /** A multi-value key as a list (`''` → `[]`). */
  getList: (key: K) => string[];
  setList: (key: K, values: readonly string[]) => void;
  /** Empties every key (the toolbar's "Clear filters" and the empty state's "Clear search"). */
  clear: () => void;
  /** Keys with a value, except `uncounted` — `EntityListToolbar.activeFilterCount`. */
  activeFilterCount: number;
  /** Any settled key set (search included) — `EntityListBody.isSearchActive`. */
  isActive: boolean;
}

const emptyRecord = <K extends string>(keys: readonly K[]): Record<K, string> => {
  const record = {} as Record<K, string>;
  for (const key of keys) record[key] = '';
  return record;
};

/**
 * The first values of a list: the URL's, else (`withRestore`) the adapter's saved state when the URL carries none of
 * the keys. Storage is read only with `withRestore`, i.e. never in a server render or a hydration render.
 */
export const initialListValues = <K extends string>(
  keys: readonly K[],
  adapter: UrlStateAdapter,
  withRestore: boolean
): Record<K, string> => {
  const initial = emptyRecord(keys);
  for (const key of keys) initial[key] = adapter.get(key) ?? '';
  if (withRestore && keys.every(key => initial[key] === '')) {
    const saved = adapter.restore?.();
    if (saved) for (const key of keys) initial[key] = saved[key] ?? '';
  }
  return initial;
};

/**
 * A list's search and filters, kept in the URL: a reload, Back and a shared link keep them; when the URL has none of
 * the keys, the adapter's `restore` (last saved state of this list) is used, so a return to the list keeps its filters. One hook for every list (replaces the
 * per-module URL hooks and `useState` filters). Keys are the URL parameter names; values are strings (`''` = unset);
 * multi-value keys use `getList` / `setList`. The URL is written with the debounced values only.
 *
 * Pass the keys as a module constant (`as const`), not an inline array.
 */
export const useUrlListState = <K extends string>(
  keys: readonly K[],
  { adapter, debounceMs = LIST_STATE_DEBOUNCE_MS, uncounted = NO_KEYS }: UseUrlListStateOptions
): UrlListState<K> => {
  // A client-only mount restores in the first render (as before); a server render and its hydration render do not
  // touch storage, and the saved state is applied right after hydration instead.
  const hydrated = useHydrated();
  const [values, setValuesState] = useState<Record<K, string>>(() => initialListValues(keys, adapter, hydrated));
  const debounced = useDebouncedValue(values, debounceMs);

  const adapterRef = useRef(adapter);
  adapterRef.current = adapter;

  const restoreAfterHydrationRef = useRef(!hydrated);
  useEffect(() => {
    if (!hydrated || !restoreAfterHydrationRef.current) return;
    restoreAfterHydrationRef.current = false;
    const restored = initialListValues(keys, adapterRef.current, true);
    setValuesState(previous => (keys.some(key => previous[key] !== restored[key]) ? restored : previous));
  }, [hydrated, keys]);

  // A list opened from a link with filters in the URL: remember that state right away (the adapter saves on every
  // write), not only after the first change in the UI.
  const rememberedFromUrlRef = useRef(false);
  useEffect(() => {
    if (rememberedFromUrlRef.current) return;
    rememberedFromUrlRef.current = true;
    const fromUrl: Record<string, string> = {};
    for (const key of keys) {
      const value = adapterRef.current.get(key);
      if (value) fromUrl[key] = value;
    }
    if (Object.keys(fromUrl).length > 0) adapterRef.current.replace(fromUrl);
  }, [keys]);

  useEffect(() => {
    const updates: Record<string, string | null> = {};
    let changed = false;
    for (const key of keys) {
      const next = debounced[key].trim();
      if ((adapterRef.current.get(key) ?? '') === next) continue;
      updates[key] = next === '' ? null : next;
      changed = true;
    }
    if (changed) adapterRef.current.replace(updates);
  }, [debounced, keys]);

  const setValue = useCallback(
    (key: K, value: string) => setValuesState(previous => (previous[key] === value ? previous : { ...previous, [key]: value })),
    []
  );
  const setValues = useCallback(
    (updates: Partial<Record<K, string>>) => setValuesState(previous => ({ ...previous, ...updates })),
    []
  );
  const getList = useCallback(
    (key: K) =>
      values[key]
        .split(LIST_SEPARATOR)
        .map(item => item.trim())
        .filter(item => item !== ''),
    [values]
  );
  const setList = useCallback((key: K, list: readonly string[]) => setValue(key, list.join(LIST_SEPARATOR)), [setValue]);
  const clear = useCallback(() => setValuesState(emptyRecord(keys)), [keys]);

  const activeFilterCount = useMemo(
    () => keys.filter(key => !uncounted.includes(key) && values[key].trim() !== '').length,
    [keys, uncounted, values]
  );
  const isActive = useMemo(() => keys.some(key => debounced[key].trim() !== ''), [keys, debounced]);

  return { values, debounced, setValue, setValues, getList, setList, clear, activeFilterCount, isActive };
};
