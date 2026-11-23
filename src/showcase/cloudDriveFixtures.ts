// Sample payloads of the ./clouddrive endpoints (`CloudDriveControllerTrait`, ddd-clouddrive ≥ 0.1.0-rc.10): the
// showcase and the checks render the drive screen on them without a request.
import type { StaticCloudDriveData } from '../clouddrive/api.ts';
import type { DriveNode, DriveNodeListItem, DriveSpaceListItem } from '../clouddrive/types.ts';

const QUOTA = {
  maxFileSizeBytes: 524_288_000,
  trashRetentionDays: 30,
  keptVersionCount: 20,
  versionRetentionDays: 90,
};

const SPACE_ITEMS: DriveSpaceListItem[] = [
  {
    id: 1, title: 'Summer 2026', displayName: 'Summer 2026', groupLabel: 'Projects', spaceKind: 'project', audience: 'INTERNAL', rootNodeId: 1,
    quota: { ...QUOTA, usedBytes: 4_400_000, quotaBytes: 5_368_709_120, fileCount: 143, folderCount: 12 }, canWrite: true, canManage: true,
  },
  {
    id: 7, title: 'Library', displayName: 'Library', groupLabel: null, spaceKind: 'library', audience: 'INTERNAL', rootNodeId: 70,
    quota: { ...QUOTA, usedBytes: 92_000_000, quotaBytes: 0, fileCount: 2310, folderCount: 88 }, canWrite: false, canManage: false,
  },
  {
    id: 9, title: 'Agent workspace', displayName: 'Agent workspace', groupLabel: 'Agents', spaceKind: 'agentSpace', audience: 'INTERNAL', rootNodeId: 90,
    quota: { ...QUOTA, usedBytes: 12_000, quotaBytes: 1_073_741_824, fileCount: 3, folderCount: 1 }, canWrite: true, canManage: false,
  },
];

const FOLDERS: DriveNodeListItem[] = [
  { id: 1, driveSpaceId: 1, parentNodeId: null, nodeType: 'FOLDER', name: '', extension: '', childCount: 4 },
  { id: 2, driveSpaceId: 1, parentNodeId: 1, nodeType: 'FOLDER', name: 'Reports', extension: '', childCount: 3 },
  { id: 6, driveSpaceId: 1, parentNodeId: 2, nodeType: 'FOLDER', name: '2026', extension: '', childCount: 1 },
];

const FILES: DriveNodeListItem[] = [
  {
    id: 4, driveSpaceId: 1, parentNodeId: 1, nodeType: 'FILE', name: 'NOTES.md', extension: 'md', family: 'TEXT', contentType: 'text/markdown',
    sizeBytes: 2048, versionNumber: 14, scanStatus: 'CLEAN', hasWorkingCopyChanges: true, createdByName: 'Agent', createdAt: '2026-11-20 09:12:00',
    updatedAt: '2026-11-22 18:04:00',
  },
  {
    id: 5, driveSpaceId: 1, parentNodeId: 1, nodeType: 'FILE', name: 'Assignments.xlsx', extension: 'xlsx', family: 'SPREADSHEET',
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', sizeBytes: 34816, versionNumber: 2, scanStatus: 'CLEAN',
    hasPendingVersion: true, createdByName: 'Staff', createdAt: '2026-11-21 10:00:00', updatedAt: '2026-11-23 01:12:00',
  },
  {
    id: 8, driveSpaceId: 1, parentNodeId: 2, nodeType: 'FILE', name: 'Quarter report.pdf', extension: 'pdf', family: 'PDF', contentType: 'application/pdf',
    sizeBytes: 812_000, versionNumber: 1, scanStatus: 'PENDING', createdByName: 'Staff', createdAt: '2026-11-23 08:30:00', updatedAt: '2026-11-23 08:30:00',
  },
];

const TRASHED: DriveNodeListItem[] = [
  {
    id: 11, driveSpaceId: 1, parentNodeId: 1, nodeType: 'FILE', name: 'Draft.docx', extension: 'docx', family: 'DOCUMENT', sizeBytes: 20_480,
    scanStatus: 'CLEAN', trashedAt: '2026-11-22 12:00:00', trashedByName: 'Staff', purgeAfter: '2026-12-22 12:00:00',
  },
];

const legacyNodeOf = (item: DriveNodeListItem): DriveNode => ({
  id: item.id,
  driveSpaceId: item.driveSpaceId,
  parentNodeId: item.parentNodeId,
  nodeType: item.nodeType,
  name: item.name,
  sizeBytes: item.sizeBytes,
  contentType: item.contentType,
  versionNumber: item.versionNumber,
});

const listOf = (items: DriveNodeListItem[]) => ({ driveNodes: { elements: items.map(legacyNodeOf) }, items: { elements: items }, nextCursor: null });

/** Sample payloads of the cloud drive endpoints: three spaces in two groups, folders, files with states, the trash. */
export const showcaseCloudDriveData: StaticCloudDriveData = {
  spaces: {
    driveSpaces: {
      elements: SPACE_ITEMS.map(item => ({ id: item.id, title: item.title, spaceKind: item.spaceKind, audience: item.audience, rootNodeId: item.rootNodeId })),
    },
    items: { elements: SPACE_ITEMS },
  },
  space: ({ driveSpaceId }) => {
    const item = SPACE_ITEMS.find(spaceItem => spaceItem.id === driveSpaceId);
    return item ? { driveSpace: { id: item.id, title: item.title, rootNodeId: item.rootNodeId }, item } : undefined;
  },
  folders: ({ driveSpaceId }) => ({ items: { elements: FOLDERS.filter(folder => folder.driveSpaceId === driveSpaceId) }, isTruncated: false }),
  children: ({ driveSpaceId, folderNodeId, recursive, query }) => {
    const files = FILES.filter(file => file.driveSpaceId === driveSpaceId);
    if (recursive) return listOf(files.filter(file => !query || file.name.toLowerCase().includes(query.toLowerCase())));
    const folderId = folderNodeId ?? SPACE_ITEMS.find(item => item.id === driveSpaceId)?.rootNodeId;
    return listOf([...FOLDERS, ...files].filter(node => node.parentNodeId === folderId));
  },
  search: ({ driveSpaceId, query }) => listOf(FILES.filter(file => file.driveSpaceId === driveSpaceId && file.name.toLowerCase().includes(query.toLowerCase()))),
  trash: ({ driveSpaceId }) => listOf(TRASHED.filter(node => node.driveSpaceId === driveSpaceId)),
  node: ({ driveNodeId }) => {
    const item = [...FILES, ...TRASHED, ...FOLDERS].find(node => node.id === driveNodeId);
    return item ? { driveNode: legacyNodeOf(item), path: `/${item.name}`, item } : undefined;
  },
  versions: ({ driveNodeId }) => ({
    items: {
      elements: driveNodeId === 5
        ? [
            { id: 52, driveNodeId: 5, versionNumber: 2, sizeBytes: 35_100, scanStatus: 'PENDING', authorName: 'Staff', createdAt: '2026-11-23 01:12:00', isCurrent: false, isLatest: true, isRestorable: false },
            { id: 51, driveNodeId: 5, versionNumber: 1, sizeBytes: 34_816, scanStatus: 'CLEAN', authorName: 'Staff', createdAt: '2026-11-21 10:00:00', isCurrent: true, isLatest: false, isRestorable: true },
          ]
        : [],
    },
  }),
  events: ({ driveNodeId }) => ({
    items: {
      elements: [
        { id: driveNodeId * 10 + 2, eventType: 'RENAMED', occurredAt: '2026-11-22 18:04:00', actorName: 'Staff', previousPath: '/Notes.md', path: '/NOTES.md' },
        { id: driveNodeId * 10 + 1, eventType: 'CREATED', occurredAt: '2026-11-20 09:12:00', actorName: 'Agent', path: '/Notes.md' },
      ],
    },
  }),
};
