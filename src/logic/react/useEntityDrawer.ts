'use client';

import { type MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { EntityDrawerState, EntityDrawerUrlAdapter } from '../pure/entityDrawer.ts';

export interface UseEntityDrawerOptions {
  adapter: EntityDrawerUrlAdapter;
  /** URL parameter of the edited entity's id (default `edit`). Two drawers on one page use different keys. */
  editKey?: string;
  /** URL parameter of the create form (default `create`, value `1`). */
  createKey?: string;
}

export interface EntityDrawer {
  /** The drawer state in the URL; `null` = closed. */
  state: EntityDrawerState | null;
  /**
   * What to render inside the drawer: the open state, or the last one while the close animation runs (the content
   * would otherwise vanish before the drawer has slid out). Key the content on it (`drawerKey`).
   */
  shown: EntityDrawerState | null;
  isOpen: boolean;
  /** The edited entity's id, `null` when closed or creating. */
  editId: string | null;
  isCreate: boolean;
  /** Opens the entity; `replace` swaps the drawer's URL in place (a create that turns into the new entity's edit). */
  openEdit: (id: string | number, options?: { replace?: boolean }) => void;
  openCreate: () => void;
  /**
   * `onClick` of a link to the entity (`<Link href="/sponsors?edit=12" onClick={drawer.editLinkClick(12)}>`): a
   * plain click opens the drawer in place, a modifier or middle click keeps the link's own behaviour (new tab).
   */
  editLinkClick: (id: string | number) => (event: MouseEvent<HTMLElement>) => void;
  /**
   * Closes the drawer. A drawer this page opened pops its own history entry (`back`), so Back / Forward stay
   * honest; a drawer that came with the URL (a link, a reload, a redirect from a detail route) removes its
   * parameter in place instead — `back` would leave the page. Call it from the form's Cancel (after
   * `confirmDiscard`) and after a save; `FormDrawer`'s ✕, Esc and overlay ask the discard question themselves.
   */
  close: () => void;
}

const CREATE_VALUE = '1';

const stateOf = (editId: string | null, createValue: string | null): EntityDrawerState | null => {
  if (editId) return { mode: 'edit', id: editId };
  if (createValue === CREATE_VALUE) return { mode: 'create' };
  return null;
};

/**
 * A list screen's side drawer with its state in the URL: `?edit=<id>` or `?create=1` next to
 * the list's own filters, so a link, a reload and Back keep working. Opening pushes a history entry; closing pops it
 * when this page opened the drawer and removes the parameter otherwise. A host can redirect its detail / create
 * routes to the list with the parameter, so links to them still land on the entity.
 *
 * ```tsx
 * const drawer = useEntityDrawer({ adapter: useNextDrawerUrlAdapter() });
 * <AddEntityButton entity="Sponsor" onClick={drawer.openCreate} />
 * rowAction={sponsor => () => drawer.openEdit(sponsor.id)}
 * <SponsorFormDrawer drawer={drawer} />   // FormDrawer open={drawer.isOpen} onClose={drawer.close} …
 * ```
 */
export const useEntityDrawer = ({
  adapter,
  editKey = 'edit',
  createKey = 'create',
}: UseEntityDrawerOptions): EntityDrawer => {
  const editId = adapter.get(editKey);
  const createValue = adapter.get(createKey);
  const state = useMemo(() => stateOf(editId, createValue), [editId, createValue]);

  const adapterRef = useRef(adapter);
  adapterRef.current = adapter;
  /** True while the drawer sits on a history entry this hook pushed (see `close`). */
  const pushedRef = useRef(false);

  const [shown, setShown] = useState<EntityDrawerState | null>(state);
  useEffect(() => {
    if (state !== null) setShown(state);
    // Closed by Back (or by `close`): the next open from the URL is not ours.
    else pushedRef.current = false;
  }, [state]);

  const openEdit = useCallback(
    (id: string | number, options?: { replace?: boolean }) => {
      const updates = { [editKey]: String(id), [createKey]: null };
      if (options?.replace) {
        adapterRef.current.replace(updates);
        return;
      }
      pushedRef.current = true;
      adapterRef.current.push(updates);
    },
    [editKey, createKey]
  );

  const editLinkClick = useCallback(
    (id: string | number) => (event: MouseEvent<HTMLElement>) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      openEdit(id);
    },
    [openEdit]
  );

  const openCreate = useCallback(() => {
    pushedRef.current = true;
    adapterRef.current.push({ [createKey]: CREATE_VALUE, [editKey]: null });
  }, [editKey, createKey]);

  const close = useCallback(() => {
    if (pushedRef.current) {
      pushedRef.current = false;
      adapterRef.current.back();
      return;
    }
    adapterRef.current.replace({ [editKey]: null, [createKey]: null });
  }, [editKey, createKey]);

  return {
    state,
    shown: state ?? shown,
    isOpen: state !== null,
    editId: state?.mode === 'edit' ? state.id : null,
    isCreate: state?.mode === 'create',
    openEdit,
    openCreate,
    editLinkClick,
    close,
  };
};
