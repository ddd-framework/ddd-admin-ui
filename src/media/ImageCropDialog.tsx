'use client';

import { type KeyboardEvent, type PointerEvent, type ReactNode, useEffect, useId, useMemo, useRef, useState } from 'react';

import { m, useTranslate } from '../i18n/index.ts';
import {
  type CropAspectOption,
  type CropHandle,
  type CropRect,
  cropRatioOf,
  initialCrop,
  moveCrop,
  resizeCrop,
  zoomCrop,
} from '../logic/pure/imageCrop.ts';
import {
  decodeImage,
  isImageNormalizeError,
  type NormalizedImage,
  type NormalizeImageOptions,
  normalizeImage,
} from '../logic/browser/normalizeImage.ts';
import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  SegmentedControl,
} from '../primitives/index.ts';
import { cn } from '../primitives/cn.ts';
import { isInlineDescription } from '../primitives/descriptionContent.ts';

/** What the crop dialog answers: the cropped and normalised image, or the untouched file ("Use original"). */
export type ImageCropResult =
  | ({ kind: 'cropped'; aspectId: string; round: boolean } & NormalizedImage)
  | { kind: 'skipped'; file: Blob };

export interface ImageCropDialogProps {
  open: boolean;
  /** The image to crop; `null` while nothing is picked (the dialog then shows nothing to crop). */
  file: Blob | null;
  /** Aspect choices (a segmented control above the image when more than one); default one free crop. */
  aspectOptions?: readonly CropAspectOption[];
  /** The option selected when a file opens (default the first). */
  defaultAspectId?: string;
  /** Already translated title (default "Crop image"). */
  title?: ReactNode;
  /** A string renders in the dialog's `<p>`, block content in a `<div>`. */
  description?: ReactNode;
  /** Shows "Use original": answers `{ kind: 'skipped', file }` without decoding or encoding. */
  allowSkip?: boolean;
  /** Already translated labels of the buttons. */
  applyLabel?: string;
  skipLabel?: string;
  /** Output of the normaliser: `maxWidth`, `maxHeight`, `maxPixels`, `type`, `quality`, `background`, `maxInputPixels`, `runInWorker`. */
  output?: Omit<NormalizeImageOptions, 'crop' | 'round'>;
  /** Smallest crop side in source pixels (default 16). The host validates anything else on the result. */
  minCropSize?: number;
  onResult: (result: ImageCropResult) => void;
  /** Cancel, Escape, the backdrop and ✕ (ignored while the image is encoded). */
  onCancel: () => void;
  className?: string;
}

const DEFAULT_ASPECTS: readonly CropAspectOption[] = [{ id: 'free', label: m('Free'), ratio: null }];
const HANDLES: readonly Exclude<CropHandle, 'move'>[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const HANDLE_POSITION: Record<Exclude<CropHandle, 'move'>, string> = {
  nw: 'top-0 left-0 cursor-nwse-resize',
  n: 'top-0 left-1/2 cursor-ns-resize',
  ne: 'top-0 left-full cursor-nesw-resize',
  e: 'top-1/2 left-full cursor-ew-resize',
  se: 'top-full left-full cursor-nwse-resize',
  s: 'top-full left-1/2 cursor-ns-resize',
  sw: 'top-full left-0 cursor-nesw-resize',
  w: 'top-1/2 left-0 cursor-ew-resize',
};
const MAX_STAGE_HEIGHT = 560;
const ZOOM_STEP = 1.1;

interface Drag {
  handle: CropHandle;
  startX: number;
  startY: number;
  crop: CropRect;
}

type Loaded = { status: 'idle' } | { status: 'loading' } | { status: 'ready'; url: string; width: number; height: number } | { status: 'error'; message: string };

/**
 * Crop surface for one picked image: a frame over the image, moved by dragging inside it, resized by its eight
 * handles, zoomed by the wheel or a pinch; arrow keys move it (Shift: ten times further), + and − zoom. Aspect
 * choices (free, fixed ratios, round) come from the host. Apply runs `normalizeImage` (orientation, crop, size limits,
 * type with alpha kept) and answers `{ kind: 'cropped', blob, … }`; "Use original" answers `{ kind: 'skipped', file }`;
 * Cancel calls `onCancel`. A corrupt file shows an error instead of throwing. Upload, validation, presets and any
 * queue stay with the host. Browser-only work runs in effects and handlers: the dialog renders on the server closed.
 */
export const ImageCropDialog = ({
  open,
  file,
  aspectOptions = DEFAULT_ASPECTS,
  defaultAspectId,
  title,
  description,
  allowSkip = false,
  applyLabel,
  skipLabel,
  output,
  minCropSize = 16,
  onResult,
  onCancel,
  className,
}: ImageCropDialogProps) => {
  const { t } = useTranslate();
  const hintId = useId();
  const [loaded, setLoaded] = useState<Loaded>({ status: 'idle' });
  const [aspectId, setAspectId] = useState(defaultAspectId ?? aspectOptions[0]?.id ?? 'free');
  const [crop, setCrop] = useState<CropRect | null>(null);
  const [pending, setPending] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [stageWidth, setStageWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<number | null>(null);

  const aspect = aspectOptions.find(option => option.id === aspectId) ?? aspectOptions[0];
  const ratio = cropRatioOf(aspect);
  const round = !!aspect?.round;
  const image = loaded.status === 'ready' ? loaded : null;
  const bounds = useMemo(
    () => (image ? { imageWidth: image.width, imageHeight: image.height, ratio, minSize: minCropSize } : null),
    [image, ratio, minCropSize]
  );

  // decode once per opened file: the oriented size, an object URL for the preview (the <img> applies the same EXIF
  // orientation as createImageBitmap's `from-image`)
  useEffect(() => {
    if (!open || !file) {
      setLoaded({ status: 'idle' });
      return;
    }
    let cancelled = false;
    let url: string | null = null;
    setLoaded({ status: 'loading' });
    setApplyError(null);
    const firstAspect = aspectOptions.find(option => option.id === defaultAspectId) ?? aspectOptions[0];
    setAspectId(firstAspect?.id ?? 'free');
    decodeImage(file)
      .then(decoded => {
        decoded.close();
        if (cancelled) return;
        url = URL.createObjectURL(file);
        setLoaded({ status: 'ready', url, width: decoded.width, height: decoded.height });
        setCrop(initialCrop(decoded.width, decoded.height, cropRatioOf(firstAspect)));
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoaded({ status: 'error', message: isImageNormalizeError(error) ? error.message : t('The file is not an image this browser can read') });
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
    // aspect options are read once per file; a new array from the host must not reset the crop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, file, defaultAspectId, t]);

  // the stage follows the container's width
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(entries => setStageWidth(entries[0]?.contentRect.width ?? 0));
    observer.observe(container);
    return () => observer.disconnect();
  }, [image]);

  const scale = image && stageWidth > 0 ? Math.min(stageWidth / image.width, MAX_STAGE_HEIGHT / image.height) : 0;

  const zoomBy = (factor: number) => {
    if (bounds && crop) setCrop(zoomCrop(crop, factor, bounds));
  };

  // wheel zoom needs a non-passive listener to keep the dialog from scrolling
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !bounds) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      setCrop(current => (current ? zoomCrop(current, Math.exp(-event.deltaY * 0.002), bounds) : current));
    };
    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
  }, [bounds, scale]);

  const selectAspect = (id: string) => {
    setAspectId(id);
    const next = aspectOptions.find(option => option.id === id);
    if (image) setCrop(initialCrop(image.width, image.height, cropRatioOf(next)));
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!crop || !scale || pending) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);
    if (pointersRef.current.size === 2) {
      const [first, second] = [...pointersRef.current.values()];
      pinchRef.current = Math.hypot(first.x - second.x, first.y - second.y);
      dragRef.current = null;
      return;
    }
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-crop-handle]');
    const handle = (target?.dataset.cropHandle as CropHandle | undefined) ?? null;
    if (!handle) return;
    event.preventDefault();
    dragRef.current = { handle, startX: event.clientX, startY: event.clientY, crop };
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!bounds || !scale) return;
    if (pointersRef.current.has(event.pointerId)) pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 2 && pinchRef.current) {
      const [first, second] = [...pointersRef.current.values()];
      const distance = Math.hypot(first.x - second.x, first.y - second.y);
      if (distance > 0) {
        const factor = distance / pinchRef.current;
        pinchRef.current = distance;
        setCrop(current => (current ? zoomCrop(current, factor, bounds) : current));
      }
      return;
    }
    const drag = dragRef.current;
    if (!drag) return;
    const dx = (event.clientX - drag.startX) / scale;
    const dy = (event.clientY - drag.startY) / scale;
    setCrop(resizeCrop(drag.crop, drag.handle, dx, dy, bounds));
  };

  const endPointer = (event: PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (pointersRef.current.size === 0) dragRef.current = null;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!bounds || !crop || pending) return;
    const step = (event.shiftKey ? 0.1 : 0.01) * Math.max(bounds.imageWidth, bounds.imageHeight);
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      setCrop(moveCrop(crop, move[0], move[1], bounds.imageWidth, bounds.imageHeight));
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      zoomBy(ZOOM_STEP);
    } else if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      zoomBy(1 / ZOOM_STEP);
    }
  };

  const apply = async () => {
    if (!file || !crop || pending) return;
    setPending(true);
    setApplyError(null);
    try {
      const normalized = await normalizeImage(file, { ...output, crop, round });
      onResult({ kind: 'cropped', aspectId: aspect?.id ?? aspectId, round, ...normalized });
    } catch (error) {
      setApplyError(isImageNormalizeError(error) ? error.message : t('The image could not be encoded'));
    } finally {
      setPending(false);
    }
  };

  const shownWidth = crop ? Math.round(crop.width) : 0;
  const shownHeight = crop ? Math.round(crop.height) : 0;

  return (
    <Dialog open={open} onOpenChange={next => !next && !pending && onCancel()}>
      <DialogContent data-slot="image-crop-dialog" className={cn('max-h-[95dvh] gap-0 overflow-y-auto p-0 sm:max-w-3xl', className)}>
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>{title ?? t('Crop image')}</DialogTitle>
          {description ? (
            isInlineDescription(description) ? (
              <DialogDescription>{description}</DialogDescription>
            ) : (
              <DialogDescription asChild>
                <div>{description}</div>
              </DialogDescription>
            )
          ) : (
            <DialogDescription>{t('Drag the frame to move it and its handles to resize it; scroll or pinch to zoom.')}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-3 px-6 py-4">
          {aspectOptions.length > 1 && (
            <div className="flex justify-center">
              <SegmentedControl
                aria-label={t('Aspect ratio')}
                value={aspect?.id ?? aspectId}
                onValueChange={selectAspect}
                options={aspectOptions.map(option => ({ value: option.id, label: option.label, translate: option.translate }))}
              />
            </div>
          )}

          <div ref={containerRef} className="flex min-h-24 w-full justify-center">
            {loaded.status === 'loading' && <p className="self-center text-sm text-muted-foreground">{t('Loading image…')}</p>}
            {loaded.status === 'error' && (
              <Alert variant="destructive" className="self-center">
                <AlertDescription>{loaded.message}</AlertDescription>
              </Alert>
            )}
            {image && crop && scale > 0 && (
              <div
                ref={stageRef}
                data-slot="image-crop-stage"
                className="relative touch-none overflow-hidden rounded-md bg-muted select-none"
                style={{ width: image.width * scale, height: image.height * scale }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={endPointer}
                onPointerCancel={endPointer}
              >
                <img src={image.url} alt="" draggable={false} className="pointer-events-none size-full" />
                <div
                  role="group"
                  tabIndex={0}
                  aria-label={t('Crop area')}
                  aria-describedby={hintId}
                  data-crop-handle="move"
                  data-round={round || undefined}
                  onKeyDown={handleKeyDown}
                  className={cn(
                    'absolute cursor-move border-2 border-background shadow-[0_0_0_9999px_rgb(0_0_0/0.5)] outline-none focus-visible:border-ring',
                    round && 'rounded-full'
                  )}
                  style={{ left: crop.x * scale, top: crop.y * scale, width: crop.width * scale, height: crop.height * scale }}
                >
                  {HANDLES.map(handle => (
                    <span
                      key={handle}
                      data-crop-handle={handle}
                      aria-hidden
                      className={cn(
                        'absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-ring bg-background pointer-coarse:size-5',
                        HANDLE_POSITION[handle]
                      )}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {image && crop && (
            <p className="text-center text-sm text-muted-foreground tabular-nums" aria-live="polite">
              {t('%width% × %height% px', { replacements: { width: shownWidth, height: shownHeight } })}
            </p>
          )}
          <p id={hintId} className="sr-only">
            {t('Arrow keys move the frame (with Shift further), + and − zoom.')}
          </p>
          {applyError && (
            <Alert variant="destructive">
              <AlertDescription>{applyError}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="border-t px-6 py-4 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            disabled={!image || pending}
            onClick={() => image && setCrop(initialCrop(image.width, image.height, ratio))}
          >
            {t('Reset')}
          </Button>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>
              {t('Cancel')}
            </Button>
            {allowSkip && (
              <Button type="button" variant="outline" disabled={!file || pending} onClick={() => file && onResult({ kind: 'skipped', file })}>
                {skipLabel ?? t('Use original')}
              </Button>
            )}
            <Button type="button" disabled={!image || !crop || pending} onClick={apply}>
              {pending ? t('Applying…') : (applyLabel ?? t('Apply'))}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
