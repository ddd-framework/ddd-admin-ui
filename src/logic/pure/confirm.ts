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
}

export interface ConfirmDialogApi {
  /** Opens the dialog; resolves `true` on confirm, `false` on cancel / Esc / overlay. */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** Render once where the hook is used. */
  dialog: ReactNode;
}

/** The one "Discard changes?" confirmation. */
export const DISCARD_CHANGES_CONFIRM: ConfirmOptions = {
  title: m('Discard changes?'),
  description: m('You have unsaved changes. Closing now will lose them.'),
  confirmLabel: 'Discard',
  cancelLabel: m('Keep editing'),
  confirmVariant: 'destructive',
};
