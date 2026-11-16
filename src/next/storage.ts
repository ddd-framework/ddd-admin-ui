/**
 * Guarded access to the browser storages for the Next adapters. Storage can be missing or refuse (server render,
 * private mode, blocked site data, quota): a failed read is "nothing stored", a failed write is skipped — the URL and
 * the component state still hold the value for this visit. Keys come from the provider's `storageKey`.
 */

/** `local`: survives the tab (views). `session`: this tab only, across reloads and navigation (list filters). */
export type StorageArea = 'local' | 'session';

const storageOf = (area: StorageArea): Storage | null => {
  if (typeof window === 'undefined') return null;
  return area === 'local' ? window.localStorage : window.sessionStorage;
};

export const readStored = (area: StorageArea, key: string): string | null => {
  try {
    return storageOf(area)?.getItem(key) ?? null;
  } catch {
    return null;
  }
};

/** `null` or `''` removes the key. */
export const writeStored = (area: StorageArea, key: string, value: string | null): void => {
  try {
    const storage = storageOf(area);
    if (!storage) return;
    if (value) storage.setItem(key, value);
    else storage.removeItem(key);
  } catch {
    // storage unavailable or full: the value stays in the URL / component state for this visit
  }
};
