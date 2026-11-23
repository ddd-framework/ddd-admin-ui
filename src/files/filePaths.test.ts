import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  filePathText,
  findFolderByPath,
  folderIdOfParam,
  folderParamOf,
  folderPathSuggestions,
  folderPathText,
  parseLocationInput,
  siblingFolders,
} from './filePaths.ts';
import type { FolderView } from './fileView.ts';

const folders: FolderView[] = [
  { id: 1, areaKey: 3, parentId: null, name: 'Templates' },
  { id: 2, areaKey: 3, parentId: 1, name: 'Typst' },
  { id: 3, areaKey: 3, parentId: 1, name: 'Word' },
  { id: 4, areaKey: 3, parentId: null, name: 'Reports' },
  { id: 5, areaKey: 3, parentId: 4, name: 'Q1' },
];

describe('file paths', () => {
  it('writes a folder or file as a path from the root', () => {
    assert.equal(folderPathText(folders, null), '/');
    assert.equal(folderPathText(folders, 2), '/Templates/Typst');
    assert.equal(filePathText(folders, { folderId: 2, name: 'letter.typ' }), '/Templates/Typst/letter.typ');
    assert.equal(filePathText(folders, { folderId: null, name: 'a.pdf' }), '/a.pdf');
    assert.equal(folderParamOf(folders, null), '');
    assert.equal(folderParamOf(folders, 5), '/Reports/Q1');
  });

  it('reads a URL value as a path, else as a folder id', () => {
    assert.equal(folderIdOfParam(folders, '/Templates/Typst'), 2);
    assert.equal(folderIdOfParam(folders, '/templates/typst'), 2, 'case-insensitive when nothing matches exactly');
    assert.equal(folderIdOfParam(folders, '3'), 3);
    assert.equal(folderIdOfParam(folders, ''), null);
    assert.equal(folderIdOfParam(folders, '/Templates/Missing'), undefined);
    assert.equal(folderIdOfParam(folders, '99'), undefined);
  });

  it('names the deepest folder and the missing name of a path', () => {
    const match = findFolderByPath(folders, ['Templates', 'Typst', 'letter.typ']);
    assert.equal(match.folderId, undefined);
    assert.equal(match.deepestFolderId, 2);
    assert.equal(match.missingSegment, 'letter.typ');
    assert.deepEqual(match.remainingSegments, ['letter.typ']);
  });

  it('normalises pasted locations', () => {
    assert.deepEqual(parseLocationInput('drive/123'), { kind: 'reference', id: '123' });
    assert.deepEqual(parseLocationInput(' "/Templates//Typst/" '), { kind: 'path', path: '/Templates/Typst', segments: ['Templates', 'Typst'] });
    assert.deepEqual(parseLocationInput('/workspace/drive/library/Templates'), {
      kind: 'path',
      path: '/library/Templates',
      segments: ['library', 'Templates'],
      mount: 'library',
    });
    assert.deepEqual(parseLocationInput('drivespaces/space-4/Q1'), { kind: 'path', path: '/space-4/Q1', segments: ['space-4', 'Q1'], mount: 'space-4' });
    assert.deepEqual(parseLocationInput('/workspace/Reports'), { kind: 'path', path: '/Reports', segments: ['Reports'] });
    assert.deepEqual(parseLocationInput('Templates\\Word'), { kind: 'path', path: '/Templates/Word', segments: ['Templates', 'Word'] });
    assert.deepEqual(parseLocationInput('/a/../b'), { kind: 'invalid', reason: 'parent' });
    assert.deepEqual(parseLocationInput('  '), { kind: 'invalid', reason: 'empty' });
  });

  it('completes folder names', () => {
    assert.deepEqual(
      folderPathSuggestions(folders, '/Templates/').map(suggestion => suggestion.path),
      ['/Templates/Typst/', '/Templates/Word/']
    );
    assert.deepEqual(
      folderPathSuggestions(folders, '/Templates/ty').map(suggestion => suggestion.path),
      ['/Templates/Typst/']
    );
    assert.deepEqual(
      folderPathSuggestions(folders, '/').map(suggestion => suggestion.folder.name),
      ['Reports', 'Templates']
    );
    assert.deepEqual(folderPathSuggestions(folders, '/Nope/x'), []);
  });

  it('lists the folders beside one', () => {
    assert.deepEqual(
      siblingFolders(folders, 1).map(folder => folder.name),
      ['Typst', 'Word']
    );
  });
});
