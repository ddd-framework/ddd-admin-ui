/**
 * How `useEntityDrawer` reaches the URL — the app's router adapter (this block imports no router). `get` must be
 * reactive (the app reads its router's search parameters), so the drawer follows Back, Forward and a reload. Every
 * write keeps the other parameters (the list's filters, `?view=`).
 */
export interface EntityDrawerUrlAdapter {
  get: (key: string) => string | null;
  /** Writes with a history entry (opening the drawer), so Back closes it. `null` removes a parameter. */
  push: (updates: Readonly<Record<string, string | null>>) => void;
  /** Writes without a history entry (closing a drawer that came with the URL, create → edit). */
  replace: (updates: Readonly<Record<string, string | null>>) => void;
  /** One history step back (closing a drawer this page opened). */
  back: () => void;
}

/** What the drawer shows: one entity (`?edit=<id>`) or the create form (`?create=1`). */
export type EntityDrawerState = { mode: 'edit'; id: string } | { mode: 'create' };

/** A stable key for the drawer's content: a new entity (or create ↔ edit) remounts the form with fresh defaults. */
export const drawerKey = (state: EntityDrawerState | null): string =>
  state === null ? 'closed' : state.mode === 'edit' ? `edit:${state.id}` : 'create';
