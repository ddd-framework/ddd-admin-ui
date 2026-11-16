'use client';

import type { ReactNode } from 'react';

import { Checkbox, Skeleton, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../primitives/index.ts';
import { useTranslate } from '../i18n/index.ts';
import { cn } from '../primitives/cn.ts';
import { EntityListLoadMore } from './EntityListLoadMore.tsx';
import { EntityListStatus } from './EntityListStatus.tsx';
import type { EntityListDataProps } from './types.ts';
import { useRowActivation } from '../logic/react/useRowActivation.ts';
import type { EntityListSelection } from '../logic/react/useRowSelection.ts';

export interface EntityListColumn<TItem> {
  id: string;
  header: ReactNode;
  cell: (item: TItem) => ReactNode;
  /** Content of this column's cell in an optional filter row under the header (prefer the toolbar search). */
  filter?: ReactNode;
  className?: string;
}

export interface EntityListTableProps<TItem> extends EntityListDataProps<TItem> {
  columns: EntityListColumn<TItem>[];
  /** Skeleton rows while the first page loads. */
  skeletonRows?: number;
  /**
   * Row selection (`useRowSelection()`): a leading checkbox column, "Select all loaded" in the header, selected rows
   * tinted. Pair it with `EntityListBulkBar` in the toolbar. Never add a hand-made checkbox column.
   */
  selection?: EntityListSelection<TItem>;
  /**
   * Offset of the sticky header row from the top of its scroll ancestor (CSS length, default `0px`): a table below
   * another sticky block (e.g. a group header that stays on screen) passes that block's height. Together with a
   * `className` that makes the table's own wrapper non-scrolling (`overflow-visible`), the header sticks to the page.
   */
  stickyHeaderTop?: string;
}

/**
 * Column labels in the section-label voice: small, heavy, uppercase, tracked out. Every header cell is sticky
 * and paints the card surface, so rows scrolling under it stay hidden; the inset shadow is the rule under the header
 * (a border would scroll away with `border-collapse`).
 */
const HEADER_CELL_CLASS =
  'sticky z-(--layer-raised) h-12 bg-card px-4 text-[11.5px] font-bold tracking-[0.08em] text-muted-foreground uppercase shadow-[inset_0_-1px_0_var(--color-border)] first:pl-6 last:pr-6';
/** Roomy rows: 16 px cells, 24 px at the card edge. */
const BODY_CELL_CLASS = 'px-4 py-3.5 first:pl-6 last:pr-6';
const SELECT_CELL_CLASS = 'w-10 pr-0';

const SelectAllHeader = <TItem,>({ selection, disabled }: { selection: EntityListSelection<TItem>; disabled: boolean }) => {
  const { t } = useTranslate();
  return (
  <Checkbox
    checked={selection.allLoadedState}
    onCheckedChange={checked => selection.setAllLoadedSelected(checked === true)}
    disabled={disabled || selection.disabled}
    aria-label={t('Select all loaded')}
    title={t('Select all loaded')}
    className="align-middle"
  />
  );
};

interface EntityListTableRowProps<TItem> {
  item: TItem;
  rowKey: string;
  columns: EntityListColumn<TItem>[];
  action: (() => void) | null | undefined;
  selection?: EntityListSelection<TItem>;
}

const EntityListTableRow = <TItem,>({ item, rowKey, columns, action, selection }: EntityListTableRowProps<TItem>) => {
  const { t } = useTranslate();
  const activation = useRowActivation(action);
  const selected = selection?.isItemSelected(item) ?? false;
  return (
    <TableRow
      className={cn('group/row', action && 'cursor-pointer')}
      data-state={selected ? 'selected' : undefined}
      {...activation}
    >
      {selection && (
        <TableCell className={cn(BODY_CELL_CLASS, SELECT_CELL_CLASS)} data-row-action-ignore>
          {selection.isItemSelectable(item) && (
            <Checkbox
              checked={selected}
              onCheckedChange={checked => selection.setItemSelected(item, checked === true)}
              disabled={selection.disabled}
              aria-label={selection.rowLabel?.(item) ?? t('Select row %rowKey%', { replacements: { rowKey } })}
              className="align-middle"
            />
          )}
        </TableCell>
      )}
      {columns.map(column => (
        <TableCell key={column.id} className={cn(BODY_CELL_CLASS, column.className)}>
          {column.cell(item)}
        </TableCell>
      ))}
    </TableRow>
  );
};

/**
 * Table view of an entity list: one scroll container that fills its card, sticky header, skeleton rows on the
 * first load, an empty / no-results / error block, and the infinite-scroll tail. Use it inside `EntityListPage`
 * (directly or through `EntityListBody`), or on its own (it then brings its own card border via `className`).
 */
export const EntityListTable = <TItem,>({
  columns,
  items,
  getRowKey,
  isLoading = false,
  isFetchingMore = false,
  hasMore = false,
  onLoadMore,
  emptyMessage,
  noResultsMessage,
  isSearchActive,
  onClearSearch,
  loadingMessage,
  error,
  rowAction,
  skeletonRows = 8,
  selection,
  className,
  stickyHeaderTop,
}: EntityListTableProps<TItem>) => {
  const { t } = useTranslate();
  const headerTopStyle = stickyHeaderTop ? { top: stickyHeaderTop } : undefined;
  const hasFilterRow = columns.some(column => column.filter !== undefined);
  const showRows = !error && !isLoading && items.length > 0;

  return (
    <div
      data-entity-list-scroll
      className={cn('relative overflow-auto md:min-h-0 md:flex-1', className)}
      aria-busy={isLoading || isFetchingMore}
    >
      <table className="w-full caption-bottom text-sm">
        <TableHeader className="[&_tr]:border-0">
          <TableRow className="hover:bg-transparent">
            {selection && (
              <TableHead className={cn(HEADER_CELL_CLASS, 'top-0', SELECT_CELL_CLASS)} style={headerTopStyle}>
                <SelectAllHeader selection={selection} disabled={isLoading || items.length === 0} />
              </TableHead>
            )}
            {columns.map(column => (
              <TableHead key={column.id} className={cn(HEADER_CELL_CLASS, 'top-0', column.className)} style={headerTopStyle}>
                {typeof column.header === 'string' ? t(column.header) : column.header}
              </TableHead>
            ))}
          </TableRow>
          {hasFilterRow && (
            <TableRow className="hover:bg-transparent">
              {selection && <TableHead className={cn(HEADER_CELL_CLASS, 'top-12 py-2.5', SELECT_CELL_CLASS)} />}
              {columns.map(column => (
                <TableHead
                  key={column.id}
                  className={cn(HEADER_CELL_CLASS, 'top-12 py-2.5 font-normal normal-case', column.className)}
                >
                  {column.filter}
                </TableHead>
              ))}
            </TableRow>
          )}
        </TableHeader>
        <TableBody>
          {isLoading && !error
            ? Array.from({ length: skeletonRows }, (_, row) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder rows
                <TableRow key={row} className="hover:bg-transparent" aria-hidden>
                  {selection && (
                    <TableCell className={cn(BODY_CELL_CLASS, SELECT_CELL_CLASS)}>
                      <Skeleton className="size-4" />
                    </TableCell>
                  )}
                  {columns.map(column => (
                    <TableCell key={column.id} className={cn(BODY_CELL_CLASS, column.className)}>
                      <Skeleton className="h-4 w-full min-w-12" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : showRows &&
              items.map(item => (
                <EntityListTableRow
                  key={getRowKey(item)}
                  rowKey={getRowKey(item)}
                  item={item}
                  columns={columns}
                  action={rowAction ? rowAction(item) : undefined}
                  selection={selection}
                />
              ))}
        </TableBody>
      </table>

      <EntityListStatus
        itemCount={items.length}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
        noResultsMessage={noResultsMessage}
        isSearchActive={isSearchActive}
        onClearSearch={onClearSearch}
        loadingMessage={loadingMessage}
        error={error}
      />
      <EntityListLoadMore hasMore={showRows && hasMore} isFetchingMore={isFetchingMore} onLoadMore={onLoadMore} />
    </div>
  );
};
