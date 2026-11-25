'use client';

import { normalizeDddError } from '@mgamadeus/ddd-web/contract';
import { Download } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';

import { type TranslateFn, useTranslate } from '../i18n/useTranslate.ts';
import { StatusBadge } from '../list/StatusBadge.tsx';
import { formatDateTime } from '../logic/pure/format.ts';
import { notify } from '../logic/pure/notify.ts';
import { Alert, AlertDescription, AlertTitle } from '../primitives/alert.tsx';
import { Button } from '../primitives/button.tsx';
import { cn } from '../primitives/cn.ts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../primitives/select.tsx';
import { Skeleton } from '../primitives/skeleton.tsx';
import { startFileDownload } from './fileDownload.ts';
import { FileFamilyIcon } from './FileFamilyIcon.tsx';
import type { FileManagerAdapter } from './fileManagerAdapter.ts';
import { FilePreview, type FilePreviewLoaders } from './FilePreview.tsx';
import { FILE_SCAN_STATUS } from './fileStatus.ts';
import {
  FILE_FAMILY_LABELS,
  type FileDetailView,
  type FileItemId,
  type FileVersionView,
  formatBytes,
  isFileBeingChecked,
  isFileReleased,
  sameFileId,
} from './fileView.ts';
import { useFileCheckPolling } from './useFileCheckPolling.ts';

export interface FileViewerProps extends FilePreviewLoaders {
  /** The file manager's adapter of the file's area: `useFile` reads the file with its versions, `useActions().getDownload` its content. */
  adapter: FileManagerAdapter;
  fileId: FileItemId;
  /** Controls after Download in the head (a link to the file's place in the host's screen, …). */
  actions?: ReactNode;
  className?: string;
}

/** The versions a reader may open, newest first. */
export const viewableFileVersions = (file: Pick<FileDetailView, 'versions'>): FileVersionView[] =>
  [...(file.versions ?? [])].filter(version => isFileReleased(version.scanStatus)).sort((a, b) => b.versionNumber - a.versionNumber);

const versionLabel = (version: FileVersionView, t: TranslateFn): string =>
  [
    version.isCurrent
      ? t('Version %number% (current)', { replacements: { number: version.versionNumber } })
      : t('Version %number%', { replacements: { number: version.versionNumber } }),
    formatBytes(version.sizeBytes),
    version.createdAt ? formatDateTime(version.createdAt) : null,
    version.uploadedBy ? t('by %user%', { replacements: { user: version.uploadedBy } }) : null,
  ]
    .filter(Boolean)
    .join(' · ');

/**
 * One file on a wide surface (a canvas beside a chat, a pane): its name and facts, the preview filling the height
 * (`FilePreview layout="canvas"`), the choice of a stored version and Download. Reads through the file manager's
 * adapter, so it shows what the reader may see there and nothing else; it changes nothing. The parent gives the
 * height (a flex column).
 */
export const FileViewer = ({ adapter, fileId, actions: headActions, loadPdfJs, loadCodeHighlighter, renderMarkdown, className }: FileViewerProps) => {
  const { t } = useTranslate();
  const actions = adapter.useActions();
  const [isChecking, setIsChecking] = useState(false);
  const refetchRef = useRef<(() => void) | undefined>(undefined);
  const pollingIntervalMs = useFileCheckPolling({ isOpen: true, isChecking, refetch: () => refetchRef.current?.() });
  const query = adapter.useFile(fileId, { pollingIntervalMs });
  refetchRef.current = query.refetch;
  const file = query.data && sameFileId(query.data.id, fileId) ? query.data : null;
  const isFileChecking = file !== null && isFileBeingChecked(file);
  useEffect(() => {
    setIsChecking(isFileChecking);
  }, [isFileChecking]);

  const [chosen, setChosen] = useState<{ fileId: string; versionId: string } | null>(null);
  const [downloading, setDownloading] = useState(false);

  if (file === null) {
    if (query.isLoading || (!query.isError && query.data === undefined)) {
      return (
        <div className={cn('flex min-h-0 flex-1 flex-col gap-3', className)} aria-busy>
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="min-h-56 w-full flex-1 rounded-xl" />
        </div>
      );
    }
    return (
      <div className={cn('flex flex-col items-center gap-3 rounded-xl bg-tint px-6 py-8 text-center', className)}>
        <FileFamilyIcon family="OTHER" size="lg" />
        <p className="max-w-sm text-[13px] text-muted-foreground">{t('This file is not available. It was removed, or you may not open it.')}</p>
      </div>
    );
  }

  const versions = viewableFileVersions(file);
  const current = versions.find(version => version.isCurrent) ?? null;
  const chosenVersion = chosen !== null && chosen.fileId === String(file.id) ? (versions.find(version => String(version.id) === chosen.versionId) ?? null) : null;
  const shownVersion = chosenVersion ?? current;
  const showsOlderVersion = shownVersion !== null && !shownVersion.isCurrent;
  const trashed = file.deletedAt !== null && file.deletedAt !== undefined;
  const released = isFileReleased(file.scanStatus);
  const facts = [
    file.extension ? `${t(FILE_FAMILY_LABELS[file.family])} (.${file.extension})` : t(FILE_FAMILY_LABELS[file.family]),
    formatBytes(shownVersion?.sizeBytes ?? file.sizeBytes),
    file.updatedAt ? formatDateTime(file.updatedAt) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const download = async () => {
    setDownloading(true);
    try {
      const result = await actions.getDownload(file.id, { disposition: 'attachment', ...(showsOlderVersion ? { versionId: shownVersion.id } : {}) });
      startFileDownload(result.url, result.fileName || file.name);
    } catch (error) {
      notify.error(normalizeDddError(error, t('%name% could not be downloaded', { replacements: { name: file.name } })).message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div data-slot="file-viewer" className={cn('flex min-h-0 flex-1 flex-col gap-3', className)}>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <FileFamilyIcon family={file.family} size="sm" />
        <div className="min-w-0 flex-1 basis-40">
          <h2 className="truncate text-sm leading-snug font-semibold" title={file.name}>
            {file.name}
          </h2>
          <p className="truncate text-xs text-muted-foreground">{facts}</p>
        </div>
        {!released && <StatusBadge value={file.scanStatus} map={FILE_SCAN_STATUS} />}
        {versions.length > 1 && shownVersion !== null && (
          <Select value={String(shownVersion.id)} onValueChange={versionId => setChosen({ fileId: String(file.id), versionId })}>
            <SelectTrigger size="sm" aria-label={t('Version shown')} className="max-w-56">
              <SelectValue>
                {shownVersion.isCurrent
                  ? t('Version %number% (current)', { replacements: { number: shownVersion.versionNumber } })
                  : t('Version %number%', { replacements: { number: shownVersion.versionNumber } })}
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="end">
              {versions.map(version => (
                <SelectItem key={String(version.id)} value={String(version.id)}>
                  {versionLabel(version, t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button type="button" variant="outline" size="sm" disabled={!released || trashed || downloading} onClick={() => void download()}>
          <Download />
          {t('Download', { context: 'action' })}
        </Button>
        {headActions}
      </header>
      {showsOlderVersion && current !== null && (
        <Alert>
          <AlertTitle>{t('You are looking at version %number%', { replacements: { number: shownVersion.versionNumber } })}</AlertTitle>
          <AlertDescription>
            {t('The current version is %number%.', { replacements: { number: current.versionNumber } })}{' '}
            <button type="button" className="font-medium underline underline-offset-2" onClick={() => setChosen(null)}>
              {t('Show the current version')}
            </button>
          </AlertDescription>
        </Alert>
      )}
      <FilePreview
        file={file}
        getDownload={actions.getDownload}
        versionId={showsOlderVersion ? shownVersion.id : undefined}
        loadPdfJs={loadPdfJs}
        loadCodeHighlighter={loadCodeHighlighter}
        renderMarkdown={renderMarkdown}
        layout="canvas"
      />
    </div>
  );
};
