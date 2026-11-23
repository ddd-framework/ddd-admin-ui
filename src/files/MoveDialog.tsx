'use client';

import { normalizeDddError } from '@mgamadeus/ddd-web/contract';
import { Check, Folder, HardDrive } from 'lucide-react';
import { type ReactNode, useId, useMemo, useState } from 'react';

import { useTranslate } from '../i18n/useTranslate.ts';
import { Combobox } from '../list/Combobox.tsx';
import { Button } from '../primitives/button.tsx';
import { cn } from '../primitives/cn.ts';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../primitives/dialog.tsx';
import { Label } from '../primitives/label.tsx';
import { Skeleton } from '../primitives/skeleton.tsx';
import type { FileQueryState } from './fileManagerAdapter.ts';
import { type FileAreaKey, type FileAreaRefView, type FileItemId, type FolderView, sameFileId } from './fileView.ts';

/** Moves to other areas: the areas offered and how to read another area's folders. */
export interface MoveDialogAreaPicker {
  /** The open area (the picker's default). */
  currentAreaKey: FileAreaKey;
  /** The adapter's `useMoveTargetAreas`. */
  useAreas: () => FileQueryState<readonly FileAreaRefView[]>;
  /** The adapter's `useFolders` for the picked area. */
  useFolders: (areaKey: FileAreaKey) => FileQueryState<readonly FolderView[]>;
}

export interface MoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `Move 3 files`, `Move the folder “Reports”`. */
  title: string;
  /** The area's name (the root option). */
  rootLabel: string;
  folders: readonly FolderView[];
  /** Where the items are now (`null` = root): offered, but Move stays off while it is picked; `undefined` when they come from different folders. */
  currentFolderId: FileItemId | null | undefined;
  /** Why a target is not possible (`null` = possible); `areaFolders` are the picked area's folders when it is another area. */
  targetBlockedReason?: (folderId: FileItemId | null, areaKey?: FileAreaKey, areaFolders?: readonly FolderView[]) => string | null;
  writesAllowed: boolean;
  /** Absent = the items stay in their area (no picker). */
  areaPicker?: MoveDialogAreaPicker;
  /** Moves; rejects with the request error (shown in the dialog). `areaKey` is set when another area was picked. */
  onMove: (folderId: FileItemId | null, areaKey?: FileAreaKey) => Promise<unknown>;
}

interface TargetOption {
  folderId: FileItemId | null;
  label: string;
  depth: number;
}

/** The tree flattened in display order (root first, children under their parent, names A–Z). */
const flattenTree = (folders: readonly FolderView[], rootLabel: string): TargetOption[] => {
  const childrenOf = new Map<string | null, FolderView[]>();
  for (const folder of folders) {
    const parent = folder.parentId === null ? null : String(folder.parentId);
    const list = childrenOf.get(parent) ?? [];
    list.push(folder);
    childrenOf.set(parent, list);
  }
  const options: TargetOption[] = [{ folderId: null, label: rootLabel, depth: 0 }];
  const walk = (parentId: string | null, depth: number) => {
    const children = [...(childrenOf.get(parentId) ?? [])].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    for (const child of children) {
      options.push({ folderId: child.id, label: child.name, depth });
      walk(String(child.id), depth + 1);
    }
  };
  walk(null, 1);
  return options;
};

interface FolderOptionsProps {
  rootLabel: string;
  folders: readonly FolderView[];
  isLoading?: boolean;
  target: FileItemId | null;
  onTarget: (folderId: FileItemId | null) => void;
  /** Marked "current" (only in the items' own area). */
  currentFolderId: FileItemId | null | undefined;
  blockedReason: (folderId: FileItemId | null) => string | null;
}

const FolderOptions = ({ rootLabel, folders, isLoading = false, target, onTarget, currentFolderId, blockedReason }: FolderOptionsProps) => {
  const { t } = useTranslate();
  const options = useMemo(() => flattenTree(folders, rootLabel), [folders, rootLabel]);
  return (
    <div role="radiogroup" aria-label={t('Target folder')} className="max-h-80 space-y-0.5 overflow-y-auto rounded-lg border p-1.5">
      {options.map(option => {
        const reason = blockedReason(option.folderId);
        const selected = sameFileId(option.folderId, target);
        const Icon = option.folderId === null ? HardDrive : Folder;
        return (
          <button
            key={option.folderId === null ? 'root' : String(option.folderId)}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={reason !== null}
            title={reason ?? undefined}
            onClick={() => onTarget(option.folderId)}
            className={cn(
              'flex h-8 w-full items-center gap-2 rounded-md pr-2 text-left text-[13px] transition-colors duration-150 hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent motion-reduce:transition-none',
              selected && 'bg-accent font-semibold hover:bg-accent'
            )}
            style={{ paddingLeft: `${8 + option.depth * 16}px` }}
          >
            <Icon aria-hidden className={cn('size-4 shrink-0', selected ? 'text-primary-emphasis' : 'text-muted-foreground')} />
            <span className="min-w-0 flex-1 truncate">{option.label}</span>
            {currentFolderId !== undefined && sameFileId(option.folderId, currentFolderId) && (
              <span className="shrink-0 text-[11px] text-muted-foreground">{t('current', { context: 'move-target-folder' })}</span>
            )}
            {selected && <Check aria-hidden className="size-4 shrink-0 text-primary-emphasis" />}
          </button>
        );
      })}
      {isLoading && (
        <div className="space-y-1.5 px-2 py-1" aria-hidden>
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-5 w-1/2" />
        </div>
      )}
    </div>
  );
};

/** Reads the picked area's folders (a component of its own: the adapter's read hook runs for that area only). */
const WithAreaFolders = ({
  areaKey,
  useFolders,
  children,
}: {
  areaKey: FileAreaKey;
  useFolders: MoveDialogAreaPicker['useFolders'];
  children: (query: FileQueryState<readonly FolderView[]>) => ReactNode;
}) => <>{children(useFolders(areaKey))}</>;

/** The area picker (a searchable list of the areas the adapter offers). */
const AreaPickerField = ({
  useAreas,
  value,
  onChange,
}: {
  useAreas: MoveDialogAreaPicker['useAreas'];
  value: FileAreaKey;
  onChange: (area: FileAreaRefView) => void;
}) => {
  const { t } = useTranslate();
  const fieldId = useId();
  const areas = useAreas();
  const options = useMemo(
    () => (areas.data ?? []).map(area => ({ value: String(area.key), label: area.groupLabel ? `${area.name} (${area.groupLabel})` : area.name })),
    [areas.data]
  );
  return (
    <div className="space-y-1.5">
      <Label htmlFor={fieldId}>{t('Area', { context: 'move-dialog-field' })}</Label>
      <Combobox
        id={fieldId}
        options={options}
        value={String(value)}
        isLoading={areas.isLoading}
        searchPlaceholder={t('Search areas…')}
        emptyMessage={t('No area found')}
        onChange={next => {
          const area = (areas.data ?? []).find(candidate => String(candidate.key) === next);
          if (area) onChange(area);
        }}
        aria-label={t('Target area')}
      />
    </div>
  );
};

const MoveForm = ({
  title,
  rootLabel,
  folders,
  currentFolderId,
  targetBlockedReason,
  writesAllowed,
  areaPicker,
  onMove,
  onOpenChange,
}: Omit<MoveDialogProps, 'open'>) => {
  const { t } = useTranslate();
  const [target, setTarget] = useState<FileItemId | null>(currentFolderId ?? null);
  const [targetArea, setTargetArea] = useState<FileAreaRefView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const otherArea =
    targetArea !== null && areaPicker !== undefined && String(targetArea.key) !== String(areaPicker.currentAreaKey) ? targetArea : null;
  const isUnchanged = otherArea === null && currentFolderId !== undefined && sameFileId(target, currentFolderId);

  const move = async (blocked: string | null) => {
    if (!writesAllowed || blocked || isUnchanged) return;
    setSaving(true);
    setError(null);
    try {
      await onMove(target, otherArea?.key);
      onOpenChange(false);
    } catch (moveError) {
      setError(normalizeDddError(moveError).message);
    } finally {
      setSaving(false);
    }
  };

  /** Folder list, message and buttons; `areaFolders` = the picked other area's folders (`null` = the open area). */
  const body = (areaFolders: readonly FolderView[] | null, isLoading: boolean) => {
    const reasonFor = (folderId: FileItemId | null) =>
      otherArea && areaFolders ? (targetBlockedReason?.(folderId, otherArea.key, areaFolders) ?? null) : (targetBlockedReason?.(folderId) ?? null);
    const blocked = reasonFor(target);
    return (
      <>
        <FolderOptions
          rootLabel={otherArea ? otherArea.name : rootLabel}
          folders={areaFolders ?? folders}
          isLoading={isLoading}
          target={target}
          onTarget={setTarget}
          currentFolderId={otherArea ? undefined : currentFolderId}
          blockedReason={reasonFor}
        />
        {(error || blocked) && <p className="text-xs text-destructive">{error ?? blocked}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('Cancel')}
          </Button>
          <Button type="button" onClick={() => void move(blocked)} disabled={!writesAllowed || saving || blocked !== null || isUnchanged}>
            {saving ? t('Moving…') : otherArea ? t('Continue') : t('Move here')}
          </Button>
        </DialogFooter>
      </>
    );
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          {areaPicker ? t('Pick the area and the folder to move to. A move into another area is confirmed separately.') : t('Pick the folder to move to.')}
        </DialogDescription>
      </DialogHeader>
      {areaPicker && (
        <AreaPickerField
          useAreas={areaPicker.useAreas}
          value={targetArea?.key ?? areaPicker.currentAreaKey}
          onChange={area => {
            setTargetArea(area);
            setTarget(String(area.key) === String(areaPicker.currentAreaKey) ? (currentFolderId ?? null) : null);
            setError(null);
          }}
        />
      )}
      {otherArea && areaPicker ? (
        <WithAreaFolders key={String(otherArea.key)} areaKey={otherArea.key} useFolders={areaPicker.useFolders}>
          {query => body(query.data ?? [], query.isLoading)}
        </WithAreaFolders>
      ) : (
        body(null, false)
      )}
    </>
  );
};

/**
 * Move files or a folder to another folder — the keyboard and phone path next to drag and drop. With an `areaPicker`
 * the target may be a folder of another area; that move is confirmed separately.
 */
export const MoveDialog = ({ open, onOpenChange, ...props }: MoveDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md">{open && <MoveForm {...props} onOpenChange={onOpenChange} />}</DialogContent>
  </Dialog>
);
