'use client';

import { ArrowDownUp, Check, ExternalLink, ImageOff, Sparkles, Upload } from 'lucide-react';
import { type ChangeEvent, type ReactNode, useRef } from 'react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  Label,
} from '../primitives/index.ts';
import { useTranslate } from '../i18n/index.ts';
import { cn } from '../primitives/cn.ts';
import { EntityListEmpty } from '../list/EntityListEmpty.tsx';
import { EntityListLoadMore } from '../list/EntityListLoadMore.tsx';
import { SearchField } from '../list/SearchField.tsx';
import type { MediaPickerSortOption, MediaPickerTile } from './types.ts';

export interface MediaPickerSearch {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  /** One-line hint under the field. */
  hint?: string;
}

export interface MediaPickerUpload {
  /** Called with the picked files; the app prepares and uploads them (`prepareImageFile` + its upload adapter). */
  onFiles: (files: File[]) => void;
  isUploading: boolean;
  accept?: string;
  disabled?: boolean;
}

export interface MediaItemPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  items: MediaPickerTile[];
  selectedId: string | null;
  /** Picking a tile; the dialog does not close by itself. */
  onSelect: (tile: MediaPickerTile) => void;
  isLoading: boolean;
  isFetchingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  error?: ReactNode;
  /** Text search (e.g. by identifier). */
  search?: MediaPickerSearch;
  /** Semantic / vector similarity search; while it is set the sort is ignored by the backend and disabled here. */
  similaritySearch?: MediaPickerSearch;
  sortOptions?: MediaPickerSortOption[];
  sort?: string;
  onSortChange?: (value: string) => void;
  /** Optional upload button (off when absent). */
  upload?: MediaPickerUpload;
}

interface PickerSearchProps {
  search: MediaPickerSearch;
  icon?: ReactNode;
}

/** A labelled search of the picker: the shared `SearchField` pill, the hint below. */
const PickerSearch = ({ search, icon }: PickerSearchProps) => (
  <div className="grid min-w-0 flex-1 gap-1.5">
    <Label className="text-[12.5px] font-bold text-muted-foreground">{search.label}</Label>
    <SearchField
      size="sm"
      value={search.value}
      onChange={search.onChange}
      placeholder={search.placeholder}
      aria-label={search.label}
      leading={icon}
    />
    {search.hint && <p className="text-xs text-muted-foreground">{search.hint}</p>}
  </div>
);

/**
 * Pick one existing media item in a dialog:
 * search, similarity search, sort, a tile grid with infinite scroll, the current item marked. Data, URLs and the
 * upload endpoint come from the app.
 */
export const MediaItemPickerDialog = ({
  open,
  onOpenChange,
  title,
  description,
  items,
  selectedId,
  onSelect,
  isLoading,
  isFetchingMore,
  hasMore,
  onLoadMore,
  error,
  search,
  similaritySearch,
  sortOptions,
  sort,
  onSortChange,
  upload,
}: MediaItemPickerDialogProps) => {
  const { t } = useTranslate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSimilarityActive = !!similaritySearch?.value.trim();
  const sortLabel = sortOptions?.find(option => option.value === sort)?.label ?? t('Sort', { context: 'media-picker' });

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length > 0) upload?.onFiles(files);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(90dvh,900px)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 p-0 sm:max-w-6xl">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="flex shrink-0 flex-col gap-3 border-b px-6 py-3 md:flex-row md:items-start">
          {search && <PickerSearch search={search} />}
          {similaritySearch && (
            <PickerSearch search={similaritySearch} icon={<Sparkles className="size-4 text-muted-foreground" aria-hidden />} />
          )}
          {sortOptions && onSortChange && (
            <div className="grid gap-1.5">
              <Label className="text-[12.5px] font-bold text-muted-foreground">{t('Sort by', { context: 'media-picker' })}</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSimilarityActive}
                    className="h-8 justify-start text-[13px] font-bold"
                  >
                    <ArrowDownUp aria-hidden />
                    {sortLabel}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {sortOptions.map(option => (
                    <DropdownMenuCheckboxItem
                      key={option.value}
                      checked={option.value === sort}
                      onCheckedChange={() => onSortChange(option.value)}
                    >
                      {option.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          {upload && (
            <div className="grid gap-1.5 md:ml-auto">
              <span className="hidden text-[12.5px] md:block">&nbsp;</span>
              <input
                ref={fileInputRef}
                type="file"
                accept={upload.accept ?? 'image/*'}
                multiple
                hidden
                onChange={handleFiles}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                disabled={upload.disabled || upload.isUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload aria-hidden />
                {upload.isUploading ? t('Uploading…', { context: 'media-picker' }) : t('Upload', { context: 'media-picker' })}
              </Button>
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {error || (!isLoading && items.length === 0) ? (
            <EntityListEmpty message={error ?? t('No media items found')} tone={error ? 'error' : 'default'} />
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))]">
              {isLoading
                ? Array.from({ length: 12 }, (_, index) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
                    <li key={index} className="aspect-square animate-pulse rounded-lg bg-muted" />
                  ))
                : items.map(item => {
                    const isSelected = item.id === selectedId;
                    return (
                      <li key={item.id} className="group relative">
                        <button
                          type="button"
                          onClick={() => onSelect(item)}
                          aria-pressed={isSelected}
                          aria-label={t('Select %title%', { replacements: { title: item.title } })}
                          className={cn(
                            'flex w-full flex-col overflow-hidden rounded-lg border bg-card text-left transition-shadow hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
                            isSelected && 'ring-2 ring-ring'
                          )}
                        >
                          <span className="flex aspect-square w-full items-center justify-center bg-muted/30">
                            {item.previewUrl ? (
                              // biome-ignore lint/performance/noImgElement: API-served media with its own size parameter
                              <img src={item.previewUrl} alt="" loading="lazy" className="size-full object-contain" />
                            ) : (
                              <ImageOff className="size-6 text-muted-foreground" aria-hidden />
                            )}
                          </span>
                          <span className="grid gap-0.5 border-t p-2">
                            <span className="truncate text-xs font-semibold">{item.title}</span>
                            {item.details?.map(line => (
                              <span key={line} className="truncate text-[11px] text-muted-foreground">
                                {line}
                              </span>
                            ))}
                          </span>
                        </button>
                        {isSelected && (
                          <span className="pointer-events-none absolute top-2 left-2 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                            <Check className="size-4" aria-hidden />
                          </span>
                        )}
                        {item.originalUrl && (
                          <a
                            href={item.originalUrl}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={t('Open original of %title%', { replacements: { title: item.title } })}
                            className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-md bg-card/90 text-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100 [@media(pointer:coarse)]:opacity-100"
                          >
                            <ExternalLink className="size-3.5" aria-hidden />
                          </a>
                        )}
                      </li>
                    );
                  })}
            </ul>
          )}
          <EntityListLoadMore hasMore={hasMore} isFetchingMore={isFetchingMore} onLoadMore={onLoadMore} />
        </div>

        <DialogFooter className="shrink-0 border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('Cancel', { context: 'media-picker' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
