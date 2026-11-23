'use client';

import { ArchiveRestore, Copy, Download, FolderInput, Link, Link2, Trash2 } from 'lucide-react';

import { useTranslate } from '../i18n/useTranslate.ts';
import { Button } from '../primitives/button.tsx';
import { cn } from '../primitives/cn.ts';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../primitives/dropdown-menu.tsx';
import { type FileView, isFileReleased } from './fileView.ts';

/** What a file row / card can trigger; the manager binds them to its dialogs and the adapter. Absent = not offered. */
export interface FileItemHandlers {
  onDownload: (file: FileView) => void;
  onMove: (file: FileView) => void;
  onTrash: (file: FileView) => void;
  onLink?: (file: FileView) => void;
  onRestore?: (file: FileView) => void;
  onPurge?: (file: FileView) => void;
  /** Copies the file's path (`/a/b/file.pdf`). */
  onCopyPath?: (file: FileView) => void;
  /** Copies a link that opens the file's details. */
  onCopyLink?: (file: FileView) => void;
}

/** "Copy path" / "Copy link" of one item as a small menu (nothing when neither handler is there). */
export const FileCopyMenu = ({ name, onCopyPath, onCopyLink }: { name: string; onCopyPath?: () => void; onCopyLink?: () => void }) => {
  const { t } = useTranslate();
  if (!onCopyPath && !onCopyLink) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          data-row-action-ignore
          aria-label={t('Copy the path or a link of %name%', { replacements: { name } })}
          title={t('Copy path or link')}
        >
          <Copy />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {onCopyPath && (
          <DropdownMenuItem onSelect={onCopyPath}>
            <Copy />
            {t('Copy path')}
          </DropdownMenuItem>
        )}
        {onCopyLink && (
          <DropdownMenuItem onSelect={onCopyLink}>
            <Link />
            {t('Copy link')}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export interface FileItemActionsProps {
  file: FileView;
  handlers: FileItemHandlers;
  /** The trash: Restore + Delete permanently instead of Download / Move / Link / Delete. */
  inTrash: boolean;
  canWrite: boolean;
  writesAllowed: boolean;
  /** Without a trash Delete removes the file (the tooltip says so). */
  hasTrash?: boolean;
  className?: string;
}

/**
 * The per-file actions (ghost icon buttons, each with a label, Delete last): Download, Move, Link (capability `links`),
 * Delete; in the trash Restore and Delete permanently. Download is off until the file is released.
 */
export const FileItemActions = ({ file, handlers, inTrash, canWrite, writesAllowed, hasTrash = true, className }: FileItemActionsProps) => {
  const { t } = useTranslate();
  const writeDisabled = !canWrite || !writesAllowed;
  if (inTrash) {
    return (
      <div className={cn('flex items-center justify-end gap-1', className)} data-row-action-ignore>
        {handlers.onRestore && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t('Restore %name%', { replacements: { name: file.name } })}
            title={t('Restore', { context: 'action' })}
            disabled={writeDisabled}
            onClick={() => handlers.onRestore?.(file)}
          >
            <ArchiveRestore />
          </Button>
        )}
        {handlers.onPurge && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t('Delete %name% permanently', { replacements: { name: file.name } })}
            title={t('Delete permanently')}
            className="text-destructive hover:text-destructive"
            disabled={writeDisabled}
            onClick={() => handlers.onPurge?.(file)}
          >
            <Trash2 />
          </Button>
        )}
      </div>
    );
  }
  const released = isFileReleased(file.scanStatus);
  return (
    <div className={cn('flex items-center justify-end gap-1', className)} data-row-action-ignore>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={t('Download %name%', { replacements: { name: file.name } })}
        title={released ? t('Download', { context: 'action' }) : t('The download unlocks after the malware check')}
        disabled={!released}
        onClick={() => handlers.onDownload(file)}
      >
        <Download />
      </Button>
      <FileCopyMenu
        name={file.name}
        onCopyPath={handlers.onCopyPath ? () => handlers.onCopyPath?.(file) : undefined}
        onCopyLink={handlers.onCopyLink ? () => handlers.onCopyLink?.(file) : undefined}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={t('Move %name%', { replacements: { name: file.name } })}
        title={t('Move', { context: 'action' })}
        disabled={writeDisabled}
        onClick={() => handlers.onMove(file)}
      >
        <FolderInput />
      </Button>
      {handlers.onLink && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t('Edit the links of %name%', { replacements: { name: file.name } })}
          title={t('Edit links')}
          disabled={writeDisabled}
          onClick={() => handlers.onLink?.(file)}
        >
          <Link2 />
        </Button>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={t('Delete %name%', { replacements: { name: file.name } })}
        title={hasTrash ? t('Move to the trash') : t('Delete', { context: 'action' })}
        className="text-destructive hover:text-destructive"
        disabled={writeDisabled}
        onClick={() => handlers.onTrash(file)}
      >
        <Trash2 />
      </Button>
    </div>
  );
};
