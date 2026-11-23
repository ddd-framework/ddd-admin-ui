'use client';

import { ChevronDown, Folder, TextCursorInput } from 'lucide-react';
import { Fragment } from 'react';

import { useTranslate } from '../i18n/useTranslate.ts';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '../primitives/breadcrumb.tsx';
import { Button } from '../primitives/button.tsx';
import { cn } from '../primitives/cn.ts';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '../primitives/dropdown-menu.tsx';
import { DROP_ACTIVE_CLASS, DROP_CANDIDATE_CLASS, useFileDropTarget } from './fileDragAndDrop.tsx';
import type { FileAreaKey, FileItemId, FolderView } from './fileView.ts';

export interface FileBreadcrumbsProps {
  /** The area (the root crumb). */
  rootLabel: string;
  /** Root → … → the open folder (`folderPath`); empty at the root. */
  path: readonly FolderView[];
  /** The trash is open: `Area › Trash`. */
  inTrash?: boolean;
  /** A search / filter spans every folder: `Area › Search results`. */
  trailLabel?: string;
  onNavigate: (folderId: FileItemId | null) => void;
  /** The open area: its crumbs (but the current one) take drops (inside the manager's `FileDndProvider`). */
  dropAreaKey?: FileAreaKey;
  /**
   * The folders of one parent (`null` = the area's root), alphabetical: each folder crumb gets a menu of the folders
   * beside it (`siblingFolders`). Absent = no menus.
   */
  siblingsOf?: (parentId: FileItemId | null) => readonly FolderView[];
  /** Turns the crumbs into the editable path bar (the last crumb and a button; Ctrl/Cmd+L in the manager). */
  onEditPath?: () => void;
}

const CRUMB_CLASS = 'max-w-64 truncate text-[13px]';

interface CrumbButtonProps {
  label: string;
  folderId: FileItemId | null;
  dropAreaKey?: FileAreaKey;
  onNavigate: (folderId: FileItemId | null) => void;
}

const CrumbButton = ({ label, folderId, dropAreaKey, onNavigate }: CrumbButtonProps) => {
  const drop = useFileDropTarget(dropAreaKey !== undefined ? { areaKey: dropAreaKey, folderId, label } : null);
  return (
    <BreadcrumbLink asChild className={cn(CRUMB_CLASS, '-mx-1 rounded px-1', drop.isCandidate && DROP_CANDIDATE_CLASS, drop.isOver && DROP_ACTIVE_CLASS)}>
      <button type="button" onClick={() => onNavigate(folderId)} {...drop.dropProps}>
        {label}
      </button>
    </BreadcrumbLink>
  );
};

/** The folders beside a crumb's folder: a chevron that opens them (the open one is marked). */
const SiblingMenu = ({
  folder,
  siblings,
  onNavigate,
}: {
  folder: FolderView;
  siblings: readonly FolderView[];
  onNavigate: (folderId: FileItemId | null) => void;
}) => {
  const { t } = useTranslate();
  if (siblings.length < 2) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="-ml-0.5 size-5 text-muted-foreground"
          aria-label={t('Folders beside %name%', { replacements: { name: folder.name } })}
        >
          <ChevronDown className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 w-56 overflow-y-auto">
        <DropdownMenuLabel className="text-xs text-muted-foreground">{t('Folders beside it')}</DropdownMenuLabel>
        {siblings.map(sibling => (
          <DropdownMenuItem
            key={String(sibling.id)}
            onSelect={() => onNavigate(sibling.id)}
            className={cn(String(sibling.id) === String(folder.id) && 'font-semibold')}
            aria-current={String(sibling.id) === String(folder.id) ? 'location' : undefined}
          >
            <Folder />
            <span className="truncate">{sibling.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/**
 * Where the list stands inside the area (`Area › Folder › Subfolder`): every crumb but the last goes there and takes
 * drops, a folder crumb opens the folders beside it, and the path can be edited (`onEditPath`).
 */
export const FileBreadcrumbs = ({ rootLabel, path, inTrash = false, trailLabel, onNavigate, dropAreaKey, siblingsOf, onEditPath }: FileBreadcrumbsProps) => {
  const { t } = useTranslate();
  const trail: { key: string; label: string; folderId: FileItemId | null; folder: FolderView | null }[] = [
    { key: 'root', label: rootLabel, folderId: null, folder: null },
    ...(inTrash || trailLabel ? [] : path.map(folder => ({ key: `f${String(folder.id)}`, label: folder.name, folderId: folder.id, folder }))),
  ];
  const last = inTrash ? t('Trash', { context: 'files-label' }) : (trailLabel ?? null);

  return (
    <div className="flex min-w-0 items-center gap-1">
      <Breadcrumb aria-label={t('Folder path')} className="min-w-0">
        <BreadcrumbList className="gap-1 sm:gap-1.5">
          {trail.map((crumb, index) => {
            const isCurrent = last === null && index === trail.length - 1;
            const siblings = crumb.folder && siblingsOf ? siblingsOf(crumb.folder.parentId) : [];
            return (
              <Fragment key={crumb.key}>
                {index > 0 && <BreadcrumbSeparator className="text-muted-foreground/60" />}
                <BreadcrumbItem className="gap-0.5">
                  {isCurrent ? (
                    onEditPath ? (
                      <button
                        type="button"
                        onClick={onEditPath}
                        title={t('Edit the path (Ctrl/Cmd+L)')}
                        className={cn(CRUMB_CLASS, '-mx-1 cursor-text rounded px-1 font-semibold text-foreground hover:bg-muted')}
                        aria-current="page"
                      >
                        {crumb.label}
                      </button>
                    ) : (
                      <BreadcrumbPage className={cn(CRUMB_CLASS, 'font-semibold')}>{crumb.label}</BreadcrumbPage>
                    )
                  ) : (
                    <CrumbButton label={crumb.label} folderId={crumb.folderId} dropAreaKey={dropAreaKey} onNavigate={onNavigate} />
                  )}
                  {crumb.folder && <SiblingMenu folder={crumb.folder} siblings={siblings} onNavigate={onNavigate} />}
                </BreadcrumbItem>
              </Fragment>
            );
          })}
          {last !== null && (
            <>
              <BreadcrumbSeparator className="text-muted-foreground/60" />
              <BreadcrumbItem>
                <BreadcrumbPage className={cn(CRUMB_CLASS, 'font-semibold')}>{last}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
      {onEditPath && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-6 shrink-0 text-muted-foreground"
          aria-label={t('Edit the path')}
          title={t('Edit the path (Ctrl/Cmd+L)')}
          onClick={onEditPath}
        >
          <TextCursorInput className="size-3.5" />
        </Button>
      )}
    </div>
  );
};
