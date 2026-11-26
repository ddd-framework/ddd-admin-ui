'use client';

import { Check, Folder } from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

import { useTranslate } from '../i18n/useTranslate.ts';
import { EntityListEmpty } from '../list/EntityListEmpty.tsx';
import { EntityListLoadMore } from '../list/EntityListLoadMore.tsx';
import { SearchField } from '../list/SearchField.tsx';
import { useDebouncedValue } from '../logic/react/useDebouncedValue.ts';
import { Button } from '../primitives/button.tsx';
import { cn } from '../primitives/cn.ts';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '../primitives/select.tsx';
import { FileBreadcrumbs } from './FileBreadcrumbs.tsx';
import { FileFamilyIcon } from './FileFamilyIcon.tsx';
import type { FileManagerAdapter } from './fileManagerAdapter.ts';
import { isFilePickable } from './filePicking.ts';
import {
  type FileAreaKey,
  type FileAreaRefView,
  type FileItemId,
  type FileView,
  folderPath,
  formatBytes,
  sameFileId,
} from './fileView.ts';

export interface FilePickerProps {
  /** The API of the open area (its read hooks only; keep its identity per area). */
  adapter: FileManagerAdapter;
  /** The areas the reader may pick from; more than one shows an area switch. */
  areas: readonly FileAreaRefView[];
  /** The open area, controlled (the host gives the adapter of this area). */
  areaKey: FileAreaKey | null;
  onAreaKeyChange: (areaKey: FileAreaKey) => void;
  /** `single` (default): one file, a click picks it; `multiple`: checkboxes. */
  selection?: 'single' | 'multiple';
  /** Which files may be picked (`file.family === 'IMAGE'`); others are shown dimmed. Absent = every file. */
  accept?: (file: FileView) => boolean;
  /** Why a dimmed file cannot be picked (`Only pictures can be picked.`). */
  acceptHint?: string;
  /** The confirm button (`Use this picture`, `Insert`). */
  confirmLabel: string;
  /** Called with the picked files (released and accepted ones only). */
  onConfirm: (files: readonly FileView[], areaKey: FileAreaKey) => void;
  /** The host works on the confirmed files: the confirm button shows it and nothing can be picked. */
  isConfirming?: boolean;
  /** A message of the host (a refusal of the server) above the footer. */
  error?: ReactNode;
  /** A Cancel button left of the confirm button (absent = none). */
  onCancel?: () => void;
  className?: string;
}

const SEARCH_DEBOUNCE_MS = 350;

/** The areas grouped by their `groupLabel` (in order of first appearance); areas without one come first. */
const groupAreas = (areas: readonly FileAreaRefView[]): { label: string | null; areas: FileAreaRefView[] }[] => {
  const groups: { label: string | null; areas: FileAreaRefView[] }[] = [];
  for (const area of areas) {
    const label = area.groupLabel ?? null;
    const group = groups.find(candidate => candidate.label === label);
    if (group) group.areas.push(area);
    else groups.push({ label, areas: [area] });
  }
  return groups.sort((left, right) => (left.label === null ? -1 : right.label === null ? 1 : 0));
};

/** One file as a tile: thumbnail or family icon, name, size; marked when picked, dimmed when it cannot be picked. */
const FilePickerTile = ({
  file,
  pickable,
  selected,
  multiple,
  disabledReason,
  disabled,
  onToggle,
}: {
  file: FileView;
  pickable: boolean;
  selected: boolean;
  multiple: boolean;
  disabledReason?: string;
  disabled: boolean;
  onToggle: () => void;
}) => {
  const { t } = useTranslate();
  const [failedThumbnail, setFailedThumbnail] = useState<string | null>(null);
  const thumbnail = file.thumbnailUrl && failedThumbnail !== file.thumbnailUrl ? file.thumbnailUrl : null;
  return (
    <li className="relative">
      <button
        type="button"
        onClick={onToggle}
        disabled={!pickable || disabled}
        aria-pressed={selected}
        aria-label={multiple ? t('Select %name%', { replacements: { name: file.name } }) : t('Pick %name%', { replacements: { name: file.name } })}
        title={pickable ? file.name : disabledReason}
        data-row-key={String(file.id)}
        className={cn(
          'flex w-full flex-col overflow-hidden rounded-lg border bg-card text-left transition-shadow hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed',
          !pickable && 'opacity-45 hover:shadow-none',
          selected && 'ring-2 ring-ring'
        )}
      >
        <span className="flex aspect-[4/3] w-full items-center justify-center bg-muted/30">
          {thumbnail ? (
            // biome-ignore lint/performance/noImgElement: a short-lived thumbnail URL of the host's API
            <img src={thumbnail} alt="" loading="lazy" className="size-full object-contain" onError={() => setFailedThumbnail(thumbnail)} />
          ) : (
            <FileFamilyIcon family={file.family} size="lg" />
          )}
        </span>
        <span className="grid gap-0.5 border-t p-2">
          <span className="truncate text-xs font-semibold">{file.name}</span>
          <span className="truncate text-[11px] text-muted-foreground">{formatBytes(file.sizeBytes)}</span>
        </span>
      </button>
      {selected && (
        <span className="pointer-events-none absolute top-2 left-2 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
          <Check className="size-4" aria-hidden />
        </span>
      )}
    </li>
  );
};

/**
 * Pick one or several files of a `FileManagerAdapter`: area switch, breadcrumbs, folders, files as tiles, search over
 * the area. Only released files the host accepts can be picked. A panel (a dialog body, a picker tab); `FilePickerDialog`
 * puts it in a dialog.
 */
export const FilePicker = ({
  adapter,
  areas,
  areaKey,
  onAreaKeyChange,
  selection = 'single',
  accept,
  acceptHint,
  confirmLabel,
  onConfirm,
  isConfirming = false,
  error,
  onCancel,
  className,
}: FilePickerProps) => {
  const { t } = useTranslate();
  const multiple = selection === 'multiple';
  const openAreaKey: FileAreaKey = areaKey ?? '';
  const [folderId, setFolderId] = useState<FileItemId | null>(null);
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<readonly FileView[]>([]);
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);

  // another area: back to its root, nothing picked
  useEffect(() => {
    setFolderId(null);
    setSearch('');
    setPicked([]);
  }, [openAreaKey]);

  const foldersQuery = adapter.useFolders(openAreaKey);
  const folders = foldersQuery.data ?? [];
  const searching = debouncedSearch !== '';
  const files = adapter.useFiles(
    areaKey === null ? null : searching ? { areaKey: openAreaKey, q: debouncedSearch, orderBy: 'name' } : { areaKey: openAreaKey, folderId: folderId ?? 'root', orderBy: 'name' }
  );
  const childFolders = useMemo(
    () => (searching ? [] : folders.filter(folder => sameFileId(folder.parentId, folderId)).sort((left, right) => left.name.localeCompare(right.name))),
    [folders, folderId, searching]
  );
  const area = areas.find(candidate => sameFileId(candidate.key, openAreaKey));
  const groups = useMemo(() => groupAreas(areas), [areas]);
  const pickedIds = new Set(picked.map(file => String(file.id)));

  const toggle = (file: FileView) => {
    if (!multiple) {
      setPicked(pickedIds.has(String(file.id)) ? [] : [file]);
      return;
    }
    setPicked(current => (current.some(entry => sameFileId(entry.id, file.id)) ? current.filter(entry => !sameFileId(entry.id, file.id)) : [...current, file]));
  };

  const isEmpty = !files.isLoading && files.items.length === 0 && childFolders.length === 0;
  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      <div className="flex shrink-0 flex-col gap-3 border-b px-6 py-3 md:flex-row md:items-center">
        {areas.length > 1 && (
          <Select value={areaKey === null ? undefined : String(areaKey)} onValueChange={value => onAreaKeyChange(areas.find(candidate => String(candidate.key) === value)?.key ?? value)}>
            <SelectTrigger size="sm" className="md:w-72" aria-label={t('Area', { context: 'file-picker' })}>
              <SelectValue placeholder={t('Choose an area', { context: 'file-picker' })} />
            </SelectTrigger>
            <SelectContent>
              {groups.map(group => (
                <SelectGroup key={group.label ?? ''}>
                  {group.label && <SelectLabel>{group.label}</SelectLabel>}
                  {group.areas.map(candidate => (
                    <SelectItem key={String(candidate.key)} value={String(candidate.key)}>
                      {candidate.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        )}
        <SearchField
          size="sm"
          className="min-w-0 flex-1"
          value={search}
          onChange={setSearch}
          placeholder={t('Search this area…', { context: 'file-picker' })}
          aria-label={t('Search files', { context: 'file-picker' })}
        />
      </div>
      <div className="shrink-0 px-6 pt-3">
        <FileBreadcrumbs
          rootLabel={area?.name ?? t('Files', { context: 'files-label' })}
          path={folderPath(folders, folderId)}
          trailLabel={searching ? t('Search results') : undefined}
          onNavigate={next => {
            setSearch('');
            setFolderId(next);
          }}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4" data-agent-anchor="file-picker-list">
        {areaKey === null ? (
          <EntityListEmpty message={t('Choose an area', { context: 'file-picker' })} />
        ) : files.isError ? (
          <EntityListEmpty message={t('The files could not be loaded.')} tone="error" />
        ) : isEmpty ? (
          <EntityListEmpty message={searching ? t('No files match the search.') : t('This folder is empty.')} />
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))]">
            {childFolders.map(folder => (
              <li key={`folder-${folder.id}`}>
                <button
                  type="button"
                  onClick={() => setFolderId(folder.id)}
                  aria-label={t('Open folder %name%', { replacements: { name: folder.name } })}
                  className="flex w-full items-center gap-2 rounded-lg border bg-card p-3 text-left text-sm font-semibold hover:bg-muted/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <Folder className="size-5 shrink-0 text-primary-emphasis" aria-hidden />
                  <span className="truncate">{folder.name}</span>
                </button>
              </li>
            ))}
            {files.isLoading
              ? Array.from({ length: 8 }, (_, index) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
                  <li key={index} className="aspect-[4/3] animate-pulse rounded-lg bg-muted" />
                ))
              : files.items.map(file => (
                  <FilePickerTile
                    key={String(file.id)}
                    file={file}
                    pickable={isFilePickable(file, accept)}
                    selected={pickedIds.has(String(file.id))}
                    multiple={multiple}
                    disabledReason={acceptHint}
                    disabled={isConfirming}
                    onToggle={() => toggle(file)}
                  />
                ))}
          </ul>
        )}
        <EntityListLoadMore hasMore={files.hasMore} isFetchingMore={files.isFetchingMore} onLoadMore={files.loadMore} />
      </div>
      {error && <div className="shrink-0 border-t bg-destructive/10 px-6 py-2 text-sm text-destructive">{error}</div>}
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t px-6 py-4">
        {acceptHint && <span className="mr-auto text-xs text-muted-foreground">{acceptHint}</span>}
        {multiple && picked.length > 0 && (
          <span className="text-xs text-muted-foreground">{t('{count, plural, one {# file picked} other {# files picked}}', { count: picked.length })}</span>
        )}
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('Cancel', { context: 'file-picker' })}
          </Button>
        )}
        <Button type="button" disabled={picked.length === 0 || isConfirming || areaKey === null} onClick={() => areaKey !== null && onConfirm(picked, areaKey)}>
          {isConfirming ? t('Working…', { context: 'file-picker' }) : confirmLabel}
        </Button>
      </div>
    </div>
  );
};
