'use client';

import { normalizeDddError } from '@mgamadeus/ddd-web/contract';
import {
  ArchiveRestore,
  ArrowLeft,
  CloudUpload,
  Download,
  FilePen,
  FolderInput,
  FolderPlus,
  FolderTree as FolderTreeIcon,
  Link2,
  Settings2,
  Trash2,
  Upload,
} from 'lucide-react';
import { type DragEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { m } from '../i18n/store.ts';
import { type TranslateFn, useTranslate } from '../i18n/useTranslate.ts';
import { DateCell } from '../list/cells.tsx';
import { EmptyValue } from '../list/EmptyValue.tsx';
import { EntityListBody } from '../list/EntityListBody.tsx';
import { type EntityListBulkAction, EntityListBulkBar } from '../list/EntityListBulkBar.tsx';
import { EntityListCard } from '../list/EntityListCard.tsx';
import type { EntityListColumn } from '../list/EntityListTable.tsx';
import { EntityListToolbar } from '../list/EntityListToolbar.tsx';
import { EntityListViewToggle } from '../list/EntityListViewToggle.tsx';
import { FilterDateRange, type FilterOption, FilterPanel, FilterSelect } from '../list/filters.tsx';
import { StatusBadge } from '../list/StatusBadge.tsx';
import type { EntityDrawerUrlAdapter } from '../logic/pure/entityDrawer.ts';
import { notify } from '../logic/pure/notify.ts';
import { renameUrlStateKeys, type UrlStateAdapter } from '../logic/pure/urlListState.ts';
import { useConfirm } from '../logic/react/useConfirm.ts';
import { useCopyToClipboard } from '../logic/react/useCopyToClipboard.ts';
import { useEntityDrawer } from '../logic/react/useEntityDrawer.ts';
import { useMemoryUrlState } from '../logic/react/useMemoryUrlState.ts';
import { useRowSelection } from '../logic/react/useRowSelection.ts';
import { useUrlListState } from '../logic/react/useUrlListState.ts';
import { useWriteAccess } from '../logic/react/writeAccess.ts';
import { PageFrame } from '../page/PageFrame.tsx';
import { Alert, AlertDescription, AlertTitle } from '../primitives/alert.tsx';
import { Button } from '../primitives/button.tsx';
import { cn } from '../primitives/cn.ts';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../primitives/sheet.tsx';
import { FileBreadcrumbs } from './FileBreadcrumbs.tsx';
import { FileCard } from './FileCard.tsx';
import {
  DROP_ACTIVE_CLASS,
  DROP_CANDIDATE_CLASS,
  FILE_MANAGER_DRAG_TYPE,
  FileDndProvider,
  type FileDragItem,
  type FileDropTarget,
  useFileDraggable,
  useFileDropTarget,
} from './fileDragAndDrop.tsx';
import { startFileDownload } from './fileDownload.ts';
import { FileDrawer } from './FileDrawer.tsx';
import { FileViewer } from './FileViewer.tsx';
import { FileFamilyIcon } from './FileFamilyIcon.tsx';
import { FileItemActions, type FileItemHandlers } from './FileItemActions.tsx';
import { FileNameDialog } from './FileNameDialog.tsx';
import { FilePathBar } from './FilePathBar.tsx';
import { filePathText, findFolderByPath, folderIdOfParam, folderParamOf, folderPathText, parseLocationInput, pathSegments, siblingFolders } from './filePaths.ts';
import { FileLinkChips } from './FileLinkChips.tsx';
import type {
  FileListOrder,
  FileListQuery,
  FileListState,
  FileManagerAdapter,
  FileQueryState,
  FileTrashQuery,
  LinkTargetsQuery,
} from './fileManagerAdapter.ts';
import { resolveFileManagerFeatures } from './fileManagerFeatures.ts';
import { FILE_NEWEST_VERSION_STATE, FILE_SCAN_STATUS } from './fileStatus.ts';
import {
  FILE_FAMILIES,
  FILE_FAMILY_LABELS,
  type FileAreaKey,
  type FileAreaRefView,
  type FileAreaView,
  type FileFamily,
  type FileItemId,
  type FileLinkRef,
  type FileView,
  type FolderView,
  folderDepth,
  folderPath,
  folderSubtreeHeight,
  folderSubtreeIds,
  formatBytes,
  isFileReleased,
  newestVersionStateOf,
  isPageThumbnail,
  type LinkTargetsView,
  type LinkTargetView,
  MAX_FOLDER_DEPTH,
  personWithOnBehalfOf,
  sameFileId,
} from './fileView.ts';
import { FolderCard, folderContentLabel } from './FolderCard.tsx';
import { FolderNameDialog } from './FolderNameDialog.tsx';
import { type FileLocation, FolderActionsMenu, FolderTree, type FolderTreeActions } from './FolderTree.tsx';
import { LinkTargetsDialog } from './LinkTargetsDialog.tsx';
import { type MoveAcrossAreasRequest, MoveAcrossAreasDialog } from './MoveAcrossAreasDialog.tsx';
import { type MoveDialogAreaPicker, MoveDialog } from './MoveDialog.tsx';
import type { MarkdownFileRenderer } from './MarkdownFilePreview.tsx';
import type { PdfJsLoader } from './PdfPreview.tsx';
import type { CodeHighlighterLoader } from './codeHighlighting.ts';
import { QuotaPill } from './QuotaPill.tsx';
import { UploadTray } from './UploadTray.tsx';
import { useFileUploadQueue } from './useFileUploadQueue.ts';

/** The URL keys of the manager: where it stands, the view and the filters. */
const LIST_KEYS = ['area', 'folder', 'tab', 'view', 'q', 'family', 'link', 'target', 'mine', 'from', 'to', 'order'] as const;
const FILTER_KEYS = ['q', 'family', 'link', 'target', 'mine', 'from', 'to'] as const;
const UNCOUNTED = ['area', 'folder', 'tab', 'view', 'q', 'order'] as const;
/** Keys that are a place: a change is a history entry (Back returns), filters are replaced. */
const PLACE_KEYS = ['area', 'folder', 'tab'] as const;

/** A URL key of the manager (`FileManagerProps.urlKeys` renames them for the host's URL). */
export type FileManagerUrlKey = (typeof LIST_KEYS)[number] | 'file' | 'fileTab';
const CLEARED_FILTERS = { q: '', family: '', link: '', target: '', mine: '', from: '', to: '' } as const;
const TRASH = 'trash';

const LINK_OPTIONS: readonly FilterOption[] = [
  { value: 'linked', label: m('Linked', { context: 'file-link-filter' }) },
  { value: 'unlinked', label: m('Not linked', { context: 'file-link-filter' }) },
];
const MINE_OPTIONS: readonly FilterOption[] = [{ value: '1', label: m('Me', { context: 'file-uploader-filter' }) }];
const ORDER_LABELS: Readonly<Record<FileListOrder, string>> = {
  name: m('Name', { context: 'file-order' }),
  created: m('Newest first', { context: 'file-order' }),
  size: m('Largest first', { context: 'file-order' }),
};

/** One row / card of the list: folders of the open folder first, then its files. */
type FileManagerEntry = { kind: 'folder'; folder: FolderView } | { kind: 'file'; file: FileView };

const isFamily = (value: string): value is FileFamily => FILE_FAMILIES.some(family => family === value);
const isOrder = (value: string): value is FileListOrder => value === 'name' || value === 'created' || value === 'size';

/** `1 file`, `3 files`. */
const filesLabel = (count: number, t: TranslateFn) => t('{count, plural, one {# file} other {# files}}', { count });

const NO_LIST: FileListState = {
  items: [],
  isLoading: false,
  isFetchingMore: false,
  hasMore: false,
  loadMore: () => undefined,
  isError: false,
};
const NO_TARGETS: FileQueryState<LinkTargetsView> = { data: undefined, isLoading: false, isError: false };
/** Stand-ins for the read hooks of a missing capability (stable: the adapter's capabilities never change). */
const useNoTrash = (_query: FileTrashQuery | null): FileListState => NO_LIST;
const useNoLinkTargets = (_query: LinkTargetsQuery | null): FileQueryState<LinkTargetsView> => NO_TARGETS;

/** The name cell of a file row: drags the file (or the selection it belongs to). */
const FileNameCell = ({ file, dragItem }: { file: FileView; dragItem: FileDragItem | null }) => {
  const drag = useFileDraggable(dragItem);
  return (
    <span className={cn('block max-w-80 truncate font-medium', dragItem && 'cursor-grab', drag.isDragging && 'opacity-50')} title={file.name} {...drag.dragProps}>
      {file.name}
    </span>
  );
};

/** The name cell of a folder row: drags the folder (with its subtree) and takes drops into it. */
const FolderNameCell = ({ folder, draggable, dropTarget }: { folder: FolderView; draggable: boolean; dropTarget: FileDropTarget | null }) => {
  const drag = useFileDraggable(draggable ? { kind: 'folder', folder } : null);
  const drop = useFileDropTarget(dropTarget);
  return (
    <span
      className={cn(
        '-mx-2 -my-1 block rounded-md px-2 py-1 font-semibold',
        draggable && 'cursor-grab',
        drop.isCandidate && DROP_CANDIDATE_CLASS,
        drop.isOver && DROP_ACTIVE_CLASS,
        drag.isDragging && 'opacity-50'
      )}
      {...drag.dragProps}
      {...drop.dropProps}
    >
      {folder.name}
    </span>
  );
};

/** `“Report.pdf”`, `3 files`, `the folder “Reports”` — dialog titles and toasts of a move. */
const dragItemLabel = (item: FileDragItem, t: TranslateFn): string =>
  item.kind === 'folder'
    ? t('the folder “%name%”', { replacements: { name: item.folder.name } })
    : item.files.length === 1
      ? t('“%name%”', { replacements: { name: item.files[0]?.name ?? '' } })
      : filesLabel(item.files.length, t);

const flattenLinkTargets = (targets: readonly LinkTargetView[]): LinkTargetView[] =>
  targets.flatMap(target => [target, ...flattenLinkTargets(target.children ?? [])]);

/** A link tab: the files linked to one target; uploads get that link. */
export interface FileManagerContext {
  linkTarget: FileLinkRef;
  /** `Project “Summer”` — the crumb and the drop hint. */
  label: string;
}

/** What the area settings slot gets. */
export interface FileAreaSettingsSlotProps {
  open: boolean;
  onClose: () => void;
  areaKey: FileAreaKey;
  area: FileAreaView | undefined;
}

/** What the area maintenance slot gets (a purge button, a usage link next to the page actions). */
export interface FileAreaMaintenanceSlotProps {
  areaKey: FileAreaKey;
  area: FileAreaView | undefined;
  inTrash: boolean;
}

/** What the area picker slot gets (it replaces the tree's area roots). */
export interface FileAreaPickerSlotProps {
  areas: readonly FileAreaRefView[];
  areaKey: FileAreaKey;
  onSelectArea: (areaKey: FileAreaKey) => void;
}

/**
 * The table columns a compact manager leaves out (a canvas, a narrow pane): what the icon, the file's own view or the
 * full screen says anyway, so name, status, size and the row's actions fit without scrolling sideways.
 */
const COMPACT_HIDDEN_COLUMN_IDS: ReadonlySet<string> = new Set(['type', 'links', 'uploadedBy', 'created', 'updated', 'deleted']);

export interface FileManagerProps {
  /** The API binding; keep its identity (and its capabilities') stable. */
  adapter: FileManagerAdapter;
  /** The areas this manager shows; the first is the default. More than one → the tree's roots (unless `renderAreaPicker`). */
  areas: readonly FileAreaRefView[];
  /** The open area, controlled (a host picker); without it the area lives in the URL state (`area`). */
  areaKey?: FileAreaKey;
  onAreaKeyChange?: (areaKey: FileAreaKey) => void;
  /**
   * `page`: a full-height page with its header; `embedded`: inside a detail tab (header-less); `compact`: a narrow
   * surface that gives the height (a canvas beside a chat, a pane) — no folder tree and no quota, folders are walked
   * through the list and the breadcrumbs, and a file opens in place (`FileViewer`, with a way back) instead of in the
   * drawer. Every control still appears by the reader's rights.
   */
  variant?: 'page' | 'embedded' | 'compact';
  /**
   * Where the manager starts when the host passes no URL adapters: the state by URL key (`{ folder: '12' }`, `{ file:
   * '7' }`; with `urlKeys` the host's names). Read once.
   */
  initialState?: Readonly<Record<string, string>>;
  title?: ReactNode;
  description?: ReactNode;
  /** Extra page actions left of "Upload files". */
  headerActions?: ReactNode;
  /** A link tab (no folders, linked files only, uploads get the link; capability `links`). */
  context?: FileManagerContext;
  /** The reader may write here (default `true`). */
  canWrite?: boolean;
  /** Writes allowed on this server; default from `WriteAccessProvider`. */
  writesAllowed?: boolean;
  writeLockedMessage?: string;
  /** The host's URL adapters (`useNextUrlStateAdapter`, `useNextDrawerUrlAdapter`); component state otherwise. */
  urlStateAdapter?: UrlStateAdapter;
  drawerUrlAdapter?: EntityDrawerUrlAdapter;
  defaultView?: 'grid' | 'table';
  /** Default 8. */
  maxFolderDepth?: number;
  /** pdf.js from the host for the PDF preview. */
  loadPdfJs?: PdfJsLoader;
  /** A highlighter of the host for the preview of source files (loaded on the first one shown). */
  loadCodeHighlighter?: CodeHighlighterLoader;
  /** Draws a Markdown file as markup in the preview (`MarkdownPreview untrusted` of ./markdown); without it its source. */
  renderMarkdown?: MarkdownFileRenderer;
  /** The area's settings (a drawer of the host): the manager adds an "Area settings" button that opens it. */
  renderAreaSettings?: (props: FileAreaSettingsSlotProps) => ReactNode;
  /** Host controls next to the page actions (a purge, a usage link). */
  renderAreaMaintenance?: (props: FileAreaMaintenanceSlotProps) => ReactNode;
  /** A host picker of the areas above the list (grouped, searchable); the tree then shows the open area only. */
  renderAreaPicker?: (props: FileAreaPickerSlotProps) => ReactNode;
  /** The label of an event type in the drawer's activity (`null` = the built-in label or the type). */
  formatEventType?: (type: string) => string | null | undefined;
  /**
   * The URL parameter names of the manager's state, when the host's differ (`{ area: 'space', folder: 'path', order:
   * 'sort' }`). Keys: `area`, `folder` (a path `/a/b`; a folder id still works), `tab` (`trash`), `view`, `q`, the
   * filters, `order`, `file` (the details drawer) and `fileTab` (the drawer's `accesses` tab).
   */
  urlKeys?: Partial<Record<FileManagerUrlKey, string>>;
  /** A notice above the list when the reader may not write here (a read-only space). */
  readOnlyNotice?: ReactNode;
  /**
   * The link "Copy link" writes (default: this page with the area, the path and the file in the URL keys). `fileId` is
   * set for a file.
   */
  buildLink?: (target: { areaKey: FileAreaKey; path: string; fileId: FileItemId | null }) => string;
}

/** `https://host/page?area=…&folder=/a/b&file=12` — this page at one location, every other parameter dropped. */
const defaultLocationLink = (
  keys: Readonly<Record<'area' | 'folder' | 'file', string>>,
  target: { areaKey: FileAreaKey | null; path: string; fileId: FileItemId | null }
): string => {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  if (target.areaKey !== null && target.areaKey !== '') url.searchParams.set(keys.area, String(target.areaKey));
  if (target.path !== '' && target.path !== '/') url.searchParams.set(keys.folder, target.path);
  if (target.fileId !== null) url.searchParams.set(keys.file, String(target.fileId));
  return url.toString();
};

/**
 * The file manager: folder tree + breadcrumbs + quota, grid / table of folders and files, search and filters in the URL
 * state, drag and drop upload with a per-file progress tray, drag and drop moves of files (with the selection) and
 * folders onto folders, breadcrumbs and other areas, bulk move / link / download / delete, the dialogs, the details
 * drawer (`?file=`) and the trash. Everything API-specific comes through the `adapter` and its capabilities.
 */
export const FileManager = ({
  adapter,
  areas,
  areaKey: controlledAreaKey,
  onAreaKeyChange,
  variant = 'page',
  initialState,
  title,
  description,
  headerActions,
  context,
  canWrite = true,
  writesAllowed: writesAllowedProp,
  writeLockedMessage,
  urlStateAdapter,
  drawerUrlAdapter,
  defaultView = 'grid',
  maxFolderDepth = MAX_FOLDER_DEPTH,
  loadPdfJs,
  loadCodeHighlighter,
  renderMarkdown,
  renderAreaSettings,
  renderAreaMaintenance,
  renderAreaPicker,
  formatEventType,
  urlKeys,
  readOnlyNotice,
  buildLink,
}: FileManagerProps) => {
  const { t } = useTranslate();
  const memory = useMemoryUrlState(initialState);
  const compact = variant === 'compact';
  const urlKeysText = JSON.stringify(urlKeys ?? {});
  const renamedKeys = useMemo<Record<string, string>>(() => JSON.parse(urlKeysText) as Record<string, string>, [urlKeysText]);
  const baseUrlAdapter = urlStateAdapter ?? memory.urlStateAdapter;
  const listUrlAdapter = useMemo(() => renameUrlStateKeys(baseUrlAdapter, renamedKeys), [baseUrlAdapter, renamedKeys]);
  const listState = useUrlListState(LIST_KEYS, { adapter: listUrlAdapter, uncounted: UNCOUNTED, pushKeys: PLACE_KEYS });
  const { values, debounced, setValue, setValues } = listState;
  const drawerAdapter = drawerUrlAdapter ?? memory.drawerUrlAdapter;
  const fileKey = renamedKeys.file ?? 'file';
  const fileTabKey = renamedKeys.fileTab ?? 'fileTab';
  const drawer = useEntityDrawer({ adapter: drawerAdapter, editKey: fileKey, createKey: 'newFile' });
  const drawerTab = drawerAdapter.get(fileTabKey) === 'accesses' ? 'accesses' : 'changes';
  const setDrawerTab = useCallback((tab: 'changes' | 'accesses') => drawerAdapter.replace({ [fileTabKey]: tab === 'accesses' ? tab : null }), [drawerAdapter, fileTabKey]);
  const clipboard = useCopyToClipboard();
  const [editingPath, setEditingPath] = useState(false);
  const [locationMiss, setLocationMiss] = useState<string | null>(null);
  const actions = adapter.useActions();
  const capabilities = adapter.capabilities;
  const features = useMemo(() => resolveFileManagerFeatures(capabilities, actions), [capabilities, actions]);
  const useTrash = capabilities?.trash?.useTrash ?? useNoTrash;
  const linksCapability = capabilities?.links;
  const useLinkTargets = linksCapability?.useLinkTargets ?? useNoLinkTargets;
  const linkKinds = linksCapability?.kinds;
  const workingCopyLabel = features.workingCopy ? (capabilities?.workingCopy?.label ?? t('Unsaved changes')) : undefined;
  const confirm = useConfirm();
  const writeAccess = useWriteAccess();
  const writesAllowed = writesAllowedProp ?? writeAccess.allowed;
  const lockedMessage = writeLockedMessage ?? writeAccess.reason ?? t('Writes are switched off on this server.');
  const [treeSheetOpen, setTreeSheetOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const displayMode: 'grid' | 'table' = values.view === 'grid' || values.view === 'table' ? values.view : defaultView;

  // ─── Where we are ──────────────────────────────────────────────────────────────────────────────────────────────
  const requestedAreaKey = controlledAreaKey ?? (values.area !== '' ? values.area : undefined);
  const area = areas.find(candidate => requestedAreaKey !== undefined && String(candidate.key) === String(requestedAreaKey)) ?? areas[0];
  const areaKey: FileAreaKey = area?.key ?? '';
  const rootLabel = area?.name ?? t('Files', { context: 'files-label' });
  const areaQuery = adapter.useArea(areaKey);
  const areaData = areaQuery.data;
  const foldersQuery = adapter.useFolders(areaKey);
  const folders = foldersQuery.data ?? [];
  // `tab=trash`; an older `folder=trash` still opens it.
  const inTrash = features.trash && !context && (values.tab === TRASH || values.folder === TRASH);
  const requestedFolder = context || inTrash || values.folder === '' || values.folder === TRASH ? null : values.folder;
  const knownFolderId = requestedFolder === null ? null : folderIdOfParam(folders, requestedFolder);
  // A path or id that is not (or no longer) in the tree falls back to the root once the tree is in (the miss is shown).
  const currentFolderId: FileItemId | null =
    requestedFolder === null
      ? null
      : knownFolderId !== undefined
        ? knownFolderId
        : foldersQuery.data
          ? null
          : /^\d+$/.test(requestedFolder)
            ? Number(requestedFolder)
            : null;
  const location: FileLocation = inTrash ? { kind: 'trash' } : { kind: 'folder', folderId: currentFolderId };
  const path = useMemo(() => folderPath(folders, currentFolderId), [folders, currentFolderId]);
  const currentFolderName = path.at(-1)?.name ?? rootLabel;

  const areaEnabled = areaData?.isEnabled ?? true;
  const canWriteHere = canWrite && areaEnabled;
  const editable = canWriteHere && writesAllowed;
  const retentionDays = areaData?.trashRetentionDays ?? null;

  // ─── The request ───────────────────────────────────────────────────────────────────────────────────────────────
  const q = debounced.q.trim();
  const family = features.familyFilter && isFamily(debounced.family) ? debounced.family : undefined;
  const filterActive = q !== '' || FILTER_KEYS.some(key => key !== 'q' && debounced[key] !== '');
  const order: FileListOrder = isOrder(debounced.order) && features.orders.includes(debounced.order) ? debounced.order : (features.orders[0] ?? 'name');
  const targetFilter = useMemo<FileLinkRef | undefined>(() => {
    if (!features.links || debounced.target === '') return undefined;
    const separator = debounced.target.indexOf(':');
    if (separator <= 0) return undefined;
    const id = debounced.target.slice(separator + 1);
    return { kind: debounced.target.slice(0, separator), id: /^\d+$/.test(id) ? Number(id) : id };
  }, [features.links, debounced.target]);
  const query = useMemo<FileListQuery>(
    () => ({
      areaKey,
      // Search and filters look into every folder; plain browsing shows one folder.
      folderId: context || filterActive ? undefined : (currentFolderId ?? 'root'),
      q: q || undefined,
      family,
      linkTarget: context?.linkTarget ?? targetFilter,
      linked: (features.links && debounced.link === 'linked') || undefined,
      unlinked: (features.links && debounced.link === 'unlinked') || undefined,
      uploadedByMe: (features.uploadedByMeFilter && debounced.mine === '1') || undefined,
      createdFrom: (features.createdFilter && debounced.from) || undefined,
      createdTo: (features.createdFilter && debounced.to) || undefined,
      orderBy: order,
      orderDirection: order === 'name' ? 'asc' : 'desc',
    }),
    [areaKey, context, filterActive, currentFolderId, q, family, targetFilter, features, debounced, order]
  );
  const files = adapter.useFiles(inTrash || !area ? null : query);
  const trash = useTrash(inTrash && area ? { areaKey } : null);
  const list = inTrash ? trash : files;
  const linkTargets = useLinkTargets(area && !context && features.links ? { areaKey } : null);

  const navigate = useCallback(
    (next: FileLocation) => {
      setValues(
        next.kind === 'trash'
          ? { tab: TRASH, folder: '' }
          : { tab: '', folder: folderParamOf(folders, next.folderId) || (next.folderId === null ? '' : String(next.folderId)) }
      );
      setLocationMiss(null);
      setEditingPath(false);
      setTreeSheetOpen(false);
    },
    [setValues, folders]
  );
  const selectArea = useCallback(
    (key: FileAreaKey) => {
      if (onAreaKeyChange) {
        onAreaKeyChange(key);
        setValues({ folder: '', tab: '' });
      } else {
        setValues({ area: String(key) === String(areas[0]?.key) ? '' : String(key), folder: '', tab: '' });
      }
      setLocationMiss(null);
      setTreeSheetOpen(false);
    },
    [onAreaKeyChange, setValues, areas]
  );
  const clearFilters = useCallback(() => setValues(CLEARED_FILTERS), [setValues]);

  // ─── Locations: the path bar, pasted paths, a URL path that is no folder ─────────────────────────────────────────
  const locationCapability = capabilities?.location;
  const missText = useCallback(
    (deepestFolderPath: string | null | undefined, missingSegment: string | null | undefined, message?: string | null) =>
      missingSegment
        ? t('“%name%” does not exist in %folder%.', { replacements: { name: missingSegment, folder: deepestFolderPath || '/' } })
        : (message ?? t('This location does not exist or you may not open it.')),
    [t]
  );
  /** Opens a resolved location: its area, its folder and (for a file) its details. */
  const openResolvedLocation = useCallback(
    (areaKeyOfLocation: FileAreaKey, folderPathOfLocation: string, fileId: FileItemId | null) => {
      if (String(areaKeyOfLocation) !== String(areaKey)) selectArea(areaKeyOfLocation);
      clearFilters();
      setValues({ folder: folderPathOfLocation === '/' ? '' : folderPathOfLocation, tab: '' });
      setLocationMiss(null);
      setEditingPath(false);
      if (fileId !== null) drawer.openEdit(fileId);
    },
    [areaKey, selectArea, clearFilters, setValues, drawer]
  );
  const goToLocation = useCallback(
    async (input: string): Promise<string | null> => {
      const parsed = parseLocationInput(input);
      if (parsed.kind === 'invalid') return parsed.reason === 'empty' ? t('Type a path.') : t('A path may not contain “..”.');
      // A folder of the open area: straight from the tree (a mount-prefixed path also without its first name).
      if (parsed.kind === 'path' && !(parsed.mount && locationCapability)) {
        for (const segments of parsed.mount ? [parsed.segments, parsed.segments.slice(1)] : [parsed.segments]) {
          const match = findFolderByPath(folders, segments);
          if (match.folderId !== undefined) {
            openResolvedLocation(areaKey, folderPathText(folders, match.folderId), null);
            return null;
          }
        }
      }
      if (locationCapability) {
        try {
          const result = await locationCapability.resolveLocation(areaKey, input);
          if (!result.found) return missText(result.deepestFolderPath, result.missingSegment, result.message);
          const folderOfLocation = result.fileId === null ? result.path : `/${pathSegments(result.path).slice(0, -1).join('/')}`;
          openResolvedLocation(result.areaKey, folderOfLocation, result.fileId);
          return null;
        } catch (error) {
          return normalizeDddError(error, t('The location could not be opened.')).message;
        }
      }
      if (parsed.kind === 'reference') return t('Links of the form drive/<id> are not supported here.');
      const match = findFolderByPath(folders, parsed.segments);
      return missText(folderPathText(folders, match.deepestFolderId), match.missingSegment);
    },
    [t, locationCapability, folders, areaKey, openResolvedLocation, missText]
  );

  // A URL path (`?folder=/a/b/report.pdf`) that is no folder: a file's path opens its folder and details, else the miss.
  const checkedLocationRef = useRef<string | null>(null);
  useEffect(() => {
    if (requestedFolder === null || knownFolderId !== undefined || !foldersQuery.data) return;
    const checkKey = `${String(areaKey)}|${requestedFolder}`;
    if (checkedLocationRef.current === checkKey) return;
    checkedLocationRef.current = checkKey;
    void goToLocation(requestedFolder).then(failure => {
      if (failure !== null) setLocationMiss(failure);
    });
  }, [requestedFolder, knownFolderId, foldersQuery.data, areaKey, goToLocation]);

  // Ctrl/Cmd+L edits the path (not inside a dialog, not in the trash or a link tab).
  useEffect(() => {
    if (context) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey || event.key.toLowerCase() !== 'l') return;
      const active = document.activeElement;
      if (active instanceof Element && active.closest('[role="dialog"], [role="alertdialog"]')) return;
      event.preventDefault();
      setEditingPath(true);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [context]);

  // ─── Copy path / link ──────────────────────────────────────────────────────────────────────────────────────────
  const linkKeys = useMemo(
    () => ({ area: renamedKeys.area ?? 'area', folder: renamedKeys.folder ?? 'folder', file: fileKey }),
    [renamedKeys, fileKey]
  );
  const linkTo = useCallback(
    (path: string, fileId: FileItemId | null) => (buildLink ? buildLink({ areaKey, path, fileId }) : defaultLocationLink(linkKeys, { areaKey, path, fileId })),
    [buildLink, areaKey, linkKeys]
  );
  const copyText = useCallback(
    async (text: string, success: string) => {
      if (text !== '' && (await clipboard.copy(text))) notify.success(success);
      else notify.error(t('The clipboard is not available here.'));
    },
    [clipboard, t]
  );
  const copyFolderPath = useCallback(
    (folder: FolderView) => void copyText(folderPathText(folders, folder.id), t('Path copied')),
    [copyText, folders, t]
  );
  const copyFolderLink = useCallback(
    (folder: FolderView) => void copyText(linkTo(folderPathText(folders, folder.id), null), t('Link copied')),
    [copyText, linkTo, folders, t]
  );

  // ─── Entries ───────────────────────────────────────────────────────────────────────────────────────────────────
  const childFolders = useMemo(
    () =>
      context || inTrash || filterActive
        ? []
        : folders
            .filter(folder => sameFileId(folder.parentId, currentFolderId))
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
    [context, inTrash, filterActive, folders, currentFolderId]
  );
  const entries = useMemo<FileManagerEntry[]>(
    () => [...childFolders.map(folder => ({ kind: 'folder' as const, folder })), ...list.items.map(file => ({ kind: 'file' as const, file }))],
    [childFolders, list.items]
  );
  const folderNameOf = useCallback(
    (file: FileView) => (file.folderId === null ? null : (folders.find(folder => sameFileId(folder.id, file.folderId))?.name ?? file.folderName ?? null)),
    [folders]
  );

  // ─── Selection (files only) ────────────────────────────────────────────────────────────────────────────────────
  const [busy, setBusy] = useState(false);
  const selectionResetKey = `${String(areaKey)}|${values.folder}|${JSON.stringify(debounced)}`;
  const getKey = useCallback((entry: FileManagerEntry) => (entry.kind === 'file' ? String(entry.file.id) : null), []);
  const selection = useRowSelection({
    items: entries,
    getKey,
    resetKey: selectionResetKey,
    disabled: busy,
    rowLabel: entry => (entry.kind === 'file' ? t('Select %name%', { replacements: { name: entry.file.name } }) : ''),
  });
  const selectedFiles = useMemo(() => selection.selectedItems.flatMap(entry => (entry.kind === 'file' ? [entry.file] : [])), [selection.selectedItems]);

  // ─── Dialogs ───────────────────────────────────────────────────────────────────────────────────────────────────
  const [moveRequest, setMoveRequest] = useState<{ files: readonly FileView[] } | { folder: FolderView } | null>(null);
  const [crossAreaMove, setCrossAreaMove] = useState<MoveAcrossAreasRequest | null>(null);
  const [linkRequest, setLinkRequest] = useState<readonly FileView[] | null>(null);
  const [folderDialog, setFolderDialog] = useState<{ mode: 'create'; parentId: FileItemId | null } | { mode: 'rename'; folder: FolderView } | null>(null);
  // the compact manager has no details drawer: a file is renamed from its row
  const [fileToRename, setFileToRename] = useState<FileView | null>(null);

  const run = useCallback(async (work: () => Promise<unknown>, success: string, failure: string): Promise<boolean> => {
    setBusy(true);
    try {
      await work();
      notify.success(success);
      return true;
    } catch (error) {
      notify.error(normalizeDddError(error, failure).message);
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const closeDrawerFor = useCallback(
    (targets: readonly FileView[]) => {
      if (drawer.editId && targets.some(file => String(file.id) === drawer.editId)) drawer.close();
    },
    [drawer]
  );

  const download = useCallback(
    async (targets: readonly FileView[]) => {
      // One download after the other.
      for (const file of targets.filter(candidate => isFileReleased(candidate.scanStatus))) {
        try {
          const result = await actions.getDownload(file.id, { disposition: 'attachment' });
          startFileDownload(result.url, result.fileName || file.name);
        } catch (error) {
          notify.error(normalizeDddError(error, t('%name% could not be downloaded', { replacements: { name: file.name } })).message);
        }
      }
    },
    [actions, t]
  );

  const trashFiles = useCallback(
    async (targets: readonly FileView[]) => {
      if (!editable || targets.length === 0) return;
      const confirmed = await confirm(
        features.trash
          ? {
              title:
                targets.length === 1
                  ? t('Move “%name%” to the trash?', { replacements: { name: targets[0]?.name ?? '' } })
                  : t('{count, plural, one {Move # file to the trash?} other {Move # files to the trash?}}', { count: targets.length }),
              description:
                retentionDays !== null
                  ? t('Deleted files stay in the trash for %days% days and can be restored until then.', { replacements: { days: retentionDays } })
                  : t('Deleted files stay in the trash and can be restored from there.'),
              confirmLabel: t('Move to the trash'),
              confirmVariant: 'destructive',
            }
          : {
              title:
                targets.length === 1
                  ? t('Delete “%name%”?', { replacements: { name: targets[0]?.name ?? '' } })
                  : t('{count, plural, one {Delete # file?} other {Delete # files?}}', { count: targets.length }),
              description: t('This cannot be undone.'),
              confirmLabel: t('Delete', { context: 'action' }),
              confirmVariant: 'destructive',
            }
      );
      if (!confirmed) return;
      const ok = await run(
        () => actions.trashFiles(targets.map(file => file.id)),
        features.trash
          ? t('{count, plural, one {# file moved to the trash} other {# files moved to the trash}}', { count: targets.length })
          : t('{count, plural, one {# file deleted} other {# files deleted}}', { count: targets.length }),
        t('Delete failed')
      );
      if (ok) {
        selection.clear();
        closeDrawerFor(targets);
      }
    },
    [editable, confirm, features.trash, retentionDays, run, actions, selection, closeDrawerFor, t]
  );

  const restoreFiles = useCallback(
    async (targets: readonly FileView[]) => {
      const restore = actions.restoreFiles;
      if (!canWrite || !writesAllowed || targets.length === 0 || !restore) return;
      const ok = await run(
        () => restore(targets.map(file => file.id)),
        t('{count, plural, one {# file restored} other {# files restored}}', { count: targets.length }),
        t('Restore failed')
      );
      if (ok) {
        selection.clear();
        closeDrawerFor(targets);
      }
    },
    [canWrite, writesAllowed, run, actions, selection, closeDrawerFor, t]
  );

  const purgeFiles = useCallback(
    async (targets: readonly FileView[]) => {
      const purge = actions.purgeFiles;
      if (!canWrite || !writesAllowed || targets.length === 0 || !purge) return;
      const confirmed = await confirm({
        title:
          targets.length === 1
            ? t('Delete “%name%” permanently?', { replacements: { name: targets[0]?.name ?? '' } })
            : t('{count, plural, one {Delete # file permanently?} other {Delete # files permanently?}}', { count: targets.length }),
        description: t('The files are removed right away and cannot be restored.'),
        confirmLabel: t('Delete permanently'),
        confirmVariant: 'destructive',
      });
      if (!confirmed) return;
      const ok = await run(
        () => purge(targets.map(file => file.id)),
        t('{count, plural, one {# file deleted permanently} other {# files deleted permanently}}', { count: targets.length }),
        t('Delete failed')
      );
      if (ok) {
        selection.clear();
        closeDrawerFor(targets);
      }
    },
    [canWrite, writesAllowed, confirm, run, actions, selection, closeDrawerFor, t]
  );

  const emptyTrash = async () => {
    const empty = actions.emptyTrash;
    if (!canWrite || !writesAllowed || !empty) return;
    const phrase = t('EMPTY', { context: 'confirm-phrase' });
    const confirmed = await confirm({
      title: t('Empty the trash of %root%?', { replacements: { root: rootLabel } }),
      description: t('Every file in this trash is removed for good — also files others deleted. This cannot be undone.'),
      requirePhrase: phrase,
      confirmLabel: t('Empty the trash'),
      confirmVariant: 'destructive',
    });
    if (!confirmed) return;
    const ok = await run(() => empty(areaKey), t('Trash emptied'), t('The trash could not be emptied'));
    if (ok) selection.clear();
  };

  const handlers = useMemo<FileItemHandlers>(
    () => ({
      onDownload: file => void download([file]),
      onMove: file => setMoveRequest({ files: [file] }),
      onTrash: file => void trashFiles([file]),
      onRename: compact ? file => setFileToRename(file) : undefined,
      onLink: features.editLinks ? file => setLinkRequest([file]) : undefined,
      onRestore: features.restore ? file => void restoreFiles([file]) : undefined,
      onPurge: features.purge ? file => void purgeFiles([file]) : undefined,
      onCopyPath: file => void copyText(filePathText(folders, file), t('Path copied')),
      onCopyLink: file => void copyText(linkTo(folderPathText(folders, file.folderId), file.id), t('Link copied')),
    }),
    [download, trashFiles, restoreFiles, purgeFiles, features, copyText, linkTo, folders, t, compact]
  );

  // ─── Folders ───────────────────────────────────────────────────────────────────────────────────────────────────
  const deleteFolder = useCallback(
    async (folder: FolderView) => {
      if (!editable) return;
      const subtree = folderSubtreeIds(folders, folder.id);
      const knownFiles = folders.filter(candidate => subtree.has(String(candidate.id))).reduce((sum, candidate) => sum + (candidate.fileCount ?? 0), 0);
      const contentLine = features.trash
        ? subtree.size > 1
          ? t('Its %files% and those of %folders% move to the trash; the folders are removed.', {
              replacements: {
                files: filesLabel(knownFiles, t),
                folders: t('{count, plural, one {# subfolder} other {# subfolders}}', { count: subtree.size - 1 }),
              },
            })
          : knownFiles > 0
            ? t('Its %files% move to the trash; the folder is removed.', { replacements: { files: filesLabel(knownFiles, t) } })
            : t('The empty folder is removed.')
        : t('The folder and everything in it are deleted. This cannot be undone.');
      const confirmed = await confirm({
        title: t('Delete the folder “%name%”?', { replacements: { name: folder.name } }),
        description: contentLine,
        confirmLabel: t('Delete folder'),
        confirmVariant: 'destructive',
      });
      if (!confirmed) return;
      setBusy(true);
      try {
        const result = await actions.deleteFolder(folder.id);
        notify.success(
          result.trashedFiles > 0 && features.trash
            ? t('{count, plural, one {Folder deleted — # file moved to the trash} other {Folder deleted — # files moved to the trash}}', {
                count: result.trashedFiles,
              })
            : t('Folder deleted')
        );
        if (currentFolderId !== null && subtree.has(String(currentFolderId))) navigate({ kind: 'folder', folderId: folder.parentId });
      } catch (error) {
        notify.error(normalizeDddError(error, t('The folder could not be deleted')).message);
      } finally {
        setBusy(false);
      }
    },
    [editable, folders, features.trash, confirm, actions, currentFolderId, navigate, t]
  );

  const folderActions = useMemo<FolderTreeActions | undefined>(
    () =>
      canWriteHere
        ? {
            onCreate: parentId => setFolderDialog({ mode: 'create', parentId }),
            onRename: folder => setFolderDialog({ mode: 'rename', folder }),
            onMove: folder => setMoveRequest({ folder }),
            onDelete: folder => void deleteFolder(folder),
            onCopyPath: copyFolderPath,
            onCopyLink: copyFolderLink,
          }
        : { onCopyPath: copyFolderPath, onCopyLink: copyFolderLink },
    [canWriteHere, deleteFolder, copyFolderPath, copyFolderLink]
  );

  // ─── Moves by drag and drop ────────────────────────────────────────────────────────────────────────────────────
  const { previewMove, moveItems } = actions;
  const dragEnabled = editable && !inTrash && !context && area !== undefined;
  /** A dragged file carries the selection it belongs to; any other file goes alone. */
  const dragItemFor = useCallback(
    (file: FileView): FileDragItem =>
      selectedFiles.length > 1 && selectedFiles.some(selected => sameFileId(selected.id, file.id))
        ? { kind: 'files', files: selectedFiles }
        : { kind: 'files', files: [file] },
    [selectedFiles]
  );
  const dropTargetOf = useCallback(
    (folderId: FileItemId | null, label: string): FileDropTarget | null => (dragEnabled ? { areaKey, folderId, label } : null),
    [dragEnabled, areaKey]
  );

  const canDrop = useCallback(
    (item: FileDragItem, target: FileDropTarget): boolean => {
      if (!dragEnabled) return false;
      if (String(target.areaKey) !== String(areaKey)) return features.moveAcrossAreas;
      if (item.kind === 'files') return item.files.some(file => !sameFileId(file.folderId, target.folderId));
      if (sameFileId(target.folderId, item.folder.parentId)) return false;
      if (target.folderId !== null && folderSubtreeIds(folders, item.folder.id).has(String(target.folderId))) return false;
      return folderDepth(folders, target.folderId) + folderSubtreeHeight(folders, item.folder.id) <= maxFolderDepth;
    },
    [dragEnabled, areaKey, features.moveAcrossAreas, folders, maxFolderDepth]
  );

  const onDrop = useCallback(
    (item: FileDragItem, target: FileDropTarget) => {
      if (String(target.areaKey) !== String(areaKey)) {
        setCrossAreaMove({
          itemLabel: dragItemLabel(item, t),
          input: {
            fileIds: item.kind === 'files' ? item.files.map(file => file.id) : [],
            folderIds: item.kind === 'folder' ? [item.folder.id] : [],
            targetAreaKey: target.areaKey,
            folderId: target.folderId,
          },
        });
        return;
      }
      if (item.kind === 'folder') {
        void run(
          () => actions.patchFolder(item.folder.id, { parentFolderId: target.folderId }),
          t('Folder “%name%” moved to %target%', { replacements: { name: item.folder.name, target: target.label } }),
          t('The folder could not be moved')
        );
        return;
      }
      const moving = item.files.filter(file => !sameFileId(file.folderId, target.folderId));
      void run(
        () =>
          actions.moveFiles(
            moving.map(file => file.id),
            target.folderId
          ),
        moving.length === 1
          ? t('“%name%” moved to %target%', { replacements: { name: moving[0]?.name ?? '', target: target.label } })
          : t('{count, plural, one {# file moved to %target%} other {# files moved to %target%}}', {
              count: moving.length,
              replacements: { target: target.label },
            }),
        t('The files could not be moved')
      ).then(ok => ok && selection.clear());
    },
    [areaKey, run, actions, selection, t]
  );

  // ─── Upload ────────────────────────────────────────────────────────────────────────────────────────────────────
  const uploads = useFileUploadQueue({
    upload: actions.upload,
    area: areaData,
    onUploaded: file =>
      notify.success(
        features.malwareScan
          ? t('%name% uploaded — it is being checked', { replacements: { name: file.name } })
          : t('%name% uploaded', { replacements: { name: file.name } }),
        { id: `upload-${String(file.id)}` }
      ),
  });
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const uploadTarget = useMemo(
    () => ({
      areaKey,
      folderId: context ? null : currentFolderId,
      label: context ? context.label : currentFolderName,
      links: context ? [context.linkTarget] : [],
    }),
    [areaKey, context, currentFolderId, currentFolderName]
  );
  const canUploadHere = editable && !inTrash && area !== undefined;
  const addFiles = (picked: readonly File[]) => {
    if (!canUploadHere || picked.length === 0) return;
    uploads.add(picked, uploadTarget);
  };

  const [draggingFiles, setDraggingFiles] = useState(false);
  const dragDepth = useRef(0);
  // Desktop files carry `Files`; a move of the manager carries its own type and never starts an upload.
  const carriesFiles = (event: DragEvent) =>
    Array.from(event.dataTransfer.types).includes('Files') && !Array.from(event.dataTransfer.types).includes(FILE_MANAGER_DRAG_TYPE);
  const uploadDropHandlers = canUploadHere
    ? {
        onDragEnter: (event: DragEvent) => {
          if (!carriesFiles(event)) return;
          event.preventDefault();
          dragDepth.current += 1;
          setDraggingFiles(true);
        },
        onDragOver: (event: DragEvent) => {
          if (!carriesFiles(event)) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
        },
        onDragLeave: (event: DragEvent) => {
          if (!carriesFiles(event)) return;
          dragDepth.current = Math.max(dragDepth.current - 1, 0);
          if (dragDepth.current === 0) setDraggingFiles(false);
        },
        onDrop: (event: DragEvent) => {
          if (!carriesFiles(event)) return;
          event.preventDefault();
          dragDepth.current = 0;
          setDraggingFiles(false);
          addFiles(Array.from(event.dataTransfer.files));
        },
      }
    : {};

  // ─── Columns and cards ─────────────────────────────────────────────────────────────────────────────────────────
  const showStatusOf = (file: FileView) => features.malwareScan || !isFileReleased(file.scanStatus);
  const columns: EntityListColumn<FileManagerEntry>[] = [
    {
      id: 'icon',
      header: <span className="sr-only">{t('Type icon')}</span>,
      className: 'w-14',
      cell: entry =>
        entry.kind === 'folder' ? (
          <FileFamilyIcon family="FOLDER" size="sm" />
        ) : entry.file.isFolder ? (
          <FileFamilyIcon family="FOLDER" size="sm" />
        ) : entry.file.thumbnailUrl ? (
          <span className="flex size-8 overflow-hidden rounded-lg bg-tint">
            <img src={entry.file.thumbnailUrl} alt="" loading="lazy" className={cn('size-full object-cover', isPageThumbnail(entry.file) && 'object-top')} />
          </span>
        ) : (
          <FileFamilyIcon family={entry.file.family} size="sm" />
        ),
    },
    {
      id: 'name',
      header: t('Name', { context: 'file-name' }),
      className: 'min-w-56',
      cell: entry =>
        entry.kind === 'folder' ? (
          <FolderNameCell folder={entry.folder} draggable={dragEnabled} dropTarget={dropTargetOf(entry.folder.id, entry.folder.name)} />
        ) : (
          <FileNameCell file={entry.file} dragItem={dragEnabled ? dragItemFor(entry.file) : null} />
        ),
    },
    // The Folder column only where a list spans folders (search, filters).
    ...(context || !filterActive
      ? []
      : [
          {
            id: 'folder',
            header: t('Folder', { context: 'file-location' }),
            cell: (entry: FileManagerEntry) =>
              entry.kind === 'folder' ? <EmptyValue /> : <span className="text-muted-foreground">{folderNameOf(entry.file) ?? rootLabel}</span>,
          },
        ]),
    ...(features.links
      ? [
          {
            id: 'links',
            header: t('Links', { context: 'file-links' }),
            className: 'min-w-40',
            cell: (entry: FileManagerEntry) => (entry.kind === 'folder' ? <EmptyValue /> : <FileLinkChips links={entry.file.links} kinds={linkKinds} />),
          },
        ]
      : []),
    {
      id: 'type',
      header: t('Type', { context: 'file-type' }),
      cell: entry =>
        entry.kind === 'folder' || entry.file.isFolder ? (
          t('Folder', { context: 'file-type' })
        ) : (
          <span className="whitespace-nowrap">
            {t(FILE_FAMILY_LABELS[entry.file.family])}{' '}
            {entry.file.extension && <span className="font-mono text-xs text-muted-foreground">.{entry.file.extension}</span>}
          </span>
        ),
    },
    {
      id: 'status',
      header: t('Status', { context: 'file-status' }),
      cell: entry =>
        entry.kind === 'folder' || entry.file.isFolder ? (
          <EmptyValue />
        ) : (
          <span className="flex flex-wrap gap-1">
            {showStatusOf(entry.file) && <StatusBadge value={entry.file.scanStatus} map={FILE_SCAN_STATUS} />}
            {isFileReleased(entry.file.scanStatus) && newestVersionStateOf(entry.file) !== null && (
              <StatusBadge value={newestVersionStateOf(entry.file) ?? 'checking'} map={FILE_NEWEST_VERSION_STATE} />
            )}
            {workingCopyLabel && entry.file.hasWorkingCopyChanges && (
              <StatusBadge
                tone="info"
                label={workingCopyLabel}
                icon={FilePen}
                title={capabilities?.workingCopy?.description ?? t('A working copy holds changes that are not saved yet.')}
              />
            )}
          </span>
        ),
    },
    {
      id: 'size',
      header: t('Size', { context: 'file-size' }),
      className: 'text-right',
      cell: entry => (
        <span className="whitespace-nowrap tabular-nums">{entry.kind === 'folder' ? folderContentLabel(entry.folder, t) : entry.file.isFolder ? <EmptyValue /> : formatBytes(entry.file.sizeBytes)}</span>
      ),
    },
    {
      id: 'uploadedBy',
      header: inTrash ? t('Deleted by') : t('Uploaded by'),
      cell: entry =>
        (entry.kind === 'folder'
          ? personWithOnBehalfOf(entry.folder.createdBy, entry.folder.createdOnBehalfOf, t)
          : inTrash
            ? entry.file.deletedBy
            : personWithOnBehalfOf(entry.file.uploadedBy, entry.file.uploadedOnBehalfOf, t)) || <EmptyValue />,
    },
    ...(inTrash
      ? [
          {
            id: 'deleted',
            header: t('Deleted', { context: 'file-date' }),
            cell: (entry: FileManagerEntry) => (entry.kind === 'file' ? <DateCell value={entry.file.deletedAt} /> : null),
          },
          {
            id: 'purge',
            header: t('Removed for good'),
            cell: (entry: FileManagerEntry) => (entry.kind === 'file' ? <DateCell value={entry.file.purgeAfter} format="date" /> : null),
          },
        ]
      : [
          {
            id: 'created',
            header: t('Created', { context: 'file-date' }),
            cell: (entry: FileManagerEntry) =>
              entry.kind === 'file' ? (
                <DateCell value={entry.file.createdAt} />
              ) : entry.folder.createdAt ? (
                <DateCell value={entry.folder.createdAt} />
              ) : (
                <EmptyValue />
              ),
          },
          {
            id: 'updated',
            header: t('Updated', { context: 'file-date' }),
            cell: (entry: FileManagerEntry) =>
              entry.kind === 'file' ? (
                <DateCell value={entry.file.updatedAt} />
              ) : entry.folder.updatedAt ? (
                <DateCell value={entry.folder.updatedAt} />
              ) : (
                <EmptyValue />
              ),
          },
        ]),
    {
      id: 'actions',
      header: <span className="sr-only">{t('Actions', { context: 'table-column' })}</span>,
      className: 'w-40 text-right',
      cell: entry =>
        entry.kind === 'folder' ? (
          folderActions ? (
            <div className="flex justify-end">
              <FolderActionsMenu
                folder={entry.folder}
                depth={folderDepth(folders, entry.folder.id)}
                actions={folderActions}
                writesAllowed={writesAllowed}
                maxFolderDepth={maxFolderDepth}
              />
            </div>
          ) : null
        ) : (
          <FileItemActions
            file={entry.file}
            handlers={handlers}
            inTrash={inTrash}
            canWrite={canWriteHere}
            writesAllowed={writesAllowed}
            hasTrash={features.trash}
            hidesUnavailable={compact}
          />
        ),
    },
  ];

  const rowAction = useCallback(
    (entry: FileManagerEntry) =>
      entry.kind === 'folder'
        ? () => navigate({ kind: 'folder', folderId: entry.folder.id })
        : entry.file.isFolder
          ? null
          : () => drawer.openEdit(entry.file.id),
    [navigate, drawer]
  );

  const anySelected = selection.count > 0;
  const renderCard = ({ item, onActivate }: { item: FileManagerEntry; onActivate?: (() => void) | null }) =>
    item.kind === 'folder' ? (
      <FolderCard
        folder={item.folder}
        depth={folderDepth(folders, item.folder.id)}
        onOpen={() => navigate({ kind: 'folder', folderId: item.folder.id })}
        actions={folderActions}
        writesAllowed={writesAllowed}
        maxFolderDepth={maxFolderDepth}
        draggable={dragEnabled}
        dropTarget={dropTargetOf(item.folder.id, item.folder.name)}
      />
    ) : (
      <FileCard
        file={item.file}
        onActivate={onActivate}
        handlers={handlers}
        inTrash={inTrash}
        canWrite={canWriteHere}
        writesAllowed={writesAllowed}
        dragItem={dragEnabled ? dragItemFor(item.file) : null}
        linkKinds={features.links ? linkKinds : undefined}
        hasTrash={features.trash}
        hidesUnavailable={compact}
        workingCopyLabel={workingCopyLabel}
        selection={
          canWriteHere
            ? {
                selected: selection.isItemSelected(item),
                onSelectedChange: selected => selection.setItemSelected(item, selected),
                anySelected,
                disabled: busy,
              }
            : undefined
        }
      />
    );

  // ─── Toolbar and bulk bar ──────────────────────────────────────────────────────────────────────────────────────
  const targetOptions = useMemo<FilterOption[]>(() => {
    const kindLabel = (kind: string) => {
      const label = linkKinds?.find(candidate => candidate.kind === kind)?.label;
      return label ? t(label) : kind;
    };
    return flattenLinkTargets(linkTargets.data?.targets ?? []).map(target => ({
      value: `${target.kind}:${String(target.id)}`,
      label: `${target.name} (${kindLabel(target.kind)})`,
    }));
  }, [linkTargets.data, linkKinds, t]);

  const familyOptions = useMemo<FilterOption[]>(() => FILE_FAMILIES.map(value => ({ value, label: t(FILE_FAMILY_LABELS[value]) })), [t]);
  const linkOptions = useMemo<FilterOption[]>(
    () => LINK_OPTIONS.map(option => ({ ...option, label: t(option.label, { context: 'file-link-filter' }) })),
    [t]
  );
  const mineOptions = useMemo<FilterOption[]>(
    () => MINE_OPTIONS.map(option => ({ ...option, label: t(option.label, { context: 'file-uploader-filter' }) })),
    [t]
  );
  const orderOptions = useMemo<FilterOption[]>(
    () => features.orders.map(value => ({ value, label: t(ORDER_LABELS[value], { context: 'file-order' }) })),
    [features.orders, t]
  );

  const bulkActions: EntityListBulkAction[] = inTrash
    ? features.restore
      ? [{ id: 'restore', label: m('Restore'), icon: <ArchiveRestore aria-hidden />, onClick: () => void restoreFiles(selectedFiles) }]
      : []
    : [
        { id: 'move', label: m('Move'), icon: <FolderInput aria-hidden />, onClick: () => setMoveRequest({ files: selectedFiles }) },
        ...(features.bulkLinks
          ? [{ id: 'link', label: m('Edit links'), icon: <Link2 aria-hidden />, onClick: () => setLinkRequest(selectedFiles) }]
          : []),
        {
          id: 'download',
          label: m('Download'),
          icon: <Download aria-hidden />,
          onClick: () => void download(selectedFiles),
          disabled: !selectedFiles.some(file => isFileReleased(file.scanStatus)),
        },
      ];
  const canDeleteSelection = inTrash ? features.purge : true;
  const bulkBar = canWriteHere ? (
    <EntityListBulkBar
      selection={selection}
      actions={bulkActions}
      onDelete={canDeleteSelection ? () => void (inTrash ? purgeFiles(selectedFiles) : trashFiles(selectedFiles)) : undefined}
      deleteLabel={inTrash ? m('Delete permanently') : m('Delete')}
      disabled={!writesAllowed}
      busy={busy}
    >
      {!writesAllowed && <span className="text-xs text-muted-foreground">{lockedMessage}</span>}
    </EntityListBulkBar>
  ) : undefined;

  const showTree = !context && !compact;
  const anyFilter = features.familyFilter || features.links || features.uploadedByMeFilter || features.createdFilter || orderOptions.length > 1;
  const toolbar = (
    <EntityListToolbar
      search={
        inTrash
          ? undefined
          : {
              value: values.q,
              onChange: value => setValue('q', value),
              placeholder: t('Search file names…'),
              'aria-label': t('Search file names'),
            }
      }
      filters={
        inTrash || !anyFilter ? undefined : (
          <FilterPanel>
            {orderOptions.length > 1 && (
              <FilterSelect
                label={t('Sort by', { context: 'file-order' })}
                allLabel={t(ORDER_LABELS[features.orders[0] ?? 'name'], { context: 'file-order' })}
                options={orderOptions.slice(1)}
                value={values.order}
                onChange={value => setValue('order', value)}
              />
            )}
            {features.familyFilter && (
              <FilterSelect
                label={t('Type', { context: 'file-type' })}
                allLabel={t('All types')}
                options={familyOptions}
                value={values.family}
                onChange={value => setValue('family', value)}
              />
            )}
            {features.links && !context && (
              <>
                <FilterSelect
                  label={t('Links', { context: 'file-links' })}
                  allLabel={t('Any', { context: 'filter-option' })}
                  options={linkOptions}
                  value={values.link}
                  onChange={value => setValue('link', value)}
                />
                <FilterSelect
                  label={t('Linked to')}
                  allLabel={t('Anything', { context: 'filter-option' })}
                  options={targetOptions}
                  value={values.target}
                  onChange={value => setValue('target', value)}
                />
              </>
            )}
            {features.uploadedByMeFilter && (
              <FilterSelect
                label={t('Uploaded by')}
                allLabel={t('Anyone')}
                options={mineOptions}
                value={values.mine}
                onChange={value => setValue('mine', value)}
              />
            )}
            {features.createdFilter && (
              <FilterDateRange
                label={t('Created', { context: 'file-date' })}
                from={values.from}
                to={values.to}
                onFromChange={value => setValue('from', value)}
                onToChange={value => setValue('to', value)}
              />
            )}
          </FilterPanel>
        )
      }
      activeFilterCount={inTrash ? 0 : listState.activeFilterCount}
      onClearFilters={clearFilters}
      trailing={
        inTrash || showTree ? (
          <>
            {inTrash && retentionDays !== null && (
              <span className="text-[12.5px] font-bold text-muted-foreground">
                {t('Deleted files stay here for %days% days, then they are removed for good.', { replacements: { days: retentionDays } })}
              </span>
            )}
            {showTree && (
              <Button type="button" variant="outline" size="sm" className="h-8 text-[13px] font-bold md:hidden" onClick={() => setTreeSheetOpen(true)}>
                <FolderTreeIcon />
                {t('Folders')}
              </Button>
            )}
          </>
        ) : undefined
      }
      viewToggle={<EntityListViewToggle displayMode={displayMode} onDisplayModeChange={mode => setValue('view', mode === defaultView ? '' : mode)} />}
      bulkBar={bulkBar}
    />
  );

  // ─── Empty states ──────────────────────────────────────────────────────────────────────────────────────────────
  const emptyMessage = !areaEnabled
    ? t('Uploads and changes are switched off for this area.')
    : inTrash
      ? t('The trash is empty.')
      : context
        ? canUploadHere
          ? t('No files linked to %label% yet. Drop files here or upload.', { replacements: { label: context.label } })
          : t('No files linked to %label% yet.', { replacements: { label: context.label } })
        : currentFolderId === null
          ? canUploadHere
            ? t('No files yet. Drop files here or upload.')
            : t('No files yet.')
          : canUploadHere
            ? t('This folder is empty. Drop files here or upload.')
            : t('This folder is empty.');

  const treeAreas = renderAreaPicker && area ? [area] : areas;
  const tree = showTree && area && (
    <FolderTree
      areas={treeAreas}
      areaKey={areaKey}
      folders={folders}
      isLoading={foldersQuery.isLoading}
      location={location}
      onSelectArea={selectArea}
      onNavigate={navigate}
      actions={folderActions}
      writesAllowed={writesAllowed}
      showTrash={features.trash}
      dragEnabled={dragEnabled}
      crossAreaDrops={features.moveAcrossAreas}
      maxFolderDepth={maxFolderDepth}
      className="h-full"
    />
  );

  const body = (
    <div className={cn('flex flex-col gap-4 md:flex-row', variant === 'page' && 'md:min-h-0 md:flex-1', compact && 'min-h-0 flex-1')}>
      {tree && <aside className="surface hidden w-64 shrink-0 overflow-hidden rounded-2xl md:flex md:flex-col">{tree}</aside>}
      <div className={cn('relative flex min-w-0 flex-1 flex-col', variant === 'page' && 'md:min-h-0', compact && 'min-h-0')} {...uploadDropHandlers}>
        <EntityListCard
          label={inTrash ? t('Trash', { context: 'files-label' }) : t('Files', { context: 'files-label' })}
          toolbar={toolbar}
          isRefetching={list.isRefetching}
          fill={variant === 'page' || compact}
        >
          <EntityListBody
            displayMode={displayMode}
            columns={compact ? columns.filter(column => !COMPACT_HIDDEN_COLUMN_IDS.has(column.id)) : columns}
            renderCard={renderCard}
            items={entries}
            getRowKey={entry => (entry.kind === 'folder' ? `folder-${String(entry.folder.id)}` : `file-${String(entry.file.id)}`)}
            rowAction={rowAction}
            selection={canWriteHere ? selection : undefined}
            isLoading={list.isLoading || (foldersQuery.isLoading && !context && !inTrash)}
            isFetchingMore={list.isFetchingMore}
            hasMore={list.hasMore}
            onLoadMore={list.loadMore}
            emptyMessage={emptyMessage}
            noResultsMessage={t('No files match the search and filters.')}
            isSearchActive={!inTrash && filterActive}
            onClearSearch={clearFilters}
            loadingMessage={inTrash ? t('Loading the trash') : t('Loading files')}
            error={list.isError ? t('The files could not be loaded.') : undefined}
          />
        </EntityListCard>
        {draggingFiles && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-(--layer-raised) flex items-center justify-center rounded-2xl border-2 border-dashed border-primary bg-accent/80 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-2 text-center">
              <CloudUpload className="size-10 text-primary-emphasis" />
              <p className="text-[15px] font-semibold">{t('Drop files to upload them to %target%', { replacements: { target: uploadTarget.label } })}</p>
              {typeof areaData?.maxFileSizeBytes === 'number' && (
                <p className="text-xs text-muted-foreground">{t('Up to %size% per file', { replacements: { size: formatBytes(areaData.maxFileSizeBytes) } })}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const belowHeader = (
    <div className="space-y-3">
      {renderAreaPicker && area && renderAreaPicker({ areas, areaKey, onSelectArea: selectArea })}
      {!areaEnabled && (
        <Alert>
          <AlertTitle>{t('Uploads and changes are switched off for this area')}</AlertTitle>
          <AlertDescription>{t('Existing files can still be downloaded.')}</AlertDescription>
        </Alert>
      )}
      {readOnlyNotice && !canWriteHere && (
        <Alert>
          <AlertDescription>{readOnlyNotice}</AlertDescription>
        </Alert>
      )}
      {locationMiss && (
        <Alert variant="destructive">
          <AlertTitle>{t('This location was not found')}</AlertTitle>
          <AlertDescription>
            {locationMiss}
            <span className="mt-1 block text-muted-foreground">{t('The nearest folder that exists is shown.')}</span>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  // The folder bar sits in the SAME wrapper as the list: a sticky element sticks only while its parent scrolls past,
  // so a parent as tall as the bar itself (the header block) never lets it stick.
  const folderBar = (
    <div
      data-file-folder-bar=""
      className={cn(
        'flex shrink-0 flex-wrap items-center justify-between gap-3',
        // a compact manager scrolls inside its list, so nothing has to stick
        !compact && 'sticky top-[var(--nav-h)] z-(--layer-sticky) -mx-1 bg-background/95 px-1 py-1 backdrop-blur-sm'
      )}
    >
      {editingPath && !context && !inTrash ? (
        <FilePathBar
          initialPath={folderPathText(folders, currentFolderId)}
          folders={folders}
          onSubmit={goToLocation}
          onCancel={() => setEditingPath(false)}
        />
      ) : (
        <FileBreadcrumbs
          rootLabel={rootLabel}
          path={path}
          inTrash={inTrash}
          trailLabel={context ? context.label : filterActive ? t('Search results in all folders') : undefined}
          onNavigate={folderId => {
            clearFilters();
            navigate({ kind: 'folder', folderId });
          }}
          dropAreaKey={dragEnabled ? areaKey : undefined}
          siblingsOf={context ? undefined : parentId => siblingFolders(folders, parentId)}
          onEditPath={context || inTrash ? undefined : () => setEditingPath(true)}
        />
      )}
      {!compact && (
        <QuotaPill usedBytes={areaData?.usedBytes} quotaBytes={areaData?.quotaBytes} isLoading={areaQuery.isLoading} note={areaData?.quotaNote} parts={areaData?.usageParts} />
      )}
    </div>
  );

  const pageActions = (
    <div className="flex flex-wrap items-center gap-2">
      {headerActions}
      {!features.partner && renderAreaMaintenance?.({ areaKey, area: areaData, inTrash })}
      {renderAreaSettings && !features.partner && (
        <Button type="button" variant="outline" onClick={() => setSettingsOpen(true)}>
          <Settings2 />
          {t('Area settings')}
        </Button>
      )}
      {inTrash ? (
        features.emptyTrash && (
          <Button
            type="button"
            variant="outline"
            onClick={() => void emptyTrash()}
            disabled={!canWrite || !writesAllowed || busy || trash.items.length === 0}
            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 />
            {t('Empty the trash')}
          </Button>
        )
      ) : (
        canWrite && (
          <>
            {folderActions?.onCreate && !context && !filterActive && (
              <Button
                type="button"
                variant="outline"
                onClick={() => folderActions.onCreate?.(currentFolderId)}
                disabled={!writesAllowed || folderDepth(folders, currentFolderId) >= maxFolderDepth}
              >
                <FolderPlus />
                {t('New folder')}
              </Button>
            )}
            <Button type="button" onClick={() => uploadInputRef.current?.click()} disabled={!canUploadHere}>
              <Upload />
              {t('Upload files')}
            </Button>
          </>
        )
      )}
      <input
        ref={uploadInputRef}
        type="file"
        multiple
        className="hidden"
        tabIndex={-1}
        aria-hidden
        accept={areaData?.allowedTypes?.length ? areaData.allowedTypes.map(type => `.${type.extension}`).join(',') : undefined}
        onChange={event => {
          addFiles(Array.from(event.target.files ?? []));
          event.target.value = '';
        }}
      />
    </div>
  );

  const moveFiles = moveRequest && 'files' in moveRequest ? moveRequest.files : null;
  const moveFolder = moveRequest && 'folder' in moveRequest ? moveRequest.folder : null;
  const moveSubtree = moveFolder ? folderSubtreeIds(folders, moveFolder.id) : null;
  const moveSubtreeHeight = moveFolder ? folderSubtreeHeight(folders, moveFolder.id) : 0;
  const sharedFolderId = moveFiles?.every(file => sameFileId(file.folderId, moveFiles[0]?.folderId ?? null)) ? (moveFiles[0]?.folderId ?? null) : undefined;
  const useMoveTargetAreas = capabilities?.moveAcrossAreas?.useMoveTargetAreas;
  const areaPicker = useMemo<MoveDialogAreaPicker | undefined>(
    () =>
      features.moveAcrossAreas && useMoveTargetAreas && !context
        ? { currentAreaKey: areaKey, useAreas: useMoveTargetAreas, useFolders: adapter.useFolders }
        : undefined,
    [features.moveAcrossAreas, useMoveTargetAreas, context, areaKey, adapter.useFolders]
  );
  const depthReason = t('Folders nest at most %max% levels deep.', { replacements: { max: maxFolderDepth } });

  const overlays = (
    <>
      {!compact && (
      <FileDrawer
        drawer={drawer}
        adapter={adapter}
        actions={actions}
        features={features}
        listedFile={list.items.find(file => String(file.id) === drawer.editId) ?? null}
        folders={folders}
        rootLabel={rootLabel}
        inTrash={inTrash}
        canWrite={canWriteHere}
        writesAllowed={writesAllowed}
        handlers={handlers}
        linkKinds={linkKinds}
        formatEventType={formatEventType}
        loadPdfJs={loadPdfJs}
        loadCodeHighlighter={loadCodeHighlighter}
        renderMarkdown={renderMarkdown}
        workingCopyLabel={workingCopyLabel}
        workingCopyDescription={capabilities?.workingCopy?.description}
        activityTab={drawerTab}
        onActivityTabChange={setDrawerTab}
        onFileCheckFinished={() => list.refetch?.()}
      />
      )}
      <MoveDialog
        open={moveRequest !== null}
        onOpenChange={open => !open && setMoveRequest(null)}
        title={
          moveFolder
            ? t('Move the folder “%name%”', { replacements: { name: moveFolder.name } })
            : moveFiles?.length === 1
              ? t('Move “%name%”', { replacements: { name: moveFiles[0]?.name ?? '' } })
              : t('{count, plural, one {Move # file} other {Move # files}}', { count: moveFiles?.length ?? 0 })
        }
        rootLabel={rootLabel}
        folders={folders}
        currentFolderId={moveFolder ? moveFolder.parentId : sharedFolderId}
        targetBlockedReason={(target, targetAreaKey, areaFolders) => {
          if (!moveFolder || !moveSubtree) return null;
          if (targetAreaKey !== undefined && areaFolders) {
            return folderDepth(areaFolders, target) + moveSubtreeHeight > maxFolderDepth ? depthReason : null;
          }
          if (target !== null && moveSubtree.has(String(target))) return t('A folder cannot move into itself.');
          if (folderDepth(folders, target) + moveSubtreeHeight > maxFolderDepth) return depthReason;
          return null;
        }}
        writesAllowed={editable}
        areaPicker={areaPicker}
        onMove={async (target, targetAreaKey) => {
          if (targetAreaKey !== undefined && String(targetAreaKey) !== String(areaKey)) {
            setCrossAreaMove({
              itemLabel: moveFolder
                ? t('the folder “%name%”', { replacements: { name: moveFolder.name } })
                : moveFiles?.length === 1
                  ? t('“%name%”', { replacements: { name: moveFiles[0]?.name ?? '' } })
                  : filesLabel(moveFiles?.length ?? 0, t),
              input: {
                fileIds: moveFiles ? moveFiles.map(file => file.id) : [],
                folderIds: moveFolder ? [moveFolder.id] : [],
                targetAreaKey,
                folderId: target,
              },
            });
            return;
          }
          const targetName = target === null ? rootLabel : (folders.find(folder => sameFileId(folder.id, target))?.name ?? rootLabel);
          if (moveFolder) {
            await actions.patchFolder(moveFolder.id, { parentFolderId: target });
            notify.success(t('Folder moved to %target%', { replacements: { target: targetName } }));
          } else if (moveFiles) {
            await actions.moveFiles(
              moveFiles.map(file => file.id),
              target
            );
            notify.success(t('{count, plural, one {# file moved} other {# files moved}}', { count: moveFiles.length }));
            selection.clear();
          }
        }}
      />
      {previewMove && moveItems && features.moveAcrossAreas && (
        <MoveAcrossAreasDialog
          request={crossAreaMove}
          onClose={() => setCrossAreaMove(null)}
          previewMove={previewMove}
          moveItems={moveItems}
          writesAllowed={editable}
          linkKinds={linkKinds}
          onMoved={(result, preview) => {
            const filesPhrase = filesLabel(result.movedFiles, t);
            const moved =
              result.movedFolders > 0
                ? t('%files% and %folders%', {
                    replacements: { files: filesPhrase, folders: t('{count, plural, one {# folder} other {# folders}}', { count: result.movedFolders }) },
                  })
                : filesPhrase;
            const target = preview.targetAreaName ?? t('the other area');
            const removedLinks = result.removedLinks ?? 0;
            notify.success(
              removedLinks > 0
                ? t('%moved% moved to %target% — %links% removed', {
                    replacements: { moved, target, links: t('{count, plural, one {# link} other {# links}}', { count: removedLinks }) },
                  })
                : t('%moved% moved to %target%', { replacements: { moved, target } })
            );
            selection.clear();
            const movedFolderIds = crossAreaMove?.input.folderIds ?? [];
            const movedFileIds = new Set((crossAreaMove?.input.fileIds ?? []).map(String));
            if (drawer.editId && movedFileIds.has(drawer.editId)) drawer.close();
            const leftFolder = movedFolderIds.some(folderId => currentFolderId !== null && folderSubtreeIds(folders, folderId).has(String(currentFolderId)));
            if (leftFolder) navigate({ kind: 'folder', folderId: null });
          }}
        />
      )}
      {linksCapability && features.editLinks && (
        <LinkTargetsDialog
          open={linkRequest !== null}
          onOpenChange={open => !open && setLinkRequest(null)}
          files={linkRequest ?? []}
          areaKey={areaKey}
          links={linksCapability}
          actions={actions}
          writesAllowed={editable}
          onSaved={count => {
            notify.success(t('{count, plural, one {Links saved} other {Links saved for # files}}', { count }));
            selection.clear();
          }}
        />
      )}
      <FileNameDialog
        file={fileToRename}
        onOpenChange={open => !open && setFileToRename(null)}
        writesAllowed={writesAllowed}
        onSubmit={async name => {
          if (fileToRename === null) return;
          await actions.patchFile(fileToRename.id, { name });
          notify.success(t('File renamed'));
        }}
      />
      <FolderNameDialog
        open={folderDialog !== null}
        onOpenChange={open => !open && setFolderDialog(null)}
        mode={folderDialog?.mode ?? 'create'}
        initialName={folderDialog?.mode === 'rename' ? folderDialog.folder.name : ''}
        parentLabel={
          folderDialog?.mode === 'create'
            ? t('in %name%', {
                replacements: {
                  name: folderDialog.parentId === null ? rootLabel : (folders.find(folder => sameFileId(folder.id, folderDialog.parentId))?.name ?? rootLabel),
                },
              })
            : t('Files in the folder keep their links.')
        }
        writesAllowed={editable}
        onSubmit={async name => {
          if (!folderDialog) return;
          if (folderDialog.mode === 'create') {
            const created = await actions.createFolder({ areaKey, parentFolderId: folderDialog.parentId, name });
            notify.success(t('Folder “%name%” created', { replacements: { name: created.name } }));
          } else {
            await actions.patchFolder(folderDialog.folder.id, { name });
            notify.success(t('Folder renamed'));
          }
        }}
      />
      <Sheet open={treeSheetOpen} onOpenChange={setTreeSheetOpen}>
        <SheetContent side="left" className="w-72 bg-card p-0">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle className="text-base">{t('Folders')}</SheetTitle>
          </SheetHeader>
          {tree}
        </SheetContent>
      </Sheet>
      <UploadTray queue={uploads} scansUploads={features.malwareScan} />
      {renderAreaSettings && !features.partner && area && renderAreaSettings({ open: settingsOpen, onClose: () => setSettingsOpen(false), areaKey, area: areaData })}
    </>
  );

  if (compact) {
    const openFileId = drawer.editId ?? null;
    return (
      <FileDndProvider enabled={dragEnabled} canDrop={canDrop} onDrop={onDrop}>
        <div data-slot="file-manager" data-variant="compact" className="flex min-h-0 flex-1 flex-col gap-3">
          {openFileId !== null ? (
            <FileViewer
              adapter={adapter}
              fileId={openFileId}
              leading={
                <Button type="button" variant="ghost" size="icon-sm" aria-label={t('Back to the folder')} title={t('Back to the folder')} onClick={() => drawer.close()}>
                  <ArrowLeft />
                </Button>
              }
              canWrite={canWriteHere && !inTrash}
              writesAllowed={writesAllowed}
              onTextSaved={() => list.refetch?.()}
              onTextCopySaved={() => list.refetch?.()}
              loadPdfJs={loadPdfJs}
              loadCodeHighlighter={loadCodeHighlighter}
              renderMarkdown={renderMarkdown}
            />
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                {folderBar}
                {pageActions}
              </div>
              {belowHeader}
              {body}
            </>
          )}
          {overlays}
        </div>
      </FileDndProvider>
    );
  }

  if (variant === 'embedded') {
    return (
      <FileDndProvider enabled={dragEnabled} canDrop={canDrop} onDrop={onDrop}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">{belowHeader}</div>
            {pageActions}
          </div>
          <div className="flex flex-col gap-3">
            {folderBar}
            {body}
          </div>
          {overlays}
        </div>
      </FileDndProvider>
    );
  }

  return (
    <FileDndProvider enabled={dragEnabled} canDrop={canDrop} onDrop={onDrop}>
      <PageFrame title={title ?? t('Files', { context: 'files-label' })} description={description} actions={pageActions} belowHeader={belowHeader}>
        <div className="flex flex-col gap-3 md:min-h-0 md:flex-1">
          {folderBar}
          {body}
        </div>
      </PageFrame>
      {overlays}
    </FileDndProvider>
  );
};
