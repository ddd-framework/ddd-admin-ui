/** The zoom of a picture preview (`ImagePreview`): steps and sizes, without a DOM. */

/** The zoom steps (1 = the picture's own pixels). */
export const IMAGE_ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4] as const;

/** The next step above (`direction` 1) or below (-1) `zoom`; the last step when there is none. */
export const nextImageZoom = (zoom: number, direction: 1 | -1): number => {
  if (direction === 1) return IMAGE_ZOOM_STEPS.find(step => step > zoom + 0.001) ?? IMAGE_ZOOM_STEPS[IMAGE_ZOOM_STEPS.length - 1];
  return [...IMAGE_ZOOM_STEPS].reverse().find(step => step < zoom - 0.001) ?? IMAGE_ZOOM_STEPS[0];
};

/**
 * The size the zoom steps count from: the picture's own size, or — for a picture that names none (an SVG without
 * width and height may report 0) — the size it is drawn at.
 */
export const imageBaseSizeOf = (
  natural: { width: number; height: number },
  drawn: { width: number; height: number }
): { width: number; height: number } => (natural.width > 0 && natural.height > 0 ? natural : drawn);

/**
 * The scale a fitted picture is drawn at inside its element (`object-fit: contain`: the smaller of both ratios);
 * 1 when a size is unknown.
 */
export const fittedImageScaleOf = (base: { width: number; height: number }, element: { width: number; height: number }): number =>
  base.width > 0 && base.height > 0 && element.width > 0 && element.height > 0 ? Math.min(element.width / base.width, element.height / base.height) : 1;

/** What a click on a fitted vector picture zooms to (of its fitted size); a raster picture goes to its own pixels. */
export const VECTOR_IMAGE_CLICK_ZOOM = 2;

/**
 * The size zoom 1 (100 %) stands for. A raster picture: its own pixels. A vector picture (`scalable`): the size it is
 * drawn at when fitted into its element — its own size is only a hint (an icon of 24 px fills the box when fitted),
 * so its steps count from what the reader sees.
 */
export const imageZoomBaseOf = (
  natural: { width: number; height: number },
  element: { width: number; height: number },
  scalable: boolean
): { width: number; height: number } => {
  if (!scalable) return natural;
  const scale = fittedImageScaleOf(natural, element);
  return { width: natural.width * scale, height: natural.height * scale };
};
