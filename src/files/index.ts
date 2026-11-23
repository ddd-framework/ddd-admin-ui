// The files entry: a generic file manager on the host's API (`FileManagerAdapter` with optional capabilities): folder
// tree, grid / table, search and filters, upload tray, drag and drop moves, the details drawer with preview, versions
// and activity, the trash, links and moves into other areas.

export { FileManager } from './FileManager.tsx';
export type {
  FileAreaMaintenanceSlotProps,
  FileAreaPickerSlotProps,
  FileAreaSettingsSlotProps,
  FileManagerContext,
  FileManagerProps,
} from './FileManager.tsx';
export type {
  FileActivityCapability,
  FileBulkLinksInput,
  FileDownloadOptions,
  FileFiltersCapability,
  FileLinkKind,
  FileLinkSet,
  FileLinksCapability,
  FileListOrder,
  FileListQuery,
  FileListState,
  FileManagerActions,
  FileManagerAdapter,
  FileManagerCapabilities,
  FileMoveAcrossAreasCapability,
  FileMoveInput,
  FileMoveResult,
  FilePatch,
  FileQueryState,
  FileTrashCapability,
  FileTrashQuery,
  FileUploadInput,
  FileVersionsCapability,
  FileWorkingCopyCapability,
  FolderCreateInput,
  FolderDeleteResult,
  FolderPatch,
  LinkTargetsQuery,
} from './fileManagerAdapter.ts';
export { resolveFileManagerFeatures } from './fileManagerFeatures.ts';
export type { FileManagerFeatures } from './fileManagerFeatures.ts';
export { FileBreadcrumbs } from './FileBreadcrumbs.tsx';
export type { FileBreadcrumbsProps } from './FileBreadcrumbs.tsx';
export { FileCard } from './FileCard.tsx';
export type { FileCardProps, FileCardSelection } from './FileCard.tsx';
export { FileDrawer, FILE_EVENT_LABELS } from './FileDrawer.tsx';
export type { FileDrawerProps } from './FileDrawer.tsx';
export { FileFamilyIcon } from './FileFamilyIcon.tsx';
export type { FileFamilyIconProps } from './FileFamilyIcon.tsx';
export { FileItemActions } from './FileItemActions.tsx';
export type { FileItemActionsProps, FileItemHandlers } from './FileItemActions.tsx';
export { FileLinkChips } from './FileLinkChips.tsx';
export type { FileLinkChipsProps } from './FileLinkChips.tsx';
export { FilePreview } from './FilePreview.tsx';
export type { FilePreviewProps } from './FilePreview.tsx';
export { PdfPreview } from './PdfPreview.tsx';
export type { PdfDocumentLike, PdfJsLike, PdfJsLoader, PdfPageLike, PdfPreviewProps } from './PdfPreview.tsx';
export { TextPreview, TEXT_PREVIEW_BYTES } from './TextPreview.tsx';
export type { TextPreviewProps } from './TextPreview.tsx';
export { detectCsvDelimiter, parseCsv } from './csvPreview.ts';
export { FILE_SCAN_STATUS, SCAN_STATUS_EXPLANATION } from './fileStatus.ts';
export {
  extensionOf,
  FILE_FAMILIES,
  FILE_FAMILY_LABELS,
  FILE_SCAN_STATUSES,
  fileFamilyOfContentType,
  fileFamilyOfExtension,
  fileNameStem,
  filePreviewKind,
  folderDepth,
  folderPath,
  folderSubtreeHeight,
  folderSubtreeIds,
  formatBytes,
  isFileReleased,
  isPageThumbnail,
  MAX_FOLDER_DEPTH,
  sameFileId,
} from './fileView.ts';
export type {
  AllowedFileTypeView,
  FileAreaKey,
  FileAreaRefView,
  FileAreaView,
  FileDetailView,
  FileDownloadView,
  FileEventView,
  FileFamily,
  FileItemId,
  FileLinkRef,
  FileLinkView,
  FileMovePreviewView,
  FileMoveUnlinkView,
  FilePreviewKind,
  FileScanStatus,
  FileVersionView,
  FileView,
  FolderView,
  LinkTargetsView,
  LinkTargetView,
} from './fileView.ts';
export { FolderCard, fileCountLabel } from './FolderCard.tsx';
export type { FolderCardProps } from './FolderCard.tsx';
export { FolderNameDialog, MAX_FOLDER_NAME_LENGTH } from './FolderNameDialog.tsx';
export type { FolderNameDialogProps } from './FolderNameDialog.tsx';
export { FolderActionsMenu, FolderTree } from './FolderTree.tsx';
export type { FileLocation, FolderActionsMenuProps, FolderTreeActions, FolderTreeProps } from './FolderTree.tsx';
export { LinkTargetsDialog } from './LinkTargetsDialog.tsx';
export type { LinkTargetsDialogProps } from './LinkTargetsDialog.tsx';
export { bulkLinkChanges, initialLinkStates, linkKeyOf, linkReferencesOf, linkSetOf } from './linkSelection.ts';
export type { LinkState } from './linkSelection.ts';
export { MoveDialog } from './MoveDialog.tsx';
export type { MoveDialogAreaPicker, MoveDialogProps } from './MoveDialog.tsx';
export { MoveAcrossAreasDialog } from './MoveAcrossAreasDialog.tsx';
export type { MoveAcrossAreasDialogProps, MoveAcrossAreasRequest } from './MoveAcrossAreasDialog.tsx';
export { DROP_ACTIVE_CLASS, DROP_CANDIDATE_CLASS, FILE_MANAGER_DRAG_TYPE, FileDndProvider, useFileDraggable, useFileDropTarget } from './fileDragAndDrop.tsx';
export type { FileDndProviderProps, FileDragItem, FileDropTarget } from './fileDragAndDrop.tsx';
export { QuotaPill } from './QuotaPill.tsx';
export type { QuotaPillProps } from './QuotaPill.tsx';
export { UploadTray } from './UploadTray.tsx';
export type { UploadTrayProps } from './UploadTray.tsx';
export { precheckUpload, uploadFamilyOf } from './uploadPrecheck.ts';
export { UPLOAD_CONCURRENCY, useFileUploadQueue } from './useFileUploadQueue.ts';
export type { FileUploadQueue, UploadItem, UploadItemStatus, UploadTarget, UseFileUploadQueueOptions } from './useFileUploadQueue.ts';
export { isUploadAborted, UploadError, uploadErrorMessage, uploadWithProgress } from './uploadWithProgress.ts';
export type { UploadFailure, UploadProgressCallbacks, UploadRequest, UploadTransport } from './uploadWithProgress.ts';
export { createStaticFileManagerAdapter } from './staticFileManagerAdapter.ts';
export type { StaticFileManagerData } from './staticFileManagerAdapter.ts';
