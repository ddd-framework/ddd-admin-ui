import { translateText } from '../i18n/store.ts';
import { extensionOf, type FileAreaView, type FileFamily, fileFamilyOfExtension, formatBytes } from './fileView.ts';

/**
 * The client pre-check of one picked file (the server checks again and is the authority): the area is switched on, the
 * extension is on the allow-list (when the area has one), the file is not empty, within the per-file limit and within
 * the quota left after the uploads already queued (`reservedBytes`). Returns the refusal, `null` when it may go.
 */
export const precheckUpload = (
  file: Pick<File, 'name' | 'size'>,
  area: FileAreaView | undefined,
  reservedBytes: number
): string | null => {
  if (!area) return null;
  if (area.isEnabled === false) return translateText('Uploads are switched off for this area.');
  const extension = extensionOf(file.name);
  if (area.allowedTypes && area.allowedTypes.length > 0 && !area.allowedTypes.some(type => type.extension === extension)) {
    return extension
      ? translateText('.%extension% files are not allowed here.', { replacements: { extension } })
      : translateText('Files without an extension are not allowed here.');
  }
  if (file.size === 0) return translateText('The file is empty.');
  if (typeof area.maxFileSizeBytes === 'number' && file.size > area.maxFileSizeBytes) {
    return translateText('Larger than the limit of %limit% per file.', { replacements: { limit: formatBytes(area.maxFileSizeBytes) } });
  }
  if (typeof area.quotaBytes === 'number') {
    const used = area.usedBytes ?? 0;
    if (used + reservedBytes + file.size > area.quotaBytes) {
      return translateText('Not enough storage left (%free% free).', {
        replacements: { free: formatBytes(Math.max(area.quotaBytes - used - reservedBytes, 0)) },
      });
    }
  }
  return null;
};

/** The family of a picked file: the area's allow-list when it names the extension, else the built-in table. */
export const uploadFamilyOf = (fileName: string, area: FileAreaView | undefined): FileFamily => {
  const extension = extensionOf(fileName);
  return area?.allowedTypes?.find(type => type.extension === extension)?.family ?? fileFamilyOfExtension(extension);
};
