/**
 * Pure geometry of the image crop surface and the plan of the image normaliser: crop rectangles in source pixels,
 * moves, resizes and zooms that stay inside the image and keep an aspect ratio, and the output size and type of a
 * normalisation. No DOM, no React: usable in server code, in tests and inside a host's worker.
 */

/** A rectangle in source-image pixels (after orientation). */
export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** One aspect choice of the crop surface. `ratio` is width / height; `null` is a free crop. */
export interface CropAspectOption {
  id: string;
  /** English UI text, translated by the surface (pass `translate: false` for an already translated label). */
  label: string;
  ratio: number | null;
  /** A round crop (avatars): the ratio is forced to 1 and the output keeps alpha outside the circle. */
  round?: boolean;
  translate?: boolean;
}

/** Which part of the crop a pointer or key acts on. */
export type CropHandle = 'move' | 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

/** The output types the normaliser encodes. */
export type ImageOutputType = 'image/png' | 'image/jpeg' | 'image/webp';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** The ratio a crop keeps: 1 for a round option, the option's ratio otherwise (`null` = free). */
export const cropRatioOf = (option: Pick<CropAspectOption, 'ratio' | 'round'> | null | undefined): number | null =>
  option?.round ? 1 : (option?.ratio ?? null);

/** The largest crop of `ratio` centred in the image; the whole image for a free ratio. */
export const initialCrop = (imageWidth: number, imageHeight: number, ratio: number | null): CropRect => {
  if (!ratio || ratio <= 0) return { x: 0, y: 0, width: imageWidth, height: imageHeight };
  let width = imageWidth;
  let height = width / ratio;
  if (height > imageHeight) {
    height = imageHeight;
    width = height * ratio;
  }
  return { x: (imageWidth - width) / 2, y: (imageHeight - height) / 2, width, height };
};

/** The crop moved by `dx` / `dy`, kept inside the image. */
export const moveCrop = (crop: CropRect, dx: number, dy: number, imageWidth: number, imageHeight: number): CropRect => ({
  ...crop,
  x: clamp(crop.x + dx, 0, Math.max(0, imageWidth - crop.width)),
  y: clamp(crop.y + dy, 0, Math.max(0, imageHeight - crop.height)),
});

export interface ResizeCropOptions {
  imageWidth: number;
  imageHeight: number;
  ratio: number | null;
  /** Smallest side in source pixels (default 1). */
  minSize?: number;
}

/**
 * The crop after dragging `handle` by `dx` / `dy` (source pixels from the drag start). The opposite edge or corner
 * stays put; with a ratio the crop keeps it (an edge handle grows the other axis around the centre); the result stays
 * inside the image and never below `minSize`.
 */
export const resizeCrop = (crop: CropRect, handle: CropHandle, dx: number, dy: number, options: ResizeCropOptions): CropRect => {
  const { imageWidth, imageHeight, ratio } = options;
  const minSize = Math.max(1, options.minSize ?? 1);
  if (handle === 'move') return moveCrop(crop, dx, dy, imageWidth, imageHeight);
  const left = crop.x;
  const top = crop.y;
  const right = crop.x + crop.width;
  const bottom = crop.y + crop.height;

  if (!ratio) {
    let nextLeft = left;
    let nextRight = right;
    let nextTop = top;
    let nextBottom = bottom;
    if (handle.includes('w')) nextLeft = clamp(left + dx, 0, right - minSize);
    if (handle.includes('e')) nextRight = clamp(right + dx, left + minSize, imageWidth);
    if (handle.includes('n')) nextTop = clamp(top + dy, 0, bottom - minSize);
    if (handle.includes('s')) nextBottom = clamp(bottom + dy, top + minSize, imageHeight);
    return { x: nextLeft, y: nextTop, width: nextRight - nextLeft, height: nextBottom - nextTop };
  }

  const minWidth = Math.max(minSize, minSize * ratio);
  if (handle === 'n' || handle === 's' || handle === 'e' || handle === 'w') {
    // an edge: that axis follows the pointer, the other grows around the centre
    const centreX = left + crop.width / 2;
    const centreY = top + crop.height / 2;
    const horizontal = handle === 'e' || handle === 'w';
    let width: number;
    if (horizontal) width = handle === 'e' ? crop.width + dx : crop.width - dx;
    else width = (handle === 's' ? crop.height + dy : crop.height - dy) * ratio;
    const anchorX = handle === 'w' ? right : left;
    const anchorY = handle === 'n' ? bottom : top;
    const maxWidthX = horizontal ? (handle === 'e' ? imageWidth - left : right) : 2 * Math.min(centreX, imageWidth - centreX);
    const maxHeightY = horizontal ? 2 * Math.min(centreY, imageHeight - centreY) : handle === 's' ? imageHeight - top : bottom;
    width = clamp(width, minWidth, Math.min(maxWidthX, maxHeightY * ratio));
    const height = width / ratio;
    const x = horizontal ? (handle === 'e' ? anchorX : anchorX - width) : centreX - width / 2;
    const y = horizontal ? centreY - height / 2 : handle === 's' ? anchorY : anchorY - height;
    return { x, y, width, height };
  }

  // a corner: the opposite corner is the anchor; the larger of the two pointer moves decides the size
  const anchorX = handle.includes('w') ? right : left;
  const anchorY = handle.includes('n') ? bottom : top;
  const pointerWidth = handle.includes('w') ? crop.width - dx : crop.width + dx;
  const pointerHeight = handle.includes('n') ? crop.height - dy : crop.height + dy;
  let width = Math.max(pointerWidth, pointerHeight * ratio);
  const maxWidth = handle.includes('w') ? anchorX : imageWidth - anchorX;
  const maxHeight = handle.includes('n') ? anchorY : imageHeight - anchorY;
  width = clamp(width, minWidth, Math.min(maxWidth, maxHeight * ratio));
  const height = width / ratio;
  return {
    x: handle.includes('w') ? anchorX - width : anchorX,
    y: handle.includes('n') ? anchorY - height : anchorY,
    width,
    height,
  };
};

/**
 * The crop scaled around its centre: `factor` > 1 zooms in (a smaller crop), < 1 zooms out; the ratio holds, the
 * crop stays inside the image and never goes below `minSize`.
 */
export const zoomCrop = (crop: CropRect, factor: number, options: ResizeCropOptions): CropRect => {
  const { imageWidth, imageHeight } = options;
  const minSize = Math.max(1, options.minSize ?? 1);
  if (!(factor > 0)) return crop;
  const ratio = crop.width / crop.height;
  let width = crop.width / factor;
  const maxWidth = Math.min(imageWidth, imageHeight * ratio);
  const minWidth = Math.max(minSize, minSize * ratio);
  width = clamp(width, Math.min(minWidth, maxWidth), maxWidth);
  const height = width / ratio;
  const centreX = crop.x + crop.width / 2;
  const centreY = crop.y + crop.height / 2;
  return {
    x: clamp(centreX - width / 2, 0, imageWidth - width),
    y: clamp(centreY - height / 2, 0, imageHeight - height),
    width,
    height,
  };
};

/** Whole source pixels of a crop, inside the image and at least 1 × 1. */
export const roundCrop = (crop: CropRect, imageWidth: number, imageHeight: number): CropRect => {
  const x = clamp(Math.round(crop.x), 0, Math.max(0, imageWidth - 1));
  const y = clamp(Math.round(crop.y), 0, Math.max(0, imageHeight - 1));
  return {
    x,
    y,
    width: clamp(Math.round(crop.width), 1, imageWidth - x),
    height: clamp(Math.round(crop.height), 1, imageHeight - y),
  };
};

export interface ImageSizeLimits {
  /** Largest output width; larger images shrink, keeping the ratio (never upscaled). */
  maxWidth?: number;
  maxHeight?: number;
  /** Largest output area in pixels (width × height). */
  maxPixels?: number;
}

/** Output size of `width` × `height` fitted into the limits, keeping the ratio, never upscaled, at least 1 × 1. */
export const fitImageSize = (width: number, height: number, limits: ImageSizeLimits = {}): { width: number; height: number } => {
  let scale = 1;
  if (limits.maxWidth && width > limits.maxWidth) scale = Math.min(scale, limits.maxWidth / width);
  if (limits.maxHeight && height > limits.maxHeight) scale = Math.min(scale, limits.maxHeight / height);
  if (limits.maxPixels && width * height > limits.maxPixels) scale = Math.min(scale, Math.sqrt(limits.maxPixels / (width * height)));
  return { width: Math.max(1, Math.floor(width * scale)), height: Math.max(1, Math.floor(height * scale)) };
};

/** Source types that may carry alpha; their output stays a type with alpha unless another type is asked for. */
const ALPHA_TYPES = ['image/png', 'image/webp', 'image/gif', 'image/avif', 'image/svg+xml'];

/**
 * The output type of a normalisation: the requested type when given; else PNG for a round crop or a source with
 * alpha (WebP stays WebP), JPEG otherwise. A JPEG never comes out of an alpha source unless it is asked for.
 */
export const chooseImageOutputType = (sourceType: string, options: { requested?: ImageOutputType; round?: boolean } = {}): ImageOutputType => {
  if (options.requested) return options.requested;
  const type = sourceType.toLowerCase();
  if (type === 'image/webp') return 'image/webp';
  if (options.round || ALPHA_TYPES.includes(type)) return 'image/png';
  return 'image/jpeg';
};

/** Everything a renderer needs to draw one normalised image: what to read from the source and what to write. */
export interface ImageNormalizationPlan {
  /** Source rectangle in oriented source pixels. */
  source: CropRect;
  width: number;
  height: number;
  type: ImageOutputType;
  /** Encoder quality for JPEG and WebP (0–1). */
  quality: number;
  /** Clip to the inscribed ellipse (a round crop); outside stays transparent (or `background` for JPEG). */
  round: boolean;
  /** Fill behind the image; set for JPEG (no alpha), `null` keeps transparency. */
  background: string | null;
}

export interface PlanImageNormalizationOptions extends ImageSizeLimits {
  crop?: CropRect | null;
  round?: boolean;
  type?: ImageOutputType;
  quality?: number;
  /** Fill of a JPEG output (default white). */
  background?: string;
}

/** The plan of one normalisation from the oriented source size, its MIME type and the options. */
export const planImageNormalization = (
  sourceWidth: number,
  sourceHeight: number,
  sourceType: string,
  options: PlanImageNormalizationOptions = {}
): ImageNormalizationPlan => {
  const source = options.crop ? roundCrop(options.crop, sourceWidth, sourceHeight) : { x: 0, y: 0, width: sourceWidth, height: sourceHeight };
  const size = fitImageSize(source.width, source.height, options);
  const type = chooseImageOutputType(sourceType, { requested: options.type, round: options.round });
  return {
    source,
    ...size,
    type,
    quality: clamp(options.quality ?? 0.9, 0, 1),
    round: !!options.round,
    background: type === 'image/jpeg' ? (options.background ?? '#ffffff') : null,
  };
};

/** Which handle is under a point (source pixels); `tolerance` in source pixels; `null` outside the crop. */
export const cropHandleAt = (x: number, y: number, crop: CropRect, tolerance: number): CropHandle | null => {
  const nearLeft = Math.abs(x - crop.x) <= tolerance;
  const nearRight = Math.abs(x - (crop.x + crop.width)) <= tolerance;
  const nearTop = Math.abs(y - crop.y) <= tolerance;
  const nearBottom = Math.abs(y - (crop.y + crop.height)) <= tolerance;
  const insideX = x >= crop.x - tolerance && x <= crop.x + crop.width + tolerance;
  const insideY = y >= crop.y - tolerance && y <= crop.y + crop.height + tolerance;
  if (!insideX || !insideY) return null;
  if (nearTop && nearLeft) return 'nw';
  if (nearTop && nearRight) return 'ne';
  if (nearBottom && nearLeft) return 'sw';
  if (nearBottom && nearRight) return 'se';
  if (nearTop) return 'n';
  if (nearBottom) return 's';
  if (nearLeft) return 'w';
  if (nearRight) return 'e';
  return 'move';
};
