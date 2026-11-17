import { translateText } from '../../i18n/store.ts';
import {
  type CropRect,
  type ImageNormalizationPlan,
  type ImageOutputType,
  type PlanImageNormalizationOptions,
  planImageNormalization,
} from '../pure/imageCrop.ts';

/** Why a normalisation failed: `decode` (not an image this browser reads, or a corrupt file), `too-large` (above
 * `maxInputPixels`), `encode` (the browser could not write the output), `unsupported` (no canvas). */
export type ImageNormalizeErrorCode = 'decode' | 'too-large' | 'encode' | 'unsupported';

/** The one error type of the normaliser; `code` says which step failed, `message` is translated. */
export class ImageNormalizeError extends Error {
  readonly code: ImageNormalizeErrorCode;
  constructor(code: ImageNormalizeErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ImageNormalizeError';
    this.code = code;
  }
}

export const isImageNormalizeError = (error: unknown): error is ImageNormalizeError => error instanceof ImageNormalizeError;

/** A decoded, oriented source image. `close()` frees it (an `ImageBitmap`'s memory, an object URL). */
export interface DecodedImage {
  source: CanvasImageSource;
  width: number;
  height: number;
  type: string;
  close: () => void;
}

/**
 * Renders a plan in a host's worker and returns the encoded blob. The package ships no worker file (a worker URL is
 * bundler-specific); a host passes a function that transfers `bitmap` to its own worker, which calls
 * `renderNormalizedImage(bitmap, plan)` on an `OffscreenCanvas`. A rejection falls back to the main thread.
 */
export type NormalizeImageWorkerRunner = (bitmap: ImageBitmap, plan: ImageNormalizationPlan) => Promise<Blob>;

export interface NormalizeImageOptions extends Omit<PlanImageNormalizationOptions, 'type'> {
  /** Output type; default: PNG for alpha sources and round crops, WebP stays WebP, JPEG otherwise. */
  type?: ImageOutputType;
  /** Refuse a source above this many pixels before drawing it (default 100 million; `Infinity` turns it off). */
  maxInputPixels?: number;
  /** Optional worker adapter; without it (or when it fails) the image is drawn on the main thread. */
  runInWorker?: NormalizeImageWorkerRunner;
}

/** A normalised image ready for an upload adapter. */
export interface NormalizedImage {
  blob: Blob;
  width: number;
  height: number;
  /** The type actually written (a browser without a WebP encoder writes PNG). */
  type: string;
  sourceWidth: number;
  sourceHeight: number;
  /** The source rectangle used, in whole oriented source pixels. */
  crop: CropRect;
  /** Whether the host's worker rendered it (false: main thread, also after a worker failure). */
  renderedInWorker: boolean;
}

const DEFAULT_MAX_INPUT_PIXELS = 100_000_000;

const decodeError = (cause?: unknown) =>
  new ImageNormalizeError('decode', translateText('The file is not an image this browser can read'), { cause });

const loadImageElement = (blob: Blob): Promise<DecodedImage> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      // an SVG without a size decodes to 0 × 0
      if (!image.naturalWidth || !image.naturalHeight) {
        URL.revokeObjectURL(url);
        reject(decodeError());
        return;
      }
      resolve({ source: image, width: image.naturalWidth, height: image.naturalHeight, type: blob.type, close: () => URL.revokeObjectURL(url) });
    };
    image.onerror = event => {
      URL.revokeObjectURL(url);
      reject(decodeError(event));
    };
    image.src = url;
  });

/**
 * Decodes a file or blob with its EXIF orientation applied (`createImageBitmap(…, { imageOrientation: 'from-image' })`,
 * an `<img>` where that fails, e.g. for SVG). Throws `ImageNormalizeError` with `code: 'decode'` for a corrupt or
 * unreadable file. Browser-only; call `close()` when done.
 */
export const decodeImage = async (blob: Blob): Promise<DecodedImage> => {
  if (blob.type && !blob.type.startsWith('image/')) throw decodeError();
  if (typeof createImageBitmap === 'function' && blob.type !== 'image/svg+xml') {
    try {
      const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, type: blob.type, close: () => bitmap.close() };
    } catch {
      // fall through to <img>: some browsers decode formats only there
    }
  }
  if (typeof Image === 'undefined') throw new ImageNormalizeError('unsupported', translateText('This browser cannot process images'));
  return loadImageElement(blob);
};

type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;

const createCanvas = (width: number, height: number): AnyCanvas => {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
  if (typeof document === 'undefined') throw new ImageNormalizeError('unsupported', translateText('This browser cannot process images'));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

const encode = (canvas: AnyCanvas, type: string, quality: number): Promise<Blob | null> => {
  if ('convertToBlob' in canvas) return canvas.convertToBlob({ type, quality }).catch(() => null);
  return new Promise(resolve => canvas.toBlob(resolve, type, quality));
};

/**
 * Draws a plan from an oriented source and encodes it: crop, resize (high quality smoothing), round clip, background
 * for JPEG. Runs on the main thread and inside a worker (`OffscreenCanvas`): a host's worker imports it from
 * `./logic`.
 */
export const renderNormalizedImage = async (source: CanvasImageSource, plan: ImageNormalizationPlan): Promise<Blob> => {
  const canvas = createCanvas(plan.width, plan.height);
  const context = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (!context) throw new ImageNormalizeError('unsupported', translateText('This browser cannot process images'));
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  if (plan.background) {
    context.fillStyle = plan.background;
    context.fillRect(0, 0, plan.width, plan.height);
  }
  if (plan.round) {
    context.beginPath();
    context.ellipse(plan.width / 2, plan.height / 2, plan.width / 2, plan.height / 2, 0, 0, Math.PI * 2);
    context.clip();
  }
  const { x, y, width, height } = plan.source;
  context.drawImage(source, x, y, width, height, 0, 0, plan.width, plan.height);
  const blob = await encode(canvas, plan.type, plan.quality);
  if (!blob) throw new ImageNormalizeError('encode', translateText('The image could not be encoded'));
  return blob;
};

/**
 * Normalises an image in the browser: decodes it with its orientation, refuses a source above `maxInputPixels`, crops
 * (`crop`, `round`), shrinks into `maxWidth` / `maxHeight` / `maxPixels` (never upscales) and encodes (`type`,
 * `quality`; alpha kept unless JPEG is asked for). With `runInWorker` the drawing runs in the host's worker and falls
 * back to the main thread when it fails. Every failure is an `ImageNormalizeError`; validation, presets and the upload
 * stay with the host.
 */
export const normalizeImage = async (blob: Blob, options: NormalizeImageOptions = {}): Promise<NormalizedImage> => {
  const decoded = await decodeImage(blob);
  try {
    const maxInputPixels = options.maxInputPixels ?? DEFAULT_MAX_INPUT_PIXELS;
    if (decoded.width * decoded.height > maxInputPixels) {
      throw new ImageNormalizeError(
        'too-large',
        translateText('The image is too large (%width% × %height% px)', { replacements: { width: decoded.width, height: decoded.height } })
      );
    }
    const plan = planImageNormalization(decoded.width, decoded.height, decoded.type || blob.type, options);
    let output: Blob | null = null;
    let renderedInWorker = false;
    if (options.runInWorker && typeof createImageBitmap === 'function') {
      try {
        // the worker gets its own bitmap (a transfer detaches it); the main-thread source stays usable for the fallback
        const bitmap = await createImageBitmap(decoded.source as ImageBitmapSource);
        output = await options.runInWorker(bitmap, plan);
        renderedInWorker = true;
      } catch {
        output = null;
      }
    }
    if (!output) output = await renderNormalizedImage(decoded.source, plan);
    return {
      blob: output,
      width: plan.width,
      height: plan.height,
      type: output.type || plan.type,
      sourceWidth: decoded.width,
      sourceHeight: decoded.height,
      crop: plan.source,
      renderedInWorker,
    };
  } catch (error) {
    if (error instanceof ImageNormalizeError) throw error;
    throw new ImageNormalizeError('encode', translateText('The image could not be encoded'), { cause: error });
  } finally {
    decoded.close();
  }
};
