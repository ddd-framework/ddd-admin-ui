'use client';

import { useEffect, useRef } from 'react';

/** The containers the shortcut keeps to: dialogs and drawers. */
export const SAVE_SHORTCUT_CONTAINER_SELECTOR = '[role="dialog"],[role="alertdialog"]';

export interface SaveShortcutTargets {
  form: HTMLFormElement | null;
  /** The actions element (may be portalled out of the form: a drawer footer, a header slot). */
  actions: HTMLElement | null;
}

const isSaveKey = (event: KeyboardEvent) =>
  (event.metaKey || event.ctrlKey) && !event.altKey && typeof event.key === 'string' && event.key.toLowerCase() === 's';

type SubmitControl = HTMLButtonElement | HTMLInputElement;

const isSubmitControl = (element: Element): element is SubmitControl =>
  (element instanceof HTMLButtonElement && element.type === 'submit') ||
  (element instanceof HTMLInputElement && (element.type === 'submit' || element.type === 'image'));

/** The actions' own submit button linked to `form`, else any submit button the form owns (`form.elements`). */
export const findShortcutSubmitter = (form: HTMLFormElement, actions: HTMLElement | null): SubmitControl | null => {
  const own = actions
    ? [...actions.querySelectorAll('button, input')].find(
        (element): element is SubmitControl => isSubmitControl(element) && element.form === form
      )
    : undefined;
  return own ?? [...form.elements].find(isSubmitControl) ?? null;
};

/**
 * Whether ⌘S / Ctrl+S with focus on `target` belongs to this form. In a dialog or drawer: anywhere inside the
 * innermost container holding the target, when that is the actions' (or the form's) container. Elsewhere: focus in
 * the form, on the actions, or nowhere (`body`, `documentElement`).
 */
export const isSaveShortcutInScope = (target: EventTarget | null, { form, actions }: SaveShortcutTargets): boolean => {
  if (!form) return false;
  const element = target instanceof Element ? target : null;
  const container =
    actions?.closest(SAVE_SHORTCUT_CONTAINER_SELECTOR) ?? form.closest(SAVE_SHORTCUT_CONTAINER_SELECTOR);
  if (container) return element !== null && element.closest(SAVE_SHORTCUT_CONTAINER_SELECTOR) === container;
  if (element === null || element === document.body || element === document.documentElement) return true;
  if (form.contains(element) || (actions?.contains(element) ?? false)) return true;
  return 'form' in element && (element as { form: unknown }).form === form;
};

/**
 * ⌘S / Ctrl+S submits the form, listened for on `document` (`isSaveShortcutInScope`). In scope it calls
 * `preventDefault` (also while the submit button is disabled: nothing is submitted then); an event already
 * `defaultPrevented` is left alone, so of two forms only one answers. Submits with
 * `form.requestSubmit(findShortcutSubmitter(…))`, so the form's validation and `onSubmit` run.
 */
export const useSaveShortcut = (getTargets: () => SaveShortcutTargets) => {
  const latest = useRef(getTargets);
  latest.current = getTargets;
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || !isSaveKey(event)) return;
      const targets = latest.current();
      const form = targets.form;
      if (!form || !form.isConnected || !isSaveShortcutInScope(event.target, targets)) return;
      event.preventDefault();
      const submitter = findShortcutSubmitter(form, targets.actions);
      if (submitter && !submitter.disabled) form.requestSubmit(submitter);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
};
