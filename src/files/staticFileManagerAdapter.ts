import type {
  FileListQuery,
  FileListState,
  FileManagerActions,
  FileManagerAdapter,
  FileManagerCapabilities,
  FileQueryState,
} from './fileManagerAdapter.ts';
import type { FileAreaKey, FileAreaRefView, FileAreaView, FileDetailView, FileItemId, FileView, FolderView, LinkTargetsView } from './fileView.ts';
import { sameFileId } from './fileView.ts';

/** Fixed payloads of a static adapter (design reviews, tests, the showcase). */
export interface StaticFileManagerData {
  areas: readonly FileAreaView[];
  folders: readonly FolderView[];
  files: readonly FileDetailView[];
  trash?: readonly FileView[];
  linkTargets?: LinkTargetsView;
  /** The capabilities to declare; default: trash, versions, activity, filters, links (when targets are given). */
  capabilities?: FileManagerCapabilities;
  /** Areas offered as move targets (capability `moveAcrossAreas`). */
  moveTargetAreas?: readonly FileAreaRefView[];
}

const done = <TData>(data: TData | undefined): FileQueryState<TData> => ({ data, isLoading: false, isError: false });
const listOf = (items: readonly FileView[]): FileListState => ({
  items,
  isLoading: false,
  isFetchingMore: false,
  hasMore: false,
  loadMore: () => undefined,
  isError: false,
});

const matches = (file: FileView, query: FileListQuery): boolean => {
  if (String(file.areaKey) !== String(query.areaKey)) return false;
  if (query.folderId === 'root' && file.folderId !== null) return false;
  if (query.folderId !== undefined && query.folderId !== 'root' && !sameFileId(file.folderId, query.folderId)) return false;
  if (query.q && !file.name.toLowerCase().includes(query.q.toLowerCase())) return false;
  if (query.family && file.family !== query.family) return false;
  if (query.linked && (file.links ?? []).length === 0) return false;
  if (query.unlinked && (file.links ?? []).length > 0) return false;
  if (query.linkTarget && !(file.links ?? []).some(link => link.kind === query.linkTarget?.kind && sameFileId(link.id, query.linkTarget.id))) return false;
  return true;
};

const refused = () => Promise.reject(new Error('This sample is read-only.'));

/**
 * A file manager adapter on fixed payloads: reads filter the payloads, every write is refused with "read-only". The
 * read hooks are plain functions (no state), so the adapter may be created at module scope.
 */
export const createStaticFileManagerAdapter = (data: StaticFileManagerData): FileManagerAdapter => {
  const actions: FileManagerActions = {
    upload: refused,
    getDownload: refused,
    patchFile: refused,
    moveFiles: refused,
    trashFiles: refused,
    createFolder: refused,
    patchFolder: refused,
    deleteFolder: refused,
    restoreFiles: refused,
    purgeFiles: refused,
    emptyTrash: refused,
    uploadVersion: refused,
    restoreVersion: refused,
    deleteOlderVersions: refused,
    setLinks: refused,
    bulkLinks: refused,
    moveItems: refused,
    previewMove: refused,
  };
  const linkTargets = data.linkTargets;
  const capabilities: FileManagerCapabilities = data.capabilities ?? {
    trash: { useTrash: query => listOf(query ? (data.trash ?? []).filter(file => String(file.areaKey) === String(query.areaKey)) : []) },
    versions: {},
    activity: {},
    filters: { family: true, created: true, uploadedByMe: true, orders: ['name', 'created', 'size'] },
    ...(linkTargets
      ? { links: { kinds: [{ kind: 'project', label: 'Project', pluralLabel: 'Projects' }], useLinkTargets: query => done(query ? linkTargets : undefined) } }
      : {}),
    ...(data.moveTargetAreas ? { moveAcrossAreas: { useMoveTargetAreas: () => done(data.moveTargetAreas) } } : {}),
  };
  return {
    useArea: (areaKey: FileAreaKey) => done(data.areas.find(area => String(area.areaKey) === String(areaKey))),
    useFolders: (areaKey: FileAreaKey) => done(data.folders.filter(folder => String(folder.areaKey) === String(areaKey))),
    useFiles: query => listOf(query ? data.files.filter(file => matches(file, query)) : []),
    useFile: (fileId: FileItemId | null) => done(fileId === null ? undefined : data.files.find(file => sameFileId(file.id, fileId))),
    useActions: () => actions,
    capabilities,
  };
};
