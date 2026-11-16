'use client';

import { createContext, type ReactNode, useContext } from 'react';

/**
 * Where the portalled primitives (dialog, sheet, popover, select, dropdown menu, tooltip) mount their content.
 * `undefined` (the default, no provider) and `null` mean `document.body`, as Radix does without a container.
 */
export type PortalContainer = HTMLElement | null | undefined;

export const PortalContainerContext = createContext<PortalContainer>(undefined);

export interface PortalContainerProviderProps {
  container: PortalContainer;
  children: ReactNode;
}

/** Sends every portalled primitive below it into `container` (e.g. a host's own overlay root or a shadow root). */
export const PortalContainerProvider = ({ container, children }: PortalContainerProviderProps) => (
  <PortalContainerContext.Provider value={container}>{children}</PortalContainerContext.Provider>
);

/** The portal container of the nearest `PortalContainerProvider`; `undefined` without one. */
export const usePortalContainer = (): PortalContainer => useContext(PortalContainerContext);
