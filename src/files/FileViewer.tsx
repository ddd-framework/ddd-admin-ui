'use client';

import { normalizeDddError } from '@mgamadeus/ddd-web/contract';
import { Download, Pencil, ShieldEllipsis } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';

import { type TranslateFn, useTranslate } from '../i18n/useTranslate.ts';
import { StatusBadge } from '../list/StatusBadge.tsx';
import { formatDateTime } from '../logic/pure/format.ts';
import { useConfirm } from '../logic/react/useConfirm.ts';
import { notify } from '../logic/pure/notify.ts';
import { Alert, AlertDescription, AlertTitle } from '../primitives/alert.tsx';
import { Button } from '../primitives/button.tsx';
import { cn } from '../primitives/cn.ts';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../primitives/dialog.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../primitives/select.tsx';
import { Skeleton } from '../primitives/skeleton.tsx';
import { startFileDownload } from './fileDownload.ts';
import { FileFamilyIcon } from './FileFamilyIcon.tsx';
import type { FileManagerAdapter } from './fileManagerAdapter.ts';
import { resolveFileManagerFeatures } from './fileManagerFeatures.ts';
import { FilePreview, type FilePreviewLoaders } from './FilePreview.tsx';
import { FILE_NEWEST_VERSION_STATE, FILE_SCAN_STATUS } from './fileStatus.ts';
import { copyFileNameOf, fileTextEditRefusalOf } from './fileTextEditing.ts';
import { FileTextEditor } from './FileTextEditor.tsx';
import {
  FILE_FAMILY_LABELS,
  type FileDetailView,
  type FileItemId,
  type FileVersionView,
  type FileView,
  filePreviewKind,
  formatBytes,
  isFileBeingChecked,
  isFileReleased,
  newestVersionStateOf,
  sameFileId,
} from './fileView.ts';
import { useFileCheckPolling } from './useFileCheckPolling.ts';

export interface FileViewerProps extends FilePreviewLoaders {
  /** The file manager's adapter of the file's area: `useFile` reads the file with its versions, `useActions().getDownload` its content. */
  adapter: FileManagerAdapter;
  fileId: FileItemId;
  /** Controls after Download in the head (a link to the file's place in the host's screen, …). */
  actions?: ReactNode;
  /** A control before the file's name (a way back to the list the file was opened from). */
  leading?: ReactNode;
  /**
   * The reader may write here (default `false`): a text file then offers "Edit" when the adapter saves texts
   * (`saveText` + `saveTextAsCopy` with capability `versions`).
   */
  canWrite?: boolean;
  /** Writes allowed on this server (default `true`). */
  writesAllowed?: boolean;
  /** A text edit became a new version of the file (`previousVersionNumber` = the version it was made from). */
  onTextSaved?: (saved: { file: FileView; previousVersionNumber: number | null }) => void;
  /** A text edit was saved as a new file beside this one (the way out of a conflict). */
  onTextCopySaved?: (copy: FileView) => void;
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
 * adapter, so it shows what the reader may see there and nothing else. With `canWrite` a text file (Markdown, text,
 * CSV, source) is edited in place: Save writes a new version on top of the version the edit started from; when the
 * file got a newer version meanwhile nothing is overwritten — the reader loads the newer version or saves the draft
 * as a copy. The parent gives the height (a flex column).
 */
export const FileViewer = ({
  adapter,
  fileId,
  actions: headActions,
  leading,
  canWrite = false,
  writesAllowed = true,
  onTextSaved,
  onTextCopySaved,
  loadPdfJs,
  loadCodeHighlighter,
  renderMarkdown,
  className,
}: FileViewerProps) => {
  const { t } = useTranslate();
  const confirm = useConfirm();
  const actions = adapter.useActions();
  const features = resolveFileManagerFeatures(adapter.capabilities, actions);
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
  // the edit of one file: the version it started from and that version's content
  const [editing, setEditing] = useState<{ fileId: string; baseVersionId: FileItemId | null; baseVersionNumber: number | null; url: string } | null>(null);
  const [startingEdit, setStartingEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState<{ text: string; message: string | null } | null>(null);
  const hasDraftRef = useRef(false);
  const noteDraft = useCallback((hasChanges: boolean) => {
    hasDraftRef.current = hasChanges;
  }, []);

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

  const kind = filePreviewKind(file);
  const activeEdit = editing !== null && editing.fileId === String(file.id) ? editing : null;
  const mayEdit = features.editText && canWrite && writesAllowed && fileTextEditRefusalOf(file, kind, showsOlderVersion) === null && current !== null;
  const newestState = released ? newestVersionStateOf(file) : null;

  const startEdit = async () => {
    if (current === null) return;
    setStartingEdit(true);
    try {
      const result = await actions.getDownload(file.id, { disposition: 'attachment', variant: 'PREVIEW', versionId: current.id });
      hasDraftRef.current = false;
      setEditing({ fileId: String(file.id), baseVersionId: current.id, baseVersionNumber: current.versionNumber, url: result.url });
    } catch (error) {
      notify.error(normalizeDddError(error, t('%name% could not be opened for editing', { replacements: { name: file.name } })).message);
    } finally {
      setStartingEdit(false);
    }
  };

  const leaveEdit = () => {
    hasDraftRef.current = false;
    setConflict(null);
    setEditing(null);
  };

  const cancelEdit = async (hasChanges: boolean) => {
    if (hasChanges && !(await confirm({ title: t('Discard your changes?'), description: t('Your changes to %name% are not saved.', { replacements: { name: file.name } }), confirmLabel: t('Discard changes'), confirmVariant: 'destructive' }))) {
      return;
    }
    leaveEdit();
  };

  const saveText = async (text: string) => {
    if (activeEdit === null || actions.saveText === undefined) return;
    setSaving(true);
    try {
      const result = await actions.saveText(file.id, { text, baseVersionId: activeEdit.baseVersionId });
      if (result.status === 'conflict') {
        setConflict({ text, message: result.message ?? null });
        return;
      }
      notify.success(
        isFileBeingChecked(result.file)
          ? t('Saved. The new version is shown as soon as it has been checked.')
          : t('%name% was saved as a new version', { replacements: { name: file.name } })
      );
      leaveEdit();
      setChosen(null);
      query.refetch?.();
      onTextSaved?.({ file: result.file, previousVersionNumber: activeEdit.baseVersionNumber });
    } catch (error) {
      notify.error(normalizeDddError(error, t('%name% could not be saved', { replacements: { name: file.name } })).message);
    } finally {
      setSaving(false);
    }
  };

  const saveAsCopy = async () => {
    if (conflict === null || actions.saveTextAsCopy === undefined) return;
    setSaving(true);
    try {
      const copy = await actions.saveTextAsCopy(file.id, { text: conflict.text, name: copyFileNameOf(file.name, file.extension, 1, t('copy', { context: 'file-name' })) });
      notify.success(t('Your changes were saved as %name%', { replacements: { name: copy.name } }));
      leaveEdit();
      query.refetch?.();
      onTextCopySaved?.(copy);
    } catch (error) {
      notify.error(normalizeDddError(error, t('The copy could not be saved')).message);
    } finally {
      setSaving(false);
    }
  };

  const loadNewerVersion = () => {
    leaveEdit();
    setChosen(null);
    query.refetch?.();
  };

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
        {leading}
        <FileFamilyIcon family={file.family} size="sm" />
        <div className="min-w-0 flex-1 basis-40">
          <h2 className="truncate text-sm leading-snug font-semibold" title={file.name}>
            {file.name}
          </h2>
          <p className="truncate text-xs text-muted-foreground">{facts}</p>
        </div>
        {!released && <StatusBadge value={file.scanStatus} map={FILE_SCAN_STATUS} />}
        {versions.length > 1 && shownVersion !== null && activeEdit === null && (
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
        {mayEdit && activeEdit === null && (
          <Button type="button" variant="outline" size="sm" disabled={startingEdit} onClick={() => void startEdit()}>
            <Pencil />
            {t('Edit', { context: 'action' })}
          </Button>
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
      {newestState !== null && activeEdit === null && (
        <Alert variant={newestState === 'checking' ? 'default' : 'destructive'}>
          <ShieldEllipsis />
          <AlertTitle>{t(FILE_NEWEST_VERSION_STATE[newestState].label)}</AlertTitle>
          <AlertDescription>
            {t(FILE_NEWEST_VERSION_STATE[newestState].description ?? '')}
            {(file.newestVersionNumber || file.newestVersionReason) && (
              <span className="mt-1 block text-muted-foreground">
                {[file.newestVersionNumber ? t('Version %number%', { replacements: { number: file.newestVersionNumber } }) : null, file.newestVersionReason].filter(Boolean).join(' · ')}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}
      {activeEdit !== null ? (
        <FileTextEditor
          url={activeEdit.url}
          fileName={file.name}
          renderMarkdown={kind === 'markdown' ? renderMarkdown : undefined}
          isSaving={saving}
          onSave={text => void saveText(text)}
          onCancel={hasChanges => void cancelEdit(hasChanges)}
          onDirtyChange={noteDraft}
        />
      ) : (
        <FilePreview
          file={file}
          getDownload={actions.getDownload}
          versionId={showsOlderVersion ? shownVersion.id : undefined}
          loadPdfJs={loadPdfJs}
          loadCodeHighlighter={loadCodeHighlighter}
          renderMarkdown={renderMarkdown}
          layout="canvas"
        />
      )}
      <Dialog open={conflict !== null} onOpenChange={open => !open && !saving && setConflict(null)}>
        <DialogContent className="sm:max-w-lg" data-slot="file-text-conflict">
          <DialogHeader>
            <DialogTitle>{t('This file has a newer version')}</DialogTitle>
            <DialogDescription>
              {t('%name% was changed while you were editing. Your changes are not saved yet, and nothing was overwritten.', { replacements: { name: file.name } })}
              <span className="mt-2 block">{t('Save your changes as a copy beside the file, or load the newer version and discard yours.')}</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" disabled={saving} onClick={() => setConflict(null)}>
              {t('Keep editing')}
            </Button>
            <Button type="button" variant="outline" disabled={saving} onClick={loadNewerVersion}>
              {t('Load the newer version')}
            </Button>
            <Button type="button" disabled={saving} onClick={() => void saveAsCopy()}>
              {saving ? t('Saving…') : t('Save as a copy')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
