'use client';

import { ChevronRight, Copy, Folder, FolderInput, FolderOpen, FolderPen, FolderPlus, HardDrive, Link, MoreHorizontal, Trash2 } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';

import { useTranslate } from '../i18n/useTranslate.ts';
import { Button } from '../primitives/button.tsx';
import { cn } from '../primitives/cn.ts';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../primitives/dropdown-menu.tsx';
import { Skeleton } from '../primitives/skeleton.tsx';
import { DROP_ACTIVE_CLASS, DROP_CANDIDATE_CLASS, type FileDropTarget, useFileDraggable, useFileDropTarget } from './fileDragAndDrop.tsx';
import { type FileAreaKey, type FileAreaRefView, type FileItemId, type FolderView, folderPath, MAX_FOLDER_DEPTH, sameFileId } from './fileView.ts';

/** Where the manager stands: a folder of the area (`null` = its root), or the area's trash. */
export type FileLocation = { kind: 'folder'; folderId: FileItemId | null } | { kind: 'trash' };

/** The folder writes the tree offers (absent = read-only tree). */
export interface FolderTreeActions {
  /** The writes; absent = not offered (a reader still gets the copy entries). */
  onCreate?: (parentId: FileItemId | null) => void;
  onRename?: (folder: FolderView) => void;
  onMove?: (folder: FolderView) => void;
  onDelete?: (folder: FolderView) => void;
  /** Copies the folder's path (`/a/b`). */
  onCopyPath?: (folder: FolderView) => void;
  /** Copies a link that opens the folder. */
  onCopyLink?: (folder: FolderView) => void;
}

export interface FolderTreeProps {
  /** The areas the manager shows; with more than one they are the tree's roots. */
  areas: readonly FileAreaRefView[];
  areaKey: FileAreaKey;
  /** The selected area's folders (flat). */
  folders: readonly FolderView[];
  isLoading?: boolean;
  location: FileLocation;
  onSelectArea: (areaKey: FileAreaKey) => void;
  onNavigate: (location: FileLocation) => void;
  actions?: FolderTreeActions;
  /** Folder writes are shown but disabled while writes are off. */
  writesAllowed: boolean;
  /** The Trash node at the bottom (capability `trash`). */
  showTrash?: boolean;
  /** Folders drag with their subtree; folders and area roots take drops (another area's root = a move between areas). */
  dragEnabled?: boolean;
  /** Drops onto other areas' roots (capability `moveAcrossAreas`). */
  crossAreaDrops?: boolean;
  maxFolderDepth?: number;
  className?: string;
}

const ROW_CLASS =
  'group/row flex h-8 w-full min-w-0 items-center gap-1.5 rounded-md pr-1 text-[13px] text-muted-foreground transition-colors duration-150 hover:bg-foreground/5 hover:text-foreground motion-reduce:transition-none';
const ROW_ACTIVE_CLASS = 'bg-accent font-semibold text-foreground hover:bg-accent';

export interface FolderActionsMenuProps {
  folder: FolderView;
  depth: number;
  actions: FolderTreeActions;
  writesAllowed: boolean;
  maxFolderDepth?: number;
  /** The trigger's look (tree row: appears on hover; card: always visible). */
  triggerClassName?: string;
}

/** The folder's actions (tree row, folder card and row): New subfolder, Rename, Move, Delete. */
export const FolderActionsMenu = ({ folder, depth, actions, writesAllowed, maxFolderDepth = MAX_FOLDER_DEPTH, triggerClassName }: FolderActionsMenuProps) => {
  const { t } = useTranslate();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          data-row-action-ignore
          aria-label={t('Actions for the folder %name%', { replacements: { name: folder.name } })}
          className={triggerClassName}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {actions.onCreate && (
          <DropdownMenuItem disabled={!writesAllowed || depth >= maxFolderDepth} onSelect={() => actions.onCreate?.(folder.id)}>
            <FolderPlus />
            {t('New subfolder')}
          </DropdownMenuItem>
        )}
        {actions.onRename && (
          <DropdownMenuItem disabled={!writesAllowed} onSelect={() => actions.onRename?.(folder)}>
            <FolderPen />
            {t('Rename', { context: 'folder-action' })}
          </DropdownMenuItem>
        )}
        {actions.onMove && (
          <DropdownMenuItem disabled={!writesAllowed} onSelect={() => actions.onMove?.(folder)}>
            <FolderInput />
            {t('Move', { context: 'folder-action' })}
          </DropdownMenuItem>
        )}
        {(actions.onCopyPath || actions.onCopyLink) && (actions.onCreate || actions.onRename || actions.onMove) && <DropdownMenuSeparator />}
        {actions.onCopyPath && (
          <DropdownMenuItem onSelect={() => actions.onCopyPath?.(folder)}>
            <Copy />
            {t('Copy path')}
          </DropdownMenuItem>
        )}
        {actions.onCopyLink && (
          <DropdownMenuItem onSelect={() => actions.onCopyLink?.(folder)}>
            <Link />
            {t('Copy link')}
          </DropdownMenuItem>
        )}
        {actions.onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" disabled={!writesAllowed} onSelect={() => actions.onDelete?.(folder)}>
              <Trash2 />
              {t('Delete folder')}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

interface TreeNodeProps {
  folder: FolderView;
  areaKey: FileAreaKey;
  depth: number;
  childrenOf: ReadonlyMap<string | null, FolderView[]>;
  expanded: ReadonlySet<string>;
  onToggle: (folderId: string) => void;
  location: FileLocation;
  onNavigate: (location: FileLocation) => void;
  actions?: FolderTreeActions;
  writesAllowed: boolean;
  dragEnabled: boolean;
  maxFolderDepth: number;
}

const TreeNode = ({
  folder,
  areaKey,
  depth,
  childrenOf,
  expanded,
  onToggle,
  location,
  onNavigate,
  actions,
  writesAllowed,
  dragEnabled,
  maxFolderDepth,
}: TreeNodeProps) => {
  const { t } = useTranslate();
  const key = String(folder.id);
  const children = childrenOf.get(key) ?? [];
  const isOpen = expanded.has(key);
  const isActive = location.kind === 'folder' && sameFileId(location.folderId, folder.id);
  const FolderIcon = isActive || isOpen ? FolderOpen : Folder;
  const drag = useFileDraggable(dragEnabled ? { kind: 'folder', folder } : null);
  const drop = useFileDropTarget(dragEnabled ? { areaKey, folderId: folder.id, label: folder.name } : null);

  return (
    <li>
      <div
        className={cn(
          ROW_CLASS,
          isActive && ROW_ACTIVE_CLASS,
          drop.isCandidate && DROP_CANDIDATE_CLASS,
          drop.isOver && DROP_ACTIVE_CLASS,
          drag.isDragging && 'opacity-50'
        )}
        style={{ paddingLeft: `${depth * 14}px` }}
        {...drag.dragProps}
        {...drop.dropProps}
      >
        {children.length > 0 ? (
          <button
            type="button"
            onClick={() => onToggle(key)}
            aria-label={isOpen ? t('Collapse %name%', { replacements: { name: folder.name } }) : t('Expand %name%', { replacements: { name: folder.name } })}
            aria-expanded={isOpen}
            className="inline-flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <ChevronRight aria-hidden className={cn('size-3.5 transition-transform duration-200 motion-reduce:transition-none', isOpen && 'rotate-90')} />
          </button>
        ) : (
          <span className="size-5 shrink-0" aria-hidden />
        )}
        <button
          type="button"
          onClick={() => onNavigate({ kind: 'folder', folderId: folder.id })}
          aria-current={isActive ? 'page' : undefined}
          className="flex h-full min-w-0 flex-1 items-center gap-2 rounded text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <FolderIcon aria-hidden className={cn('size-4 shrink-0', isActive ? 'text-primary-emphasis' : 'text-muted-foreground')} />
          <span className="min-w-0 flex-1 truncate">{folder.name}</span>
          {typeof folder.fileCount === 'number' && folder.fileCount > 0 && (
            <span className="shrink-0 text-[11px] font-semibold text-muted-foreground tabular-nums group-hover/row:hidden">{folder.fileCount}</span>
          )}
        </button>
        {actions && (
          <FolderActionsMenu
            folder={folder}
            depth={depth}
            actions={actions}
            writesAllowed={writesAllowed}
            maxFolderDepth={maxFolderDepth}
            triggerClassName="size-6 shrink-0 opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 max-md:opacity-100 data-[state=open]:opacity-100"
          />
        )}
      </div>
      {isOpen && children.length > 0 && (
        <ul>
          {children.map(child => (
            <TreeNode
              key={String(child.id)}
              folder={child}
              areaKey={areaKey}
              depth={depth + 1}
              childrenOf={childrenOf}
              expanded={expanded}
              onToggle={onToggle}
              location={location}
              onNavigate={onNavigate}
              actions={actions}
              writesAllowed={writesAllowed}
              dragEnabled={dragEnabled}
              maxFolderDepth={maxFolderDepth}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

interface RootRowProps {
  icon: ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  trailing?: ReactNode;
  dropTarget?: FileDropTarget | null;
}

const RootRow = ({ icon, label, active, onClick, trailing, dropTarget = null }: RootRowProps) => {
  const drop = useFileDropTarget(dropTarget);
  return (
    <div
      className={cn(ROW_CLASS, 'pl-1', active && ROW_ACTIVE_CLASS, drop.isCandidate && DROP_CANDIDATE_CLASS, drop.isOver && DROP_ACTIVE_CLASS)}
      {...drop.dropProps}
    >
      <button
        type="button"
        onClick={onClick}
        aria-current={active ? 'page' : undefined}
        className="flex h-full min-w-0 flex-1 items-center gap-2 rounded text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {icon}
        <span className="min-w-0 flex-1 truncate">{label}</span>
      </button>
      {trailing}
    </div>
  );
};

/**
 * The folder tree of an area: the area as the root (several areas as roots, the selected one open), folders nested and
 * collapsible (the open folder's ancestors are always open), the Trash node at the bottom. Folder writes sit in a row
 * menu; with `dragEnabled` folders drag (with their subtree) and folders and area roots take drops.
 */
export const FolderTree = ({
  areas,
  areaKey,
  folders,
  isLoading = false,
  location,
  onSelectArea,
  onNavigate,
  actions,
  writesAllowed,
  showTrash = true,
  dragEnabled = false,
  crossAreaDrops = false,
  maxFolderDepth = MAX_FOLDER_DEPTH,
  className,
}: FolderTreeProps) => {
  const { t } = useTranslate();
  const [expandedState, setExpandedState] = useState<ReadonlySet<string>>(new Set());

  const childrenOf = useMemo(() => {
    const map = new Map<string | null, FolderView[]>();
    for (const folder of folders) {
      const parent = folder.parentId === null ? null : String(folder.parentId);
      const siblings = map.get(parent) ?? [];
      siblings.push(folder);
      map.set(parent, siblings);
    }
    for (const siblings of map.values()) siblings.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    return map;
  }, [folders]);

  // The open folder's ancestors are always expanded (a deep link shows where it is).
  const expanded = useMemo(() => {
    const next = new Set(expandedState);
    if (location.kind === 'folder') {
      for (const ancestor of folderPath(folders, location.folderId).slice(0, -1)) next.add(String(ancestor.id));
    }
    return next;
  }, [expandedState, folders, location]);

  const toggle = (folderId: string) =>
    setExpandedState(previous => {
      const next = new Set(previous);
      if (expanded.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });

  const topLevel = childrenOf.get(null) ?? [];
  const multiArea = areas.length > 1;
  const atRoot = location.kind === 'folder' && location.folderId === null;

  const folderList = isLoading ? (
    <div className="space-y-1.5 py-1 pl-6" aria-hidden>
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="h-5 w-2/3" />
    </div>
  ) : topLevel.length > 0 ? (
    <ul className={cn(multiArea && 'pl-3')}>
      {topLevel.map(folder => (
        <TreeNode
          key={String(folder.id)}
          folder={folder}
          areaKey={areaKey}
          depth={1}
          childrenOf={childrenOf}
          expanded={expanded}
          onToggle={toggle}
          location={location}
          onNavigate={onNavigate}
          actions={actions}
          writesAllowed={writesAllowed}
          dragEnabled={dragEnabled}
          maxFolderDepth={maxFolderDepth}
        />
      ))}
    </ul>
  ) : null;

  const rootTrailing = actions?.onCreate ? (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={t('New folder')}
      title={t('New folder')}
      disabled={!writesAllowed}
      onClick={() => actions.onCreate?.(null)}
      className="size-6 shrink-0 opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 max-md:opacity-100"
    >
      <FolderPlus />
    </Button>
  ) : undefined;

  const rootIcon = (active: boolean) => (
    <HardDrive aria-hidden className={cn('size-4 shrink-0', active ? 'text-primary-emphasis' : 'text-muted-foreground')} />
  );

  return (
    <nav aria-label={t('Folders')} className={cn('flex min-h-0 flex-col', className)}>
      <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2">
        {multiArea ? (
          <ul className="space-y-0.5">
            {areas.map(area => {
              const selected = String(area.key) === String(areaKey);
              const acceptsDrop = dragEnabled && (selected || crossAreaDrops);
              return (
                <li key={String(area.key)}>
                  <RootRow
                    icon={rootIcon(selected && atRoot)}
                    label={area.name}
                    active={selected && atRoot}
                    onClick={() => (selected ? onNavigate({ kind: 'folder', folderId: null }) : onSelectArea(area.key))}
                    trailing={selected ? rootTrailing : undefined}
                    dropTarget={acceptsDrop ? { areaKey: area.key, folderId: null, label: area.name } : null}
                  />
                  {selected && folderList}
                </li>
              );
            })}
          </ul>
        ) : (
          <>
            <RootRow
              icon={rootIcon(atRoot)}
              label={areas[0]?.name ?? t('All files')}
              active={atRoot}
              onClick={() => onNavigate({ kind: 'folder', folderId: null })}
              trailing={rootTrailing}
              dropTarget={dragEnabled ? { areaKey, folderId: null, label: areas[0]?.name ?? t('All files') } : null}
            />
            {folderList}
          </>
        )}
      </div>
      {showTrash && (
        <div className="shrink-0 border-t p-2">
          <RootRow
            icon={<Trash2 aria-hidden className="size-4 shrink-0 text-muted-foreground" />}
            label={t('Trash', { context: 'files-label' })}
            active={location.kind === 'trash'}
            onClick={() => onNavigate({ kind: 'trash' })}
          />
        </div>
      )}
    </nav>
  );
};
