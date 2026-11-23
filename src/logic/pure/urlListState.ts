/**
 * How `useUrlListState` reaches the URL — the app's router adapter (this block imports no router). `get` reads the
 * current search parameter; `replace` writes several at once without a history entry (`null` removes one) and keeps
 * every other parameter (`?view=`, a tab, another list's state).
 */
export interface UrlStateAdapter {
  get: (key: string) => string | null;
  replace: (updates: Readonly<Record<string, string | null>>) => void;
  /**
   * Writes like `replace` but with a history entry (Back returns to the state before): a list that is a place, not a
   * filter (a folder of a file manager). Optional: without it `useUrlListState`'s `pushKeys` write with `replace`.
   */
  push?: (updates: Readonly<Record<string, string | null>>) => void;
  /**
   * The list's last saved state (`key → value`), used when the URL carries none of the list's keys — so returning to a
   * list (sidebar link, redirect after a save) restores its filters. Where it is saved is the adapter's choice (e.g.
   * this tab's sessionStorage under the list's id). Optional.
   */
  restore?: () => Readonly<Record<string, string>> | null;
}

/** The list filters' debounce: typing updates the inputs at once, the request and the URL 350 ms later. */
export const LIST_STATE_DEBOUNCE_MS = 350;

/**
 * The same adapter under other parameter names: a block that reads fixed keys (`area`, `folder`) shown in a host whose
 * URL names them differently (`space`, `path`). `names` maps the block's key to the URL's; unmapped keys stay.
 *
 * `const urlState = useMemo(() => renameUrlStateKeys(adapter, { area: 'space', folder: 'path' }), [adapter]);`
 */
export const renameUrlStateKeys = (adapter: UrlStateAdapter, names: Readonly<Record<string, string>>): UrlStateAdapter => {
  const toUrl = (key: string) => names[key] ?? key;
  const toUrlUpdates = (updates: Readonly<Record<string, string | null>>) => {
    const renamed: Record<string, string | null> = {};
    for (const [key, value] of Object.entries(updates)) renamed[toUrl(key)] = value;
    return renamed;
  };
  const fromUrl = new Map(Object.entries(names).map(([blockKey, urlKey]) => [urlKey, blockKey]));
  const { push, restore } = adapter;
  return {
    get: key => adapter.get(toUrl(key)),
    replace: updates => adapter.replace(toUrlUpdates(updates)),
    ...(push ? { push: (updates: Readonly<Record<string, string | null>>) => push(toUrlUpdates(updates)) } : {}),
    ...(restore
      ? {
          restore: () => {
            const saved = restore();
            if (!saved) return null;
            const renamed: Record<string, string> = {};
            for (const [key, value] of Object.entries(saved)) renamed[fromUrl.get(key) ?? key] = value;
            return renamed;
          },
        }
      : {}),
  };
};
