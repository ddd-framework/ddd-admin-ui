import type { ReactNode } from 'react';

import { m } from '../../i18n/store.ts';

/** What a confirmation dialog shows (`useConfirmDialog().confirm(options)`). */
export interface ConfirmOptions {
  title: string;
  /**
   * The body. May be a React node for a host's own dialog content; the package's own confirmations (discard changes,
   * clear translations) always pass plain text, so a host confirmation service that takes text only can render them.
   * Block content (paragraphs, a list) is fine: the package dialog renders a non-text description in a `<div>`.
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

/**
 * Whether a confirmation's description is text a text-only host service can show: absent, a string or a number.
 * Anything else (an element, a fragment, an array) is a node (`AdminUiProvider.confirmWithRichDescription`).
 */
export const isTextConfirmDescription = (description: ConfirmOptions['description']): boolean =>
  description === undefined || description === null || typeof description === 'string' || typeof description === 'number';

/** The services `AdminUiProvider` routes a confirmation to (the host's, and the ones for phrases and node descriptions). */
export interface ConfirmRoutes<TConfirm> {
  host: TConfirm;
  /** Confirmations with `requirePhrase` (`confirmWithPhrase`). */
  phrase?: TConfirm;
  /** Confirmations whose description is not text (`confirmWithRichDescription`). */
  richDescription?: TConfirm;
}

/**
 * Who answers one confirmation: a phrase confirmation goes to `phrase` (when set), a node description to
 * `richDescription` (when set), everything else to `host`.
 */
export const routeConfirm = <TConfirm>(options: ConfirmOptions, routes: ConfirmRoutes<TConfirm>): TConfirm => {
  if (options.requirePhrase !== undefined && routes.phrase) return routes.phrase;
  if (routes.richDescription && !isTextConfirmDescription(options.description)) return routes.richDescription;
  return routes.host;
};

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
