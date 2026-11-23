// Sample payloads of the ./files manager: the showcase and the checks render the manager on them.
import type { StaticFileManagerData } from '../files/staticFileManagerAdapter.ts';

export const showcaseFilesData: StaticFileManagerData = {
  areas: [
    {
      areaKey: 'marketing',
      isEnabled: true,
      quotaBytes: 5 * 1024 ** 3,
      usedBytes: 1.2 * 1024 ** 3,
      maxFileSizeBytes: 100 * 1024 ** 2,
      trashRetentionDays: 30,
    },
  ],
  folders: [
    { id: 1, areaKey: 'marketing', parentId: null, name: 'Brand', fileCount: 2 },
    { id: 2, areaKey: 'marketing', parentId: 1, name: 'Logos', fileCount: 1 },
    { id: 3, areaKey: 'marketing', parentId: null, name: 'Reports', fileCount: 1 },
  ],
  files: [
    {
      id: 11,
      areaKey: 'marketing',
      folderId: null,
      name: 'Budget 2026.xlsx',
      extension: 'xlsx',
      family: 'SPREADSHEET',
      sizeBytes: 48_213,
      scanStatus: 'CLEAN',
      uploadedBy: 'Alex Example',
      createdAt: '2026-11-02 09:14:00',
      updatedAt: '2026-11-20 16:40:00',
      links: [{ kind: 'project', id: 7, name: 'Spring launch' }],
      sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      versions: [
        { id: 102, versionNumber: 2, sizeBytes: 48_213, scanStatus: 'CLEAN', isCurrent: true, uploadedBy: 'Alex Example', createdAt: '2026-11-20 16:40:00' },
        { id: 101, versionNumber: 1, sizeBytes: 45_002, scanStatus: 'CLEAN', isCurrent: false, uploadedBy: 'Alex Example', createdAt: '2026-11-02 09:14:00' },
      ],
      events: [
        { id: 1, type: 'VERSION_ADDED', occurredAt: '2026-11-20 16:40:00', actor: 'Alex Example', detail: 'v2' },
        { id: 2, type: 'UPLOADED', occurredAt: '2026-11-02 09:14:00', actor: 'Alex Example' },
      ],
    },
    {
      id: 12,
      areaKey: 'marketing',
      folderId: null,
      name: 'Press kit.pdf',
      extension: 'pdf',
      family: 'PDF',
      sizeBytes: 2_310_442,
      scanStatus: 'PENDING',
      uploadedBy: 'Sam Example',
      createdAt: '2026-11-23 08:01:00',
      links: [],
    },
    {
      id: 13,
      areaKey: 'marketing',
      folderId: null,
      name: 'Notes.md',
      extension: 'md',
      family: 'TEXT',
      sizeBytes: 1_024,
      scanStatus: 'CLEAN',
      hasWorkingCopyChanges: true,
      uploadedBy: 'Alex Example',
      createdAt: '2026-11-21 11:00:00',
      links: [],
    },
  ],
  trash: [
    {
      id: 21,
      areaKey: 'marketing',
      folderId: null,
      name: 'Old flyer.png',
      extension: 'png',
      family: 'IMAGE',
      sizeBytes: 820_000,
      scanStatus: 'CLEAN',
      deletedAt: '2026-11-18 10:00:00',
      deletedBy: 'Sam Example',
      purgeAfter: '2026-12-18 10:00:00',
    },
  ],
  linkTargets: {
    targets: [
      { kind: 'project', id: 7, name: 'Spring launch', children: [{ kind: 'project', id: 8, name: 'Social media', hint: 'Spring launch' }] },
      { kind: 'project', id: 9, name: 'Annual report' },
    ],
  },
};
