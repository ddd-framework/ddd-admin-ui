// Sample payloads of the ./clouddrive endpoints (`CloudDriveControllerTrait`): the showcase and the checks render the
// drive screen on them without a request.
import type { StaticCloudDriveData } from '../clouddrive/api.ts';
import type { DriveNode } from '../clouddrive/types.ts';

const ROOT_CHILDREN: DriveNode[] = [
  { id: 2, driveSpaceId: 1, parentNodeId: 1, nodeType: 'FOLDER', name: 'reports', childCount: 3 },
  { id: 3, driveSpaceId: 1, parentNodeId: 1, nodeType: 'FOLDER', name: 'work', childCount: 12, isSystem: true },
  {
    id: 4, driveSpaceId: 1, parentNodeId: 1, nodeType: 'FILE', name: 'NOTES.md', sizeBytes: 2048, contentType: 'text/markdown',
    versionNumber: 14, currentVersionId: 40, latestVersionId: 40, changeHistory: { modifiedTime: '2026-11-22 18:04:00' },
  },
  {
    id: 5, driveSpaceId: 1, parentNodeId: 1, nodeType: 'FILE', name: 'Zuordnung.xlsx', sizeBytes: 34816,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', versionNumber: 2, currentVersionId: 51, latestVersionId: 52,
    changeHistory: { modifiedTime: '2026-11-23 01:12:00' },
  },
];

/** Sample payloads of the cloud drive endpoints: two spaces, a root folder with a system folder and a pending file. */
export const showcaseCloudDriveData: StaticCloudDriveData = {
  spaces: {
    driveSpaces: {
      elements: [
        { id: 1, title: 'World "Sommer 2026"', spaceKind: 'agentSpace', audience: 'INTERNAL', usedBytes: 4_400_000, quotaBytes: 5_368_709_120, fileCount: 143, folderCount: 12 },
        { id: 7, title: 'Library', spaceKind: 'library', audience: 'INTERNAL', usedBytes: 92_000_000, fileCount: 2310, folderCount: 88 },
      ],
    },
  },
  children: () => ({ driveNodes: { elements: ROOT_CHILDREN }, nextCursor: null }),
  search: ({ query }) => ({ driveNodes: { elements: ROOT_CHILDREN.filter(node => node.name.toLowerCase().includes(query.toLowerCase())) } }),
};
