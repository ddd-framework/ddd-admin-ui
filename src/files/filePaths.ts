// Pure helpers of the file manager's locations: a folder or file as a path (`/Templates/Typst/letter.typ`), the path
// typed or pasted into the path bar, and the folder-name completion. No React, no API.
import { type FileItemId, type FileView, type FolderView, folderPath, sameFileId } from './fileView.ts';

/** The separator of a path; a path always starts with it (`/` = the area's root). */
export const PATH_SEPARATOR = '/';

/** `/Templates/Typst` — the folder's path from the area's root; `/` for the root. */
export const folderPathText = (folders: readonly FolderView[], folderId: FileItemId | null): string =>
  PATH_SEPARATOR + folderPath(folders, folderId).map(folder => folder.name).join(PATH_SEPARATOR);

/** `/Templates/Typst/letter.typ` — a file's path (its folder's path and its name). */
export const filePathText = (folders: readonly FolderView[], file: Pick<FileView, 'folderId' | 'name'>): string => {
  const folderText = folderPathText(folders, file.folderId);
  return (folderText === PATH_SEPARATOR ? '' : folderText) + PATH_SEPARATOR + file.name;
};

/** The names of a path (`/a//b/` → `['a', 'b']`); `.` is dropped. */
export const pathSegments = (path: string): string[] =>
  path
    .split(PATH_SEPARATOR)
    .map(segment => segment.trim())
    .filter(segment => segment !== '' && segment !== '.');

/** What the path bar was given, after normalising. */
export type FileLocationInput =
  /** A path inside the open area (`/a/b`, `a/b`, `/workspace/drive/a/b` without a known mount). */
  | { kind: 'path'; path: string; segments: string[]; mount?: string }
  /** A reference to one item (`drive/123`). */
  | { kind: 'reference'; id: string }
  /** Nothing usable (empty, `..`). */
  | { kind: 'invalid'; reason: 'empty' | 'parent' };

const WORKSPACE_DRIVE_PREFIX = /^\/?workspace\/drive\//i;
const DRIVESPACES_PREFIX = /^\/?drivespaces\//i;
const WORKSPACE_PREFIX = /^\/?workspace\//i;
const REFERENCE = /^\/?drive\/(\d+)\/?$/i;

/**
 * Normalises a typed or pasted location: surrounding quotes and whitespace go, backslashes become slashes,
 * `drive/<id>` is a reference, `/workspace/drive/<first>/…` and `drivespaces/<first>/…` keep `<first>` as a possible
 * mount name (the adapter's `resolveLocation` decides whether it names another area), `/workspace/<path>` is a path.
 */
export const parseLocationInput = (raw: string): FileLocationInput => {
  const text = raw
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/\\/g, PATH_SEPARATOR)
    .trim();
  if (text === '') return { kind: 'invalid', reason: 'empty' };
  const reference = REFERENCE.exec(text);
  if (reference?.[1]) return { kind: 'reference', id: reference[1] };
  let rest = text;
  let mount: string | undefined;
  if (WORKSPACE_DRIVE_PREFIX.test(rest) || DRIVESPACES_PREFIX.test(rest)) {
    rest = rest.replace(WORKSPACE_DRIVE_PREFIX, '').replace(DRIVESPACES_PREFIX, '');
    const [first] = pathSegments(rest);
    mount = first;
  } else if (WORKSPACE_PREFIX.test(rest)) {
    rest = rest.replace(WORKSPACE_PREFIX, '');
  }
  const segments = pathSegments(rest);
  if (segments.includes('..')) return { kind: 'invalid', reason: 'parent' };
  return { kind: 'path', path: PATH_SEPARATOR + segments.join(PATH_SEPARATOR), segments, ...(mount === undefined ? {} : { mount }) };
};

/** Where a path leads in the loaded folder tree. */
export interface FolderPathMatch {
  /** The folder the whole path names (`null` = the root); `undefined` when a segment is missing. */
  folderId: FileItemId | null | undefined;
  /** The deepest folder found on the way (`null` = the root). */
  deepestFolderId: FileItemId | null;
  /** The first name that is no folder there; `null` when the whole path was found. */
  missingSegment: string | null;
  /** The names after the deepest folder (a file name when only the last one is missing). */
  remainingSegments: string[];
}

const childNamed = (folders: readonly FolderView[], parentId: FileItemId | null, name: string): FolderView | undefined => {
  const children = folders.filter(folder => sameFileId(folder.parentId, parentId));
  return children.find(folder => folder.name === name) ?? children.find(folder => folder.name.toLocaleLowerCase() === name.toLocaleLowerCase());
};

/** Walks a path's names through the folder tree (exact name first, then case-insensitive). */
export const findFolderByPath = (folders: readonly FolderView[], segments: readonly string[]): FolderPathMatch => {
  let current: FileItemId | null = null;
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index] ?? '';
    const child = childNamed(folders, current, segment);
    if (!child) {
      return { folderId: undefined, deepestFolderId: current, missingSegment: segment, remainingSegments: segments.slice(index) };
    }
    current = child.id;
  }
  return { folderId: current, deepestFolderId: current, missingSegment: null, remainingSegments: [] };
};

/**
 * The folder a URL value names: a path (`/a/b`), else a folder id (`17`, a node id fallback); `undefined` while it is
 * not in the tree. `''` is the root.
 */
export const folderIdOfParam = (folders: readonly FolderView[], value: string): FileItemId | null | undefined => {
  if (value === '' || value === PATH_SEPARATOR) return null;
  if (value.startsWith(PATH_SEPARATOR)) return findFolderByPath(folders, pathSegments(value)).folderId;
  const byId = folders.find(folder => String(folder.id) === value);
  return byId ? byId.id : undefined;
};

/** The URL value of a folder: its path (`''` for the root). */
export const folderParamOf = (folders: readonly FolderView[], folderId: FileItemId | null): string =>
  folderId === null ? '' : folderPathText(folders, folderId);

/** One completion of the path bar. */
export interface FolderPathSuggestion {
  folder: FolderView;
  /** The full path the completion writes into the bar (with a trailing slash). */
  path: string;
}

/**
 * The folders that complete the typed path: the children of the folder the complete names lead to, whose name starts
 * with (else contains) the last, unfinished name — at most `limit`, alphabetical. A path ending in `/` lists every
 * child of that folder.
 */
export const folderPathSuggestions = (folders: readonly FolderView[], typed: string, limit = 8): FolderPathSuggestion[] => {
  const parsed = parseLocationInput(typed === '' ? PATH_SEPARATOR : typed);
  if (parsed.kind !== 'path') return [];
  const endsWithSeparator = /[/\\]\s*$/.test(typed) || typed.trim() === '';
  const complete = endsWithSeparator ? parsed.segments : parsed.segments.slice(0, -1);
  const partial = endsWithSeparator ? '' : (parsed.segments.at(-1) ?? '');
  const parent = findFolderByPath(folders, complete);
  if (parent.folderId === undefined) return [];
  const needle = partial.toLocaleLowerCase();
  const children = folders
    .filter(folder => sameFileId(folder.parentId, parent.folderId ?? null))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  const starts = children.filter(folder => folder.name.toLocaleLowerCase().startsWith(needle));
  const contains = needle === '' ? [] : children.filter(folder => !starts.includes(folder) && folder.name.toLocaleLowerCase().includes(needle));
  const base = PATH_SEPARATOR + complete.join(PATH_SEPARATOR);
  return [...starts, ...contains].slice(0, limit).map(folder => ({
    folder,
    path: `${base === PATH_SEPARATOR ? '' : base}${PATH_SEPARATOR}${folder.name}${PATH_SEPARATOR}`,
  }));
};

/** The folders beside one (the same parent), alphabetical — the breadcrumb's sibling menu. */
export const siblingFolders = (folders: readonly FolderView[], parentId: FileItemId | null): FolderView[] =>
  folders
    .filter(folder => sameFileId(folder.parentId, parentId))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
