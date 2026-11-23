'use client';

import { type TranslateFn, useTranslate } from '../i18n/useTranslate.ts';
import { useRowActivation } from '../logic/react/useRowActivation.ts';
import { Card, CardContent } from '../primitives/card.tsx';
import { cn } from '../primitives/cn.ts';
import { DROP_ACTIVE_CLASS, DROP_CANDIDATE_CLASS, type FileDropTarget, useFileDraggable, useFileDropTarget } from './fileDragAndDrop.tsx';
import { FileFamilyIcon } from './FileFamilyIcon.tsx';
import type { FolderView } from './fileView.ts';
import { FolderActionsMenu, type FolderTreeActions } from './FolderTree.tsx';

export interface FolderCardProps {
  folder: FolderView;
  /** Depth of the folder (top level = 1), for the "New subfolder" limit. */
  depth: number;
  onOpen: () => void;
  actions?: FolderTreeActions;
  writesAllowed: boolean;
  maxFolderDepth?: number;
  /** A mouse drag moves the folder with its subtree (inside a `FileDndProvider` that allows it). */
  draggable?: boolean;
  /** Files and folders dropped onto the card move into this folder; absent = no drop target. */
  dropTarget?: FileDropTarget | null;
}

/** `3 files`, or "Folder" when the backend sends no count. */
export const fileCountLabel = (count: number | null | undefined, t: TranslateFn): string =>
  typeof count === 'number' ? t('{count, plural, one {# file} other {# files}}', { count }) : t('Folder', { context: 'file-type' });

/** What a folder holds: `3 files`, else `1 entry` / `5 entries` (files and folders), else "Folder". */
export const folderContentLabel = (folder: Pick<FolderView, 'fileCount' | 'entryCount'>, t: TranslateFn): string =>
  typeof folder.fileCount !== 'number' && typeof folder.entryCount === 'number'
    ? t('{count, plural, one {# entry} other {# entries}}', { count: folder.entryCount })
    : fileCountLabel(folder.fileCount, t);

/** A folder in the grid (folders come first): a click opens it, its menu holds the folder writes; drag source and drop target. */
export const FolderCard = ({ folder, depth, onOpen, actions, writesAllowed, maxFolderDepth, draggable = false, dropTarget = null }: FolderCardProps) => {
  const { t } = useTranslate();
  const activation = useRowActivation(onOpen);
  const drag = useFileDraggable(draggable ? { kind: 'folder', folder } : null);
  const drop = useFileDropTarget(dropTarget);
  return (
    <Card
      className={cn(
        'cursor-pointer gap-0 self-start py-0 transition-shadow hover:shadow-md motion-reduce:transition-none',
        drop.isCandidate && DROP_CANDIDATE_CLASS,
        drop.isOver && DROP_ACTIVE_CLASS,
        drag.isDragging && 'opacity-50'
      )}
      {...activation}
      {...drag.dragProps}
      {...drop.dropProps}
    >
      <CardContent className="flex items-center gap-3 p-4">
        <FileFamilyIcon family="FOLDER" size="md" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold" title={folder.name}>
            {folder.name}
          </h3>
          <p className="text-sm text-muted-foreground">{drop.isOver ? t('Drop to move here') : folderContentLabel(folder, t)}</p>
        </div>
        {actions && <FolderActionsMenu folder={folder} depth={depth} actions={actions} writesAllowed={writesAllowed} maxFolderDepth={maxFolderDepth} />}
      </CardContent>
    </Card>
  );
};
