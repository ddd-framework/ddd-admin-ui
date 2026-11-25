import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { copyFileNameOf, FILE_TEXT_EDIT_MAX_BYTES, fileTextDraftSourceOf, fileTextEditRefusalOf, fileTextForSaving } from './fileTextEditing.ts';

const file = { scanStatus: 'CLEAN', hasPendingVersion: false, newestVersionStatus: null, deletedAt: null, sizeBytes: 1200 } as const;

describe('fileTextEditRefusalOf', () => {
  it('lets a released text file of a readable size be edited', () => {
    assert.equal(fileTextEditRefusalOf(file, 'markdown', false), null);
    assert.equal(fileTextEditRefusalOf(file, 'code', false), null);
    assert.equal(fileTextEditRefusalOf(file, 'csv', false), null);
    assert.equal(fileTextEditRefusalOf(file, 'text', false), null);
  });

  it('refuses everything that is no text, trashed, unreleased, old, superseded or too large', () => {
    assert.equal(fileTextEditRefusalOf(file, 'pdf', false), 'kind');
    assert.equal(fileTextEditRefusalOf(file, 'pdf-rendition', false), 'kind');
    assert.equal(fileTextEditRefusalOf(file, 'image', false), 'kind');
    assert.equal(fileTextEditRefusalOf({ ...file, deletedAt: '2026-11-25T10:00:00Z' }, 'text', false), 'trashed');
    assert.equal(fileTextEditRefusalOf({ ...file, scanStatus: 'PENDING' }, 'text', false), 'unreleased');
    assert.equal(fileTextEditRefusalOf(file, 'text', true), 'older-version');
    assert.equal(fileTextEditRefusalOf({ ...file, hasPendingVersion: true }, 'text', false), 'newer-version');
    assert.equal(fileTextEditRefusalOf({ ...file, newestVersionStatus: 'INFECTED' }, 'text', false), 'newer-version');
    assert.equal(fileTextEditRefusalOf({ ...file, sizeBytes: FILE_TEXT_EDIT_MAX_BYTES + 1 }, 'text', false), 'too-large');
  });
});

describe('fileTextDraftSourceOf / fileTextForSaving', () => {
  it('keeps Unix line ends', () => {
    const source = fileTextDraftSourceOf('a\nb\n');
    assert.deepEqual(source, { text: 'a\nb\n', lineEnding: '\n' });
    assert.equal(fileTextForSaving('a\nb\nc\n', source ?? { lineEnding: '\n' }), 'a\nb\nc\n');
  });

  it('gives the editor plain line ends and writes the Windows ones back', () => {
    const source = fileTextDraftSourceOf('a\r\nb\r\n');
    assert.deepEqual(source, { text: 'a\nb\n', lineEnding: '\r\n' });
    assert.equal(fileTextForSaving('a\nb\nc\n', source ?? { lineEnding: '\n' }), 'a\r\nb\r\nc\r\n');
    // a draft that already holds a Windows line end does not get it doubled
    assert.equal(fileTextForSaving('a\r\nb', { lineEnding: '\r\n' }), 'a\r\nb');
  });

  it('does not turn a file with mixed line ends into a Windows file', () => {
    assert.equal(fileTextDraftSourceOf('a\r\nb\nc')?.lineEnding, '\n');
  });

  it('refuses bytes that were no UTF-8 text', () => {
    assert.equal(fileTextDraftSourceOf('Stra�e'), null);
    assert.equal(fileTextDraftSourceOf('PK\u0000\u0003'), null);
  });
});

describe('copyFileNameOf', () => {
  it('names the copy beside the file', () => {
    assert.equal(copyFileNameOf('Notes.md', 'md', 1, 'copy'), 'Notes (copy).md');
    assert.equal(copyFileNameOf('Notes.md', 'md', 3, 'Kopie'), 'Notes (Kopie 3).md');
    assert.equal(copyFileNameOf('README', '', 1, 'copy'), 'README (copy)');
    assert.equal(copyFileNameOf('archive.tar.gz', 'gz', 2, 'copy'), 'archive.tar (copy 2).gz');
  });
});
