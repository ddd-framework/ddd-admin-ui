/**
 * Guarded access to the browser storages. Storage can be missing or refuse (server render, private mode, blocked site
 * data, quota): a failed read is "nothing stored", a failed write is skipped — the URL and the component state still
 * hold the value for this visit. Safe to call on the server (always nothing).
 */

/** `local`: survives the tab (views). `session`: this tab only, across reloads and navigation (list filters). */
export type StorageArea = 'local' | 'session';

const storageOf = (area: StorageArea): Storage | null => {
  if (typeof window === 'undefined') return null;
  return area === 'local' ? window.localStorage : window.sessionStorage;
};

/** The stored text, `null` when nothing is stored or storage is unavailable. */
export const readStored = (area: StorageArea, key: string): string | null => {
  try {
    return storageOf(area)?.getItem(key) ?? null;
  } catch {
    return null;
  }
};

/** Stores `value`; `null` or `''` removes the key. Never throws. */
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

/**
 * A neutral storage key, `<prefix>.<area>.<name>` (e.g. `admin.list-view.projects`): `prefix` names the app, `area`
 * the feature (not the storage area), `name` the item. Empty parts are left out; dots inside a part are kept.
 */
export const buildStorageKey = (prefix: string, area: string, name: string): string =>
  [prefix, area, name].filter(part => part !== '').join('.');
