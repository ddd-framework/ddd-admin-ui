'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect } from 'react';

import { type ListDisplayMode, parseListDisplayMode } from '../logic/pure/displayMode.ts';
import { useHydrated } from '../logic/react/useHydrated.ts';
import { useAdminUi } from '../provider/adminUiContext.ts';
import { LIST_VIEW_PARAM } from './listViewParam.ts';
import { queueSearchParamsWrite } from './searchParamsWriter.ts';
import { readStored, writeStored } from './storage.ts';

/** Stable empty default of `extraModes` (an inline `[]` would be a new effect dependency per render). */
const NO_EXTRA_MODES: readonly never[] = [];

/**
 * A list's Grid / Table view: `?view=` in the URL, remembered per list in localStorage (the provider's
 * `storageKey('list-view', listId)`) — the same `listId` as the list's `useNextUrlStateAdapter`. The URL wins; without
 * `?view=` the remembered view applies, else the page's default. A switch writes the URL through the one URL writer
 * (`router.replace`, no history entry, scroll kept; the default is never written) and the remembered view (the default
 * removes it). A remembered view the page can no longer show (Grid after its card was removed, an unknown value) is
 * dropped. `extraModes`: the list's own views (`ListExtraView` values; a module constant). Reads `useSearchParams`:
 * the calling screen renders inside `<Suspense>`.
 */
export const useListViewParam = <TExtra extends string = never>(
  listId: string,
  defaultMode: ListDisplayMode | TExtra,
  hasGrid = true,
  extraModes: readonly TExtra[] = NO_EXTRA_MODES
): [ListDisplayMode | TExtra, (mode: ListDisplayMode | TExtra) => void] => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { storageKey: keyOf, preserveSearchParams } = useAdminUi();
  const storageKey = keyOf('list-view', listId);
  // Read after hydration (and at once on a client-only mount), so a server-rendered list hydrates without a mismatch.
  const hydrated = useHydrated();
  const stored = hydrated ? readStored('local', storageKey) : null;
  const mode = parseListDisplayMode(searchParams.get(LIST_VIEW_PARAM) ?? stored, defaultMode, hasGrid, extraModes);

  useEffect(() => {
    if (stored === null) return;
    const normalised = parseListDisplayMode(stored, defaultMode, hasGrid, extraModes);
    if (normalised !== stored || normalised === defaultMode) writeStored('local', storageKey, null);
  }, [defaultMode, hasGrid, extraModes, storageKey, stored]);

  const setMode = useCallback(
    (next: ListDisplayMode | TExtra) => {
      const value = next === defaultMode ? null : next;
      writeStored('local', storageKey, value);
      queueSearchParamsWrite(pathname, router, { [LIST_VIEW_PARAM]: value }, { preserve: preserveSearchParams });
    },
    [defaultMode, pathname, router, storageKey, preserveSearchParams]
  );

  return [mode, setMode];
};
