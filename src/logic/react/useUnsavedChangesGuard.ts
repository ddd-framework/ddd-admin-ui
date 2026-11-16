'use client';

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef } from 'react';

import { useTranslate } from '../../i18n/useTranslate.ts';
import { type ConfirmOptions, DISCARD_CHANGES_CONFIRM } from '../pure/confirm.ts';

/**
 * The forms inside one dismissible container (a `FormDrawer`) report whether they hold unsaved changes, so the
 * container can ask before it closes. A registry, because a drawer can host more
 * than one form.
 */
export interface UnsavedChangesRegistry {
  setDirty: (id: string, isDirty: boolean) => void;
  hasUnsavedChanges: () => boolean;
}

export const UnsavedChangesContext = createContext<UnsavedChangesRegistry | null>(null);

/** The discard confirmation with its texts translated (the dialog renders the given strings as they are). */
export const useDiscardChangesConfirm = (): ConfirmOptions => {
  const { t } = useTranslate();
  return useMemo(
    () => ({
      ...DISCARD_CHANGES_CONFIRM,
      title: t('Discard changes?'),
      description: t('You have unsaved changes. Closing now will lose them.'),
      confirmLabel: t('Discard', { context: 'unsaved-changes-confirm' }),
      cancelLabel: t('Keep editing'),
    }),
    [t]
  );
};

export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

/**
 * For the container: provide `registry` through `UnsavedChangesContext` and route every user dismissal through
 * `guardClose`. A programmatic close (after a save) calls the close function directly.
 */
export const useUnsavedChangesBoundary = (confirm: ConfirmFn) => {
  const dirtyIds = useRef(new Set<string>());
  const discardConfirm = useDiscardChangesConfirm();

  const registry = useMemo<UnsavedChangesRegistry>(
    () => ({
      setDirty: (id, isDirty) => {
        if (isDirty) dirtyIds.current.add(id);
        else dirtyIds.current.delete(id);
      },
      hasUnsavedChanges: () => dirtyIds.current.size > 0,
    }),
    []
  );

  const guardClose = useCallback(
    async (close: () => void) => {
      if (registry.hasUnsavedChanges() && !(await confirm(discardConfirm))) return;
      close();
    },
    [registry, confirm, discardConfirm]
  );

  return { registry, guardClose };
};

/**
 * For a form: reports `isDirty` to the nearest container, warns before a reload or tab close while dirty, and returns
 * `confirmDiscard` for the form's own Cancel: `onClick={async () => (await confirmDiscard()) && onClose()}`.
 */
export const useUnsavedChangesGuard = (isDirty: boolean, confirm: ConfirmFn) => {
  const registry = useContext(UnsavedChangesContext);
  const id = useId();
  const discardConfirm = useDiscardChangesConfirm();
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  useEffect(() => {
    registry?.setDirty(id, isDirty);
    return () => registry?.setDirty(id, false);
  }, [registry, id, isDirty]);

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  const confirmDiscard = useCallback(
    () => (isDirtyRef.current ? confirm(discardConfirm) : Promise.resolve(true)),
    [confirm, discardConfirm]
  );

  return { confirmDiscard };
};
