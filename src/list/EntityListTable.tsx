'use client';

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { type CSSProperties, type ReactNode, useLayoutEffect, useRef, useState } from 'react';

import { Checkbox, Skeleton, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../primitives/index.ts';
import { useTranslate } from '../i18n/index.ts';
import { cn } from '../primitives/cn.ts';
import { EntityListLoadMore } from './EntityListLoadMore.tsx';
import { EntityListStatus } from './EntityListStatus.tsx';
import type { EntityListDataProps } from './types.ts';
import { type EntityListSort, type ListSortDirection, nextListSort } from '../logic/pure/listSort.ts';
import {
  computeListTracks,
  hasListTracks,
  isContentTrack,
  type ListColumnAlign,
  type ListColumnPin,
  type ListColumnWidth,
  type ListPinPlacement,
  type ListPinRequest,
  type ListTrack,
  listTrackLayoutTemplate,
  listTrackTemplate,
  minimumListWidth,
  resolveListPins,
} from '../logic/pure/listTracks.ts';
import { useRowActivation } from '../logic/react/useRowActivation.ts';
import type { EntityListSelection } from '../logic/react/useRowSelection.ts';

export interface EntityListColumn<TItem> {
  id: string;
  header: ReactNode;
  cell: (item: TItem) => ReactNode;
  /** Content of this column's cell in an optional filter row under the header (prefer the toolbar search). */
  filter?: ReactNode;
  /** Classes of the column's header and body cells. In a table with tracks a width class does not size the column. */
  className?: string;
  /**
   * Track of the column: a share of the free width (`'1fr'`, `'2fr'`), a fixed length (`'120px'`) or `'content'` (as
   * wide as its widest cell: a row's actions, pinned or not). One column with a width gives every column a track
   * (default `'1fr'`); without any width the table sizes its columns by content.
   */
  width?: ListColumnWidth;
  /** Lower bound in px of a share column (default 120). The table scrolls sideways inside its card instead of squeezing. */
  minWidth?: number;
  /**
   * Stays on screen while the table scrolls sideways. `end` always holds (a row's actions); `start` is a request,
   * honoured only while the table overflows and the pinned columns take less than a third of the visible width.
   */
  pin?: ListColumnPin;
  /** Horizontal alignment of the header and the cells (default `start`). */
  align?: ListColumnAlign;
  /**
   * Makes the header a sort control (with the table's `onSortChange`); the value names the sort and comes back in
   * `onSortChange`. The table never sorts rows itself: the host maps the key to its request.
   */
  sortKey?: string;
  /** The first direction when this column becomes sorted (default `'asc'`; e.g. `'desc'` for dates, newest first). */
  sortStart?: ListSortDirection;
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
  /** The current sort (`null`: the host's default order). Shown on the header of the column with that `sortKey`. */
  sort?: EntityListSort | null;
  /**
   * Called with the next sort when a sortable header is clicked: not sorted → the column's `sortStart` (ascending by
   * default) → the other direction → `null` (or back to `sortStart` with `sortRequired`).
   */
  onSortChange?: (sort: EntityListSort | null) => void;
  /** The list is always sorted: a sorted column's third click returns to its first direction instead of `null`. */
  sortRequired?: boolean;
  /** A leading `#` column: the 1-based position of the row among the loaded rows. Pinned with the selection column. */
  showRowIndex?: boolean;
  /** Extra classes of a body row (`index`: 0-based among the loaded rows), e.g. a muted archived row. */
  rowClassName?: (item: TItem, index: number) => string | undefined;
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
const INDEX_CELL_CLASS = 'pr-0 tabular-nums text-muted-foreground';
/** Cells of a table with tracks: the text wraps inside its track instead of running into the next column. */
const TRACK_CELL_CLASS = 'whitespace-normal break-words';
/** The content box of a cell in a table with tracks (the cell itself is a flex row that centres it vertically). */
const TRACK_CONTENT_CLASS = 'min-w-0 flex-1';

/** Track of the selection column: 24 px card-edge inset + the 16 px checkbox. */
const SELECT_TRACK_PX = 40;
/** Track of the row index: up to four digits after the card-edge inset (first column) or the 16 px cell inset. */
const indexTrackPx = (afterSelection: boolean) => (afterSelection ? 48 : 56);

const ALIGN_CLASS: Record<ListColumnAlign, string | undefined> = {
  start: undefined,
  center: 'text-center',
  end: 'text-end',
};

/** What a header or body cell needs from the table's layout: track mode and the pin of its position. */
interface CellLayout {
  /** The table has tracks (CSS grid with table roles). */
  tracks: boolean;
  /** Pin per position (leading columns first), `null` while the table uses neither tracks, pins nor a row index. */
  placements: (ListPinPlacement | null)[] | null;
}

/** Pin attributes and sticky offset of the cell at `position` (nothing for an unpinned cell). */
const pinProps = (layout: CellLayout, position: number, header: boolean) => {
  const placement = layout.placements?.[position] ?? null;
  if (!placement) return undefined;
  const style: CSSProperties = {
    position: 'sticky',
    [placement.side === 'start' ? 'left' : 'right']: placement.offset,
    // a pinned header cell paints above the header cells scrolling under it, a pinned body cell above body cells
    zIndex: header ? 'calc(var(--layer-raised) + 1)' : 1,
  };
  return { style, 'data-list-pin': placement.side, 'data-list-pin-edge': placement.edge ? '' : undefined };
};

/** Cell content: as is in a content-sized table, in a shrinkable box in a table with tracks. */
const cellContent = (layout: CellLayout, content: ReactNode, align?: ListColumnAlign) =>
  layout.tracks ? <div className={cn(TRACK_CONTENT_CLASS, align && ALIGN_CLASS[align])}>{content}</div> : content;

/** Classes a cell adds for the layout: wrapping in a table with tracks, the alignment on the cell otherwise. */
const cellLayoutClass = (layout: CellLayout, align?: ListColumnAlign) =>
  layout.tracks ? TRACK_CELL_CLASS : align && ALIGN_CLASS[align];

/** `role` of a table element in a table with tracks: `display: grid` drops the native table semantics in some browsers. */
const roleIn = (layout: CellLayout, role: 'table' | 'rowgroup' | 'row' | 'columnheader' | 'cell') => (layout.tracks ? role : undefined);

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

/** A sortable column's header content: one button that moves the sort on; the cell carries `aria-sort`. */
const SortHeaderButton = ({
  label,
  direction,
  onClick,
  iconFirst,
}: {
  label: ReactNode;
  direction: 'asc' | 'desc' | undefined;
  onClick: () => void;
  /** An end-aligned column: the arrow before the label, so the label shares the right edge with the numbers. */
  iconFirst: boolean;
}) => {
  const Icon = direction === 'asc' ? ArrowUp : direction === 'desc' ? ArrowDown : ArrowUpDown;
  const icon = <Icon aria-hidden className={cn('size-3.5 shrink-0', !direction && 'opacity-50')} />;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        '-mx-1 inline-flex cursor-pointer items-center gap-1.5 rounded-sm px-1 text-left font-bold tracking-[inherit] uppercase outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
        direction && 'text-foreground'
      )}
    >
      {iconFirst && icon}
      <span>{label}</span>
      {!iconFirst && icon}
    </button>
  );
};

interface EntityListTableRowProps<TItem> {
  item: TItem;
  rowKey: string;
  columns: EntityListColumn<TItem>[];
  action: (() => void) | null | undefined;
  selection?: EntityListSelection<TItem>;
  /** 1-based position among the loaded rows, when the table shows the row index. */
  rowNumber?: number;
  layout: CellLayout;
  className?: string;
}

const EntityListTableRow = <TItem,>({
  item,
  rowKey,
  columns,
  action,
  selection,
  rowNumber,
  layout,
  className,
}: EntityListTableRowProps<TItem>) => {
  const { t } = useTranslate();
  const activation = useRowActivation(action);
  const selected = selection?.isItemSelected(item) ?? false;
  const leading = (selection ? 1 : 0) + (rowNumber !== undefined ? 1 : 0);
  return (
    <TableRow
      className={cn('group/row', action && 'cursor-pointer', className)}
      data-state={selected ? 'selected' : undefined}
      role={roleIn(layout, 'row')}
      {...activation}
    >
      {selection && (
        <TableCell className={cn(BODY_CELL_CLASS, SELECT_CELL_CLASS)} data-row-action-ignore role={roleIn(layout, 'cell')} {...pinProps(layout, 0, false)}>
          {selection.isItemSelectable(item) ? (
            <Checkbox
              checked={selected}
              onCheckedChange={checked => selection.setItemSelected(item, checked === true)}
              disabled={selection.disabled}
              aria-label={selection.rowLabel?.(item) ?? t('Select row %rowKey%', { replacements: { rowKey } })}
              className="align-middle"
            />
          ) : (
            selection.isItemSelectionDisabled?.(item) && (
              <Checkbox
                checked={false}
                disabled
                aria-label={selection.rowLabel?.(item) ?? t('Select row %rowKey%', { replacements: { rowKey } })}
                className="align-middle"
              />
            )
          )}
        </TableCell>
      )}
      {rowNumber !== undefined && (
        <TableCell className={cn(BODY_CELL_CLASS, INDEX_CELL_CLASS)} role={roleIn(layout, 'cell')} {...pinProps(layout, selection ? 1 : 0, false)}>
          {rowNumber}
        </TableCell>
      )}
      {columns.map((column, index) => (
        <TableCell
          key={column.id}
          className={cn(BODY_CELL_CLASS, column.className, cellLayoutClass(layout, column.align))}
          role={roleIn(layout, 'cell')}
          {...pinProps(layout, leading + index, false)}
        >
          {cellContent(layout, column.cell(item), column.align)}
        </TableCell>
      ))}
    </TableRow>
  );
};

/** What the table measures after hydration: its visible width, its scroll width and (content-sized) its header cells. */
interface TableMeasure {
  visibleWidth: number;
  scrollWidth: number;
  cellWidths: number[];
}

const sameMeasure = (previous: TableMeasure | null, next: TableMeasure) =>
  previous !== null &&
  previous.visibleWidth === next.visibleWidth &&
  previous.scrollWidth === next.scrollWidth &&
  previous.cellWidths.length === next.cellWidths.length &&
  previous.cellWidths.every((width, index) => Math.abs(width - (next.cellWidths[index] ?? 0)) < 0.5);

/**
 * Table view of an entity list: one scroll container that fills its card, sticky header, skeleton rows on the
 * first load, an empty / no-results / error block, and the infinite-scroll tail. Use it inside `EntityListPage`
 * (directly or through `EntityListBody`), or on its own (it then brings its own card border via `className`).
 *
 * Optional, per table: column tracks (`width`, `minWidth`), pinned columns (`pin`), alignment (`align`), sortable
 * headers (`sortKey` + `sort` / `onSortChange`) and a row index (`showRowIndex`). A table that uses none of them renders
 * exactly as before they existed. Sizes are measured only after hydration; the server render and the hydration render
 * use the CSS form of the same tracks.
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
  sort,
  onSortChange,
  sortRequired = false,
  showRowIndex = false,
  rowClassName,
}: EntityListTableProps<TItem>) => {
  const { t } = useTranslate();
  const headerTopStyle = stickyHeaderTop ? { top: stickyHeaderTop } : undefined;
  const hasFilterRow = columns.some(column => column.filter !== undefined);
  const showRows = !error && !isLoading && items.length > 0;

  // ── layout: tracks, pins, row index (all optional; none of them → the content-sized table as before) ──────────────
  const leadingCount = (selection ? 1 : 0) + (showRowIndex ? 1 : 0);
  const tracks: ListTrack[] = [
    ...(selection ? [{ width: `${SELECT_TRACK_PX}px` }] : []),
    ...(showRowIndex ? [{ width: `${indexTrackPx(selection !== undefined)}px` }] : []),
    ...columns.map(column => ({ width: column.width, minWidth: column.minWidth })),
  ];
  const sized = hasListTracks(columns);
  const usesLayout = sized || showRowIndex || columns.some(column => column.pin !== undefined);
  const trackSignature = tracks.map(track => `${track.width ?? ''}/${track.minWidth ?? ''}`).join(' ');
  // `'content'` tracks: their header cells are measured like the cells of a content-sized table
  const measuresCells = !sized || tracks.some(isContentTrack);

  const scrollRef = useRef<HTMLDivElement>(null);
  const headerRowRef = useRef<HTMLTableRowElement>(null);
  const [measure, setMeasure] = useState<TableMeasure | null>(null);

  // After hydration only (effects never run on the server, and the first client render matches the server HTML):
  // the visible width, and in a content-sized table the header cells, re-read on every resize. The scroll position is
  // written to the DOM directly (pinned cells show their surface and edge only while content is under them).
  // biome-ignore lint/correctness/useExhaustiveDependencies: trackSignature re-subscribes when the columns change
  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    if (!usesLayout || !scroller || typeof ResizeObserver === 'undefined') return;
    const syncScrollEdges = () => {
      const overflow = scroller.scrollWidth - scroller.clientWidth;
      const scrolled = Math.abs(scroller.scrollLeft);
      scroller.toggleAttribute('data-list-overflow-start', overflow > 1 && scrolled > 1);
      scroller.toggleAttribute('data-list-overflow-end', overflow > 1 && scrolled < overflow - 1);
    };
    const read = () => {
      const visibleWidth = scroller.clientWidth;
      if (visibleWidth <= 0) {
        // hidden (e.g. the table below `md` next to the phone cards): nothing to lay out
        setMeasure(previous => (previous === null ? previous : null));
        return;
      }
      const cellWidths = measuresCells
        ? Array.from(headerRowRef.current?.children ?? [], cell => cell.getBoundingClientRect().width)
        : [];
      const next = { visibleWidth, scrollWidth: scroller.scrollWidth, cellWidths };
      setMeasure(previous => (sameMeasure(previous, next) ? previous : next));
      syncScrollEdges();
    };
    const observer = new ResizeObserver(read);
    observer.observe(scroller);
    const table = scroller.querySelector('table');
    if (table) observer.observe(table);
    if (measuresCells) for (const cell of Array.from(headerRowRef.current?.children ?? [])) observer.observe(cell);
    scroller.addEventListener('scroll', syncScrollEdges, { passive: true });
    read();
    return () => {
      observer.disconnect();
      scroller.removeEventListener('scroll', syncScrollEdges);
      scroller.removeAttribute('data-list-overflow-start');
      scroller.removeAttribute('data-list-overflow-end');
    };
  }, [usesLayout, sized, measuresCells, trackSignature]);

  let gridStyle: CSSProperties | undefined;
  let placements: (ListPinPlacement | null)[] | null = null;
  if (usesLayout) {
    const pinRequests: ListPinRequest[] = [
      ...Array.from({ length: leadingCount }, () => ({ always: true })),
      ...columns.map(column => ({ pin: column.pin })),
    ];
    if (sized) {
      const measuredTracks = tracks.map((track, index) =>
        isContentTrack(track) ? { ...track, contentWidth: measure?.cellWidths[index] } : track
      );
      const contentKnown = measure !== null && (measure.cellWidths.length === tracks.length || !tracks.some(isContentTrack));
      const computed = measure && contentKnown ? computeListTracks(measuredTracks, measure.visibleWidth) : null;
      const fixedWidths = tracks.map(track => (track.width?.endsWith('px') ? Number.parseFloat(track.width) : null));
      placements = resolveListPins(pinRequests, {
        widths: computed?.widths ?? fixedWidths,
        visibleWidth: measure?.visibleWidth ?? null,
        scrollWidth: computed?.scrollWidth ?? null,
      }).placements;
      gridStyle = computed
        ? { gridTemplateColumns: listTrackLayoutTemplate(measuredTracks, computed.widths), minWidth: computed.scrollWidth }
        : { gridTemplateColumns: listTrackTemplate(tracks), minWidth: minimumListWidth(tracks) };
    } else {
      const measured = measure && measure.cellWidths.length === tracks.length ? measure : null;
      placements = resolveListPins(pinRequests, {
        widths: measured?.cellWidths ?? tracks.map(() => null),
        visibleWidth: measured?.visibleWidth ?? null,
        scrollWidth: measured?.scrollWidth ?? null,
      }).placements;
    }
  }
  const layout: CellLayout = { tracks: sized, placements };
  const headerCellProps = (position: number, extraStyle?: CSSProperties) => {
    const pin = pinProps(layout, position, true);
    const style = pin || extraStyle ? { ...extraStyle, ...pin?.style } : undefined;
    return { ...pin, style, role: roleIn(layout, 'columnheader') };
  };
  const indexPosition = selection ? 1 : 0;

  return (
    <div
      ref={scrollRef}
      data-entity-list-scroll
      className={cn('relative overflow-auto md:min-h-0 md:flex-1', className)}
      aria-busy={isLoading || isFetchingMore}
    >
      <table
        className="w-full caption-bottom text-sm"
        data-list-tracks={sized ? '' : undefined}
        role={roleIn(layout, 'table')}
        style={gridStyle}
      >
        <TableHeader
          className="[&_tr]:border-0"
          role={roleIn(layout, 'rowgroup')}
          style={sized && headerTopStyle ? headerTopStyle : undefined}
        >
          <TableRow ref={headerRowRef} className="hover:bg-transparent" role={roleIn(layout, 'row')}>
            {selection && (
              <TableHead className={cn(HEADER_CELL_CLASS, 'top-0', SELECT_CELL_CLASS)} {...headerCellProps(0, headerTopStyle)}>
                <SelectAllHeader selection={selection} disabled={isLoading || items.length === 0} />
              </TableHead>
            )}
            {showRowIndex && (
              <TableHead className={cn(HEADER_CELL_CLASS, 'top-0', INDEX_CELL_CLASS)} {...headerCellProps(indexPosition, headerTopStyle)}>
                <span aria-hidden>#</span>
                <span className="sr-only">{t('Row number')}</span>
              </TableHead>
            )}
            {columns.map((column, index) => {
              const label = typeof column.header === 'string' ? t(column.header) : column.header;
              const sortable = column.sortKey !== undefined && onSortChange !== undefined;
              const direction = sortable && sort && sort.key === column.sortKey ? sort.direction : undefined;
              return (
                <TableHead
                  key={column.id}
                  className={cn(HEADER_CELL_CLASS, 'top-0', column.className, cellLayoutClass(layout, column.align))}
                  aria-sort={direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : undefined}
                  {...headerCellProps(leadingCount + index, headerTopStyle)}
                >
                  {cellContent(
                    layout,
                    sortable ? (
                      <SortHeaderButton
                        label={label}
                        direction={direction}
                        onClick={() =>
                          onSortChange(nextListSort(sort, column.sortKey as string, { start: column.sortStart, required: sortRequired }))
                        }
                        iconFirst={column.align === 'end'}
                      />
                    ) : (
                      label
                    ),
                    column.align
                  )}
                </TableHead>
              );
            })}
          </TableRow>
          {hasFilterRow && (
            <TableRow className="hover:bg-transparent" role={roleIn(layout, 'row')}>
              {selection && <TableHead className={cn(HEADER_CELL_CLASS, 'top-12 py-2.5', SELECT_CELL_CLASS)} {...headerCellProps(0)} />}
              {showRowIndex && (
                <TableHead className={cn(HEADER_CELL_CLASS, 'top-12 py-2.5', INDEX_CELL_CLASS)} {...headerCellProps(indexPosition)} />
              )}
              {columns.map((column, index) => (
                <TableHead
                  key={column.id}
                  className={cn(HEADER_CELL_CLASS, 'top-12 py-2.5 font-normal normal-case', column.className, cellLayoutClass(layout, column.align))}
                  {...headerCellProps(leadingCount + index)}
                >
                  {column.filter === undefined ? column.filter : cellContent(layout, column.filter, column.align)}
                </TableHead>
              ))}
            </TableRow>
          )}
        </TableHeader>
        <TableBody role={roleIn(layout, 'rowgroup')}>
          {isLoading && !error
            ? Array.from({ length: skeletonRows }, (_, row) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder rows
                <TableRow key={row} className="hover:bg-transparent" aria-hidden role={roleIn(layout, 'row')}>
                  {selection && (
                    <TableCell className={cn(BODY_CELL_CLASS, SELECT_CELL_CLASS)} role={roleIn(layout, 'cell')} {...pinProps(layout, 0, false)}>
                      <Skeleton className="size-4" />
                    </TableCell>
                  )}
                  {showRowIndex && (
                    <TableCell
                      className={cn(BODY_CELL_CLASS, INDEX_CELL_CLASS)}
                      role={roleIn(layout, 'cell')}
                      {...pinProps(layout, indexPosition, false)}
                    >
                      <Skeleton className="h-4 w-5" />
                    </TableCell>
                  )}
                  {columns.map((column, index) => (
                    <TableCell
                      key={column.id}
                      className={cn(BODY_CELL_CLASS, column.className, cellLayoutClass(layout, column.align))}
                      role={roleIn(layout, 'cell')}
                      {...pinProps(layout, leadingCount + index, false)}
                    >
                      <Skeleton className="h-4 w-full min-w-12" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : showRows &&
              items.map((item, index) => (
                <EntityListTableRow
                  key={getRowKey(item)}
                  rowKey={getRowKey(item)}
                  item={item}
                  columns={columns}
                  action={rowAction ? rowAction(item) : undefined}
                  selection={selection}
                  rowNumber={showRowIndex ? index + 1 : undefined}
                  layout={layout}
                  className={rowClassName?.(item, index)}
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
