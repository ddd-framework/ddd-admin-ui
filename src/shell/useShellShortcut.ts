'use client';

import { useEffect, useRef } from 'react';

/** The key that collapses / expands the desktop sidebar (⌘B is bold in text editors). */
export const SIDEBAR_SHORTCUT_KEY = '[';

/** The desktop breakpoint of the shell (`lg`): the sidebar column shows from here, the mobile menu below. */
export const SHELL_DESKTOP_QUERY = '(min-width: 64rem)';

/** Where a key press belongs to typing or to an open layer (the column behind a dialog or menu must not move). */
export const SHELL_SHORTCUT_IGNORED_SELECTOR =
  'input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="textbox"], [role="combobox"], [role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]';

const isIgnoredTarget = (target: EventTarget | null, extraSelector?: string): boolean =>
  target instanceof Element &&
  ((target instanceof HTMLElement && target.isContentEditable) ||
    target.closest(extraSelector ? `${SHELL_SHORTCUT_IGNORED_SELECTOR}, ${extraSelector}` : SHELL_SHORTCUT_IGNORED_SELECTOR) !== null);

export interface ShellShortcutOptions {
  /** The media query the shortcut works under (default `SHELL_DESKTOP_QUERY`); `null`: at every width. */
  media?: string | null;
  /** More places where the key is ignored (a selector added to the built-in typing and layer selector). */
  ignoreSelector?: string;
}

/**
 * A single-key shortcut on `document` for the desktop shell: calls `onPress` for `key` without a modifier, ignored while
 * typing (inputs, textareas, selects, editable regions), inside an open dialog or menu, on auto-repeat, when another
 * handler already took the event, and below the desktop breakpoint (the sidebar is not shown there). `null` turns it
 * off. Prevents the default when it acts. `options`: another media query (`media`, `null`: every width) and more ignored
 * places (`ignoreSelector`).
 */
export const useShellShortcut = (key: string | null, onPress: () => void, options: ShellShortcutOptions = {}): void => {
  const media = options.media === undefined ? SHELL_DESKTOP_QUERY : options.media;
  const { ignoreSelector } = options;
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
      if (isIgnoredTarget(event.target, ignoreSelector)) return;
      if (media !== null && !window.matchMedia(media).matches) return;
      event.preventDefault();
      onPressRef.current();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [key, media, ignoreSelector]);
};
