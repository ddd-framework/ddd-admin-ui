'use client';

import { createContext, useContext, type ReactNode } from 'react';

/**
 * The element overlays portal into. Lives in `primitives` (primitives read it); the provider renders it.
 * `null` = `document.body`.
 */
const PortalContainerContext = createContext<HTMLElement | null>(null);

export const PortalContainerProvider = ({
  container,
  children,
}: {
  container: HTMLElement | null;
  children: ReactNode;
}) => <PortalContainerContext.Provider value={container}>{children}</PortalContainerContext.Provider>;

/** The portal container of the nearest provider, or `undefined` (= `document.body`). */
export const usePortalContainer = (): HTMLElement | undefined => useContext(PortalContainerContext) ?? undefined;
