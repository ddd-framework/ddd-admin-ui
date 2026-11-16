'use client';

import { ImageOff } from 'lucide-react';
import { useState } from 'react';

import { useTranslate } from '../i18n/index.ts';
import { cn } from '../primitives/cn.ts';

export interface MediaPreviewProps {
  src: string | null | undefined;
  alt: string;
  /** Text of the empty box. */
  emptyLabel?: string;
  /** Sizing classes of the box (default `size-32`). */
  className?: string;
  /** Mark the image as its own click target inside a clickable row (`useRowActivation` skips it). */
  ignoreRowAction?: boolean;
}

/**
 * A media item's image, contained in a bordered box, or a dashed placeholder when there is
 * none or the file does not load. Plain `<img>`: the files are served by the API with their own sizing parameter.
 */
export const MediaPreview = ({ src, alt, emptyLabel, className, ignoreRowAction }: MediaPreviewProps) => {
  const { t } = useTranslate();
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = !!src && failedSrc !== src;

  if (!showImage) {
    return (
      <div
        className={cn(
          'flex size-32 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground',
          className
        )}
      >
        <ImageOff className="size-4" aria-hidden />
        {emptyLabel ?? t('No image')}
      </div>
    );
  }
  return (
    <div className={cn('flex size-32 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/30', className)}>
      {/* biome-ignore lint/performance/noImgElement: API-served media with its own size parameter, not a Next asset */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="size-full object-contain"
        onError={() => setFailedSrc(src)}
        data-row-action-ignore={ignoreRowAction ? '' : undefined}
      />
    </div>
  );
};
