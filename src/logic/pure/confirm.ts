import type { ReactNode } from 'react';

import { m } from '../../i18n/store.ts';

/** What a confirmation dialog shows (`useConfirmDialog().confirm(options)`). */
export interface ConfirmOptions {
  title: string;
  /**
   * The body. May be a React node for a host's own dialog content; the package's own confirmations (discard changes,
   * clear translations) always pass plain text, so a host confirmation service that takes text only can render them.
   */
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `destructive` for an irreversible step (discard, delete). */
  confirmVariant?: 'default' | 'destructive';
  /**
   * A phrase the user types before the confirm button turns on (the entity's name before deleting it). Compared
   * exactly, after trimming the typed text.
   */
  requirePhrase?: string;
  /** The label of the phrase field, already translated; default "Type “<phrase>” to confirm". */
  requirePhraseLabel?: string;
}

export interface ConfirmDialogApi {
  /** Opens the dialog; resolves `true` on confirm, `false` on cancel / Esc / overlay. */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** Render once where the hook is used. */
  dialog: ReactNode;
}

let warnedMissingConfirmProvider = false;

/**
 * `useConfirm()` below no `AdminUiProvider`: nothing to ask with, so the answer is `false` (the step does not run);
 * warns once outside production.
 */
export const confirmWithoutProvider = (_options: ConfirmOptions): Promise<boolean> => {
  if (!warnedMissingConfirmProvider && process.env.NODE_ENV !== 'production') {
    warnedMissingConfirmProvider = true;
    console.warn('useConfirm: no AdminUiProvider above this component; confirmations answer false.');
  }
  return Promise.resolve(false);
};

/** The one "Discard changes?" confirmation. */
export const DISCARD_CHANGES_CONFIRM: ConfirmOptions = {
  title: m('Discard changes?'),
  description: m('You have unsaved changes. Closing now will lose them.'),
  confirmLabel: 'Discard',
  cancelLabel: m('Keep editing'),
  confirmVariant: 'destructive',
};
