import { translateText } from '../../i18n/store.ts';

/** A picked image, decoded in the browser and ready for an upload adapter. */
export interface PreparedImage {
  file: File;
  /** Base64 content without the `data:` prefix. */
  base64: string;
  width: number;
  height: number;
  /** Lower-case format from the MIME type (`png`, `jpeg`, `svg+xml`). */
  format: string;
  /** Real byte size of the file. */
  fileSize: number;
}

const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error(translateText('Unreadable file'))));
    reader.onerror = () => reject(reader.error ?? new Error(translateText('Unreadable file')));
    reader.readAsDataURL(file);
  });

const measure = (dataUrl: string): Promise<{ width: number; height: number }> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error(translateText('The file is not an image this browser can read')));
    image.src = dataUrl;
  });

/**
 * Reads a picked image in the browser: base64 content, pixel size, format and the real byte size (not an estimate
 * from the base64 length). Browser-only; call it from an event handler, never during render.
 */
export const prepareImageFile = async (file: File): Promise<PreparedImage> => {
  if (!file.type.startsWith('image/')) throw new Error(translateText('%name% is not an image', { replacements: { name: file.name } }));
  const dataUrl = await readAsDataUrl(file);
  const { width, height } = await measure(dataUrl);
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  return { file, base64, width, height, format: file.type.slice('image/'.length).toLowerCase(), fileSize: file.size };
};
