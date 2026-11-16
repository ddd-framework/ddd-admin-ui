'use client';

import { createContext, useContext, useEffect, useLayoutEffect, useMemo } from 'react';
import { setTranslations } from '../i18n/store.ts';
import { setNotificationAdapter } from '../logic/pure/notify.ts';
import { PortalContainerProvider } from '../primitives/portalContainer.tsx';
import type { AdminUiContextValue, AdminUiProviderProps, StorageKeyFn } from './types.ts';

export const defaultStorageKey: StorageKeyFn = (kind, id) => `ddd-admin-ui.${kind}.${id}`;

const AdminUiContext = createContext<AdminUiContextValue>({ storageKey: defaultStorageKey });

/** Wires the host's adapters into the package. Adapters passed to a block directly win over these. */
export const AdminUiProvider = ({
  children,
  translations,
  notifications,
  storageKey = defaultStorageKey,
  portalContainer = null,
  upload,
}: AdminUiProviderProps) => {
  useLayoutEffect(() => {
    if (!notifications) return undefined;
    setNotificationAdapter(notifications);
    return () => setNotificationAdapter(null);
  }, [notifications]);

  useEffect(() => {
    if (!translations) return undefined;
    const apply = () => {
      const snapshot = translations.getSnapshot();
      setTranslations(snapshot.languageCode, snapshot.writingStyle, snapshot.translations);
    };
    apply();
    return translations.subscribe(apply);
  }, [translations]);

  const value = useMemo<AdminUiContextValue>(() => ({ storageKey, ...(upload ? { upload } : {}) }), [storageKey, upload]);
  return (
    <AdminUiContext.Provider value={value}>
      <PortalContainerProvider container={portalContainer}>{children}</PortalContainerProvider>
    </AdminUiContext.Provider>
  );
};

/** The adapters of the nearest provider (defaults without one). */
export const useAdminUi = (): AdminUiContextValue => useContext(AdminUiContext);
