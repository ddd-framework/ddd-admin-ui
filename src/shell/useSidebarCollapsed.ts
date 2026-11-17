'use client';

import { useCallback, useSyncExternalStore } from 'react';

import { readStored, writeStored } from '../logic/browser/storage.ts';

/** The default key of the collapsed sidebar (localStorage); a host with several areas passes one per area. */
export const SIDEBAR_COLLAPSED_STORAGE_KEY = 'ddd-admin-ui.sidebar.collapsed';

/** Same-tab listeners per key (the `storage` event only reaches the other tabs). */
const listeners = new Map<string, Set<() => void>>();
/** This visit's value when the storage refuses (private mode, blocked site data). */
const memory = new Map<string, boolean>();

/** `'1'` = rail, `'0'` = expanded; nothing stored = this visit's value, else expanded. */
const readCollapsed = (key: string): boolean => {
  const stored = readStored('local', key);
  return stored === null ? (memory.get(key) ?? false) : stored === '1';
};

const subscribeTo = (key: string, onChange: () => void) => {
  const keyListeners = listeners.get(key) ?? new Set<() => void>();
  keyListeners.add(onChange);
  listeners.set(key, keyListeners);
  // another tab collapsed or expanded the same sidebar: follow it
  const onStorage = (event: StorageEvent) => {
    if (event.key === key) onChange();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    keyListeners.delete(onChange);
    window.removeEventListener('storage', onStorage);
  };
};

const expandedOnServer = () => false;

/**
 * Whether the desktop sidebar is the icon rail, remembered in localStorage under `storageKey` (guarded: with blocked
 * storage it still toggles, for this visit). Hydration-safe: `false` (expanded) in the server render and while
 * hydrating, the stored value right after; a client-only mount reads it at once. Every sidebar with the same key, in
 * this tab and in others, follows a change. Returns `[collapsed, setCollapsed]`; `setCollapsed()` toggles.
 */
export const useSidebarCollapsed = (
  storageKey: string = SIDEBAR_COLLAPSED_STORAGE_KEY
): [collapsed: boolean, setCollapsed: (next?: boolean) => void] => {
  const subscribe = useCallback((onChange: () => void) => subscribeTo(storageKey, onChange), [storageKey]);
  const collapsed = useSyncExternalStore(subscribe, () => readCollapsed(storageKey), expandedOnServer);
  const setCollapsed = useCallback(
    (next?: boolean) => {
      const value = next ?? !readCollapsed(storageKey);
      memory.set(storageKey, value);
      writeStored('local', storageKey, value ? '1' : '0');
      for (const listener of listeners.get(storageKey) ?? []) listener();
    },
    [storageKey]
  );
  return [collapsed, setCollapsed];
};
