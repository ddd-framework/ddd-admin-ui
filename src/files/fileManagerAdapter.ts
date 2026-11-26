import type { ReactNode } from 'react';

import type {
  FileAreaKey,
  FileAreaRefView,
  FileAreaView,
  FileDetailView,
  FileDownloadView,
  FileEventView,
  FileFamily,
  FileItemId,
  FileLinkRef,
  FileMovePreviewView,
  FileView,
  FolderView,
  LinkTargetsView,
} from './fileView.ts';
import type { UploadProgressCallbacks } from './uploadWithProgress.ts';

/**
 * The seam between the file manager and one API. The blocks of this entry see only the view models of `fileView.ts`.
 *
 * Reads are React hooks (`use…`): the manager calls each exactly once per render, unconditionally, so **the adapter
 * object — capabilities included — must keep its identity** for the life of the manager (a module constant, or
 * `useMemo` with stable dependencies). Writes come from `useActions()`, a hook, so an adapter can bind RTK Query mutation
 * triggers; each action resolves when the request succeeded and rejects with the request's error (the manager shows
 * `normalizeDddError(error).message`). The adapter owns cache invalidation; the manager never refetches by hand.
 *
 * Everything beyond browsing, uploading, renaming, moving inside the area, folders and the trash move is a capability:
 * a control appears only when its capability (and the actions it needs) is there.
 */
export interface FileManagerAdapter {
  /** The area: switch, quota, usage, per-file limit, allow-list. */
  useArea: (areaKey: FileAreaKey) => FileQueryState<FileAreaView>;
  /** Every folder of the area, flat. */
  useFolders: (areaKey: FileAreaKey) => FileQueryState<readonly FolderView[]>;
  /** The list with the manager's query; `null` = skip (the trash is shown). */
  useFiles: (query: FileListQuery | null) => FileListState;
  /**
   * One file for the drawer (versions, activity, hash); `null` = skip. `options.pollingIntervalMs` > 0: fetch the file
   * and its versions again every n ms (the drawer asks for it while a version is still being checked); 0 / absent: off.
   */
  useFile: (fileId: FileItemId | null, options?: FileQueryOptions) => FileQueryState<FileDetailView>;
  /** Every write of the manager, bound to the API's mutations. */
  useActions: () => FileManagerActions;
  /** The optional features this API offers. */
  capabilities?: FileManagerCapabilities;
}

/** The optional features of an adapter. Absent = the manager offers no control for it. */
export interface FileManagerCapabilities {
  /** Trashed files: a Trash node, restore (`restoreFiles`), final delete (`purgeFiles`), empty (`emptyTrash`). */
  trash?: FileTrashCapability;
  /**
   * The drawer lists the versions; Replace (`uploadVersion`), Restore (`restoreVersion`), Delete older
   * (`deleteOlderVersions`), editing a text file in place (`saveText` + `saveTextAsCopy`).
   */
  versions?: FileVersionsCapability;
  /** The drawer lists the file's events (`FileDetailView.events`). */
  activity?: FileActivityCapability;
  /** Links of files to targets of the host (chips, link dialog, linked / unlinked filters, link tabs). */
  links?: FileLinksCapability;
  /** Moves into other areas (`moveItems`, `previewMove`): a target-area picker and drops on other areas' roots. */
  moveAcrossAreas?: FileMoveAcrossAreasCapability;
  /** The list filters and orders the backend supports (absent: name search only, ordered by name). */
  filters?: FileFiltersCapability;
  /** Files with uncommitted changes of a working copy carry a badge (`FileView.hasWorkingCopyChanges`). */
  workingCopy?: FileWorkingCopyCapability;
  /** The malware check: scan states and their badges (absent: the states are shown only when not released). */
  malwareScan?: { enabled: boolean };
  /**
   * Locations the folder tree cannot resolve alone: a pasted `drive/<id>`, a path into another area, a file's path
   * (the path bar and a URL `path` that names a file). Without it the path bar resolves folder paths of the open area.
   */
  location?: FileLocationCapability;
  /**
   * Who reads here: `staff` (default) or `partner`. A partner sees no staff-only control (purge, empty trash, area
   * settings and maintenance, the client address of an access).
   */
  audience?: 'staff' | 'partner';
  /**
   * Files of other stores copied into the open folder ("Insert from the media library"): a page action (a menu for
   * several sources) that opens the host's dialog. Only with write access, never in the trash or a link tab.
   */
  imports?: FileImportsCapability;
  /**
   * Files copied out into other stores ("Copy to the media library"): a file action and a bulk action for released
   * files a target accepts; the host's dialog does the rest (a slot, a refusal per file).
   */
  exports?: FileExportsCapability;
}

/** What the host's import dialog gets: where the copies go and how to report them. */
export interface FileImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  areaKey: FileAreaKey;
  /** The open folder (`null` = the area's root). */
  folderId: FileItemId | null;
  /** The open folder as a path inside its area (`/a/b`; `/` = the root). */
  folderPath: string;
  /** The host copied files: the manager loads the list again (the host's adapter may also invalidate its cache). */
  onImported: () => void;
}

/** One store files can be copied in from. */
export interface FileImportSource {
  key: string;
  /** The action's label (`From the media library`), already translated or a text the host's store translates. */
  label: string;
  /** An icon for the action (default a download-into-folder icon). */
  icon?: ReactNode;
  /** The host's picker; it copies the picked files and calls `onImported`. Rendered only while open. */
  renderDialog: (props: FileImportDialogProps) => ReactNode;
}

export interface FileImportsCapability {
  sources: readonly FileImportSource[];
}

/** What the host's export dialog gets: the files to copy out. */
export interface FileExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  areaKey: FileAreaKey;
  /** Released files the target accepts (at least one). */
  files: readonly FileView[];
  /** The host copied files (the manager clears the selection; the files' history shows the copy). */
  onExported: () => void;
}

/** One store files can be copied out into. */
export interface FileExportTarget {
  key: string;
  /** The action's label (`Copy to the media library`). */
  label: string;
  /** An icon for the action (default an export icon). */
  icon?: ReactNode;
  /** Whether a file can go there (a picture); absent = every file. Files not released are never offered. */
  accepts?: (file: FileView) => boolean;
  /** The host's dialog; it copies the files and calls `onExported`. Rendered only while open. */
  renderDialog: (props: FileExportDialogProps) => ReactNode;
}

export interface FileExportsCapability {
  targets: readonly FileExportTarget[];
}

/** Where a location leads (`FileLocationCapability.resolveLocation`). */
export interface FileLocationResolution {
  found: true;
  /** The area of the location; another area than the open one switches to it. */
  areaKey: FileAreaKey;
  /** The folder to open (`null` = the area's root): the item itself, or a file's folder. */
  folderId: FileItemId | null;
  /** The file the location names (its details open), else `null`. */
  fileId: FileItemId | null;
  /** The location as a path inside its area (`/a/b/file.pdf`). */
  path: string;
}

/** A location that leads nowhere: what was found on the way, for the error. */
export interface FileLocationMiss {
  found: false;
  /** The deepest folder that exists on the way, as a path (`/a`), when known. */
  deepestFolderPath?: string | null;
  /** The first name that does not exist there. */
  missingSegment?: string | null;
  /** The server's message, when it gave one. */
  message?: string | null;
}

export interface FileLocationCapability {
  /** Resolves a typed or pasted location (`/a/b`, `drive/123`, `/workspace/drive/…`) against `areaKey`. */
  resolveLocation: (areaKey: FileAreaKey, input: string) => Promise<FileLocationResolution | FileLocationMiss>;
}

export interface FileTrashCapability {
  /** The area's trash; `null` = skip (the trash is not shown). */
  useTrash: (query: FileTrashQuery | null) => FileListState;
}

export interface FileVersionsCapability {
  /** Extension a replacement must have: `same` (default) or `any`. */
  replacementExtension?: 'same' | 'any';
}

export interface FileActivityCapability {
  /** How many events the drawer lists (default 20). */
  limit?: number;
  /**
   * The file's accesses (viewed, downloaded) for the drawer's "Accesses" tab; `null` = skip. Without it the drawer
   * shows the changes only.
   */
  useAccessEvents?: (fileId: FileItemId | null) => FileQueryState<readonly FileEventView[]>;
}

/** One kind of link target the host offers (`project`, `customer`, …). */
export interface FileLinkKind {
  kind: string;
  /** Singular, already translated or a text the host's store translates (`Project`). */
  label: string;
  /** Plural for the filters (`Projects`); default the label. */
  pluralLabel?: string;
}

export interface FileLinksCapability {
  /** The target kinds, in the order the filters and the dialog show them. */
  kinds: readonly FileLinkKind[];
  /** The targets the link dialog and the filters offer; `null` = skip. */
  useLinkTargets: (query: LinkTargetsQuery | null) => FileQueryState<LinkTargetsView>;
  /** A sentence under the link dialog's title (what a link does in the host). */
  dialogDescription?: string;
}

export interface FileMoveAcrossAreasCapability {
  /** The areas files and folders may move to; called only while the move dialog is open. */
  useMoveTargetAreas: () => FileQueryState<readonly FileAreaRefView[]>;
}

export interface FileFiltersCapability {
  family?: boolean;
  /** Created from / to. */
  created?: boolean;
  uploadedByMe?: boolean;
  /** Orders the list may be sorted by (the first is the default). */
  orders?: readonly FileListOrder[];
}

export interface FileWorkingCopyCapability {
  /** The badge text (default "Unsaved changes"). */
  label?: string;
  /** Its explanation (tooltip). */
  description?: string;
}

/** A read hook's result (the subset of an RTK Query result the manager needs). */
export interface FileQueryState<TData> {
  data: TData | undefined;
  /** First load, no data yet. */
  isLoading: boolean;
  /** Any request in flight (also a background refetch). */
  isFetching?: boolean;
  isError: boolean;
  /** Fetches the current data again (optional: without it the manager waits for the next poll or write). */
  refetch?: () => void;
}

/** Options of a read hook of the adapter. */
export interface FileQueryOptions {
  /** Fetch again every n ms; 0 / absent: no polling. */
  pollingIntervalMs?: number;
}

/** A growing list window. */
export interface FileListState {
  items: readonly FileView[];
  isLoading: boolean;
  /** A background refetch with rows on screen. */
  isRefetching?: boolean;
  isFetchingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  isError: boolean;
  /** Fetches the rows again (optional; the manager calls it when an open file's check has finished). */
  refetch?: () => void;
}

export type FileListOrder = 'name' | 'created' | 'size';

/**
 * The list query of the manager. Folder scope: a folder id, `'root'`, or `undefined` = every folder of the area (search,
 * filters, a link tab).
 */
export interface FileListQuery {
  areaKey: FileAreaKey;
  folderId?: FileItemId | 'root';
  /** Name search; already trimmed. */
  q?: string;
  family?: FileFamily;
  /** Files linked to this target (capability `links`). */
  linkTarget?: FileLinkRef;
  /** Only files without any link. */
  unlinked?: boolean;
  /** Only files with at least one link. */
  linked?: boolean;
  uploadedByMe?: boolean;
  /** Created on or after this day (`YYYY-MM-DD`, the viewer's calendar day). */
  createdFrom?: string;
  /** Created on or before this day (`YYYY-MM-DD`). */
  createdTo?: string;
  orderBy?: FileListOrder;
  orderDirection?: 'asc' | 'desc';
}

export interface FileTrashQuery {
  areaKey: FileAreaKey;
}

export interface LinkTargetsQuery {
  areaKey: FileAreaKey;
  q?: string;
}

/** One upload: the target and the file. */
export interface FileUploadInput {
  areaKey: FileAreaKey;
  /** `null` = the area's root. */
  folderId: FileItemId | null;
  file: File;
  description?: string;
  /** Links set on the new file (a link tab's target). */
  links: readonly FileLinkRef[];
}

/** Only the named fields. */
export interface FilePatch {
  name?: string;
  description?: string;
  folderId?: FileItemId | null;
}

/** Several files' links changed at once: only the changes. */
export interface FileBulkLinksInput {
  fileIds: readonly FileItemId[];
  add: readonly FileLinkRef[];
  remove: readonly FileLinkRef[];
}

/** One file's complete link set. */
export interface FileLinkSet {
  links: readonly FileLinkRef[];
}

export interface FolderCreateInput {
  areaKey: FileAreaKey;
  parentFolderId: FileItemId | null;
  name: string;
}

export interface FolderPatch {
  name?: string;
  /** `null` = move to the area's root. */
  parentFolderId?: FileItemId | null;
}

/** Files and / or folders into a folder of an area (another area for capability `moveAcrossAreas`). */
export interface FileMoveInput {
  fileIds: readonly FileItemId[];
  folderIds: readonly FileItemId[];
  targetAreaKey: FileAreaKey;
  /** `null` = the target area's root. */
  folderId: FileItemId | null;
}

export interface FileMoveResult {
  movedFiles: number;
  movedFolders: number;
  /** Links removed because their target is not part of the target area. */
  removedLinks?: number;
}

export interface FolderDeleteResult {
  trashedFiles: number;
  deletedFolders: number;
}

export interface FileDownloadOptions {
  /** A specific version; default the current one. */
  versionId?: FileItemId;
  /** `inline` only for JPEG / PNG / GIF / WebP, PDF and the server's sanitised picture (the server refuses it otherwise). */
  disposition: 'inline' | 'attachment';
  /**
   * `PREVIEW` = what the drawer shows (an access the server may record as "viewed"); `THUMBNAIL` = a small picture in
   * a list (never recorded); `PDF_RENDITION` = the PDF the server renders of a document (`FileView.hasPdfRendition`;
   * the answer may be `pending` or `failed`); `SANITIZED_IMAGE` = the picture the server sanitised of a vector file
   * (`FileView.hasSanitizedImage`): the answer's URL must serve that copy as a picture type and never the uploaded
   * bytes — an adapter that cannot say so answers `failed` (the file then has no preview); default `ORIGINAL` = a
   * download (recorded as "downloaded").
   */
  variant?: 'ORIGINAL' | 'PREVIEW' | 'THUMBNAIL' | 'PDF_RENDITION' | 'SANITIZED_IMAGE';
}

/** The text of a file, saved as a new version on top of the version it was read from. */
export interface FileTextSaveInput {
  text: string;
  /** The version the text was read from: the save is refused (`conflict`) when the file has a newer one. `null` = unknown. */
  baseVersionId: FileItemId | null;
}

/**
 * What a text save did: `saved` = a new version exists (`file` shows it, possibly still being checked); `conflict` =
 * the file has a newer version than `baseVersionId`, nothing was written.
 */
export type FileTextSaveResult = { status: 'saved'; file: FileView } | { status: 'conflict'; message?: string | null };

/** A text saved as a new file beside the one it came from (the way out of a conflict). */
export interface FileTextCopyInput {
  text: string;
  /** The copy's name as the manager proposes it (`Notes (copy).md`); the adapter picks a free one when it is taken. */
  name: string;
}

/** The writes of the manager; the optional ones belong to a capability. */
export interface FileManagerActions {
  /** One upload with progress (`uploadWithProgress` or a direct upload to a store). Resolves with the new file. */
  upload: (input: FileUploadInput, callbacks: UploadProgressCallbacks) => Promise<FileView>;
  /** A download / preview link (through the release gate). */
  getDownload: (fileId: FileItemId, options: FileDownloadOptions) => Promise<FileDownloadView>;
  patchFile: (fileId: FileItemId, patch: FilePatch) => Promise<unknown>;
  /** Files into a folder of the open area. */
  moveFiles: (fileIds: readonly FileItemId[], folderId: FileItemId | null) => Promise<unknown>;
  /** Into the trash (with capability `trash`) or deleted (without it). */
  trashFiles: (fileIds: readonly FileItemId[]) => Promise<unknown>;
  createFolder: (input: FolderCreateInput) => Promise<FolderView>;
  patchFolder: (folderId: FileItemId, patch: FolderPatch) => Promise<unknown>;
  deleteFolder: (folderId: FileItemId) => Promise<FolderDeleteResult>;
  // trash
  restoreFiles?: (fileIds: readonly FileItemId[]) => Promise<unknown>;
  purgeFiles?: (fileIds: readonly FileItemId[]) => Promise<unknown>;
  emptyTrash?: (areaKey: FileAreaKey) => Promise<unknown>;
  // versions
  uploadVersion?: (fileId: FileItemId, file: File, callbacks: UploadProgressCallbacks) => Promise<FileView>;
  restoreVersion?: (fileId: FileItemId, versionId: FileItemId) => Promise<unknown>;
  deleteOlderVersions?: (fileId: FileItemId) => Promise<unknown>;
  // editing in place (text files): both must be there for "Edit"
  /** A new version with this text on top of `baseVersionId`; never on top of a newer one. */
  saveText?: (fileId: FileItemId, input: FileTextSaveInput) => Promise<FileTextSaveResult>;
  /** The text as a new file in the folder of `fileId`; resolves with it. */
  saveTextAsCopy?: (fileId: FileItemId, input: FileTextCopyInput) => Promise<FileView>;
  // links
  setLinks?: (fileId: FileItemId, links: FileLinkSet) => Promise<unknown>;
  bulkLinks?: (input: FileBulkLinksInput) => Promise<unknown>;
  // moves into other areas and folder moves in one request
  moveItems?: (input: FileMoveInput) => Promise<FileMoveResult>;
  previewMove?: (input: FileMoveInput) => Promise<FileMovePreviewView>;
}
