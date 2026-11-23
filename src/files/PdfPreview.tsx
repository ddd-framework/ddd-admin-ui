'use client';

import { useEffect, useRef, useState } from 'react';

import { useTranslate } from '../i18n/useTranslate.ts';
import { Button } from '../primitives/button.tsx';
import { Skeleton } from '../primitives/skeleton.tsx';

/** The part of pdf.js the preview uses (structural, so the package does not depend on `pdfjs-dist`). */
export interface PdfJsLike {
  getDocument: (source: { url: string; enableXfa?: boolean; isEvalSupported?: boolean; stopAtErrors?: boolean }) => {
    promise: Promise<PdfDocumentLike>;
    destroy: () => Promise<void> | void;
  };
}

export interface PdfDocumentLike {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPageLike>;
}

export interface PdfPageLike {
  getViewport: (options: { scale: number }) => { width: number; height: number };
  render: (parameters: { canvas: HTMLCanvasElement; canvasContext: CanvasRenderingContext2D; viewport: unknown }) => {
    promise: Promise<void>;
    cancel: () => void;
  };
}

/**
 * Loads pdf.js in the host (with its worker set up), e.g.
 * `() => import('pdfjs-dist').then(pdfjs => { pdfjs.GlobalWorkerOptions.workerSrc = workerUrl; return pdfjs; })`.
 */
export type PdfJsLoader = () => Promise<PdfJsLike>;

/** Pages rendered per step ("Load more"). */
const PAGE_STEP = 3;
/** Rendering width cap (CSS px). */
const MAX_WIDTH = 440;

export interface PdfPreviewProps {
  url: string;
  fileName: string;
  loadPdfJs: PdfJsLoader;
}

const PdfPage = ({ pdf, pageNumber, width }: { pdf: PdfDocumentLike; pageNumber: number; width: number }) => {
  const { t } = useTranslate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<void> } | null = null;
    void pdf
      .getPage(pageNumber)
      .then(page => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');
        if (cancelled || !canvas || !context) return;
        const base = page.getViewport({ scale: 1 });
        const scale = Math.min(width, MAX_WIDTH) / base.width;
        const ratio = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: scale * ratio });
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width / ratio)}px`;
        canvas.style.height = `${Math.floor(viewport.height / ratio)}px`;
        renderTask = page.render({ canvas, canvasContext: context, viewport });
        return renderTask.promise;
      })
      .catch((error: unknown) => {
        if (!cancelled && !(error instanceof Error && error.name === 'RenderingCancelledException')) setFailed(true);
      });
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pdf, pageNumber, width]);

  if (failed) return <p className="py-6 text-center text-xs text-muted-foreground">{t('Page %number% could not be shown.', { replacements: { number: pageNumber } })}</p>;
  return <canvas ref={canvasRef} aria-label={t('Page %number%', { replacements: { number: pageNumber } })} className="mx-auto block rounded-md bg-white shadow-sm" />;
};

/**
 * The PDF preview of the drawer: pdf.js (loaded by the host) renders the first pages onto canvases — no PDF viewer, no
 * scripts (`isEvalSupported: false`), no XFA — three at a time with "Load more".
 */
export const PdfPreview = ({ url, fileName, loadPdfJs }: PdfPreviewProps) => {
  const { t } = useTranslate();
  const containerRef = useRef<HTMLDivElement>(null);
  const loaderRef = useRef(loadPdfJs);
  loaderRef.current = loadPdfJs;
  const [pdf, setPdf] = useState<PdfDocumentLike | null>(null);
  const [error, setError] = useState(false);
  const [shown, setShown] = useState(PAGE_STEP);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let destroy: (() => unknown) | null = null;
    setPdf(null);
    setError(false);
    setShown(PAGE_STEP);
    loaderRef
      .current()
      .then(pdfjs => {
        if (cancelled) return;
        const task = pdfjs.getDocument({ url, enableXfa: false, isEvalSupported: false, stopAtErrors: false });
        destroy = () => task.destroy();
        return task.promise.then(loaded => {
          if (!cancelled) setPdf(loaded);
        });
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
      void destroy?.();
    };
  }, [url]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(entries => {
      const next = Math.floor(entries[0]?.contentRect.width ?? 0);
      // Re-render only on a real change (≥ 24 px), not on every sub-pixel layout pass.
      setWidth(previous => (Math.abs(previous - next) >= 24 || previous === 0 ? next : previous));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const pageCount = pdf?.numPages ?? 0;
  const pages = Array.from({ length: Math.min(shown, pageCount) }, (_, index) => index + 1);

  return (
    <div ref={containerRef} className="space-y-3" aria-label={t('Preview of %name%', { replacements: { name: fileName } })} role="document">
      {error ? (
        <p className="py-6 text-center text-[13px] text-muted-foreground">{t('This PDF could not be shown. Download it to open it.')}</p>
      ) : !pdf || width === 0 ? (
        <Skeleton className="mx-auto aspect-[1/1.414] w-full max-w-[420px] rounded-md" />
      ) : (
        <>
          {pages.map(pageNumber => (
            <PdfPage key={pageNumber} pdf={pdf} pageNumber={pageNumber} width={width} />
          ))}
          <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
            <span>{t('%shown% of {count, plural, one {# page} other {# pages}}', { count: pageCount, replacements: { shown: pages.length } })}</span>
            {pages.length < pageCount && (
              <Button type="button" variant="outline" size="sm" onClick={() => setShown(value => value + PAGE_STEP)}>
                {t('Load more')}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
};
