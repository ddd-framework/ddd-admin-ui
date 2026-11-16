/**
 * How `useUrlListState` reaches the URL — the app's router adapter (this block imports no router). `get` reads the
 * current search parameter; `replace` writes several at once without a history entry (`null` removes one) and keeps
 * every other parameter (`?view=`, a tab, another list's state).
 */
export interface UrlStateAdapter {
  get: (key: string) => string | null;
  replace: (updates: Readonly<Record<string, string | null>>) => void;
  /**
   * The list's last saved state (`key → value`), used when the URL carries none of the list's keys — so returning to a
   * list (sidebar link, redirect after a save) restores its filters. Where it is saved is the adapter's choice (e.g.
   * this tab's sessionStorage under the list's id). Optional.
   */
  restore?: () => Readonly<Record<string, string>> | null;
}

/** The list filters' debounce: typing updates the inputs at once, the request and the URL 350 ms later. */
export const LIST_STATE_DEBOUNCE_MS = 350;
