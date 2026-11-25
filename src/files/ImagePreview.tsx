'use client';

import { Maximize, ZoomIn, ZoomOut } from 'lucide-react';
import { useRef, useState } from 'react';

import { useTranslate } from '../i18n/useTranslate.ts';
import { Button } from '../primitives/button.tsx';
import { cn } from '../primitives/cn.ts';
import { fittedImageScaleOf, IMAGE_ZOOM_STEPS, imageBaseSizeOf, imageZoomBaseOf, nextImageZoom, VECTOR_IMAGE_CLICK_ZOOM } from './imageZoom.ts';

export { fittedImageScaleOf, IMAGE_ZOOM_STEPS, imageBaseSizeOf, imageZoomBaseOf, nextImageZoom, VECTOR_IMAGE_CLICK_ZOOM } from './imageZoom.ts';

export interface ImagePreviewProps {
  url: string;
  alt: string;
  /** `canvas`: the picture fills the height it is given. Default `drawer` (a box of fixed height). */
  layout?: 'drawer' | 'canvas';
  /**
   * A vector picture: fitted, it is drawn as large as its box allows (its own size is only a hint, and some have
   * none), and its zoom steps count from that fitted size (100 % = fitted; a click zooms to 200 %). Default false: a
   * raster picture is never drawn larger than its pixels while fitted, and 100 % is its own pixels.
   */
  scalable?: boolean;
}

/**
 * A picture, fitted into its box; a click (or the buttons) zooms in steps and the box scrolls. Only ever an `<img>`:
 * the bytes are decoded as a picture, never as a document — a vector picture shown this way runs no script and loads
 * no other resource.
 */
export const ImagePreview = ({ url, alt, layout = 'drawer', scalable = false }: ImagePreviewProps) => {
  const { t } = useTranslate();
  const [failed, setFailed] = useState(false);
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  // `null` = fitted into the box
  const [zoom, setZoom] = useState<number | null>(null);
  // the size 100 % stands for, taken when the fitted view is left (`imageZoomBaseOf`)
  const [zoomBase, setZoomBase] = useState<{ width: number; height: number } | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const fills = layout === 'canvas';

  if (failed) return <p className="py-6 text-center text-[13px] text-muted-foreground">{t('This image could not be shown.')}</p>;

  const zoomed = zoom !== null && zoomBase !== null;
  const fittedClass = scalable ? (fills ? 'h-full w-full' : 'max-h-[23rem] w-full') : fills ? 'max-h-full' : 'max-h-[23rem]';
  // from the fitted picture the next step is counted from the scale it is drawn at, not from 100 %
  const leaveFit = (zoomOf: (fittedScale: number) => number) => {
    const image = imageRef.current;
    if (!image || natural === null) return;
    const element = { width: image.clientWidth, height: image.clientHeight };
    const base = imageZoomBaseOf(natural, element, scalable);
    setZoomBase(base);
    setZoom(zoomOf(fittedImageScaleOf(base, element)));
  };
  const zoomTo = (direction: 1 | -1) => {
    if (zoom === null) leaveFit(fittedScale => nextImageZoom(fittedScale, direction));
    else setZoom(nextImageZoom(zoom, direction));
  };
  const toggleZoom = () => {
    if (zoom === null) leaveFit(() => (scalable ? VECTOR_IMAGE_CLICK_ZOOM : 1));
    else setZoom(null);
  };

  return (
    <div className={cn('space-y-2', fills && 'flex min-h-0 flex-1 flex-col')}>
      <div
        data-slot="image-preview"
        className={cn('rounded-xl bg-tint p-2', zoomed ? 'overflow-auto' : 'flex items-center justify-center overflow-hidden', fills ? 'min-h-0 flex-1' : 'max-h-96')}
      >
        <img
          ref={imageRef}
          src={url}
          alt={alt}
          draggable={false}
          className={cn('rounded-md', zoomed ? 'max-w-none cursor-zoom-out' : 'max-w-full cursor-zoom-in object-contain', !zoomed && fittedClass)}
          style={zoomed ? { width: Math.round(zoomBase.width * zoom), height: 'auto' } : undefined}
          onLoad={event =>
            setNatural(
              imageBaseSizeOf(
                { width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight },
                { width: event.currentTarget.clientWidth, height: event.currentTarget.clientHeight }
              )
            )
          }
          onError={() => setFailed(true)}
          onClick={toggleZoom}
        />
      </div>
      <div className="flex items-center justify-center gap-1">
        <Button type="button" variant="ghost" size="icon-sm" aria-label={t('Zoom out')} title={t('Zoom out')} disabled={natural === null || (zoom !== null && zoom <= IMAGE_ZOOM_STEPS[0])} onClick={() => zoomTo(-1)}>
          <ZoomOut />
        </Button>
        <span className="min-w-12 text-center text-xs text-muted-foreground tabular-nums" aria-live="polite">
          {zoom === null ? t('Fit', { context: 'image-zoom' }) : `${Math.round(zoom * 100)} %`}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t('Zoom in')}
          title={t('Zoom in')}
          disabled={natural === null || (zoom !== null && zoom >= IMAGE_ZOOM_STEPS[IMAGE_ZOOM_STEPS.length - 1])}
          onClick={() => zoomTo(1)}
        >
          <ZoomIn />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={t('Fit to the view')} title={t('Fit to the view')} disabled={zoom === null} onClick={() => setZoom(null)}>
          <Maximize />
        </Button>
      </div>
    </div>
  );
};
