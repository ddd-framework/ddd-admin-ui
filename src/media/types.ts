import type { PreparedImage } from '../logic/browser/prepareImageFile.ts';

/** @deprecated moved to logic/browser/prepareImageFile — the re-export is removed in a later minor */
export type { PreparedImage } from '../logic/browser/prepareImageFile.ts';

/** One media item as the picker shows it; the app maps its model into this (adapter). */
export interface MediaPickerTile {
  id: string;
  /** Thumbnail URL, `null` for a placeholder. */
  previewUrl: string | null;
  /** The full-size file, linked as "Open original". */
  originalUrl?: string | null;
  title: string;
  /** Secondary lines (size, format, usage). */
  details?: string[];
}

export interface MediaPickerSortOption {
  value: string;
  label: string;
}

/**
 * Uploads one prepared image and answers the new item as a tile (a JSON request with the base64 content or a
 * multipart upload, the host's choice). The block never knows the endpoint.
 */
export type MediaUploadAdapter = (image: PreparedImage) => Promise<MediaPickerTile>;
