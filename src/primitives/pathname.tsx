'use client';

import { createContext, type ReactNode, useContext, useSyncExternalStore } from 'react';

/**
 * A hook that answers the current pathname (without query, hash or base path) — the router's, passed in because the
 * blocks import no router: `useNextPathname` from `./next`, or the host's own. `null` while it is not known (the
 * fallback during a server render). Passed by reference: a module-level function, the same identity on every render.
 */
export type UsePathname = () => string | null;

const subscribeToHistory = (onChange: () => void) => {
  window.addEventListener('popstate', onChange);
  return () => window.removeEventListener('popstate', onChange);
};
const browserPathname = () => window.location.pathname;
const noPathname = () => null;

/**
 * The fallback without a host adapter: `location.pathname`, read after hydration (`null` on the server and while
 * hydrating), updated on back / forward only. A client router that pushes history entries needs its adapter.
 */
export const useBrowserPathname: UsePathname = () => useSyncExternalStore(subscribeToHistory, browserPathname, noPathname);

export const PathnameContext = createContext<UsePathname>(useBrowserPathname);

export interface PathnameProviderProps {
  usePathname: UsePathname;
  children: ReactNode;
}

/** Hands one pathname hook to every block below it (set once by `AdminUiProvider.usePathname`). */
export const PathnameProvider = ({ usePathname, children }: PathnameProviderProps) => (
  <PathnameContext.Provider value={usePathname}>{children}</PathnameContext.Provider>
);

/** The current pathname from the nearest provider's hook (else `location.pathname` after hydration). */
export const useCurrentPathname = (): string | null => {
  const usePathname = useContext(PathnameContext);
  return usePathname();
};
