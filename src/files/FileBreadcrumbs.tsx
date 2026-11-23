'use client';

import { Fragment } from 'react';

import { useTranslate } from '../i18n/useTranslate.ts';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '../primitives/breadcrumb.tsx';
import { cn } from '../primitives/cn.ts';
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

/** Where the list stands inside the area (`Area › Folder › Subfolder`): every crumb but the last goes there and takes drops. */
export const FileBreadcrumbs = ({ rootLabel, path, inTrash = false, trailLabel, onNavigate, dropAreaKey }: FileBreadcrumbsProps) => {
  const { t } = useTranslate();
  const trail: { key: string; label: string; folderId: FileItemId | null }[] = [
    { key: 'root', label: rootLabel, folderId: null },
    ...(inTrash || trailLabel ? [] : path.map(folder => ({ key: `f${String(folder.id)}`, label: folder.name, folderId: folder.id }))),
  ];
  const last = inTrash ? t('Trash', { context: 'files-label' }) : (trailLabel ?? null);

  return (
    <Breadcrumb aria-label={t('Folder path')}>
      <BreadcrumbList className="gap-1 sm:gap-1.5">
        {trail.map((crumb, index) => {
          const isCurrent = last === null && index === trail.length - 1;
          return (
            <Fragment key={crumb.key}>
              {index > 0 && <BreadcrumbSeparator className="text-muted-foreground/60" />}
              <BreadcrumbItem>
                {isCurrent ? (
                  <BreadcrumbPage className={cn(CRUMB_CLASS, 'font-semibold')}>{crumb.label}</BreadcrumbPage>
                ) : (
                  <CrumbButton label={crumb.label} folderId={crumb.folderId} dropAreaKey={dropAreaKey} onNavigate={onNavigate} />
                )}
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
  );
};
