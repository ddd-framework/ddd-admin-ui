'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

import type { UrlStateAdapter } from '../logic/pure/urlListState.ts';
import { useAdminUi } from '../provider/adminUiContext.ts';
import { queueSearchParamsWrite, readSavedListQuery } from './searchParamsWriter.ts';

export interface NextUrlStateAdapterOptions {
  /**
   * The list's stable id: its state is remembered under the provider's `storageKey('list-filters', listId)`. A list
   * inside one entity carries the entity id; two states on one page (filters + selection) share the id.
   */
  listId: string;
  /**
   * `false`: no saved state comes back (`restore` is left out): a list opened without its parameters starts empty.
   * Writes still save the query (another list of the same id may restore it). Default `true`.
   */
  restore?: boolean;
  /**
   * The parameters a write remembers for `restore` (the list's own keys, e.g. the keys passed to `useUrlListState`):
   * a drawer's `edit`, another list's filters or a host parameter are then never saved with the list. Default: the
   * whole query, as before. Two states sharing the `listId` name both their keys.
   */
  savedKeys?: readonly string[];
}

/**
 * The Next router as `useUrlListState`'s URL adapter: reads `useSearchParams`, writes through the one URL writer
 * (`router.replace` on top of the live URL, same-tick writes merged), so parameters another hook wrote (`?view=`, a
 * selection) survive. The URL is the source of truth while on the page; each write also saves the query in this tab's
 * sessionStorage under the list's key, and `restore` hands it back when the list is opened without its parameters (a
 * sidebar link, a redirect after a save) — within the tab, never in a new one. Reads `useSearchParams`: the screen
 * renders inside `<Suspense>`.
 *
 * `const list = useUrlListState(KEYS, { adapter: useNextUrlStateAdapter({ listId: 'admin.items' }), uncounted: ['q'] });`
 */
export const useNextUrlStateAdapter = ({ listId, restore = true, savedKeys }: NextUrlStateAdapterOptions): UrlStateAdapter => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { storageKey: keyOf, preserveSearchParams } = useAdminUi();
  const storageKey = keyOf('list-filters', listId);
  const savedKeysText = savedKeys ? savedKeys.join('\n') : null;

  return useMemo<UrlStateAdapter>(
    () => ({
      get: key => searchParams.get(key),
      replace: updates =>
        queueSearchParamsWrite(pathname, router, updates, {
          saveAs: storageKey,
          preserve: preserveSearchParams,
          ...(savedKeysText === null ? {} : { saveKeys: savedKeysText.split('\n') }),
        }),
      ...(restore ? { restore: () => readSavedListQuery(storageKey) } : {}),
    }),
    [pathname, router, storageKey, searchParams, preserveSearchParams, restore, savedKeysText]
  );
};
