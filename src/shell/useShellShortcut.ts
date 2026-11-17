'use client';

import { useEffect, useRef } from 'react';

/** The key that collapses / expands the desktop sidebar (⌘B is bold in text editors). */
export const SIDEBAR_SHORTCUT_KEY = '[';

/** The desktop breakpoint of the shell (`lg`): the sidebar column shows from here, the mobile menu below. */
export const SHELL_DESKTOP_QUERY = '(min-width: 64rem)';

/** A key press that belongs to typing or to an open layer (the column behind a dialog or menu must not move). */
const isIgnoredTarget = (target: EventTarget | null): boolean =>
  target instanceof Element &&
  ((target instanceof HTMLElement && target.isContentEditable) ||
    target.closest(
      'input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="textbox"], [role="combobox"], [role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]'
    ) !== null);

/**
 * A single-key shortcut on `document` for the desktop shell: calls `onPress` for `key` without a modifier, ignored while
 * typing (inputs, textareas, selects, editable regions), inside an open dialog or menu, on auto-repeat, when another
 * handler already took the event, and below the desktop breakpoint (the sidebar is not shown there). `null` turns it
 * off. Prevents the default when it acts.
 */
export const useShellShortcut = (key: string | null, onPress: () => void): void => {
  // the latest callback without re-subscribing on every render
  const onPressRef = useRef(onPress);
  useEffect(() => {
    onPressRef.current = onPress;
  }, [onPress]);

  useEffect(() => {
    if (key === null) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== key || event.defaultPrevented || event.repeat) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isIgnoredTarget(event.target)) return;
      if (!window.matchMedia(SHELL_DESKTOP_QUERY).matches) return;
      event.preventDefault();
      onPressRef.current();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [key]);
};
