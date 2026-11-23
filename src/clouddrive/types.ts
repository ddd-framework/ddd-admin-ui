// Payloads of the cloud drive endpoints (`CloudDriveControllerTrait` of mgamadeus/ddd-clouddrive).

export type DriveNodeType = 'FOLDER' | 'FILE' | 'LINK';
export type DriveSpaceAudience = 'INTERNAL' | 'SHARED';
export type DriveContentPurpose = 'DOWNLOAD' | 'INLINE';

export interface DriveSpace {
  id: number;
  title?: string | null;
  spaceKind?: string | null;
  audience?: DriveSpaceAudience | null;
  rootNodeId?: number | null;
  usedBytes?: number | null;
  quotaBytes?: number | null;
  fileCount?: number | null;
  folderCount?: number | null;
}

export interface DriveNode {
  id: number;
  driveSpaceId: number;
  parentNodeId?: number | null;
  nodeType: DriveNodeType;
  name: string;
  sizeBytes?: number | null;
  contentType?: string | null;
  versionNumber?: number | null;
  currentVersionId?: number | null;
  latestVersionId?: number | null;
  tags?: string | null;
  description?: string | null;
  isSystem?: boolean | null;
  isContentUntrusted?: boolean | null;
  childCount?: number | null;
  trashedAt?: string | null;
  changeHistory?: { createdTime?: string | null; modifiedTime?: string | null } | null;
}

export interface DriveFileVersion {
  id: number;
  versionNumber: number;
  sizeBytes?: number | null;
  comment?: string | null;
  origin?: string | null;
  changeHistory?: { createdTime?: string | null } | null;
}

export interface DrivePresignedRequest {
  method: 'PUT' | 'GET';
  url: string;
  headers?: Record<string, string>;
  expiresAt?: string | null;
}

export interface DriveUploadPartRequest {
  partNumber: number;
  request: DrivePresignedRequest;
}

export interface DriveUploadReservation {
  driveBlobId: number;
  sizeBytes: number;
  uploadRequest?: DrivePresignedRequest | null;
  isMultipart?: boolean;
  partSizeBytes?: number;
  partCount?: number;
  partRequests?: { elements?: DriveUploadPartRequest[] } | null;
  isContentKnown?: boolean;
}

export interface DriveContentGrant {
  purpose: string;
  url: string;
  expiresAt?: string | null;
  fileName: string;
  sizeBytes?: number | null;
  contentType?: string | null;
}

export interface DriveFileCard {
  reference: string;
  driveSpaceId: number;
  name: string;
  path: string;
  isFolder: boolean;
  sizeBytes?: number | null;
  contentType?: string | null;
  modifiedAt?: string | null;
  versionNumber?: number | null;
  childCount?: number | null;
  state?: string | null;
  inlineUrl?: string | null;
  downloadUrl?: string | null;
  thumbnailUrl?: string | null;
  urlsExpireAt?: string | null;
}

export interface DriveSpacesResponse {
  driveSpaces: { elements?: DriveSpace[] };
}

export interface DriveNodesResponse {
  driveNodes: { elements?: DriveNode[] };
  nextCursor?: string | null;
}

export interface DriveNodeResponse {
  driveNode: DriveNode;
  path: string;
  /** The folders above the node, the root first and its own folder last (mgamadeus/ddd-clouddrive ≥ 0.1.0-rc.3). */
  ancestors?: { elements?: DriveNode[] } | null;
  driveFileVersions?: { elements?: DriveFileVersion[] } | null;
  isConflict?: boolean | null;
  conflictReason?: string | null;
}

export interface DriveUploadReservationResponse {
  reservation: DriveUploadReservation;
}

export interface DriveContentGrantResponse {
  grant: DriveContentGrant;
}

export interface DriveFileCardsResponse {
  cards: { elements?: DriveFileCard[] };
}

export interface DriveChildrenArg {
  driveSpaceId: number;
  folderNodeId?: number | null;
  cursor?: string | null;
  limit?: number;
  includeSystem?: boolean;
}

export interface DriveSearchArg {
  driveSpaceId: number;
  query: string;
  limit?: number;
}

export interface DriveNodeIdArg {
  driveNodeId: number;
}

export interface DriveFolderCreateArg {
  driveSpaceId: number;
  parentNodeId?: number | null;
  name: string;
}

export interface DriveUploadReserveArg {
  driveSpaceId: number;
  sizeBytes: number;
  contentType?: string | null;
  contentMd5?: string | null;
  sha256?: string | null;
  idempotencyKey?: string | null;
}

export interface DriveUploadCompleteArg {
  driveBlobId: number;
  folderNodeId?: number | null;
  name: string;
  comment?: string | null;
  expectedLatestVersionId?: number | null;
  replaceExisting?: boolean;
}

export interface DriveContentArg {
  driveNodeId: number;
  purpose?: DriveContentPurpose;
  versionId?: number | null;
}

export interface DriveNodeMoveArg {
  driveNodeId: number;
  targetFolderNodeId?: number | null;
  name?: string | null;
}

export interface DriveFileCardsArg {
  references: string[];
}
