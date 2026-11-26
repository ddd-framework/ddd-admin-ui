import type { FileListOrder, FileManagerActions, FileManagerCapabilities } from './fileManagerAdapter.ts';

/** What the manager offers: each flag is a capability together with the actions it needs. */
export interface FileManagerFeatures {
  trash: boolean;
  restore: boolean;
  purge: boolean;
  emptyTrash: boolean;
  versions: boolean;
  replaceVersion: boolean;
  restoreVersion: boolean;
  deleteOlderVersions: boolean;
  /** Text files are edited in place (`saveText` and `saveTextAsCopy`). */
  editText: boolean;
  activity: boolean;
  links: boolean;
  editLinks: boolean;
  bulkLinks: boolean;
  moveAcrossAreas: boolean;
  familyFilter: boolean;
  createdFilter: boolean;
  uploadedByMeFilter: boolean;
  orders: readonly FileListOrder[];
  workingCopy: boolean;
  malwareScan: boolean;
  /** The drawer's "Accesses" tab (`activity.useAccessEvents`). */
  accesses: boolean;
  /** Pasted locations beyond the folder tree (`location.resolveLocation`). */
  resolveLocation: boolean;
  /** The reader is a partner: no staff-only control. */
  partner: boolean;
  /** Copies from other stores into the open folder (capability `imports` with at least one source). */
  imports: boolean;
  /** Copies of files into other stores (capability `exports` with at least one target). */
  exports: boolean;
}

/**
 * Resolves the adapter's capabilities against its actions: a control appears only when both are there (a capability
 * without the action it needs offers nothing, an action without its capability is ignored).
 */
export const resolveFileManagerFeatures = (
  capabilities: FileManagerCapabilities | undefined,
  actions: Partial<FileManagerActions>
): FileManagerFeatures => {
  const trash = capabilities?.trash !== undefined;
  const partner = capabilities?.audience === 'partner';
  const versions = capabilities?.versions !== undefined;
  const links = capabilities?.links !== undefined && capabilities.links.kinds.length > 0;
  const orders = capabilities?.filters?.orders?.length ? capabilities.filters.orders : (['name'] as const);
  return {
    trash,
    restore: trash && actions.restoreFiles !== undefined,
    purge: trash && !partner && actions.purgeFiles !== undefined,
    emptyTrash: trash && !partner && actions.emptyTrash !== undefined,
    versions,
    replaceVersion: versions && actions.uploadVersion !== undefined,
    restoreVersion: versions && actions.restoreVersion !== undefined,
    deleteOlderVersions: versions && actions.deleteOlderVersions !== undefined,
    editText: versions && actions.saveText !== undefined && actions.saveTextAsCopy !== undefined,
    activity: capabilities?.activity !== undefined,
    links,
    editLinks: links && actions.setLinks !== undefined,
    bulkLinks: links && actions.bulkLinks !== undefined,
    moveAcrossAreas: capabilities?.moveAcrossAreas !== undefined && actions.moveItems !== undefined && actions.previewMove !== undefined,
    familyFilter: capabilities?.filters?.family === true,
    createdFilter: capabilities?.filters?.created === true,
    uploadedByMeFilter: capabilities?.filters?.uploadedByMe === true,
    orders,
    workingCopy: capabilities?.workingCopy !== undefined,
    malwareScan: capabilities?.malwareScan?.enabled !== false,
    accesses: capabilities?.activity?.useAccessEvents !== undefined,
    resolveLocation: capabilities?.location !== undefined,
    partner,
    imports: (capabilities?.imports?.sources.length ?? 0) > 0,
    exports: (capabilities?.exports?.targets.length ?? 0) > 0,
  };
};
