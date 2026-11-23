import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { FileAreaView } from './fileView.ts';
import { precheckUpload, uploadFamilyOf } from './uploadPrecheck.ts';

const area: FileAreaView = {
  areaKey: 'a',
  isEnabled: true,
  quotaBytes: 1000,
  usedBytes: 700,
  maxFileSizeBytes: 200,
  allowedTypes: [
    { extension: 'pdf', family: 'PDF' },
    { extension: 'png', family: 'IMAGE' },
  ],
};

describe('upload pre-check', () => {
  it('lets a file within the rules go', () => {
    assert.equal(precheckUpload({ name: 'a.pdf', size: 100 }, area, 0), null);
    assert.equal(precheckUpload({ name: 'a.pdf', size: 100 }, undefined, 0), null, 'no area yet: the server decides');
  });

  it('refuses type, emptiness, size, quota and a switched-off area', () => {
    assert.match(precheckUpload({ name: 'a.exe', size: 10 }, area, 0) ?? '', /not allowed/);
    assert.match(precheckUpload({ name: 'noextension', size: 10 }, area, 0) ?? '', /without an extension/);
    assert.match(precheckUpload({ name: 'a.pdf', size: 0 }, area, 0) ?? '', /empty/);
    assert.match(precheckUpload({ name: 'a.pdf', size: 250 }, area, 0) ?? '', /limit/);
    assert.match(precheckUpload({ name: 'a.pdf', size: 150 }, area, 200) ?? '', /storage/, 'queued uploads count against the quota');
    assert.match(precheckUpload({ name: 'a.pdf', size: 1 }, { ...area, isEnabled: false }, 0) ?? '', /switched off/);
  });

  it('accepts any extension and size when the area names no rules', () => {
    assert.equal(precheckUpload({ name: 'notes.md', size: 10_000_000 }, { areaKey: 1, usedBytes: 5 }, 0), null);
  });

  it('takes the family from the allow-list, else from the extension', () => {
    assert.equal(uploadFamilyOf('x.png', area), 'IMAGE');
    assert.equal(uploadFamilyOf('x.docx', area), 'DOCUMENT');
    assert.equal(uploadFamilyOf('x.unknown', undefined), 'OTHER');
  });
});
