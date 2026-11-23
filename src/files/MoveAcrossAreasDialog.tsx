'use client';

import { normalizeDddError } from '@mgamadeus/ddd-web/contract';
import { ArrowRight, Link2Off, TriangleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useTranslate } from '../i18n/useTranslate.ts';
import { Alert, AlertDescription, AlertTitle } from '../primitives/alert.tsx';
import { Button } from '../primitives/button.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../primitives/dialog.tsx';
import { Skeleton } from '../primitives/skeleton.tsx';
import type { FileLinkKind, FileMoveInput, FileMoveResult } from './fileManagerAdapter.ts';
import { type FileMovePreviewView, formatBytes } from './fileView.ts';
import { QuotaPill } from './QuotaPill.tsx';

/** A move into another area waiting for its confirmation (a drop onto another area, or the move dialog's area picker). */
export interface MoveAcrossAreasRequest {
  input: FileMoveInput;
  /** `“Report.pdf”`, `3 files`, `the folder “Reports”`. */
  itemLabel: string;
}

export interface MoveAcrossAreasDialogProps {
  request: MoveAcrossAreasRequest | null;
  onClose: () => void;
  previewMove: (input: FileMoveInput) => Promise<FileMovePreviewView>;
  moveItems: (input: FileMoveInput) => Promise<FileMoveResult>;
  writesAllowed: boolean;
  /** The adapter's link kinds (names the kind of a removed link). */
  linkKinds?: readonly FileLinkKind[];
  onMoved: (result: FileMoveResult, preview: FileMovePreviewView) => void;
}

const PreviewBody = ({ preview, linkKinds }: { preview: FileMovePreviewView; linkKinds: readonly FileLinkKind[] }) => {
  const { t } = useTranslate();
  const targetArea = preview.targetAreaName ?? t('the target area');
  const target = `${targetArea}${preview.targetFolderPath ? ` / ${preview.targetFolderPath}` : ''}`;
  const fileCount = t('{count, plural, one {# file} other {# files}}', { count: preview.fileCount });
  const folderCount = t('{count, plural, one {# folder} other {# folders}}', { count: preview.folderCount });
  const summary = preview.folderCount > 0 ? t('%files% and %folders%', { replacements: { files: fileCount, folders: folderCount } }) : fileCount;
  const kindLabel = (kind: string) => {
    const label = linkKinds.find(candidate => candidate.kind === kind)?.label;
    return label ? t(label) : kind;
  };
  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
        <span className="font-semibold">{preview.sourceAreaName ?? t('This area')}</span>
        <ArrowRight aria-hidden className="size-4 text-muted-foreground" />
        <span className="font-semibold">{target}</span>
        <span className="basis-full text-muted-foreground">
          {t('%summary% · %size% including older versions', { replacements: { summary, size: formatBytes(preview.movedBytes) } })}
        </span>
      </div>
      {typeof preview.targetQuotaBytes === 'number' && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-muted-foreground">{t('Storage in %area% after the move', { replacements: { area: targetArea } })}</span>
          <QuotaPill usedBytes={preview.targetUsedBytes + preview.movedBytes} quotaBytes={preview.targetQuotaBytes} />
        </div>
      )}
      {preview.unlinks.length > 0 && (
        <Alert>
          <Link2Off aria-hidden />
          <AlertTitle>{t('{count, plural, one {# link will be removed} other {# links will be removed}}', { count: preview.unlinks.length })}</AlertTitle>
          <AlertDescription>
            <p>{t('These links point to targets outside %area%:', { replacements: { area: targetArea } })}</p>
            <ul className="mt-1.5 max-h-36 list-disc space-y-0.5 overflow-y-auto pl-4">
              {preview.unlinks.map(unlink => (
                <li key={`${String(unlink.fileId)}-${unlink.kind}-${unlink.targetName ?? ''}`}>
                  <span className="font-medium">{unlink.fileName}</span> — {kindLabel(unlink.kind)} {unlink.targetName ?? t('(not visible to you)')}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      {(preview.nameConflicts.length > 0 || preview.blockingReasons.length > 0) && (
        <Alert variant="destructive">
          <TriangleAlert aria-hidden />
          <AlertTitle>{t('This move is not possible')}</AlertTitle>
          <AlertDescription>
            {preview.nameConflicts.length > 0 && (
              <p>{t('Already in the target folder: %names%. Rename or move them first.', { replacements: { names: preview.nameConflicts.join(', ') } })}</p>
            )}
            {preview.blockingReasons.map(reason => (
              <p key={reason}>{reason}</p>
            ))}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

/**
 * The confirmation of a move into another area: what moves, the storage it takes in the target area, the links it
 * removes and why it is refused — all from the adapter's `previewMove`; nothing is written before "Move".
 */
export const MoveAcrossAreasDialog = ({ request, onClose, previewMove, moveItems, writesAllowed, linkKinds = [], onMoved }: MoveAcrossAreasDialogProps) => {
  const { t } = useTranslate();
  const [preview, setPreview] = useState<FileMovePreviewView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: a language change must not reload the preview
  useEffect(() => {
    setPreview(null);
    setError(null);
    if (!request) return;
    let current = true;
    previewMove(request.input).then(
      result => current && setPreview(result),
      previewError => current && setError(normalizeDddError(previewError, t('The move could not be checked')).message)
    );
    return () => {
      current = false;
    };
  }, [request, previewMove]);

  const move = async () => {
    if (!request || !preview?.canMove || !writesAllowed) return;
    setMoving(true);
    setError(null);
    try {
      const result = await moveItems(request.input);
      onMoved(result, preview);
      onClose();
    } catch (moveError) {
      setError(normalizeDddError(moveError, t('The move failed')).message);
    } finally {
      setMoving(false);
    }
  };

  return (
    <Dialog open={request !== null} onOpenChange={open => !open && !moving && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('Move %item% to another area?', { replacements: { item: request?.itemLabel ?? '' } })}</DialogTitle>
          <DialogDescription>
            {t('The files leave this area; whoever can only see this area loses access. Folders move with everything in them.')}
          </DialogDescription>
        </DialogHeader>
        {preview ? (
          <PreviewBody preview={preview} linkKinds={linkKinds} />
        ) : error ? null : (
          <div className="space-y-3" aria-busy>
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-8 w-2/3 rounded-full" />
          </div>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={moving}>
            {t('Cancel')}
          </Button>
          <Button type="button" onClick={() => void move()} disabled={!writesAllowed || moving || !preview?.canMove}>
            {moving ? t('Moving…') : t('Move', { context: 'confirm-move-button' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
