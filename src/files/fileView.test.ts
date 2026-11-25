import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseCsv } from './csvPreview.ts';
import {
  extensionOf,
  fileFamilyOfContentType,
  fileNameStem,
  codeLanguageOfExtension,
  filePreviewDispositionOf,
  filePreviewKind,
  filePreviewVariantOf,
  isTextPreviewKind,
  folderDepth,
  folderPath,
  folderSubtreeHeight,
  folderSubtreeIds,
  type FolderView,
  formatBytes,
  personWithOnBehalfOf,
  sameFileId,
} from './fileView.ts';
import { bulkLinkChanges, initialLinkStates, linkSetOf } from './linkSelection.ts';

const folders: FolderView[] = [
  { id: 1, areaKey: 'a', parentId: null, name: 'Reports' },
  { id: 2, areaKey: 'a', parentId: 1, name: '2026' },
  { id: 3, areaKey: 'a', parentId: 2, name: 'Q1' },
  { id: 'x', areaKey: 'a', parentId: null, name: 'Other' },
];

describe('file view helpers', () => {
  it('draws a person with the account they acted for', () => {
    const t = (text: string, options?: { replacements?: Record<string, string | number> }) =>
      text.replace('%name%', String(options?.replacements?.name ?? ''));
    assert.equal(personWithOnBehalfOf('Staff', 'Partner GmbH', t), 'Staff (on behalf: Partner GmbH)');
    assert.equal(personWithOnBehalfOf('Ann', null, t), 'Ann');
    assert.equal(personWithOnBehalfOf(null, 'Partner GmbH', t), null);
  });

  it('compares ids as text', () => {
    assert.equal(sameFileId(2, '2'), true);
    assert.equal(sameFileId(null, null), true);
    assert.equal(sameFileId(null, 0), false);
  });

  it('walks the folder tree with number and string ids', () => {
    assert.deepEqual(
      folderPath(folders, '3').map(folder => folder.name),
      ['Reports', '2026', 'Q1']
    );
    assert.equal(folderDepth(folders, 3), 3);
    assert.equal(folderDepth(folders, null), 0);
    assert.deepEqual([...folderSubtreeIds(folders, 1)].sort(), ['1', '2', '3']);
    assert.equal(folderSubtreeHeight(folders, 1), 3);
  });

  it('shows a vector file only as the picture the server sanitised', () => {
    assert.equal(filePreviewKind({ family: 'VECTOR', extension: 'svg', hasSanitizedImage: true }), 'sanitized-image');
    assert.equal(filePreviewKind({ family: 'VECTOR', extension: 'SVG', hasSanitizedImage: true }), 'sanitized-image');
    assert.equal(filePreviewKind({ family: 'VECTOR', extension: 'svg', hasSanitizedImage: false }), 'none');
    assert.equal(filePreviewKind({ family: 'VECTOR', extension: 'svg' }), 'none', 'old servers and files without a copy: no preview');
    // neither a thumbnail nor a PDF rendition makes the uploaded bytes of a vector file a preview
    assert.equal(filePreviewKind({ family: 'VECTOR', extension: 'svg', thumbnailUrl: 'https://cdn/x.svg' }), 'none');
    assert.equal(filePreviewKind({ family: 'VECTOR', extension: 'svg', hasPdfRendition: true }), 'none');
    assert.equal(filePreviewKind({ family: 'VECTOR', extension: 'svg', thumbnailUrl: 'https://cdn/x.svg', hasSanitizedImage: true }), 'sanitized-image');
    // the fact belongs to vector files: it turns no other file into a picture
    assert.equal(filePreviewKind({ family: 'TEXT', extension: 'html', hasSanitizedImage: true }), 'none');
    assert.equal(filePreviewKind({ family: 'OTHER', extension: 'svgz', hasSanitizedImage: true }), 'none');
    assert.equal(filePreviewKind({ family: 'IMAGE', extension: 'png', hasSanitizedImage: true }), 'image');
    assert.equal(isTextPreviewKind('sanitized-image'), false, 'never read as text, so never edited in place');
  });

  it('asks the release gate for the sanitised picture and for nothing else of a vector file', () => {
    assert.equal(filePreviewVariantOf('sanitized-image'), 'SANITIZED_IMAGE');
    assert.equal(filePreviewDispositionOf('sanitized-image'), 'inline');
    assert.equal(filePreviewVariantOf('pdf-rendition'), 'PDF_RENDITION');
    for (const kind of ['image', 'pdf', 'markdown', 'code', 'text', 'csv', 'video', 'audio'] as const) {
      assert.equal(filePreviewVariantOf(kind), 'PREVIEW', kind);
    }
    assert.equal(filePreviewDispositionOf('image'), 'inline');
    assert.equal(filePreviewDispositionOf('pdf'), 'inline');
    assert.equal(filePreviewDispositionOf('pdf-rendition'), 'inline');
    for (const kind of ['markdown', 'code', 'text', 'csv', 'video', 'audio', 'none'] as const) {
      assert.equal(filePreviewDispositionOf(kind), 'attachment', kind);
    }
  });

  it('previews only safe types', () => {
    assert.equal(filePreviewKind({ family: 'IMAGE', extension: 'png' }), 'image');
    assert.equal(filePreviewKind({ family: 'IMAGE', extension: 'heic' }), 'none');
    assert.equal(filePreviewKind({ family: 'IMAGE', extension: 'heic', thumbnailUrl: 'https://cdn/x.webp' }), 'image');
    assert.equal(filePreviewKind({ family: 'VECTOR', extension: 'svg' }), 'none', 'an SVG the server sanitised no copy of never renders in the browser');
    // an Office document the server renders as a PDF: every page, not the first page's picture
    assert.equal(filePreviewKind({ family: 'DOCUMENT', extension: 'docx', hasPdfRendition: true }), 'pdf-rendition');
    assert.equal(filePreviewKind({ family: 'DOCUMENT', extension: 'docx', hasPdfRendition: true, thumbnailUrl: 'https://cdn/x.webp' }), 'pdf-rendition');
    assert.equal(filePreviewKind({ family: 'DOCUMENT', extension: 'docx' }), 'none');
    assert.equal(filePreviewKind({ family: 'PDF', extension: 'pdf', hasPdfRendition: true }), 'pdf', 'a PDF is its own preview');
    assert.equal(filePreviewKind({ family: 'PDF', extension: 'pdf' }), 'pdf');
    assert.equal(filePreviewKind({ family: 'SPREADSHEET', extension: 'csv' }), 'csv');
    assert.equal(filePreviewKind({ family: 'TEXT', extension: 'html' }), 'none', 'HTML is never shown as text or markup');
    assert.equal(filePreviewKind({ family: 'VECTOR', extension: 'svg', thumbnailUrl: 'https://cdn/x.png' }), 'none', 'a vector file has no inline picture');
    assert.equal(filePreviewKind({ family: 'TEXT', extension: 'md' }), 'markdown');
    assert.equal(filePreviewKind({ family: 'TEXT', extension: 'txt' }), 'text');
    assert.equal(filePreviewKind({ family: 'TEXT', extension: 'JSON' }), 'code');
    assert.equal(filePreviewKind({ family: 'OTHER', extension: 'ts' }), 'code');
    assert.equal(filePreviewKind({ family: 'VIDEO', extension: 'mp4' }), 'video');
    assert.equal(filePreviewKind({ family: 'VIDEO', extension: 'avi' }), 'none', 'a container no browser plays');
    assert.equal(filePreviewKind({ family: 'AUDIO', extension: 'mp3' }), 'audio');
    assert.equal(codeLanguageOfExtension('TSX'), 'typescript');
    assert.equal(codeLanguageOfExtension('html'), null);
    assert.equal(isTextPreviewKind('markdown'), true);
    assert.equal(isTextPreviewKind('pdf'), false);
  });

  it('splits names and formats sizes', () => {
    assert.equal(extensionOf('Budget 2026.XLSX'), 'xlsx');
    assert.equal(extensionOf('.env'), '');
    assert.equal(fileNameStem('Budget 2026.xlsx', 'xlsx'), 'Budget 2026');
    assert.equal(formatBytes(1536), '1.5 KB');
    assert.equal(formatBytes(undefined), '—');
    assert.equal(fileFamilyOfContentType('image/svg+xml'), 'VECTOR');
    assert.equal(fileFamilyOfContentType('application/pdf; charset=binary'), 'PDF');
    assert.equal(fileFamilyOfContentType(null), null);
  });

  it('reads CSV without evaluating anything', () => {
    assert.deepEqual(parseCsv('a;b\n"=1+1";"x""y"\n'), [
      ['a', 'b'],
      ['=1+1', 'x"y'],
    ]);
  });

  it('computes link sets and bulk changes', () => {
    const files = [
      { links: [{ kind: 'project', id: 1, name: 'A' }] },
      { links: [{ kind: 'project', id: 1, name: 'A' }, { kind: 'customer', id: 'c7', name: 'B' }] },
    ];
    const initial = initialLinkStates(files);
    assert.equal(initial.get('project:1'), true);
    assert.equal(initial.get('customer:c7'), 'indeterminate');
    const next = new Map(initial);
    next.set('customer:c7', true);
    next.set('project:1', false);
    const change = bulkLinkChanges([10, 11], initial, next);
    assert.deepEqual(change.add, [{ kind: 'customer', id: 'c7' }]);
    assert.deepEqual(change.remove, [{ kind: 'project', id: '1' }]);
    assert.deepEqual(linkSetOf(new Map([['project:1', true]]), new Map([['project:1', { kind: 'project', id: 1 }]])).links, [{ kind: 'project', id: 1 }]);
  });
});
