'use client';

import { createContext, useContext } from 'react';

/** A drawer's scrolling body and the footer pinned below it, once both are mounted. */
export interface DrawerFooterSlot {
  bodyElement: HTMLElement;
  footerElement: HTMLElement;
}

export const DrawerFooterSlotContext = createContext<DrawerFooterSlot | null>(null);

/** True inside a drawer's body. Set from the first render, unlike the footer slot. */
export const DrawerSurfaceContext = createContext(false);

export const useIsInDrawer = (): boolean => useContext(DrawerSurfaceContext);
