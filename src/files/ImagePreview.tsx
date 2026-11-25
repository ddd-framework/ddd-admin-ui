'use client';

import { Maximize, ZoomIn, ZoomOut } from 'lucide-react';
import { useState } from 'react';

import { useTranslate } from '../i18n/useTranslate.ts';
import { Button } from '../primitives/button.tsx';
import { cn } from '../primitives/cn.ts';

/** The zoom steps (1 = the picture's own pixels). */
export const IMAGE_ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4] as const;

/** The next step above (`direction` 1) or below (-1) `zoom`; the last step when there is none. */
export const nextImageZoom = (zoom: number, direction: 1 | -1): number => {
  if (direction === 1) return IMAGE_ZOOM_STEPS.find(step => step > zoom + 0.001) ?? IMAGE_ZOOM_STEPS[IMAGE_ZOOM_STEPS.length - 1];
  return [...IMAGE_ZOOM_STEPS].reverse().find(step => step < zoom - 0.001) ?? IMAGE_ZOOM_STEPS[0];
};

export interface ImagePreviewProps {
  url: string;
  alt: string;
  /** `canvas`: the picture fills the height it is given. Default `drawer` (a box of fixed height). */
  layout?: 'drawer' | 'canvas';
}

/**
 * A picture, fitted into its box; a click (or the buttons) zooms in steps and the box scrolls. Only ever an `<img>`:
 * the bytes are decoded as a picture, never as a document.
 */
export const ImagePreview = ({ url, alt, layout = 'drawer' }: ImagePreviewProps) => {
  const { t } = useTranslate();
  const [failed, setFailed] = useState(false);
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  // `null` = fitted into the box
  const [zoom, setZoom] = useState<number | null>(null);
  const fills = layout === 'canvas';

  if (failed) return <p className="py-6 text-center text-[13px] text-muted-foreground">{t('This image could not be shown.')}</p>;

  const zoomed = zoom !== null && natural !== null;
  const zoomTo = (direction: 1 | -1) => setZoom(previous => nextImageZoom(previous ?? 1, direction));

  return (
    <div className={cn('space-y-2', fills && 'flex min-h-0 flex-1 flex-col')}>
      <div
        data-slot="image-preview"
        className={cn('rounded-xl bg-tint p-2', zoomed ? 'overflow-auto' : 'flex items-center justify-center overflow-hidden', fills ? 'min-h-0 flex-1' : 'max-h-96')}
      >
        <img
          src={url}
          alt={alt}
          draggable={false}
          className={cn('rounded-md', zoomed ? 'max-w-none cursor-zoom-out' : 'max-w-full cursor-zoom-in object-contain', !zoomed && (fills ? 'max-h-full' : 'max-h-[23rem]'))}
          style={zoomed ? { width: Math.round(natural.width * zoom), height: 'auto' } : undefined}
          onLoad={event => setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
          onError={() => setFailed(true)}
          onClick={() => setZoom(previous => (previous === null ? 1 : null))}
        />
      </div>
      <div className="flex items-center justify-center gap-1">
        <Button type="button" variant="ghost" size="icon-sm" aria-label={t('Zoom out')} title={t('Zoom out')} disabled={natural === null || (zoom ?? 1) <= IMAGE_ZOOM_STEPS[0]} onClick={() => zoomTo(-1)}>
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
          disabled={natural === null || (zoom ?? 1) >= IMAGE_ZOOM_STEPS[IMAGE_ZOOM_STEPS.length - 1]}
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
