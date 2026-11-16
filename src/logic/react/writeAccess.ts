'use client';

import { createContext, createElement, type ReactNode, useContext, useMemo } from 'react';

import { narrowWriteAccess, WRITE_ACCESS_ALLOWED, type WriteAccess } from '../pure/writeAccess.ts';

/** The write access of the subtree (`WriteAccessProvider`); no provider = allowed. */
export const WriteAccessContext = createContext<WriteAccess>(WRITE_ACCESS_ALLOWED);

export interface WriteAccessProviderProps {
  /** `{ allowed, reason? }`; nested providers can only narrow (an outer `allowed: false` stays). */
  value: WriteAccess;
  children?: ReactNode;
}

/**
 * Sets whether the controls below may write, as a presentation aid: `FormSubmitButton`, the actions of
 * `EntityListBulkBar` and `AddEntityButton` as a button are disabled while it is `false` (a link never). The handlers
 * keep their own guard and the server its check.
 */
export const WriteAccessProvider = ({ value, children }: WriteAccessProviderProps) => {
  const parent = useContext(WriteAccessContext);
  const merged = useMemo(() => narrowWriteAccess(parent, value), [parent, value.allowed, value.reason]);
  return createElement(WriteAccessContext.Provider, { value: merged }, children);
};

/** The write access of the nearest `WriteAccessProvider` (`{ allowed: true }` without one). */
export const useWriteAccess = (): WriteAccess => useContext(WriteAccessContext);
