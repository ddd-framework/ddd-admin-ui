'use client';

import { createContext, type DragEvent, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { FileAreaKey, FileItemId, FileView, FolderView } from './fileView.ts';

/**
 * Drag and drop moves of the file manager on the browser's own drag and drop (no library):
 * - sources: file cards / rows (a selected file carries the whole selection), folder cards / rows and tree folders;
 * - targets: tree folders and area roots (another area = a move between areas), folder cards / rows, breadcrumbs;
 * - the rules (`canDrop`) and the move (`onDrop`) come from the manager; a target the dragged item cannot go to takes
 *   no part (no highlight, no drop): itself, its own subtree, its current folder, too deep, an area without moves.
 * Keyboard and touch use the Move dialog. Files dragged in from the desktop are uploads, never moves (the manager tells
 * them apart by `dataTransfer.types`).
 */

/** What is dragged: files (one, or the selection it belongs to) or one folder with its subtree. */
export type FileDragItem = { kind: 'files'; files: readonly FileView[] } | { kind: 'folder'; folder: FolderView };

/** Where it may land: a folder of an area (`null` = the area's root). */
export interface FileDropTarget {
  areaKey: FileAreaKey;
  folderId: FileItemId | null;
  /** The folder's or the area's name (the toast after the move). */
  label: string;
}

/** The data type marking a drag of the manager (desktop files carry `Files`). */
export const FILE_MANAGER_DRAG_TYPE = 'application/x-ddd-file-manager';

interface FileDndState {
  enabled: boolean;
  canDrop: (item: FileDragItem, target: FileDropTarget) => boolean;
  onDrop: (item: FileDragItem, target: FileDropTarget) => void;
  active: FileDragItem | null;
  setActive: (item: FileDragItem | null) => void;
}

const FileDndContext = createContext<FileDndState>({
  enabled: false,
  canDrop: () => false,
  onDrop: () => undefined,
  active: null,
  setActive: () => undefined,
});

/** Drop target classes: every possible target while a drag runs, and the one under the pointer. */
export const DROP_CANDIDATE_CLASS = 'ring-1 ring-primary/40';
export const DROP_ACTIVE_CLASS = 'bg-accent ring-2 ring-primary';

export interface FileDndProviderProps {
  /** Writes allowed in the open area (and not in the trash / a link tab): otherwise nothing is draggable. */
  enabled: boolean;
  canDrop: (item: FileDragItem, target: FileDropTarget) => boolean;
  onDrop: (item: FileDragItem, target: FileDropTarget) => void;
  children: ReactNode;
}

/** The drag and drop context of one file manager. */
export const FileDndProvider = ({ enabled, canDrop, onDrop, children }: FileDndProviderProps) => {
  const [active, setActive] = useState<FileDragItem | null>(null);
  const value = useMemo<FileDndState>(() => ({ enabled, canDrop, onDrop, active, setActive }), [enabled, canDrop, onDrop, active]);
  return <FileDndContext.Provider value={value}>{children}</FileDndContext.Provider>;
};

const isManagerDrag = (event: DragEvent) => Array.from(event.dataTransfer.types).includes(FILE_MANAGER_DRAG_TYPE);

export interface FileDraggableProps {
  draggable?: boolean;
  onDragStart?: (event: DragEvent<HTMLElement>) => void;
  onDragEnd?: (event: DragEvent<HTMLElement>) => void;
}

/** Makes an element draggable; `item` `null` = not draggable. Outside a `FileDndProvider` nothing is draggable. */
export const useFileDraggable = (item: FileDragItem | null): { dragProps: FileDraggableProps; isDragging: boolean } => {
  const { enabled, active, setActive } = useContext(FileDndContext);
  const isDragging = item !== null && active !== null && dragKey(active) === dragKey(item);
  if (!enabled || item === null) return { dragProps: {}, isDragging: false };
  return {
    isDragging,
    dragProps: {
      draggable: true,
      onDragStart: event => {
        event.stopPropagation();
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData(FILE_MANAGER_DRAG_TYPE, dragKey(item));
        setActive(item);
      },
      onDragEnd: () => setActive(null),
    },
  };
};

const dragKey = (item: FileDragItem): string =>
  item.kind === 'folder' ? `folder:${String(item.folder.id)}` : `files:${item.files.map(file => String(file.id)).join(',')}`;

export interface FileDropProps {
  onDragOver?: (event: DragEvent<HTMLElement>) => void;
  onDragEnter?: (event: DragEvent<HTMLElement>) => void;
  onDragLeave?: (event: DragEvent<HTMLElement>) => void;
  onDrop?: (event: DragEvent<HTMLElement>) => void;
}

/**
 * Makes an element a drop target. It takes part only while an item it accepts is dragged: `isCandidate` for the hint on
 * every possible target, `isOver` for the one under the pointer.
 */
export const useFileDropTarget = (target: FileDropTarget | null): { dropProps: FileDropProps; isCandidate: boolean; isOver: boolean } => {
  const { enabled, canDrop, onDrop, active, setActive } = useContext(FileDndContext);
  const [overDepth, setOverDepth] = useState(0);
  const accepts = enabled && target !== null && active !== null && canDrop(active, target);
  const leave = useCallback(() => setOverDepth(depth => Math.max(depth - 1, 0)), []);
  // A drag that ended anywhere (a drop elsewhere, Escape) leaves no highlight behind.
  useEffect(() => {
    if (active === null) setOverDepth(0);
  }, [active]);
  if (!accepts || target === null || active === null) return { dropProps: {}, isCandidate: false, isOver: false };
  return {
    isCandidate: true,
    isOver: overDepth > 0,
    dropProps: {
      onDragEnter: event => {
        if (!isManagerDrag(event)) return;
        event.preventDefault();
        setOverDepth(depth => depth + 1);
      },
      onDragOver: event => {
        if (!isManagerDrag(event)) return;
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'move';
      },
      onDragLeave: event => {
        if (!isManagerDrag(event)) return;
        leave();
      },
      onDrop: event => {
        if (!isManagerDrag(event)) return;
        event.preventDefault();
        event.stopPropagation();
        setOverDepth(0);
        setActive(null);
        onDrop(active, target);
      },
    },
  };
};
