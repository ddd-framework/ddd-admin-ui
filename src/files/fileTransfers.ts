import type { FileExportTarget, FileExportsCapability, FileImportsCapability, FileManagerCapabilities } from './fileManagerAdapter.ts';
import { type FileView, isFileReleased } from './fileView.ts';

/** Copies into and out of the file manager that a host adds around a manager it does not build itself. */
export interface FileTransfers {
  imports?: FileImportsCapability;
  exports?: FileExportsCapability;
}

/**
 * The files a target takes of the given ones: released (a file still checked, blocked or failed is never copied
 * out), not a trashed folder, and accepted by the target (`accepts`; absent = every file).
 */
export const filesForExportTarget = (target: Pick<FileExportTarget, 'accepts'>, files: readonly FileView[]): FileView[] =>
  files.filter(file => !file.isFolder && isFileReleased(file.scanStatus) && (target.accepts?.(file) ?? true));

/** The targets that take at least one of the files, in the capability's order. */
export const exportTargetsFor = (exportsCapability: FileExportsCapability | undefined, files: readonly FileView[]): FileExportTarget[] =>
  (exportsCapability?.targets ?? []).filter(target => filesForExportTarget(target, files).length > 0);

/**
 * The adapter's capabilities with the host's transfers added: the adapter's own `imports` / `exports` win, the
 * transfers fill what it leaves out. Returns the capabilities unchanged (same identity) when nothing is added.
 */
export const withFileTransfers = (
  capabilities: FileManagerCapabilities | undefined,
  transfers: FileTransfers | null | undefined
): FileManagerCapabilities | undefined => {
  const imports = capabilities?.imports ?? transfers?.imports;
  const exportsCapability = capabilities?.exports ?? transfers?.exports;
  if (imports === capabilities?.imports && exportsCapability === capabilities?.exports) return capabilities;
  return { ...capabilities, imports, exports: exportsCapability };
};
