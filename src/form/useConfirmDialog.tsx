'use client';

import { useCallback, useRef, useState } from 'react';

import { ConfirmDialogView, type ConfirmDialogViewEntry } from '../primitives/confirmDialogView.tsx';
import type { ConfirmDialogApi, ConfirmOptions } from '../logic/pure/confirm.ts';

/** @deprecated moved to logic/pure/confirm — the re-export is removed in a later minor */
export type { ConfirmDialogApi, ConfirmOptions } from '../logic/pure/confirm.ts';

/**
 * A promise-returning confirmation, as a hook: the dialog renders where the hook's `dialog` is placed. A new call while
 * one is open answers the open one `false`. Screens below `AdminUiProvider` use `useConfirm()` (`./logic`) instead:
 * nothing to render, calls queue. Dialogs are only for confirmations.
 */
export const useConfirmDialog = (): ConfirmDialogApi => {
  const [entry, setEntry] = useState<ConfirmDialogViewEntry | null>(null);
  const pending = useRef<{ id: number; resolve: (confirmed: boolean) => void } | null>(null);
  const nextId = useRef(1);

  const settle = useCallback((id: number, confirmed: boolean) => {
    if (pending.current?.id !== id) return;
    pending.current.resolve(confirmed);
    pending.current = null;
    setEntry(null);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    pending.current?.resolve(false);
    const id = nextId.current;
    nextId.current += 1;
    setEntry({ id, options });
    return new Promise<boolean>(resolve => {
      pending.current = { id, resolve };
    });
  }, []);

  return { confirm, dialog: <ConfirmDialogView entry={entry} onSettle={settle} /> };
};
