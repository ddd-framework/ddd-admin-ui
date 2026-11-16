'use client';

import { createContext, type ReactNode, useCallback, useContext, useLayoutEffect, useMemo, useState } from 'react';

import { cn } from './cn.ts';

interface FormActionsSlotRegistry {
  /** The mounted slots of this provider, in mount order. */
  slots: readonly HTMLElement[];
  register: (slot: HTMLElement) => () => void;
}

const FormActionsSlotContext = createContext<FormActionsSlotRegistry | null>(null);

export interface FormActionsSlotProviderProps {
  children?: ReactNode;
}

/**
 * The scope of header slots for `FormActions`: wrap a page's header and its form (`EntityDetailShell
 * formActionsSlot` brings its own). A `FormActions` below it portals into the slot closest above it; the nearest
 * provider counts.
 */
export const FormActionsSlotProvider = ({ children }: FormActionsSlotProviderProps) => {
  const [slots, setSlots] = useState<readonly HTMLElement[]>([]);
  const register = useCallback((slot: HTMLElement) => {
    setSlots(current => (current.includes(slot) ? current : [...current, slot]));
    return () => setSlots(current => current.filter(candidate => candidate !== slot));
  }, []);
  const registry = useMemo(() => ({ slots, register }), [slots, register]);
  return <FormActionsSlotContext.Provider value={registry}>{children}</FormActionsSlotContext.Provider>;
};

export interface FormActionsSlotProps {
  className?: string;
}

/**
 * Where a form's `FormActions` show in a header (`placement` `auto` or `header`): an empty element, hidden while empty,
 * registered with the nearest `FormActionsSlotProvider`. Without a provider it stays empty.
 */
export const FormActionsSlot = ({ className }: FormActionsSlotProps) => {
  const registry = useContext(FormActionsSlotContext);
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const register = registry?.register;
  useLayoutEffect(() => (element && register ? register(element) : undefined), [element, register]);
  return <div ref={setElement} data-form-actions-slot="" className={cn('flex items-center empty:hidden', className)} />;
};

/**
 * The slot for actions written at `anchor`: of the nearest provider's slots, the last one before the anchor in
 * document order (the closest above the form). `null` without a provider, a slot or an anchor.
 */
export const useFormActionsSlotFor = (anchor: Element | null): HTMLElement | null => {
  const registry = useContext(FormActionsSlotContext);
  if (!registry || !anchor) return null;
  let closest: HTMLElement | null = null;
  for (const slot of registry.slots) {
    if (!slot.isConnected || slot.contains(anchor)) continue;
    // the anchor follows the slot: the slot is above it
    if (!(slot.compareDocumentPosition(anchor) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
    if (!closest || closest.compareDocumentPosition(slot) & Node.DOCUMENT_POSITION_FOLLOWING) closest = slot;
  }
  return closest;
};
