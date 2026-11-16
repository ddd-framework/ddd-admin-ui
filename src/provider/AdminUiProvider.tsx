'use client';

import { useEffect, useLayoutEffect, useMemo, useState } from 'react';

import { setTranslations } from '../i18n/store.ts';
import type { ConfirmOptions } from '../logic/pure/confirm.ts';
import { createConfirmQueue } from '../logic/pure/confirmQueue.ts';
import { setNotificationAdapter } from '../logic/pure/notify.ts';
import { ConfirmContext } from '../logic/react/useConfirm.ts';
import { LinkComponentProvider } from '../primitives/link.tsx';
import { PortalContainerProvider } from '../primitives/portal.tsx';
import { TooltipProvider } from '../primitives/tooltip.tsx';
import { AdminUiContext } from './adminUiContext.ts';
import { ConfirmHost } from './ConfirmHost.tsx';
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
 * router hooks, upload, markdown editor, AI translation) to packaged screens through `useAdminUi()`, sets the link
 * component of every block (`linkComponent`), and answers `useConfirm()` (the package dialog, or the host's `confirm`).
 * Blocks never read `useAdminUi()`: they take adapters as props.
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
  confirm: hostConfirm,
}: AdminUiProviderProps) => {
  const [confirmQueue] = useState(() => createConfirmQueue<ConfirmOptions>());
  const confirm = hostConfirm ?? confirmQueue.request;

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
          <ConfirmContext.Provider value={confirm}>
            {linkComponent ? <LinkComponentProvider linkComponent={linkComponent}>{children}</LinkComponentProvider> : children}
            {hostConfirm ? null : <ConfirmHost queue={confirmQueue} />}
          </ConfirmContext.Provider>
        </PortalContainerProvider>
      </TooltipProvider>
    </AdminUiContext.Provider>
  );
};
