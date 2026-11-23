'use client';

import { normalizeDddError } from '@mgamadeus/ddd-web/contract';
import { ExternalLink } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';

import { type TranslateFn, useTranslate } from '../i18n/useTranslate.ts';
import { StatusBadge } from '../list/StatusBadge.tsx';
import { Button } from '../primitives/button.tsx';
import { cn } from '../primitives/cn.ts';
import { Skeleton } from '../primitives/skeleton.tsx';
import { FileFamilyIcon } from './FileFamilyIcon.tsx';
import type { FileDownloadOptions } from './fileManagerAdapter.ts';
import { FILE_SCAN_STATUS, SCAN_STATUS_EXPLANATION } from './fileStatus.ts';
import { FILE_FAMILY_LABELS, type FileDownloadView, type FileItemId, type FileView, filePreviewKind, isFileReleased } from './fileView.ts';
import { type PdfJsLoader, PdfPreview } from './PdfPreview.tsx';
import { TextPreview } from './TextPreview.tsx';

export interface FilePreviewProps {
  file: FileView;
  /** The release gate; called once per file / state / disposition. */
  getDownload: (fileId: FileItemId, options: FileDownloadOptions) => Promise<FileDownloadView>;
  /** pdf.js from the host; without it a PDF offers "Open PDF" (the browser's viewer, in a new tab). */
  loadPdfJs?: PdfJsLoader;
  className?: string;
}

const noPreviewText = (file: FileView, t: TranslateFn): string => {
  if (file.family === 'IMAGE') return t('This image type has no preview here. Download it to open it.');
  if (file.family === 'VIDEO' || file.family === 'AUDIO') return t('Media files have no player here. Download the file to play it.');
  if (file.family === 'ARCHIVE') return t('Archives are not opened in the browser. Download it to unpack it.');
  return t('%type% files have no preview here. Download it to open it.', { replacements: { type: t(FILE_FAMILY_LABELS[file.family]) } });
};

const Panel = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('flex flex-col items-center gap-3 rounded-xl bg-tint px-6 py-8 text-center', className)}>{children}</div>
);

const usePreviewUrl = (file: FileView, enabled: boolean, disposition: FileDownloadOptions['disposition'], getDownload: FilePreviewProps['getDownload']) => {
  const getDownloadRef = useRef(getDownload);
  getDownloadRef.current = getDownload;
  const [state, setState] = useState<{ key: string; url: string | null; error: string | null }>({ key: '', url: null, error: null });
  // another current version (upload, restore) is another content: fetch the preview again
  const key = `${String(file.id)}:${String(file.contentVersion ?? '')}:${file.updatedAt ?? ''}:${file.sizeBytes}:${file.scanStatus}:${disposition}`;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    getDownloadRef
      .current(file.id, { disposition, variant: 'PREVIEW' })
      .then(download => {
        if (!cancelled) setState({ key, url: download.url, error: null });
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ key, url: null, error: normalizeDddError(error).message });
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, file.id, disposition, key]);

  return state.key === key ? state : { key, url: null, error: null };
};

const ImagePreview = ({ url, alt }: { url: string; alt: string }) => {
  const { t } = useTranslate();
  const [failed, setFailed] = useState(false);
  if (failed) return <p className="py-6 text-center text-[13px] text-muted-foreground">{t('This image could not be shown.')}</p>;
  return (
    <div className="flex justify-center overflow-hidden rounded-xl bg-tint p-2">
      <img src={url} alt={alt} className="max-h-96 w-auto max-w-full rounded-md object-contain" onError={() => setFailed(true)} />
    </div>
  );
};

/**
 * The drawer's preview: JPEG / PNG / GIF / WebP (or the server's rendition) as `<img>`, PDF on canvases through the
 * host's pdf.js, TXT / CSV as text, everything else icon + "download to open". Nothing is fetched before the file is
 * released; an unreleased file shows its scan state and what it means instead. File content is never inserted as HTML.
 */
export const FilePreview = ({ file, getDownload, loadPdfJs, className }: FilePreviewProps) => {
  const { t } = useTranslate();
  const released = isFileReleased(file.scanStatus);
  // a file in the trash is not previewed (the server releases its content as a download only)
  const trashed = file.deletedAt !== null && file.deletedAt !== undefined;
  const kind = filePreviewKind(file);
  const disposition: FileDownloadOptions['disposition'] = kind === 'image' || kind === 'pdf' ? 'inline' : 'attachment';
  const preview = usePreviewUrl(file, released && !trashed && kind !== 'none', disposition, getDownload);

  if (trashed) {
    return (
      <Panel className={className}>
        <FileFamilyIcon family={file.family} size="lg" />
        <p className="max-w-sm text-[13px] text-muted-foreground">{t('Files in the trash have no preview. Restore the file to see it.')}</p>
      </Panel>
    );
  }

  if (!released) {
    return (
      <Panel className={className}>
        <FileFamilyIcon family={file.family} size="lg" />
        <StatusBadge value={file.scanStatus} map={FILE_SCAN_STATUS} />
        <p className="max-w-sm text-[13px] text-muted-foreground">{t(SCAN_STATUS_EXPLANATION[file.scanStatus])}</p>
      </Panel>
    );
  }
  if (kind === 'none') {
    return (
      <Panel className={className}>
        <FileFamilyIcon family={file.family} size="lg" />
        <p className="max-w-sm text-[13px] text-muted-foreground">{noPreviewText(file, t)}</p>
      </Panel>
    );
  }
  if (preview.error) {
    return (
      <Panel className={className}>
        <FileFamilyIcon family={file.family} size="lg" />
        <p className="max-w-sm text-[13px] text-destructive">{preview.error}</p>
      </Panel>
    );
  }
  if (!preview.url) return <Skeleton className={cn('h-56 w-full rounded-xl', className)} />;

  return (
    <div className={className}>
      {kind === 'image' && <ImagePreview url={preview.url} alt={t('Preview of %name%', { replacements: { name: file.name } })} />}
      {kind === 'pdf' &&
        (loadPdfJs ? (
          <PdfPreview url={preview.url} fileName={file.name} loadPdfJs={loadPdfJs} />
        ) : (
          <Panel>
            <FileFamilyIcon family="PDF" size="lg" />
            <Button asChild variant="outline" size="sm">
              <a href={preview.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink />
                {t('Open PDF')}
              </a>
            </Button>
          </Panel>
        ))}
      {(kind === 'text' || kind === 'csv') && <TextPreview url={preview.url} fileName={file.name} asTable={kind === 'csv'} />}
    </div>
  );
};
