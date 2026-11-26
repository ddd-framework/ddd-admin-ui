'use client';

import { createContext, type ReactNode, useContext } from 'react';

import type { FileTransfers } from './fileTransfers.ts';

const FileTransfersContext = createContext<FileTransfers | null>(null);

export interface FileTransfersProviderProps {
  /** Keep its identity (module scope or `useMemo`): every file manager below reads it once per render. */
  value: FileTransfers;
  children: ReactNode;
}

/**
 * Adds copies into and out of every file manager below it (capabilities `imports` and `exports`) for a host that
 * renders a manager built by another package (a drive screen): the adapter's own capabilities win.
 */
export const FileTransfersProvider = ({ value, children }: FileTransfersProviderProps) => (
  <FileTransfersContext.Provider value={value}>{children}</FileTransfersContext.Provider>
);

/** The transfers of the nearest `FileTransfersProvider`, or `null`. */
export const useFileTransfers = (): FileTransfers | null => useContext(FileTransfersContext);
