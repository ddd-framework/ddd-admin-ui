// No directive: no hooks, browser-only at call time (`window`); module state `pending` is the one write queue.
import type { useRouter } from 'next/navigation';

import { readStored, writeStored } from './storage.ts';

type AppRouter = ReturnType<typeof useRouter>;

/** Search-parameter updates; `null` or `''` removes the parameter. */
export type SearchParamUpdates = Readonly<Record<string, string | null>>;

export interface SearchParamsWriteOptions {
  /** A sessionStorage key that remembers the resulting query (the list's filters key). */
  saveAs?: string;
  /** Parameters a write never removes (a host's sticky parameters, e.g. `debug`); setting a value still works. */
  preserve?: readonly string[];
}

interface PendingWrite {
  /** Route path of a router write (`usePathname`); `null` while the batch holds shallow writes only. */
  pathname: string | null;
  router: AppRouter | null;
  updates: Record<string, string | null>;
  saveAs: Set<string>;
  preserve: Set<string>;
  /** A shallow write asked for a history entry (opening a drawer). */
  push: boolean;
  shallow: boolean;
}

let pending: PendingWrite | null = null;

const mergedQuery = (write: PendingWrite): string => {
  const params = new URLSearchParams(window.location.search);
  for (const [key, value] of Object.entries(write.updates)) {
    if (value === null || value === '') {
      if (!write.preserve.has(key)) params.delete(key);
    } else {
      params.set(key, value);
    }
  }
  return params.toString();
};

/** Writes the queued batch now (also run before a history step, so a pending write never lands on another entry). */
export const flushSearchParamsWrites = (): void => {
  const write = pending;
  pending = null;
  if (!write) return;
  const query = mergedQuery(write);
  for (const storageKey of write.saveAs) writeStored('session', storageKey, query);
  if (write.shallow || !write.router || write.pathname === null) {
    // Shallow: the live path (base path included), only the query changes; Next keeps `useSearchParams` in step.
    const url = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
    if (write.push) window.history.pushState(null, '', url);
    else window.history.replaceState(null, '', url);
    return;
  }
  write.router.replace(query ? `${write.pathname}?${query}` : write.pathname, { scroll: false });
};

const enqueue = (updates: SearchParamUpdates, options: SearchParamsWriteOptions | undefined): PendingWrite => {
  if (!pending) {
    pending = {
      pathname: null,
      router: null,
      updates: {},
      saveAs: new Set(),
      preserve: new Set(),
      push: false,
      shallow: false,
    };
    queueMicrotask(flushSearchParamsWrites);
  }
  Object.assign(pending.updates, updates);
  if (options?.saveAs) pending.saveAs.add(options.saveAs);
  for (const key of options?.preserve ?? []) pending.preserve.add(key);
  return pending;
};

/**
 * The one URL writer. Writes search parameters with `router.replace` (no history entry, no scroll jump) on top of the
 * live `window.location.search`. Writes queued in the same tick — this one, `queueShallowSearchParamsWrite`, from any
 * list, selection, view toggle or drawer — are merged into one write: two lists (or a list and its selection)
 * restoring their saved state on mount would otherwise each start from the old URL and drop the other's parameters.
 * `saveAs` also stores the resulting query in this tab's sessionStorage.
 */
export const queueSearchParamsWrite = (
  pathname: string,
  router: AppRouter,
  updates: SearchParamUpdates,
  options?: SearchParamsWriteOptions
): void => {
  if (pending && pending.pathname !== null && pending.pathname !== pathname) flushSearchParamsWrites();
  const write = enqueue(updates, options);
  write.pathname = pathname;
  write.router = router;
};

/**
 * A shallow write into the same queue (`history.pushState` / `replaceState`, no server round trip: the page behind a
 * drawer stays mounted). A batch that holds a shallow write is written shallowly as a whole — one history entry when
 * any write asked for `push`, else `replaceState` — so a drawer never triggers a router navigation; a batch of router
 * writes only goes through `router.replace`.
 */
export const queueShallowSearchParamsWrite = (
  mode: 'push' | 'replace',
  updates: SearchParamUpdates,
  options?: SearchParamsWriteOptions
): void => {
  const write = enqueue(updates, options);
  write.shallow = true;
  if (mode === 'push') write.push = true;
};

/** The query string last saved in this tab under a list's filters key, as `key → value`; `null` when none. */
export const readSavedListQuery = (storageKey: string): Record<string, string> | null => {
  const query = readStored('session', storageKey);
  return query ? Object.fromEntries(new URLSearchParams(query)) : null;
};
