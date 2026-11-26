import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { acceptsImageFiles, isFilePickable } from './filePicking.ts';
import type { FileView } from './fileView.ts';

const file = (extension: string, family: FileView['family'], scanStatus: FileView['scanStatus'] = 'CLEAN'): FileView => ({
  id: extension,
  areaKey: 1,
  folderId: null,
  name: `file.${extension}`,
  extension,
  family,
  sizeBytes: 1,
  scanStatus,
});

describe('file picking', () => {
  it('picks released files the host accepts', () => {
    assert.equal(isFilePickable(file('png', 'IMAGE')), true);
    assert.equal(isFilePickable(file('png', 'IMAGE', 'SKIPPED')), true);
    assert.equal(isFilePickable(file('png', 'IMAGE', 'PENDING')), false);
    assert.equal(isFilePickable(file('png', 'IMAGE', 'INFECTED')), false);
    assert.equal(isFilePickable({ ...file('png', 'IMAGE'), isFolder: true }), false);
    assert.equal(isFilePickable(file('pdf', 'PDF'), acceptsImageFiles), false);
  });

  it('takes raster pictures as pictures, never a vector file', () => {
    assert.equal(acceptsImageFiles(file('jpg', 'IMAGE')), true);
    assert.equal(acceptsImageFiles(file('HEIC', 'IMAGE')), true);
    assert.equal(acceptsImageFiles(file('svg', 'IMAGE')), false);
    assert.equal(acceptsImageFiles(file('pdf', 'PDF')), false);
  });
});
