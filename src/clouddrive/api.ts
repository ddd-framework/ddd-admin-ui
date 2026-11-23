import {
  type ApiMutationHook,
  type ApiQueryHook,
  type InjectableBaseApi,
  type InjectedEndpointDefinition,
  type InjectedRequest,
  injectEndpointsOnce,
  type StaticQueryFailure,
  staticMutationHook,
  staticQueryHook,
  toQueryString,
  trimApiPrefix,
} from '../logic/pure/injectedApi.ts';
import type {
  DriveChildrenArg,
  DriveContentArg,
  DriveContentGrantResponse,
  DriveFileCardsArg,
  DriveFileCardsResponse,
  DriveFolderCreateArg,
  DriveNodeIdArg,
  DriveNodeMoveArg,
  DriveNodeResponse,
  DriveNodesResponse,
  DriveSearchArg,
  DriveSpacesResponse,
  DriveUploadCompleteArg,
  DriveUploadReservationResponse,
  DriveUploadReserveArg,
} from './types.ts';

/** The cache tag type of the cloud drive operations (ids `SPACES`, `NODES`). */
export const CLOUD_DRIVE_TAG = 'AdminUiCloudDrive';

/** The hooks `createCloudDriveApi` returns; the drive screen takes them as its `api`. */
export interface CloudDriveApi {
  /** `GET /spaces/list`: the spaces the viewer may read. */
  useDriveSpacesQuery: ApiQueryHook<void, DriveSpacesResponse>;
  /** `GET /spaces/{id}/children?folderNodeId&cursor&limit&includeSystem`: one page of a folder. */
  useDriveChildrenQuery: ApiQueryHook<DriveChildrenArg, DriveNodesResponse>;
  /** `GET /spaces/{id}/search?query&limit`: names containing the query. */
  useDriveSearchQuery: ApiQueryHook<DriveSearchArg, DriveNodesResponse>;
  /** `GET /nodes/{id}`: one file or folder with its path and versions. */
  useDriveNodeQuery: ApiQueryHook<DriveNodeIdArg, DriveNodeResponse>;
  /** `POST /spaces/{id}/folders`. */
  useCreateDriveFolderMutation: ApiMutationHook<DriveFolderCreateArg, DriveNodeResponse>;
  /** `POST /spaces/{id}/uploads`: one presigned PUT or the parts of a multipart upload. */
  useReserveDriveUploadMutation: ApiMutationHook<DriveUploadReserveArg, DriveUploadReservationResponse>;
  /** `POST /uploads/{blobId}/complete`: the file (a conflict answers `isConflict`). */
  useCompleteDriveUploadMutation: ApiMutationHook<DriveUploadCompleteArg, DriveNodeResponse>;
  /** `GET /nodes/{id}/content?purpose&versionId`: a short-lived content URL (not cached). */
  useDriveContentMutation: ApiMutationHook<DriveContentArg, DriveContentGrantResponse>;
  /** `POST /nodes/{id}/move`. */
  useMoveDriveNodeMutation: ApiMutationHook<DriveNodeMoveArg, DriveNodeResponse>;
  /** `POST /nodes/{id}/trash`. */
  useTrashDriveNodeMutation: ApiMutationHook<DriveNodeIdArg, DriveNodeResponse>;
  /** `POST /nodes/{id}/restore`. */
  useRestoreDriveNodeMutation: ApiMutationHook<DriveNodeIdArg, DriveNodeResponse>;
  /** `POST /cards`: file cards with open, download and thumbnail URLs (the `DriveFiles` widget). */
  useDriveFileCardsQuery: ApiQueryHook<DriveFileCardsArg, DriveFileCardsResponse>;
}

export interface CreateCloudDriveApiOptions {
  /** The host's RTK Query api (`createApi` with the React hooks module). */
  baseApi: InjectableBaseApi;
  /** Where the host mounts `CloudDriveControllerTrait`, without a trailing slash (`/api/admin/common/cloudDrive`). */
  apiPrefix: string;
}

const idOf = (id: number): string => encodeURIComponent(String(id));

/** The request of every operation, on `apiPrefix`. Pure: no RTK runtime. */
export const buildCloudDriveRequests = (apiPrefix: string) => {
  const prefix = trimApiPrefix(apiPrefix);
  return {
    spaces: (): InjectedRequest => ({ url: `${prefix}/spaces/list` }),
    children: ({ driveSpaceId, folderNodeId, cursor, limit, includeSystem }: DriveChildrenArg): InjectedRequest => ({
      url: `${prefix}/spaces/${idOf(driveSpaceId)}/children${toQueryString({ folderNodeId, cursor, limit, includeSystem })}`,
    }),
    search: ({ driveSpaceId, query, limit }: DriveSearchArg): InjectedRequest => ({
      url: `${prefix}/spaces/${idOf(driveSpaceId)}/search${toQueryString({ query, limit })}`,
    }),
    node: ({ driveNodeId }: DriveNodeIdArg): InjectedRequest => ({ url: `${prefix}/nodes/${idOf(driveNodeId)}` }),
    createFolder: ({ driveSpaceId, ...body }: DriveFolderCreateArg): InjectedRequest => ({
      url: `${prefix}/spaces/${idOf(driveSpaceId)}/folders`, method: 'POST', body,
    }),
    reserveUpload: ({ driveSpaceId, ...body }: DriveUploadReserveArg): InjectedRequest => ({
      url: `${prefix}/spaces/${idOf(driveSpaceId)}/uploads`, method: 'POST', body,
    }),
    completeUpload: ({ driveBlobId, ...body }: DriveUploadCompleteArg): InjectedRequest => ({
      url: `${prefix}/uploads/${idOf(driveBlobId)}/complete`, method: 'POST', body,
    }),
    content: ({ driveNodeId, purpose, versionId }: DriveContentArg): InjectedRequest => ({
      url: `${prefix}/nodes/${idOf(driveNodeId)}/content${toQueryString({ purpose, versionId })}`,
    }),
    move: ({ driveNodeId, ...body }: DriveNodeMoveArg): InjectedRequest => ({ url: `${prefix}/nodes/${idOf(driveNodeId)}/move`, method: 'POST', body }),
    trash: ({ driveNodeId }: DriveNodeIdArg): InjectedRequest => ({ url: `${prefix}/nodes/${idOf(driveNodeId)}/trash`, method: 'POST' }),
    restore: ({ driveNodeId }: DriveNodeIdArg): InjectedRequest => ({ url: `${prefix}/nodes/${idOf(driveNodeId)}/restore`, method: 'POST' }),
    cards: (body: DriveFileCardsArg): InjectedRequest => ({ url: `${prefix}/cards`, method: 'POST', body }),
  };
};

const SPACES = { type: CLOUD_DRIVE_TAG, id: 'SPACES' } as const;
const NODES = { type: CLOUD_DRIVE_TAG, id: 'NODES' } as const;

/** The operations as injected. Every write invalidates `NODES` and `SPACES` (counters); content URLs are never cached. */
export const cloudDriveEndpointDefinitions = (apiPrefix: string) => {
  const requests = buildCloudDriveRequests(apiPrefix);
  return {
    adminUiDriveSpaces: { kind: 'query', request: requests.spaces, providesTags: [SPACES] },
    adminUiDriveChildren: { kind: 'query', request: requests.children, providesTags: [NODES] },
    adminUiDriveSearch: { kind: 'query', request: requests.search, providesTags: [NODES] },
    adminUiDriveNode: { kind: 'query', request: requests.node, providesTags: [NODES] },
    adminUiDriveFileCards: { kind: 'query', request: requests.cards, providesTags: [NODES] },
    adminUiDriveFolderCreate: { kind: 'mutation', request: requests.createFolder, invalidatesTags: [NODES, SPACES] },
    adminUiDriveUploadReserve: { kind: 'mutation', request: requests.reserveUpload },
    adminUiDriveUploadComplete: { kind: 'mutation', request: requests.completeUpload, invalidatesTags: [NODES, SPACES] },
    adminUiDriveContent: { kind: 'mutation', request: requests.content },
    adminUiDriveNodeMove: { kind: 'mutation', request: requests.move, invalidatesTags: [NODES] },
    adminUiDriveNodeTrash: { kind: 'mutation', request: requests.trash, invalidatesTags: [NODES, SPACES] },
    adminUiDriveNodeRestore: { kind: 'mutation', request: requests.restore, invalidatesTags: [NODES, SPACES] },
  } as const satisfies Record<string, InjectedEndpointDefinition<never>>;
};

/**
 * Injects the cloud drive operations into the host's RTK Query api and returns their hooks. Call it once at module
 * scope: `export const cloudDriveApi = createCloudDriveApi({ baseApi: adminApi, apiPrefix: '/api/admin/common/cloudDrive' });`
 */
export const createCloudDriveApi = ({ baseApi, apiPrefix }: CreateCloudDriveApiOptions): CloudDriveApi =>
  injectEndpointsOnce(baseApi, `clouddrive:${trimApiPrefix(apiPrefix)}`, [CLOUD_DRIVE_TAG], cloudDriveEndpointDefinitions(apiPrefix), hookOf => ({
    useDriveSpacesQuery: hookOf('adminUiDriveSpaces') as CloudDriveApi['useDriveSpacesQuery'],
    useDriveChildrenQuery: hookOf('adminUiDriveChildren') as CloudDriveApi['useDriveChildrenQuery'],
    useDriveSearchQuery: hookOf('adminUiDriveSearch') as CloudDriveApi['useDriveSearchQuery'],
    useDriveNodeQuery: hookOf('adminUiDriveNode') as CloudDriveApi['useDriveNodeQuery'],
    useDriveFileCardsQuery: hookOf('adminUiDriveFileCards') as CloudDriveApi['useDriveFileCardsQuery'],
    useCreateDriveFolderMutation: hookOf('adminUiDriveFolderCreate') as CloudDriveApi['useCreateDriveFolderMutation'],
    useReserveDriveUploadMutation: hookOf('adminUiDriveUploadReserve') as CloudDriveApi['useReserveDriveUploadMutation'],
    useCompleteDriveUploadMutation: hookOf('adminUiDriveUploadComplete') as CloudDriveApi['useCompleteDriveUploadMutation'],
    useDriveContentMutation: hookOf('adminUiDriveContent') as CloudDriveApi['useDriveContentMutation'],
    useMoveDriveNodeMutation: hookOf('adminUiDriveNodeMove') as CloudDriveApi['useMoveDriveNodeMutation'],
    useTrashDriveNodeMutation: hookOf('adminUiDriveNodeTrash') as CloudDriveApi['useTrashDriveNodeMutation'],
    useRestoreDriveNodeMutation: hookOf('adminUiDriveNodeRestore') as CloudDriveApi['useRestoreDriveNodeMutation'],
  }));

/** Fixed answers of a `createStaticCloudDriveApi`; a query without one stays loading. */
export interface StaticCloudDriveData {
  spaces?: DriveSpacesResponse | StaticQueryFailure;
  children?: (arg: DriveChildrenArg) => DriveNodesResponse | StaticQueryFailure | undefined;
  search?: (arg: DriveSearchArg) => DriveNodesResponse | StaticQueryFailure | undefined;
  node?: (arg: DriveNodeIdArg) => DriveNodeResponse | StaticQueryFailure | undefined;
  cards?: (arg: DriveFileCardsArg) => DriveFileCardsResponse | StaticQueryFailure | undefined;
}

const NOT_AVAILABLE = (): never => {
  throw { status: 403, data: { error: 'Not available in this preview' } };
};

/** A `CloudDriveApi` answering fixed payloads, without a store or a request; writes are refused. */
export const createStaticCloudDriveApi = (data: StaticCloudDriveData): CloudDriveApi => ({
  useDriveSpacesQuery: staticQueryHook(() => data.spaces),
  useDriveChildrenQuery: staticQueryHook(arg => data.children?.(arg)),
  useDriveSearchQuery: staticQueryHook(arg => data.search?.(arg)),
  useDriveNodeQuery: staticQueryHook(arg => data.node?.(arg)),
  useDriveFileCardsQuery: staticQueryHook(arg => data.cards?.(arg)),
  useCreateDriveFolderMutation: staticMutationHook(NOT_AVAILABLE),
  useReserveDriveUploadMutation: staticMutationHook(NOT_AVAILABLE),
  useCompleteDriveUploadMutation: staticMutationHook(NOT_AVAILABLE),
  useDriveContentMutation: staticMutationHook(NOT_AVAILABLE),
  useMoveDriveNodeMutation: staticMutationHook(NOT_AVAILABLE),
  useTrashDriveNodeMutation: staticMutationHook(NOT_AVAILABLE),
  useRestoreDriveNodeMutation: staticMutationHook(NOT_AVAILABLE),
});
