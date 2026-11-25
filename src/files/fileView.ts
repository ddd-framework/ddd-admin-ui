/**
 * The view models of the file manager. A host's adapter maps its own payloads (entities, projections, drive nodes) onto
 * these, so the blocks of this entry import no model and no API.
 *
 * Ids and area keys are opaque: a number or a string, compared as text (`sameFileId`). Date-times are the backend's
 * offsetless UTC strings (`Y-m-d H:i:s`), drawn with `DateCell` / `formatDateTime`, never `new Date(value)`.
 */

import { formatUiNumber } from '../i18n/format.ts';
import { m, type TranslateFn } from '../i18n/store.ts';
import type { FileDownloadOptions } from './fileManagerAdapter.ts';

/** An id of a file, folder, version or link target. */
export type FileItemId = string | number;

/** The key of one file area (a space, a tenant's area, a project's files): opaque to the manager. */
export type FileAreaKey = string | number;

/** Two ids name the same item (a number and its text are equal). */
export const sameFileId = (left: FileItemId | null | undefined, right: FileItemId | null | undefined): boolean =>
  left === null || left === undefined || right === null || right === undefined ? left === right : String(left) === String(right);

/** What kind of file it is: icon, filter and preview follow it. */
export const FILE_FAMILIES = [
  'PDF',
  'SPREADSHEET',
  'DOCUMENT',
  'PRESENTATION',
  'TEXT',
  'IMAGE',
  'VECTOR',
  'VIDEO',
  'AUDIO',
  'ARCHIVE',
  'OTHER',
] as const;

export type FileFamily = (typeof FILE_FAMILIES)[number];

export const FILE_FAMILY_LABELS: Readonly<Record<FileFamily, string>> = {
  PDF: m('PDF'),
  SPREADSHEET: m('Spreadsheet'),
  DOCUMENT: m('Document'),
  PRESENTATION: m('Presentation'),
  TEXT: m('Text'),
  IMAGE: m('Image'),
  VECTOR: m('SVG graphic'),
  VIDEO: m('Video'),
  AUDIO: m('Audio'),
  ARCHIVE: m('Archive'),
  OTHER: m('Other file'),
};

const FAMILY_BY_EXTENSION: Readonly<Record<string, FileFamily>> = {
  pdf: 'PDF',
  xlsx: 'SPREADSHEET',
  xls: 'SPREADSHEET',
  ods: 'SPREADSHEET',
  csv: 'SPREADSHEET',
  numbers: 'SPREADSHEET',
  docx: 'DOCUMENT',
  doc: 'DOCUMENT',
  odt: 'DOCUMENT',
  rtf: 'DOCUMENT',
  pages: 'DOCUMENT',
  pptx: 'PRESENTATION',
  ppt: 'PRESENTATION',
  odp: 'PRESENTATION',
  key: 'PRESENTATION',
  txt: 'TEXT',
  md: 'TEXT',
  log: 'TEXT',
  json: 'TEXT',
  xml: 'TEXT',
  yaml: 'TEXT',
  yml: 'TEXT',
  jpg: 'IMAGE',
  jpeg: 'IMAGE',
  png: 'IMAGE',
  gif: 'IMAGE',
  webp: 'IMAGE',
  heic: 'IMAGE',
  heif: 'IMAGE',
  avif: 'IMAGE',
  tif: 'IMAGE',
  tiff: 'IMAGE',
  bmp: 'IMAGE',
  svg: 'VECTOR',
  mp4: 'VIDEO',
  mov: 'VIDEO',
  webm: 'VIDEO',
  m4v: 'VIDEO',
  mp3: 'AUDIO',
  wav: 'AUDIO',
  m4a: 'AUDIO',
  ogg: 'AUDIO',
  zip: 'ARCHIVE',
  gz: 'ARCHIVE',
  tar: 'ARCHIVE',
  '7z': 'ARCHIVE',
  rar: 'ARCHIVE',
};

/** The family of an extension (lower case, without the dot); `OTHER` for an unknown one. */
export const fileFamilyOfExtension = (extension: string): FileFamily => FAMILY_BY_EXTENSION[extension.toLowerCase()] ?? 'OTHER';

/** The family of a MIME type (`image/png` → `IMAGE`), `null` when the type says nothing about it. */
export const fileFamilyOfContentType = (contentType: string | null | undefined): FileFamily | null => {
  const type = (contentType ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
  if (type === '') return null;
  if (type === 'application/pdf') return 'PDF';
  if (type === 'image/svg+xml') return 'VECTOR';
  if (type.startsWith('image/')) return 'IMAGE';
  if (type.startsWith('video/')) return 'VIDEO';
  if (type.startsWith('audio/')) return 'AUDIO';
  if (type.startsWith('text/csv') || type.includes('spreadsheet') || type.includes('excel')) return 'SPREADSHEET';
  if (type.includes('presentation') || type.includes('powerpoint')) return 'PRESENTATION';
  if (type.includes('wordprocessing') || type === 'application/msword' || type.includes('opendocument.text')) return 'DOCUMENT';
  if (type.startsWith('text/') || type === 'application/json' || type === 'application/xml') return 'TEXT';
  if (type.includes('zip') || type.includes('compressed') || type === 'application/x-tar' || type === 'application/gzip') return 'ARCHIVE';
  return null;
};

/** The state of the malware check of a file (version). */
/** `BLOCKED`: refused by the area's type rules (not malware); `INFECTED`: refused by the malware check. */
export const FILE_SCAN_STATUSES = ['UPLOADING', 'PENDING', 'CLEAN', 'INFECTED', 'BLOCKED', 'FAILED', 'SKIPPED'] as const;

export type FileScanStatus = (typeof FILE_SCAN_STATUSES)[number];

/** A reference to one link target of a file (`kind` names the target type the adapter declares). */
export interface FileLinkRef {
  kind: string;
  id: FileItemId;
}

/** A link of a file as chips and the drawer show it. */
export interface FileLinkView extends FileLinkRef {
  name: string;
}

/** One file as the list, the grid and the trash draw it. */
export interface FileView {
  id: FileItemId;
  areaKey: FileAreaKey;
  /** `null` = the area's root. */
  folderId: FileItemId | null;
  /** The folder's name for the table's Folder column (`null` = root; omitted = looked up in the loaded tree). */
  folderName?: string | null;
  /** Full name including the extension (`Budget 2026.xlsx`). */
  name: string;
  /** Lower case, without the dot (`xlsx`); `''` without one. */
  extension: string;
  family: FileFamily;
  mimeType?: string | null;
  /** Size of the current version (or, without one, of the newest). */
  sizeBytes: number;
  /**
   * Identifies the content the file shows (the current version's number or id): it changes whenever another version
   * becomes current (an upload, a restore), so a preview loaded before is fetched again. Absent = unknown.
   */
  contentVersion?: number | string | null;
  description?: string | null;
  /**
   * The scan state of the current (released) version, or — while there is none — of the newest version. Areas without a
   * malware check pass `SKIPPED` (released) or `CLEAN`.
   */
  scanStatus: FileScanStatus;
  /** A newer version is being checked while the current one stays available. */
  hasPendingVersion?: boolean;
  /**
   * The check state of the newest version while it is not the current one (`PENDING` while checked, `FAILED` when the
   * check could not run, `INFECTED` when it was blocked); absent = unknown (`hasPendingVersion` alone).
   */
  newestVersionStatus?: FileScanStatus | null;
  /** The newest version's number while it is not the current one (shown with its state). */
  newestVersionNumber?: number | null;
  /** Why the newest version was refused or failed (a short server text), when known. */
  newestVersionReason?: string | null;
  /** Changes of a working copy are not committed yet (capability `workingCopy`). */
  hasWorkingCopyChanges?: boolean;
  /** Short-lived thumbnail URL of a released image (or a page rendition); absent otherwise. */
  thumbnailUrl?: string | null;
  /**
   * The server shows this file as a PDF it renders itself (a Word, Excel or PowerPoint document): the preview asks
   * `getDownload` with `variant: 'PDF_RENDITION'` and draws the answer like a PDF. Absent / `false`: no rendition.
   */
  hasPdfRendition?: boolean;
  /**
   * The server shows this vector file (an SVG) as a picture from a copy it sanitised itself — no script, no handler,
   * no reference to another resource — served as `image/svg+xml`: the preview asks `getDownload` with
   * `variant: 'SANITIZED_IMAGE'` and draws the answer in an `<img>`, never the uploaded bytes. Absent / `false`: the
   * file has no preview.
   */
  hasSanitizedImage?: boolean;
  /** Links under the reader's rights (capability `links`). */
  links?: readonly FileLinkView[];
  /** Display name of the uploader. */
  uploadedBy?: string | null;
  /** Display name of the account the uploader acted for (impersonation), shown as "(on behalf: …)". */
  uploadedOnBehalfOf?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  /** Trash only. */
  deletedAt?: string | null;
  deletedBy?: string | null;
  /** Trash only: when the file is removed for good. */
  purgeAfter?: string | null;
  /**
   * Trash only: the row is a trashed folder (with its content), not a file. Restore and final delete take its id like
   * a file's; it has no details, no download and no versions.
   */
  isFolder?: boolean;
}

/** One stored version of a file (drawer). */
export interface FileVersionView {
  id: FileItemId;
  versionNumber: number;
  sizeBytes: number;
  scanStatus: FileScanStatus;
  /** Signature name (`INFECTED`) or why it could not be scanned. */
  scanResultDetail?: string | null;
  /** The released version the file downloads by default. */
  isCurrent: boolean;
  uploadedBy?: string | null;
  /** Display name of the account the uploader acted for (impersonation), shown as "(on behalf: …)". */
  uploadedOnBehalfOf?: string | null;
  createdAt?: string | null;
  /** Free text stored with the version (a person's or the agent's note). */
  comment?: string | null;
  /** A note the system wrote, drawn in the reader's language (wins over `comment`). */
  systemNote?: FileVersionSystemNote | null;
}

/** What the system noted on a version; unknown codes fall back to `comment`. */
export interface FileVersionSystemNote {
  /** `RESTORED_FROM_VERSION`, `MOVED_FROM_AREA`, `COPIED_FROM_PATH` (others: not drawn). */
  code: string;
  /** RESTORED_FROM_VERSION: the restored version's number. */
  versionNumber?: number | null;
  /** MOVED_FROM_AREA: the area the file came from (absent when the reader may not see it). */
  sourceAreaName?: string | null;
  /** COPIED_FROM_PATH: the path the file was copied from (absent when the reader may not see it). */
  sourcePath?: string | null;
}

/** The system note codes the file manager draws. */
export const FILE_VERSION_NOTE_CODES = ['RESTORED_FROM_VERSION', 'MOVED_FROM_AREA', 'COPIED_FROM_PATH'] as const;

/** One entry of a file's activity (capability `activity`). */
export interface FileEventView {
  id: FileItemId;
  /** The backend's event type (`UPLOADED`, `RENAMED`, …); unknown types are shown as they are. */
  type: string;
  occurredAt?: string | null;
  /** Display name; `null` = a system action (scan, purge). */
  actor?: string | null;
  /** Who acted on behalf of the actor, when someone did. */
  impersonatedBy?: string | null;
  /** A short human detail (`"Report.pdf" → "Report 2026.pdf"`, `v3`). */
  detail?: string | null;
  /** Who acted: `staff` or `partner` (an access event), when the backend says. */
  audience?: string | null;
  /** What was opened: a preview or the original (an access event). */
  variant?: string | null;
  /** The reader's public address (an access event; only staff readers get it). */
  clientIp?: string | null;
}

/** The drawer's file: the list facts plus content hash, versions and activity. */
export interface FileDetailView extends FileView {
  sha256?: string | null;
  versions?: readonly FileVersionView[];
  events?: readonly FileEventView[];
}

/** One folder (the tree is loaded flat). */
export interface FolderView {
  id: FileItemId;
  areaKey: FileAreaKey;
  /** `null` = a top-level folder of the area. */
  parentId: FileItemId | null;
  name: string;
  /** Files directly in this folder (not trashed), when the backend sends it. */
  fileCount?: number | null;
  /** Files and folders directly inside (a backend that counts entries, not files); used when `fileCount` is absent. */
  entryCount?: number | null;
  /** Display name of the account that created the folder. */
  createdBy?: string | null;
  /** Display name of the account the creator acted for (impersonation), shown as "(on behalf: …)". */
  createdOnBehalfOf?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

/** An area the manager can show (the tree's roots when there is more than one) or move to. */
export interface FileAreaRefView {
  key: FileAreaKey;
  name: string;
  /** A group heading in pickers (`Customers`, `Projects`). */
  groupLabel?: string | null;
}

/** One link target offered by the link dialog (a target of the adapter's kinds), its sub-targets nested. */
export interface LinkTargetView {
  kind: string;
  id: FileItemId;
  name: string;
  /** A hint next to the name (where it belongs). */
  hint?: string | null;
  children?: readonly LinkTargetView[];
}

/** What the link dialog may offer. */
export interface LinkTargetsView {
  targets: readonly LinkTargetView[];
}

/** One allowed extension of the area (the upload pre-check). */
export interface AllowedFileTypeView {
  extension: string;
  family: FileFamily;
}

/** One area: switch, quota, usage, per-file limit and the allow-list for the client pre-check. */
export interface FileAreaView {
  areaKey: FileAreaKey;
  /** `false`: uploads and changes are switched off (downloads stay possible). Default `true`. */
  isEnabled?: boolean;
  /** `null` / absent: no limit shown. */
  quotaBytes?: number | null;
  usedBytes?: number | null;
  /** `null` / absent: no per-file limit in the pre-check. */
  maxFileSizeBytes?: number | null;
  /** Absent: every extension may be uploaded (the server decides). */
  allowedTypes?: readonly AllowedFileTypeView[] | null;
  /** Days a trashed file stays restorable; absent = not said. */
  trashRetentionDays?: number | null;
  /** What the quota counts (a sentence for the quota pill's tooltip); default: every kept version and the trash. */
  quotaNote?: string | null;
  fileCount?: number | null;
  folderCount?: number | null;
  /** What the usage is made of (the quota pill's tooltip): e.g. current versions, older versions, trash, uploads. */
  usageParts?: readonly FileAreaUsagePart[] | null;
}

/** One part of an area's usage. */
export interface FileAreaUsagePart {
  /** Shown as given (translate it before). */
  label: string;
  bytes: number;
}

/**
 * What the newest, not yet current version of a file is: being checked, check failed, refused by the type rules
 * (`blocked`), refused by the malware check (`infected`); `null` = nothing to say.
 */
export type FileNewestVersionState = 'checking' | 'failed' | 'blocked' | 'infected';

/** The state of a file's newest version that is not current yet (`hasPendingVersion` / `newestVersionStatus`). */
export const newestVersionStateOf = (file: Pick<FileView, 'hasPendingVersion' | 'newestVersionStatus'>): FileNewestVersionState | null => {
  switch (file.newestVersionStatus) {
    case 'INFECTED':
      return 'infected';
    case 'BLOCKED':
      return 'blocked';
    case 'FAILED':
      return 'failed';
    case 'PENDING':
    case 'UPLOADING':
      return 'checking';
    default:
      return file.hasPendingVersion ? 'checking' : null;
  }
};

/** How often the drawer fetches a file again while one of its versions is being checked. */
export const FILE_CHECK_POLL_INTERVAL_MS = 4000;

/**
 * Whether a file has a version that is still being uploaded or checked: its shown version (`scanStatus`) or a newer one
 * (`newestVersionStateOf()` = `checking`). The drawer polls while this is true.
 */
export const isFileBeingChecked = (file: Pick<FileView, 'scanStatus' | 'hasPendingVersion' | 'newestVersionStatus'>): boolean =>
  file.scanStatus === 'UPLOADING' || file.scanStatus === 'PENDING' || newestVersionStateOf(file) === 'checking';

/** A download (or preview) link of the release gate. */
export interface FileDownloadView {
  /** The link; `''` while `state` is not `ready`. */
  url: string;
  fileName: string;
  expiresAt?: string | null;
  /**
   * Only for what the server derives from the file (`variant: 'PDF_RENDITION'`, `'SANITIZED_IMAGE'`): `pending` = it
   * is being made (ask again shortly), `failed` = none could be made (`message` says why, when the server said it).
   * Absent = `ready`.
   */
  state?: 'ready' | 'pending' | 'failed';
  message?: string | null;
}

/** A link a move to another area removes (its target is not part of the target area). */
export interface FileMoveUnlinkView {
  fileId: FileItemId;
  fileName: string;
  kind: string;
  /** `null` when the reader cannot see the target any more. */
  targetName: string | null;
}

/** What a move to another area would do (shown by its confirmation). */
export interface FileMovePreviewView {
  sourceAreaName: string | null;
  targetAreaName: string | null;
  /** `Folder / Subfolder` of the target, `''` = its root. */
  targetFolderPath: string;
  isCrossArea: boolean;
  fileCount: number;
  folderCount: number;
  /** Bytes the target area takes over (every kept version). */
  movedBytes: number;
  targetUsedBytes: number;
  targetQuotaBytes?: number | null;
  quotaExceeded: boolean;
  unlinks: readonly FileMoveUnlinkView[];
  /** Names that exist already in the target folder (the move is refused). */
  nameConflicts: readonly string[];
  /** Other reasons the move is refused. */
  blockingReasons: readonly string[];
  canMove: boolean;
}

// ─── Derived facts ─────────────────────────────────────────────────────────────────────────────────────────────────

/** Released for download and preview: `CLEAN`, or `SKIPPED` (an area without a malware check). */
export const isFileReleased = (status: FileScanStatus): boolean => status === 'CLEAN' || status === 'SKIPPED';

/** Raster types a browser may show inline (served with their own type, never sniffed). */
const INLINE_IMAGE_EXTENSIONS: ReadonlySet<string> = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);

export type FilePreviewKind = 'image' | 'sanitized-image' | 'pdf' | 'pdf-rendition' | 'markdown' | 'code' | 'text' | 'csv' | 'video' | 'audio' | 'none';

const OFFICE_PAGE_FAMILIES: ReadonlySet<FileFamily> = new Set(['DOCUMENT', 'SPREADSHEET', 'PRESENTATION']);
const TEXT_EXTENSIONS: ReadonlySet<string> = new Set(['txt', 'log']);
const MARKDOWN_EXTENSIONS: ReadonlySet<string> = new Set(['md', 'markdown']);

/**
 * Source files shown as text with their language (the name a highlighter knows). HTML and SVG are not in the list: they
 * are never shown, neither as markup nor as text.
 */
const CODE_LANGUAGE_BY_EXTENSION: Readonly<Record<string, string>> = {
  json: 'json', xml: 'xml', yaml: 'yaml', yml: 'yaml', toml: 'ini', ini: 'ini', js: 'javascript', mjs: 'javascript',
  cjs: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', php: 'php', py: 'python', rb: 'ruby', go: 'go',
  rs: 'rust', java: 'java', kt: 'kotlin', swift: 'swift', c: 'c', h: 'c', cpp: 'cpp', cs: 'csharp', css: 'css', scss: 'scss',
  less: 'less', sql: 'sql', sh: 'bash', bash: 'bash', zsh: 'bash', diff: 'diff', patch: 'diff', graphql: 'graphql',
  lua: 'lua', pl: 'perl', r: 'r',
};

/** Containers a browser plays in its own player; the server must serve them inline with their own type. */
const VIDEO_EXTENSIONS: ReadonlySet<string> = new Set(['mp4', 'm4v', 'webm', 'mov']);
const AUDIO_EXTENSIONS: ReadonlySet<string> = new Set(['mp3', 'm4a', 'wav', 'ogg', 'oga', 'opus', 'flac', 'aac']);

/** The highlighter language of a source file by its extension (`ts` → `typescript`), or `null` for another file. */
export const codeLanguageOfExtension = (extension: string): string | null => CODE_LANGUAGE_BY_EXTENSION[extension.toLowerCase()] ?? null;

/** Whose thumbnail is a document's first page: grid and table crop it from the top. */
export const isPageThumbnail = (file: Pick<FileView, 'family' | 'extension'>): boolean => {
  const extension = file.extension.toLowerCase();
  return file.family === 'PDF' || (OFFICE_PAGE_FAMILIES.has(file.family) && extension !== 'csv' && extension !== 'txt');
};

/**
 * What the preview shows. Only JPEG / PNG / GIF / WebP (or a rendition the server made: a thumbnail URL says it
 * exists) as `<img>`, PDF (or the PDF the server renders of an Office document) on canvases, Markdown as sanitised
 * markup or as its source, source files, TXT and CSV as text
 * nodes, MP4 / WebM / MP3 … in the browser's own player. An SVG is a picture only from the copy the server sanitised
 * (`hasSanitizedImage`), in an `<img>`: the uploaded bytes of an SVG, HTML and everything else never render in the
 * browser — icon, facts and Download only.
 */
export const filePreviewKind = (
  file: Pick<FileView, 'family' | 'extension' | 'thumbnailUrl' | 'hasPdfRendition' | 'hasSanitizedImage'>
): FilePreviewKind => {
  const extension = file.extension.toLowerCase();
  const hasRendition = Boolean(file.thumbnailUrl);
  if (file.family === 'IMAGE') return INLINE_IMAGE_EXTENSIONS.has(extension) || hasRendition ? 'image' : 'none';
  // a vector file is never its own preview and no thumbnail stands in for it: only the server's sanitised copy
  if (file.family === 'VECTOR') return file.hasSanitizedImage === true ? 'sanitized-image' : 'none';
  // every page as a PDF beats the first page as a picture
  if (file.family !== 'PDF' && file.hasPdfRendition === true) return 'pdf-rendition';
  if (file.family !== 'PDF' && isPageThumbnail(file) && hasRendition) return 'image';
  if (file.family === 'PDF') return 'pdf';
  if (extension === 'csv') return 'csv';
  if (MARKDOWN_EXTENSIONS.has(extension)) return 'markdown';
  if (TEXT_EXTENSIONS.has(extension)) return 'text';
  if (codeLanguageOfExtension(extension) !== null) return 'code';
  if (VIDEO_EXTENSIONS.has(extension)) return 'video';
  if (AUDIO_EXTENSIONS.has(extension)) return 'audio';
  return 'none';
};

/** What the preview of a kind asks the release gate for: only pictures and PDFs are handed to the browser inline. */
export const filePreviewDispositionOf = (kind: FilePreviewKind): FileDownloadOptions['disposition'] =>
  kind === 'image' || kind === 'sanitized-image' || kind === 'pdf' || kind === 'pdf-rendition' ? 'inline' : 'attachment';

/**
 * The variant the preview of a kind asks for. A vector file is asked for as `SANITIZED_IMAGE` and as nothing else:
 * no path of the preview reaches its uploaded bytes.
 */
export const filePreviewVariantOf = (kind: FilePreviewKind): NonNullable<FileDownloadOptions['variant']> => {
  if (kind === 'pdf-rendition') return 'PDF_RENDITION';
  if (kind === 'sanitized-image') return 'SANITIZED_IMAGE';
  return 'PREVIEW';
};

/** The kinds whose content is read as text (`fetch`), never handed to the browser as a document. */
export const isTextPreviewKind = (kind: FilePreviewKind): boolean => kind === 'markdown' || kind === 'code' || kind === 'text' || kind === 'csv';

/** `Budget 2026.xlsx` → `Budget 2026` (the editable part; the extension stays read-only). */
export const fileNameStem = (name: string, extension: string): string => {
  const suffix = `.${extension}`;
  return extension && name.toLowerCase().endsWith(suffix.toLowerCase()) ? name.slice(0, -suffix.length) : name;
};

/** The extension of a file name, lower case without the dot (`''` without one). */
export const extensionOf = (fileName: string): string => {
  const dot = fileName.lastIndexOf('.');
  return dot > 0 && dot < fileName.length - 1 ? fileName.slice(dot + 1).toLowerCase() : '';
};

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

/** `1536` → `1.5 KB`, binary steps (1 KB = 1024 B). */
/**
 * A person with the account they acted for, as the drawer, the table and the cards draw it: `Jane (on behalf: Acme)`;
 * the name alone without an on-behalf account; null without a name.
 */
export const personWithOnBehalfOf = (name: string | null | undefined, onBehalfOf: string | null | undefined, t: TranslateFn): string | null =>
  name ? (onBehalfOf ? `${name} ${t('(on behalf: %name%)', { replacements: { name: onBehalfOf } })}` : name) : null;

export const formatBytes = (bytes: number | null | undefined): string => {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes) || bytes < 0) return '—';
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit === 0 || value >= 100 ? 0 : 1;
  return `${formatUiNumber(value, { maximumFractionDigits: digits, minimumFractionDigits: 0 })} ${BYTE_UNITS[unit]}`;
};

const folderKey = (id: FileItemId | null): string | null => (id === null ? null : String(id));

/** The folder and every folder below it (a folder move must not land inside its own subtree); ids as text. */
export const folderSubtreeIds = (folders: readonly FolderView[], rootId: FileItemId): Set<string> => {
  const ids = new Set<string>([String(rootId)]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const folder of folders) {
      const parent = folderKey(folder.parentId);
      if (parent !== null && ids.has(parent) && !ids.has(String(folder.id))) {
        ids.add(String(folder.id));
        grew = true;
      }
    }
  }
  return ids;
};

/** Root → … → the folder (the breadcrumb trail); `[]` for the root or an unknown id. */
export const folderPath = (folders: readonly FolderView[], folderId: FileItemId | null): FolderView[] => {
  const byId = new Map(folders.map(folder => [String(folder.id), folder]));
  const path: FolderView[] = [];
  const seen = new Set<string>();
  let current = folderId === null ? undefined : byId.get(String(folderId));
  while (current && !seen.has(String(current.id))) {
    seen.add(String(current.id));
    path.unshift(current);
    current = current.parentId === null ? undefined : byId.get(String(current.parentId));
  }
  return path;
};

/** Default maximum folder depth (the manager's `maxFolderDepth` prop overrides it). */
export const MAX_FOLDER_DEPTH = 8;

/** Depth of a folder (top level = 1, root = 0). */
export const folderDepth = (folders: readonly FolderView[], folderId: FileItemId | null): number => folderPath(folders, folderId).length;

/** Height of a folder's subtree (a leaf = 1): a moved folder takes all of it along. */
export const folderSubtreeHeight = (folders: readonly FolderView[], folderId: FileItemId): number => {
  const children = folders.filter(folder => sameFileId(folder.parentId, folderId));
  return 1 + children.reduce((height, child) => Math.max(height, folderSubtreeHeight(folders, child.id)), 0);
};
