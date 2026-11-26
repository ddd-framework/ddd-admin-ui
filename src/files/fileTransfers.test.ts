import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { FileExportsCapability, FileManagerCapabilities } from './fileManagerAdapter.ts';
import { exportTargetsFor, filesForExportTarget, withFileTransfers } from './fileTransfers.ts';
import type { FileView } from './fileView.ts';

const file = (id: number, family: FileView['family'], scanStatus: FileView['scanStatus'] = 'CLEAN'): FileView => ({
  id,
  areaKey: 1,
  folderId: null,
  name: `file-${id}`,
  extension: family === 'IMAGE' ? 'png' : 'pdf',
  family,
  sizeBytes: 10,
  scanStatus,
});

const renderDialog = () => null;
const exportsCapability: FileExportsCapability = {
  targets: [
    { key: 'media', label: 'Copy to the media library', accepts: candidate => candidate.family === 'IMAGE', renderDialog },
    { key: 'archive', label: 'Archive', renderDialog },
  ],
};

describe('file transfers', () => {
  it('offers a file to a target only when it is released and accepted', () => {
    const files = [file(1, 'IMAGE'), file(2, 'PDF'), file(3, 'IMAGE', 'PENDING'), { ...file(4, 'IMAGE'), isFolder: true }];
    assert.deepEqual(filesForExportTarget(exportsCapability.targets[0], files).map(candidate => candidate.id), [1]);
    assert.deepEqual(filesForExportTarget(exportsCapability.targets[1], files).map(candidate => candidate.id), [1, 2]);
  });

  it('lists the targets that take at least one file, in order', () => {
    assert.deepEqual(exportTargetsFor(exportsCapability, [file(2, 'PDF')]).map(target => target.key), ['archive']);
    assert.deepEqual(exportTargetsFor(exportsCapability, [file(1, 'IMAGE')]).map(target => target.key), ['media', 'archive']);
    assert.deepEqual(exportTargetsFor(exportsCapability, [file(3, 'IMAGE', 'INFECTED')]), []);
    assert.deepEqual(exportTargetsFor(undefined, [file(1, 'IMAGE')]), []);
  });

  it('adds the host transfers to what the adapter leaves out and keeps the identity when nothing is added', () => {
    const capabilities: FileManagerCapabilities = { malwareScan: { enabled: true } };
    assert.equal(withFileTransfers(capabilities, null), capabilities);
    assert.equal(withFileTransfers(capabilities, {}), capabilities);
    const merged = withFileTransfers(capabilities, { exports: exportsCapability });
    assert.equal(merged?.exports, exportsCapability);
    assert.deepEqual(merged?.malwareScan, { enabled: true });
    const own: FileExportsCapability = { targets: [] };
    assert.equal(withFileTransfers({ exports: own }, { exports: exportsCapability })?.exports, own);
    assert.equal(withFileTransfers(undefined, { exports: exportsCapability })?.exports, exportsCapability);
  });
});
