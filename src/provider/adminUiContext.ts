'use client';

import { createContext, useContext } from 'react';

import { defaultStorageKey } from './storageKey.ts';
import type { AdminUiContextValue } from './types.ts';

/** The provider's host adapters; set by `AdminUiProvider`. */
export const AdminUiContext = createContext<AdminUiContextValue | null>(null);

const DEFAULT_CONTEXT: AdminUiContextValue = { storageKey: defaultStorageKey };

/** The provider's host adapters; outside a provider the defaults (default storage keys, no adapters). */
export const useAdminUi = (): AdminUiContextValue => useContext(AdminUiContext) ?? DEFAULT_CONTEXT;
