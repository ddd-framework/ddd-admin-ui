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
import type { CodeHighlighterLoader } from './codeHighlighting.ts';
import { CodePreview } from './CodePreview.tsx';
import {
  codeLanguageOfExtension,
  FILE_FAMILY_LABELS,
  type FileDownloadView,
  type FileItemId,
  type FileView,
  filePreviewKind,
  isFileReleased,
} from './fileView.ts';
import { ImagePreview } from './ImagePreview.tsx';
import { MarkdownFilePreview, type MarkdownFileRenderer } from './MarkdownFilePreview.tsx';
import { MediaPreview } from './MediaPreview.tsx';
import { PDF_PREVIEW_CANVAS_MAX_WIDTH, type PdfJsLoader, PdfPreview } from './PdfPreview.tsx';
import { TextPreview } from './TextPreview.tsx';
import { TEXT_PREVIEW_BYTES, TEXT_VIEWER_BYTES } from './useTextHead.ts';

/** What the host brings for the previews that need a library or a renderer; each is optional. */
export interface FilePreviewLoaders {
  /** pdf.js from the host; without it a PDF offers "Open PDF" (the browser's viewer, in a new tab). */
  loadPdfJs?: PdfJsLoader;
  /** A highlighter from the host (loaded on the first source file shown); without it source files show plain. */
  loadCodeHighlighter?: CodeHighlighterLoader;
  /** Draws a Markdown file as markup (`MarkdownPreview untrusted` of ./markdown); without it Markdown shows its source. */
  renderMarkdown?: MarkdownFileRenderer;
}

export interface FilePreviewProps extends FilePreviewLoaders {
  file: FileView;
  /** The release gate; called once per file / state / disposition. */
  getDownload: (fileId: FileItemId, options: FileDownloadOptions) => Promise<FileDownloadView>;
  /** A stored version instead of the current one (the file's facts — type, scan state — still decide what is shown). */
  versionId?: FileItemId;
  /**
   * `drawer` (default): boxes of a fixed height, for a column that scrolls. `canvas`: no box of its own height and no
   * width cap — the preview fills the flex column it is put in (the parent gives the height) and scrolls inside;
   * texts are read up to 1 MB instead of 100 KB.
   */
  layout?: 'drawer' | 'canvas';
  className?: string;
}

const noPreviewText = (file: FileView, t: TranslateFn): string => {
  if (file.family === 'IMAGE') return t('This image type has no preview here. Download it to open it.');
  if (file.family === 'VIDEO' || file.family === 'AUDIO') return t('This media format has no player here. Download the file to play it.');
  if (file.family === 'ARCHIVE') return t('Archives are not opened in the browser. Download it to unpack it.');
  return t('%type% files have no preview here. Download it to open it.', { replacements: { type: t(FILE_FAMILY_LABELS[file.family]) } });
};

const Panel = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('flex flex-col items-center gap-3 rounded-xl bg-tint px-6 py-8 text-center', className)}>{children}</div>
);

const usePreviewUrl = (
  file: FileView,
  enabled: boolean,
  disposition: FileDownloadOptions['disposition'],
  getDownload: FilePreviewProps['getDownload'],
  versionId: FileItemId | undefined
) => {
  const getDownloadRef = useRef(getDownload);
  getDownloadRef.current = getDownload;
  const [state, setState] = useState<{ key: string; url: string | null; error: string | null }>({ key: '', url: null, error: null });
  // another current version (upload, restore) is another content: fetch the preview again
  const key = `${String(file.id)}:${String(versionId ?? '')}:${String(file.contentVersion ?? '')}:${file.updatedAt ?? ''}:${file.sizeBytes}:${file.scanStatus}:${disposition}`;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    getDownloadRef
      .current(file.id, { disposition, variant: 'PREVIEW', ...(versionId === undefined ? {} : { versionId }) })
      .then(download => {
        if (!cancelled) setState({ key, url: download.url, error: null });
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ key, url: null, error: normalizeDddError(error).message });
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, file.id, disposition, key, versionId]);

  return state.key === key ? state : { key, url: null, error: null };
};

/**
 * The preview of a file: JPEG / PNG / GIF / WebP (or the server's rendition) as `<img>` with zoom, PDF on canvases
 * through the host's pdf.js, Markdown as markup or source, source files with the host's highlighter, TXT / CSV as
 * text, MP4 / WebM / MP3 … in the browser's player, everything else icon + "download to open". Nothing is fetched
 * before the file is released; an unreleased file shows its scan state and what it means instead. File content is
 * never inserted as HTML. `layout="canvas"` fills the column it is put in (a canvas, a wide pane) instead of drawing
 * boxes of a fixed height.
 */
export const FilePreview = ({ file, getDownload, loadPdfJs, loadCodeHighlighter, renderMarkdown, versionId, layout = 'drawer', className }: FilePreviewProps) => {
  const { t } = useTranslate();
  const released = isFileReleased(file.scanStatus);
  // a file in the trash is not previewed (the server releases its content as a download only)
  const trashed = file.deletedAt !== null && file.deletedAt !== undefined;
  const kind = filePreviewKind(file);
  const disposition: FileDownloadOptions['disposition'] = kind === 'image' || kind === 'pdf' ? 'inline' : 'attachment';
  const preview = usePreviewUrl(file, released && !trashed && kind !== 'none', disposition, getDownload, versionId);
  const fills = layout === 'canvas';
  const maxBytes = fills ? TEXT_VIEWER_BYTES : TEXT_PREVIEW_BYTES;

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
  if (!preview.url) return <Skeleton className={cn('w-full rounded-xl', fills ? 'min-h-56 flex-1' : 'h-56', className)} />;

  return (
    <div data-slot="file-preview" data-preview-kind={kind} className={cn(fills && 'flex min-h-0 flex-1 flex-col', fills && kind === 'pdf' && 'overflow-auto', className)}>
      {kind === 'image' && <ImagePreview url={preview.url} alt={t('Preview of %name%', { replacements: { name: file.name } })} layout={layout} />}
      {kind === 'pdf' &&
        (loadPdfJs ? (
          <PdfPreview url={preview.url} fileName={file.name} loadPdfJs={loadPdfJs} maxWidth={fills ? PDF_PREVIEW_CANVAS_MAX_WIDTH : undefined} />
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
      {kind === 'markdown' && (
        <MarkdownFilePreview
          url={preview.url}
          fileName={file.name}
          renderMarkdown={renderMarkdown}
          loadCodeHighlighter={loadCodeHighlighter}
          layout={layout}
          maxBytes={maxBytes}
        />
      )}
      {kind === 'code' && (
        <CodePreview
          url={preview.url}
          fileName={file.name}
          language={codeLanguageOfExtension(file.extension)}
          loadCodeHighlighter={loadCodeHighlighter}
          layout={layout}
          maxBytes={maxBytes}
        />
      )}
      {(kind === 'text' || kind === 'csv') && <TextPreview url={preview.url} fileName={file.name} asTable={kind === 'csv'} layout={layout} maxBytes={maxBytes} />}
      {(kind === 'video' || kind === 'audio') && <MediaPreview url={preview.url} fileName={file.name} kind={kind} layout={layout} />}
    </div>
  );
};
