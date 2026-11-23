'use client';

// The file manager of `./files` on the drive's endpoints (`createCloudDriveApi`, mgamadeus/ddd-clouddrive ≥ 0.1.0-rc.10).
import { useMemo, useState } from 'react';

import type {
  FileListQuery,
  FileListState,
  FileManagerActions,
  FileManagerAdapter,
  FileManagerCapabilities,
  FileQueryState,
  FileTrashQuery,
} from '../files/fileManagerAdapter.ts';
import type { FileAreaKey, FileAreaView, FileDetailView, FileItemId, FolderView } from '../files/fileView.ts';
import type { CloudDriveApi } from './api.ts';
import { buildCloudDriveFileActions, type CloudDriveFileActionTriggers, type DriveNodeFact, rememberDriveNodes } from './driveFileActions.ts';
import {
  DRIVE_LIST_PAGE_SIZE,
  driveAreaViewOf,
  driveChildrenArgOf,
  driveEventViewOf,
  driveFileItemsOf,
  driveFileViewOf,
  driveFolderViewsOf,
  driveVersionViewOf,
  nextDriveListLimit,
} from './driveFileMapping.ts';
import type { DriveNodeListItem, DriveSpaceListItem } from './types.ts';

/** How many changes the drawer shows. */
export const DRIVE_ACTIVITY_LIMIT = 20;

export interface UseCloudDriveFileAdapterOptions {
  /** `createCloudDriveApi(…)` of the host. */
  api: CloudDriveApi;
  /** The open space; writes without an area (move, trash, restore, purge) go to it. */
  spaceId: number;
}

/**
 * The capabilities of the drive besides the trash (which `createCloudDriveFileAdapter` adds with its own hook): the
 * same set for every space; the actions say what a viewer may do.
 */
export const CLOUD_DRIVE_FILE_CAPABILITIES: Omit<FileManagerCapabilities, 'trash'> = {
  versions: { replacementExtension: 'same' },
  activity: { limit: DRIVE_ACTIVITY_LIMIT },
  filters: { family: true, created: true, uploadedByMe: true, orders: ['name', 'created', 'size'] },
  workingCopy: {},
  malwareScan: { enabled: true },
};

const EMPTY_LIST: FileListState = { items: [], isLoading: false, isFetchingMore: false, hasMore: false, loadMore: () => undefined, isError: false };

const toSpaceId = (areaKey: FileAreaKey | null | undefined): number => {
  const spaceId = Number(areaKey);
  return Number.isInteger(spaceId) && spaceId > 0 ? spaceId : 0;
};

/** A list that grows by one page per "more" (one request each time, so a write's refetch keeps every row current). */
const useGrowingLimit = (key: string): readonly [number, (next: number) => void] => {
  const [state, setState] = useState({ key, limit: DRIVE_LIST_PAGE_SIZE });
  const limit = state.key === key ? state.limit : DRIVE_LIST_PAGE_SIZE;
  return [limit, (next: number) => setState({ key, limit: next })] as const;
};

/**
 * A `FileManagerAdapter` on the drive: area = space, folder and file ids = node ids. Every space offers trash,
 * versions, activity, filters (family, created, mine, three orders), the working-copy mark and the malware status;
 * purge and empty trash appear only for a viewer with the space's manage right. Create it with
 * `useCloudDriveFileAdapter`; its identity changes only with `api` and `spaceId`.
 */
export const createCloudDriveFileAdapter = (api: CloudDriveApi, spaceId: number): FileManagerAdapter => {
  const nodeFacts = new Map<number, DriveNodeFact>();
  const rememberNodes = (items: readonly DriveNodeListItem[]) => rememberDriveNodes(nodeFacts, items);

  const useSpaceItem = (areaKey: FileAreaKey | null | undefined): { item: DriveSpaceListItem | undefined; isLoading: boolean; isError: boolean } => {
    const driveSpaceId = toSpaceId(areaKey);
    const spaceQuery = api.useDriveSpaceQuery({ driveSpaceId }, { skip: driveSpaceId === 0 });
    return { item: spaceQuery.data?.item ?? undefined, isLoading: spaceQuery.isLoading, isError: spaceQuery.isError };
  };

  const useArea = (areaKey: FileAreaKey): FileQueryState<FileAreaView> => {
    const space = useSpaceItem(areaKey);
    return { data: space.item ? driveAreaViewOf(space.item) : undefined, isLoading: space.isLoading, isError: space.isError };
  };

  const useFolders = (areaKey: FileAreaKey): FileQueryState<readonly FolderView[]> => {
    const space = useSpaceItem(areaKey);
    const driveSpaceId = toSpaceId(areaKey);
    const foldersQuery = api.useDriveFoldersQuery({ driveSpaceId, includeSystem: false }, { skip: driveSpaceId === 0 });
    const data = useMemo(
      () => (foldersQuery.data && space.item ? driveFolderViewsOf(foldersQuery.data.items.elements ?? [], space.item.rootNodeId) : undefined),
      [foldersQuery.data, space.item]
    );
    return { data, isLoading: foldersQuery.isLoading || space.isLoading, isFetching: foldersQuery.isFetching, isError: foldersQuery.isError };
  };

  const useFiles = (query: FileListQuery | null): FileListState => {
    const space = useSpaceItem(query?.areaKey);
    const [limit, setLimit] = useGrowingLimit(JSON.stringify(query));
    const rootNodeId = space.item?.rootNodeId;
    const skip = query === null || space.item === undefined;
    const childrenQuery = api.useDriveChildrenQuery(
      query && !skip ? driveChildrenArgOf(query, rootNodeId, limit) : { driveSpaceId: 0 },
      { skip }
    );
    const items = useMemo(() => {
      const fileItems = driveFileItemsOf(childrenQuery.data?.items?.elements);
      rememberNodes(fileItems);
      return fileItems.map(item => driveFileViewOf(item, rootNodeId));
    }, [childrenQuery.data, rootNodeId]);
    const nextLimit = nextDriveListLimit(limit);
    const hasMore = Boolean(childrenQuery.data?.nextCursor) && nextLimit !== null;
    if (skip) return EMPTY_LIST;
    return {
      items,
      isLoading: childrenQuery.isLoading || space.isLoading,
      isRefetching: childrenQuery.isFetching && childrenQuery.data !== undefined && childrenQuery.currentData !== undefined,
      isFetchingMore: childrenQuery.isFetching && childrenQuery.data !== undefined && childrenQuery.currentData === undefined,
      hasMore,
      loadMore: () => {
        if (nextLimit !== null) setLimit(nextLimit);
      },
      isError: childrenQuery.isError,
    };
  };

  const useTrash = (query: FileTrashQuery | null): FileListState => {
    const space = useSpaceItem(query?.areaKey);
    const [limit, setLimit] = useGrowingLimit(JSON.stringify(query));
    const driveSpaceId = toSpaceId(query?.areaKey);
    const skip = query === null || driveSpaceId === 0;
    const trashQuery = api.useDriveTrashQuery({ driveSpaceId, limit }, { skip });
    const rootNodeId = space.item?.rootNodeId;
    const items = useMemo(
      () => (trashQuery.data?.items?.elements ?? []).filter(item => item.nodeType === 'FILE').map(item => driveFileViewOf(item, rootNodeId)),
      [trashQuery.data, rootNodeId]
    );
    const nextLimit = nextDriveListLimit(limit);
    if (skip) return EMPTY_LIST;
    return {
      items,
      isLoading: trashQuery.isLoading,
      isRefetching: trashQuery.isFetching && trashQuery.currentData !== undefined,
      isFetchingMore: trashQuery.isFetching && trashQuery.data !== undefined && trashQuery.currentData === undefined,
      hasMore: Boolean(trashQuery.data?.nextCursor) && nextLimit !== null,
      loadMore: () => {
        if (nextLimit !== null) setLimit(nextLimit);
      },
      isError: trashQuery.isError,
    };
  };

  const useFile = (fileId: FileItemId | null): FileQueryState<FileDetailView> => {
    const driveNodeId = fileId === null ? 0 : Number(fileId);
    const skip = !Number.isInteger(driveNodeId) || driveNodeId <= 0;
    const nodeQuery = api.useDriveNodeQuery({ driveNodeId }, { skip });
    const versionsQuery = api.useDriveVersionsQuery({ driveNodeId }, { skip });
    const eventsQuery = api.useDriveEventsQuery({ driveNodeId, limit: DRIVE_ACTIVITY_LIMIT }, { skip });
    const item = nodeQuery.data?.item ?? undefined;
    const space = useSpaceItem(item?.driveSpaceId);
    const data = useMemo((): FileDetailView | undefined => {
      if (!item || item.nodeType !== 'FILE') return undefined;
      rememberNodes([item]);
      return {
        ...driveFileViewOf(item, space.item?.rootNodeId),
        sha256: nodeQuery.data?.driveNode.sha256 ?? null,
        versions: versionsQuery.data?.items?.elements?.map(driveVersionViewOf),
        events: eventsQuery.data?.items?.elements?.map(driveEventViewOf),
      };
    }, [item, nodeQuery.data, versionsQuery.data, eventsQuery.data, space.item]);
    return { data, isLoading: nodeQuery.isLoading, isFetching: nodeQuery.isFetching || versionsQuery.isFetching, isError: nodeQuery.isError };
  };

  const useActions = (): FileManagerActions => {
    const space = useSpaceItem(spaceId);
    const [reserveUpload] = api.useReserveDriveUploadMutation();
    const [completeUpload] = api.useCompleteDriveUploadMutation();
    const [requestContent] = api.useDriveContentMutation();
    const [moveNode] = api.useMoveDriveNodeMutation();
    const [updateMetadata] = api.useUpdateDriveNodeMetadataMutation();
    const [createFolder] = api.useCreateDriveFolderMutation();
    const [moveNodes] = api.useMoveDriveNodesMutation();
    const [trashNodes] = api.useTrashDriveNodesMutation();
    const [restoreNodes] = api.useRestoreDriveNodesMutation();
    const [purgeNodes] = api.usePurgeDriveNodesMutation();
    const [emptyTrash] = api.useEmptyDriveTrashMutation();
    const [restoreVersion] = api.useRestoreDriveVersionMutation();
    const rootNodeId = space.item?.rootNodeId ?? null;
    const canManage = space.item?.canManage === true;

    const triggers: CloudDriveFileActionTriggers = {
      reserveUpload, completeUpload, requestContent, moveNode, updateMetadata, createFolder, moveNodes, trashNodes, restoreNodes,
      purgeNodes, emptyTrash, restoreVersion,
    };
    return useMemo(
      () => buildCloudDriveFileActions(triggers, { spaceId, rootNodeId, canManage, nodeFacts }),
      [canManage, rootNodeId, reserveUpload, completeUpload, requestContent, moveNode, updateMetadata, createFolder, moveNodes, trashNodes, restoreNodes, purgeNodes, emptyTrash, restoreVersion]
    );
  };

  return {
    useArea,
    useFolders,
    useFiles,
    useFile,
    useActions,
    capabilities: { ...CLOUD_DRIVE_FILE_CAPABILITIES, trash: { useTrash } },
  };
};

/** The drive's file manager adapter for one space; stable while `api` and `spaceId` stay the same. */
export const useCloudDriveFileAdapter = ({ api, spaceId }: UseCloudDriveFileAdapterOptions): FileManagerAdapter =>
  useMemo(() => createCloudDriveFileAdapter(api, spaceId), [api, spaceId]);
