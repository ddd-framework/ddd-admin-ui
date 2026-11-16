'use client';

import { useEffect, useLayoutEffect, useMemo } from 'react';

import { setTranslations } from '../i18n/store.ts';
import { setNotificationAdapter } from '../logic/pure/notify.ts';
import { LinkComponentProvider } from '../primitives/link.tsx';
import { PortalContainerProvider } from '../primitives/portal.tsx';
import { TooltipProvider } from '../primitives/tooltip.tsx';
import { AdminUiContext } from './adminUiContext.ts';
import { defaultStorageKey } from './storageKey.ts';
import type { AdminUiContextValue, AdminUiProviderProps, TranslationAdapter } from './types.ts';


/** Keeps the package's translation store on the host store's current snapshot. */
const TranslationBridge = ({ adapter }: { adapter: TranslationAdapter }) => {
  useEffect(() => {
    const apply = () => {
      const snapshot = adapter.getSnapshot();
      setTranslations(snapshot.languageCode, snapshot.writingStyle, snapshot.translations);
    };
    apply();
    return adapter.subscribe(apply);
  }, [adapter]);
  return null;
};

/**
 * The one provider of the package: registers the host's notification adapter, feeds the translation store from a
 * host store, renders the tooltip provider and the portal container, and hands the host adapters (storage keys,
 * router hooks, upload, markdown editor, AI translation) to packaged screens through `useAdminUi()`, and sets the link
 * component of every block (`linkComponent`). Blocks never read `useAdminUi()`: they take adapters as props.
 */
export const AdminUiProvider = ({
  children,
  translations,
  notifications,
  storageKey = defaultStorageKey,
  useUrlStateAdapter,
  useDrawerUrlAdapter,
  portalContainer,
  tooltipDelayMs,
  upload,
  renderMarkdownEditor,
  aiTranslation,
  preserveSearchParams,
  linkComponent,
}: AdminUiProviderProps) => {
  // A layout effect: registered before any child's ordinary effect can raise a toast.
  useLayoutEffect(() => {
    if (!notifications) return;
    setNotificationAdapter(notifications);
    return () => setNotificationAdapter(null);
  }, [notifications]);

  const value = useMemo<AdminUiContextValue>(
    () => ({
      storageKey,
      useUrlStateAdapter,
      useDrawerUrlAdapter,
      upload,
      renderMarkdownEditor,
      aiTranslation,
      preserveSearchParams,
    }),
    [storageKey, useUrlStateAdapter, useDrawerUrlAdapter, upload, renderMarkdownEditor, aiTranslation, preserveSearchParams]
  );

  return (
    <AdminUiContext.Provider value={value}>
      {translations && <TranslationBridge adapter={translations} />}
      <TooltipProvider delayDuration={tooltipDelayMs}>
        <PortalContainerProvider container={portalContainer}>
          {linkComponent ? <LinkComponentProvider linkComponent={linkComponent}>{children}</LinkComponentProvider> : children}
        </PortalContainerProvider>
      </TooltipProvider>
    </AdminUiContext.Provider>
  );
};
