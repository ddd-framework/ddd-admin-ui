'use client';

import { useCallback, useSyncExternalStore } from 'react';

import { readStored, writeStored } from '../logic/browser/storage.ts';

/** The default key of the collapsed sidebar (localStorage); a host with several areas passes one per area. */
export const SIDEBAR_COLLAPSED_STORAGE_KEY = 'ddd-admin-ui.sidebar.collapsed';

/** Same-tab listeners per key (the `storage` event only reaches the other tabs). */
const listeners = new Map<string, Set<() => void>>();
/** This visit's value when the storage refuses (private mode, blocked site data). */
const memory = new Map<string, boolean>();

/** The stored strings of the two states. */
export interface SidebarCollapsedStorageValues {
  collapsed: string;
  expanded: string;
}

/** The default stored strings: `'1'` = rail, `'0'` = expanded. */
export const SIDEBAR_COLLAPSED_STORAGE_VALUES: SidebarCollapsedStorageValues = { collapsed: '1', expanded: '0' };

export interface UseSidebarCollapsedOptions {
  /** The strings stored for the two states (e.g. `{ collapsed: 'true', expanded: 'false' }` of an older frame). */
  values?: SidebarCollapsedStorageValues;
}

/** The stored collapsed string means rail; anything else stored means expanded; nothing stored = this visit's value, else expanded. */
const readCollapsed = (key: string, values: SidebarCollapsedStorageValues = SIDEBAR_COLLAPSED_STORAGE_VALUES): boolean => {
  const stored = readStored('local', key);
  return stored === null ? (memory.get(key) ?? false) : stored === values.collapsed;
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
 * this tab and in others, follows a change. Returns `[collapsed, setCollapsed]`; `setCollapsed()` toggles. `values`: the
 * stored strings (default `'1'` / `'0'`).
 */
export const useSidebarCollapsed = (
  storageKey: string = SIDEBAR_COLLAPSED_STORAGE_KEY,
  options: UseSidebarCollapsedOptions = {}
): [collapsed: boolean, setCollapsed: (next?: boolean) => void] => {
  const collapsedValue = options.values?.collapsed ?? SIDEBAR_COLLAPSED_STORAGE_VALUES.collapsed;
  const expandedValue = options.values?.expanded ?? SIDEBAR_COLLAPSED_STORAGE_VALUES.expanded;
  const subscribe = useCallback((onChange: () => void) => subscribeTo(storageKey, onChange), [storageKey]);
  const collapsed = useSyncExternalStore(
    subscribe,
    () => readCollapsed(storageKey, { collapsed: collapsedValue, expanded: expandedValue }),
    expandedOnServer
  );
  const setCollapsed = useCallback(
    (next?: boolean) => {
      const value = next ?? !readCollapsed(storageKey, { collapsed: collapsedValue, expanded: expandedValue });
      memory.set(storageKey, value);
      writeStored('local', storageKey, value ? collapsedValue : expandedValue);
      for (const listener of listeners.get(storageKey) ?? []) listener();
    },
    [storageKey, collapsedValue, expandedValue]
  );
  return [collapsed, setCollapsed];
};
