'use client';

import { FilePen } from 'lucide-react';
import { useState } from 'react';

import { useTranslate } from '../i18n/useTranslate.ts';
import { StatusBadge } from '../list/StatusBadge.tsx';
import { formatDate } from '../logic/pure/format.ts';
import { useRowActivation } from '../logic/react/useRowActivation.ts';
import { Card, CardContent, CardFooter } from '../primitives/card.tsx';
import { Checkbox } from '../primitives/checkbox.tsx';
import { cn } from '../primitives/cn.ts';
import { type FileDragItem, useFileDraggable } from './fileDragAndDrop.tsx';
import { FileFamilyIcon } from './FileFamilyIcon.tsx';
import { type FileItemHandlers, FileItemActions } from './FileItemActions.tsx';
import { FileLinkChips } from './FileLinkChips.tsx';
import type { FileLinkKind } from './fileManagerAdapter.ts';
import { FILE_NEWEST_VERSION_STATE, FILE_SCAN_STATUS } from './fileStatus.ts';
import { FILE_FAMILY_LABELS, type FileView, formatBytes, isPageThumbnail, newestVersionStateOf, personWithOnBehalfOf } from './fileView.ts';

export interface FileCardSelection {
  selected: boolean;
  onSelectedChange: (selected: boolean) => void;
  /** Any card is selected: every checkbox stays visible (otherwise they appear on hover / focus). */
  anySelected: boolean;
  disabled?: boolean;
}

export interface FileCardProps {
  file: FileView;
  /** Opens the drawer; the grid passes it from the list's `rowAction`. */
  onActivate?: (() => void) | null;
  handlers: FileItemHandlers;
  inTrash: boolean;
  canWrite: boolean;
  writesAllowed: boolean;
  /** Bulk selection (absent = no checkbox, e.g. read-only). */
  selection?: FileCardSelection;
  /** What a drag of the card moves (the file, or the selection it belongs to); absent = not draggable. */
  dragItem?: FileDragItem | null;
  /** The adapter's link kinds (capability `links`); absent = no link chips. */
  linkKinds?: readonly FileLinkKind[];
  /** Without a trash Delete removes the file. */
  hasTrash?: boolean;
  /** The badge of uncommitted working-copy changes (capability `workingCopy`); absent = no badge. */
  workingCopyLabel?: string;
  /** The grid's row key (set by `EntityListGrid`): lands on the card's root, so tests and agents find the card. */
  'data-row-key'?: string;
}

/** The thumbnail or the family icon; a failed thumbnail falls back to the icon. */
const FilePreviewTile = ({ file }: { file: FileView }) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (file.isFolder) return <FileFamilyIcon family="FOLDER" size="lg" />;
  const src = file.thumbnailUrl && failedSrc !== file.thumbnailUrl ? file.thumbnailUrl : null;
  if (src) {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        draggable={false}
        className={cn('size-full object-cover', isPageThumbnail(file) && 'object-top')}
        onError={() => setFailedSrc(src)}
      />
    );
  }
  return <FileFamilyIcon family={file.family} size="lg" />;
};

/**
 * The grid card of a file: preview tile (thumbnail or family icon), name, size · date, link chips, the scan badge
 * whenever the file is not released, the actions in the footer. A click opens the drawer; the checkbox selects it.
 */
export const FileCard = ({
  file,
  onActivate,
  handlers,
  inTrash,
  canWrite,
  writesAllowed,
  selection,
  dragItem,
  linkKinds,
  hasTrash = true,
  workingCopyLabel,
  'data-row-key': rowKey,
}: FileCardProps) => {
  const { t } = useTranslate();
  const activation = useRowActivation(onActivate);
  const drag = useFileDraggable(dragItem ?? null);
  const showStatus = !file.isFolder && file.scanStatus !== 'CLEAN' && file.scanStatus !== 'SKIPPED';
  const newestVersionState = showStatus ? null : newestVersionStateOf(file);
  const dateLine = inTrash
    ? file.deletedBy
      ? t('Deleted %date% by %user%', { replacements: { date: formatDate(file.deletedAt), user: file.deletedBy } })
      : t('Deleted %date%', { replacements: { date: formatDate(file.deletedAt) } })
    : [formatDate(file.createdAt), personWithOnBehalfOf(file.uploadedBy, file.uploadedOnBehalfOf, t)].filter(Boolean).join(' · ');

  return (
    <Card
      data-row-key={rowKey}
      className={cn(
        'group/card gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md motion-reduce:transition-none',
        onActivate && 'cursor-pointer',
        selection?.selected && 'ring-2 ring-primary',
        drag.isDragging && 'opacity-50'
      )}
      {...activation}
      {...drag.dragProps}
    >
      <div className="relative flex h-36 items-center justify-center overflow-hidden bg-tint">
        <FilePreviewTile file={file} />
        {selection && (
          <div
            data-row-action-ignore
            className={cn(
              'absolute top-2.5 left-2.5 flex rounded-md bg-card/90 p-1 shadow-sm transition-opacity duration-150 motion-reduce:transition-none',
              selection.selected || selection.anySelected ? 'opacity-100' : 'opacity-0 group-hover/card:opacity-100 focus-within:opacity-100'
            )}
          >
            <Checkbox
              checked={selection.selected}
              onCheckedChange={checked => selection.onSelectedChange(checked === true)}
              disabled={selection.disabled}
              aria-label={t('Select %name%', { replacements: { name: file.name } })}
            />
          </div>
        )}
        {(showStatus || newestVersionState !== null || (workingCopyLabel && file.hasWorkingCopyChanges)) && (
          <div className="absolute top-2.5 right-2.5 flex flex-col items-end gap-1">
            {showStatus && <StatusBadge value={file.scanStatus} map={FILE_SCAN_STATUS} className="shadow-sm" />}
            {!showStatus && newestVersionState !== null && (
              <StatusBadge value={newestVersionState} map={FILE_NEWEST_VERSION_STATE} className="shadow-sm" />
            )}
            {workingCopyLabel && file.hasWorkingCopyChanges && <StatusBadge tone="info" label={workingCopyLabel} icon={FilePen} className="shadow-sm" />}
          </div>
        )}
        <span className="absolute bottom-2.5 left-2.5 rounded-md bg-card/90 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-muted-foreground uppercase shadow-sm">
          {file.isFolder ? t('Folder', { context: 'file-type' }) : file.extension || t(FILE_FAMILY_LABELS[file.family])}
        </span>
      </div>
      <CardContent className="flex-1 space-y-1.5 p-4">
        <h3 className="truncate font-semibold" title={file.name}>
          {file.name}
        </h3>
        <p className="truncate text-sm text-muted-foreground">
          {file.isFolder ? dateLine : `${formatBytes(file.sizeBytes)} · ${dateLine}`}
        </p>
        {linkKinds && <FileLinkChips links={file.links} kinds={linkKinds} showEmpty={false} />}
      </CardContent>
      <CardFooter className="justify-end gap-2 border-t px-4 pt-3 pb-4">
        <FileItemActions file={file} handlers={handlers} inTrash={inTrash} canWrite={canWrite} writesAllowed={writesAllowed} hasTrash={hasTrash} />
      </CardFooter>
    </Card>
  );
};
