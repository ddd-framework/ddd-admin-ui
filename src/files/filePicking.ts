import { type FileView, isFileReleased } from './fileView.ts';

/** A file the picker lets the reader pick: a released file (no trashed folder) the host accepts (absent = every one). */
export const isFilePickable = (file: FileView, accept?: (file: FileView) => boolean): boolean =>
  !file.isFolder && isFileReleased(file.scanStatus) && (accept?.(file) ?? true);

/** Accepts pictures: the family `IMAGE` (a vector file is no picture the reader can use as one). */
export const acceptsImageFiles = (file: FileView): boolean => file.family === 'IMAGE' && file.extension.toLowerCase() !== 'svg';
