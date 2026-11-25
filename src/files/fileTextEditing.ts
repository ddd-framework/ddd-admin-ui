import { type FilePreviewKind, type FileView, fileNameStem, isFileReleased, isTextPreviewKind, newestVersionStateOf } from './fileView.ts';
import { TEXT_VIEWER_BYTES } from './useTextHead.ts';

/** A text file is edited in place up to this size (what the viewer reads of it). */
export const FILE_TEXT_EDIT_MAX_BYTES = TEXT_VIEWER_BYTES;

/**
 * Why a file is not edited in place right now: `kind` = no text file, `trashed`, `unreleased` = its content is not
 * released, `older-version` = an older version is shown, `newer-version` = a newer version waits for its check (or was
 * refused), `too-large`.
 */
export type FileTextEditRefusal = 'kind' | 'trashed' | 'unreleased' | 'older-version' | 'newer-version' | 'too-large';

/** Whether the shown content of a file may be edited in place; `null` = yes. */
export const fileTextEditRefusalOf = (
  file: Pick<FileView, 'scanStatus' | 'hasPendingVersion' | 'newestVersionStatus' | 'deletedAt' | 'sizeBytes'>,
  kind: FilePreviewKind,
  showsOlderVersion: boolean
): FileTextEditRefusal | null => {
  if (!isTextPreviewKind(kind)) return 'kind';
  if (file.deletedAt !== null && file.deletedAt !== undefined) return 'trashed';
  if (!isFileReleased(file.scanStatus)) return 'unreleased';
  if (showsOlderVersion) return 'older-version';
  if (file.hasPendingVersion === true || newestVersionStateOf(file) !== null) return 'newer-version';
  if (file.sizeBytes > FILE_TEXT_EDIT_MAX_BYTES) return 'too-large';
  return null;
};

/** A file's text as the editor takes it: line ends as `\n` (what a text field holds), and the line end to write back. */
export interface FileTextDraftSource {
  text: string;
  lineEnding: '\n' | '\r\n';
}

/**
 * The editor's starting text of a file read as UTF-8, or `null` when the bytes were no UTF-8 text (the decoder put a
 * replacement character in): saving such a text would damage the file.
 */
export const fileTextDraftSourceOf = (decodedText: string): FileTextDraftSource | null => {
  if (decodedText.includes('�') || decodedText.includes('\u0000')) return null;
  const windowsLineEnds = decodedText.split('\r\n').length - 1;
  const lineEnds = decodedText.split('\n').length - 1;
  return {
    text: decodedText.replace(/\r\n/g, '\n'),
    // a file that ends every line the Windows way keeps doing so
    lineEnding: windowsLineEnds > 0 && windowsLineEnds === lineEnds ? '\r\n' : '\n',
  };
};

/** The draft as it is written: the file's own line end again. */
export const fileTextForSaving = (draft: string, source: Pick<FileTextDraftSource, 'lineEnding'>): string => {
  const normalized = draft.replace(/\r\n/g, '\n');
  return source.lineEnding === '\r\n' ? normalized.replace(/\n/g, '\r\n') : normalized;
};

/** `Notes.md` → `Notes (copy).md`, then `Notes (copy 2).md` …; `copyWord` is the reader's word for "copy". */
export const copyFileNameOf = (name: string, extension: string, attempt: number, copyWord: string): string => {
  const stem = fileNameStem(name, extension);
  const suffix = attempt <= 1 ? ` (${copyWord})` : ` (${copyWord} ${attempt})`;
  return extension ? `${stem}${suffix}.${extension}` : `${stem}${suffix}`;
};
