'use client';

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import {
  type CSSProperties,
  type KeyboardEvent,
  memo,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Checkbox, Skeleton, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../primitives/index.ts';
import { useTranslate } from '../i18n/index.ts';
import { cn } from '../primitives/cn.ts';
import { EntityListLoadMore } from './EntityListLoadMore.tsx';
import { EntityListStatus } from './EntityListStatus.tsx';
import type { EntityListDataProps, RowActionResolver } from './types.ts';
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
import type { EntityListSelection, SelectionModifiers } from '../logic/react/useRowSelection.ts';

export interface EntityListColumn<TItem> {
  id: string;
  header: ReactNode;
  cell: (item: TItem) => ReactNode;
  /** Content of this column's cell in an optional filter row under the header (prefer the toolbar search). */
  filter?: ReactNode;
  /** Classes of the column's header and body cells. In a table with tracks a width class does not size the column. */
  className?: string;
  /** Classes of the column's header cell only (with `className`). */
  headerClassName?: string;
  /** Classes of the column's body cells only (with `className`; also its skeleton cells). */
  cellClassName?: string;
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
  /**
   * Rows with a `rowAction` become a tab stop: Enter or Space on the focused row runs the action (a focus ring marks
   * it). Off by default (the row's own labelled controls keep the action reachable); for lists whose rows have no
   * such control.
   */
  rowKeyboardActivation?: boolean;
  /**
   * What toggles a row's selection: `checkbox` (default) the checkbox only; `cell` the whole selection cell (a larger
   * target; the click never runs the row action). Shift with a click passes `{ shiftKey: true }` to `setItemSelected`
   * either way (`useRowSelection({ rangeSelection: true })` selects the range).
   */
  selectionHitArea?: 'checkbox' | 'cell';
  /**
   * A table whose tracks are all fixed (`'120px'`) or `'content'` fills its container with an empty filler track
   * (before a trailing run of end-pinned columns, so a row's actions stay at the right edge). Default `false`: such a
   * table is as wide as its tracks.
   */
  fillWidth?: boolean;
  /**
   * Where the header sticks. `scroller` (default): inside the table's own scroll container. `page` (a table with
   * tracks): the header sticks to the page (at `stickyHeaderTop`) while the body scrolls sideways in its own scroller
   * and the header follows it; the table's ancestors up to the page must not scroll or clip. Without tracks `page`
   * behaves like `scroller`.
   */
  stickyHeader?: 'scroller' | 'page';
  /** Sortable headers that are not sorted carry `aria-sort="none"` (default: no attribute on them). */
  markUnsortedHeaders?: boolean;
  /** Which body rows tint on hover: `all` (default) or `action` (only rows with a row action, and selected rows keep their tint). */
  rowHover?: 'all' | 'action';
  /**
   * How a pinned column's scroll edge is drawn. `cell` (default): each pinned edge cell draws its own rule and shadow.
   * `overlay`: one continuous rule and shadow per side across the header and the body (no seams between rows).
   */
  pinEdge?: 'cell' | 'overlay';
  /** Width in px of the selection column (default 40: the 24 px card-edge inset and the 16 px checkbox). */
  selectionColumnWidth?: number;
  /** Width in px of the row index column (default 48 after the selection column, else 56). */
  indexColumnWidth?: number;
  /** Extra classes of the selection column's header and body cells. */
  selectionCellClassName?: string;
  /** Extra classes of the row index column's header and body cells. */
  indexCellClassName?: string;
  /**
   * The colour header cells and pinned cells paint (a CSS colour, e.g. `var(--color-popover)` for a table on a
   * popover). Default: the card colour. Set as `--list-surface` on the table's scroll container.
   */
  surface?: string;
  /**
   * The accessible name and tooltip of the "select all" checkbox, from the loaded row count and whether more rows exist
   * on the server (already translated). Default "Select all loaded".
   */
  selectAllLabel?: (loadedCount: number, hasMore: boolean) => string;
  /**
   * What a fixed column `width` (`'120px'`) and a `minWidth` measure. `border-box` (default): the cell including its
   * inline padding (16 px each side, 24 px at the card edge). `content-box`: the content only; the table adds the
   * cell's padding to the track.
   */
  columnWidthBox?: 'border-box' | 'content-box';
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

/** The header's sticky offset and a leading cell's own width, merged (either may be absent). */
const leadingStyle = (top: CSSProperties | undefined, own: CSSProperties | undefined): CSSProperties | undefined =>
  top || own ? { ...own, ...top } : undefined;

/** Cell content: as is in a content-sized table, in a shrinkable box in a table with tracks. */
const cellContent = (layout: CellLayout, content: ReactNode, align?: ListColumnAlign) =>
  layout.tracks ? <div className={cn(TRACK_CONTENT_CLASS, align && ALIGN_CLASS[align])}>{content}</div> : content;

/** Classes a cell adds for the layout: wrapping in a table with tracks, the alignment on the cell otherwise. */
const cellLayoutClass = (layout: CellLayout, align?: ListColumnAlign) =>
  layout.tracks ? TRACK_CELL_CLASS : align && ALIGN_CLASS[align];

/** `role` of a table element in a table with tracks: `display: grid` drops the native table semantics in some browsers. */
const roleIn = (layout: CellLayout, role: 'table' | 'rowgroup' | 'row' | 'columnheader' | 'cell') => (layout.tracks ? role : undefined);

const SelectAllHeader = <TItem,>({ selection, disabled, label }: { selection: EntityListSelection<TItem>; disabled: boolean; label?: string }) => {
  const { t } = useTranslate();
  const text = label ?? t('Select all loaded');
  return (
  <Checkbox
    checked={selection.allLoadedState}
    onCheckedChange={checked => selection.setAllLoadedSelected(checked === true)}
    disabled={disabled || selection.disabled}
    aria-label={text}
    title={text}
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
  /** The table's resolver; the row resolves its own action (memoised per item). */
  rowAction?: RowActionResolver<TItem>;
  /** The row's selection state (absent: no selection column). */
  selection?: RowSelectionCell;
  /** Sets the row's selection (stable: the table forwards it to the current `selection`). */
  onSelect: (item: TItem, selected: boolean, modifiers: SelectionModifiers) => void;
  hitArea: 'checkbox' | 'cell';
  /** 1-based position among the loaded rows, when the table shows the row index. */
  rowNumber?: number;
  layout: CellLayout;
  /** Index among `columns` before which the filler cell sits; `null`: none. */
  fillerBefore: number | null;
  className?: string;
  keyboardActivation?: boolean;
  /** Only rows with an action (or selected) tint on hover. */
  hoverOnlyWithAction: boolean;
  /** The leading columns' own sizes and classes (`selectionColumnWidth`, `indexCellClassName`, …). */
  leadingCells: LeadingCells;
}

/** Sizes and classes of the selection and row index cells; one object per table (the memoised rows compare it). */
interface LeadingCells {
  selectClassName: string;
  indexClassName: string;
  /** Inline width of the selection cell in a content-sized table (`selectionColumnWidth`). */
  selectStyle?: CSSProperties;
  /** Inline width of the row index cell in a content-sized table (`indexColumnWidth`). */
  indexStyle?: CSSProperties;
}

/** Merges a pinned cell's props with an extra inline style. */
const withStyle = <T extends { style?: CSSProperties } | undefined>(props: T, style: CSSProperties | undefined) =>
  style ? { ...props, style: { ...style, ...props?.style } } : props;

/** Shift with a press in the selection cell extends the selection: it must not select the page's text. */
const preventShiftSelection = (event: MouseEvent<HTMLElement>) => {
  if (event.shiftKey) event.preventDefault();
};

/** What a row's selection cell needs: plain values, so a row re-renders only when its own state changes. */
interface RowSelectionCell {
  selected: boolean;
  selectable: boolean;
  /** A row with a key the selection refuses: a disabled checkbox. */
  refused: boolean;
  /** Every checkbox is locked (a bulk action runs). */
  locked: boolean;
  label: string;
}

/** An empty cell in the filler track (`fillWidth`): hidden from assistive technology. */
const FillerCell = ({ header = false, className }: { header?: boolean; className?: string }) =>
  header ? (
    <TableHead aria-hidden data-list-filler="" className={cn(HEADER_CELL_CLASS, 'px-0 first:pl-0 last:pr-0', className)} />
  ) : (
    <TableCell aria-hidden data-list-filler="" className="p-0" />
  );

const EntityListTableRowView = <TItem,>({
  item,
  rowKey,
  columns,
  rowAction,
  selection,
  onSelect,
  hitArea,
  rowNumber,
  layout,
  fillerBefore,
  className,
  keyboardActivation = false,
  hoverOnlyWithAction,
  leadingCells,
}: EntityListTableRowProps<TItem>) => {
  const action = useMemo(() => (rowAction ? rowAction(item) : undefined), [rowAction, item]);
  const activation = useRowActivation(action);
  const keyboard =
    keyboardActivation && action
      ? {
          tabIndex: 0,
          onKeyDown: (event: KeyboardEvent<HTMLTableRowElement>) => {
            // only the row itself: a focused control inside it keeps its own keys
            if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return;
            event.preventDefault();
            action();
          },
        }
      : undefined;
  const selected = selection?.selected ?? false;
  const leading = (selection ? 1 : 0) + (rowNumber !== undefined ? 1 : 0);
  // Shift with a click: the range is the selection's to resolve; the checkbox does not toggle on its own then
  const onCheckboxClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (!event.shiftKey) return;
    event.preventDefault();
    onSelect(item, !selected, { shiftKey: true });
  };
  const onSelectCellClick =
    hitArea === 'cell' && selection?.selectable && !selection.locked
      ? (event: MouseEvent<HTMLTableCellElement>) => {
          if (event.target instanceof Element && event.target.closest('button')) return;
          onSelect(item, !selected, { shiftKey: event.shiftKey });
        }
      : undefined;
  const cells = columns.map((column, index) => (
    <TableCell
      key={column.id}
      className={cn(BODY_CELL_CLASS, column.className, column.cellClassName, cellLayoutClass(layout, column.align))}
      role={roleIn(layout, 'cell')}
      {...pinProps(layout, leading + index + (fillerBefore !== null && index >= fillerBefore ? 1 : 0), false)}
    >
      {cellContent(layout, column.cell(item), column.align)}
    </TableCell>
  ));
  if (fillerBefore !== null) cells.splice(fillerBefore, 0, <FillerCell key="list-filler" />);
  return (
    <TableRow
      className={cn(
        'group/row',
        action && 'cursor-pointer',
        hoverOnlyWithAction && !action && '[&:not([data-state=selected]):hover]:bg-transparent',
        keyboard && 'focus-visible:bg-muted/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
        className
      )}
      data-state={selected ? 'selected' : undefined}
      data-list-row-hover={hoverOnlyWithAction && !action ? 'none' : undefined}
      role={roleIn(layout, 'row')}
      {...activation}
      {...keyboard}
    >
      {selection && (
        <TableCell
          className={cn(BODY_CELL_CLASS, leadingCells.selectClassName, onSelectCellClick && 'cursor-pointer')}
          data-row-action-ignore
          role={roleIn(layout, 'cell')}
          onClick={onSelectCellClick}
          onMouseDown={preventShiftSelection}
          {...withStyle(pinProps(layout, 0, false), leadingCells.selectStyle)}
        >
          {selection.selectable ? (
            <Checkbox
              checked={selected}
              onCheckedChange={checked => onSelect(item, checked === true, { shiftKey: false })}
              onClick={onCheckboxClick}
              disabled={selection.locked}
              aria-label={selection.label}
              className="align-middle"
            />
          ) : (
            selection.refused && <Checkbox checked={false} disabled aria-label={selection.label} className="align-middle" />
          )}
        </TableCell>
      )}
      {rowNumber !== undefined && (
        <TableCell
          className={cn(BODY_CELL_CLASS, leadingCells.indexClassName)}
          role={roleIn(layout, 'cell')}
          {...withStyle(pinProps(layout, selection ? 1 : 0, false), leadingCells.indexStyle)}
        >
          {rowNumber}
        </TableCell>
      )}
      {cells}
    </TableRow>
  );
};

const sameSelectionCell = (left: RowSelectionCell | undefined, right: RowSelectionCell | undefined) =>
  left === right ||
  (left !== undefined &&
    right !== undefined &&
    left.selected === right.selected &&
    left.selectable === right.selectable &&
    left.refused === right.refused &&
    left.locked === right.locked &&
    left.label === right.label);

/**
 * A body row, memoised: it re-renders when its item, its selection state, the columns, the row action resolver or the
 * layout change. Keep `columns` and `rowAction` stable (`useMemo` / `useCallback`) and the rows skip the re-render of a
 * parent update (a selection change re-renders only the rows it touches).
 */
const EntityListTableRow = memo(
  EntityListTableRowView,
  (previous, next) =>
    previous.item === next.item &&
    previous.rowKey === next.rowKey &&
    previous.columns === next.columns &&
    previous.rowAction === next.rowAction &&
    previous.onSelect === next.onSelect &&
    previous.hitArea === next.hitArea &&
    previous.rowNumber === next.rowNumber &&
    previous.layout === next.layout &&
    previous.fillerBefore === next.fillerBefore &&
    previous.className === next.className &&
    previous.keyboardActivation === next.keyboardActivation &&
    previous.hoverOnlyWithAction === next.hoverOnlyWithAction &&
    previous.leadingCells === next.leadingCells &&
    sameSelectionCell(previous.selection, next.selection)
) as typeof EntityListTableRowView;

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
  emptyAction,
  emptyIcon,
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
  rowKeyboardActivation = false,
  selectionHitArea = 'checkbox',
  fillWidth = false,
  stickyHeader = 'scroller',
  markUnsortedHeaders = false,
  rowHover = 'all',
  pinEdge = 'cell',
  selectionColumnWidth,
  indexColumnWidth,
  selectionCellClassName,
  indexCellClassName,
  surface,
  selectAllLabel,
  columnWidthBox = 'border-box',
}: EntityListTableProps<TItem>) => {
  const { t } = useTranslate();
  const hasFilterRow = columns.some(column => column.filter !== undefined);
  const showRows = !error && !isLoading && items.length > 0;

  // ── layout: tracks, pins, row index (all optional; none of them → the content-sized table as before) ──────────────
  const leadingCount = (selection ? 1 : 0) + (showRowIndex ? 1 : 0);
  const sized = hasListTracks(columns);
  // `fillWidth`: a filler track when no column takes a share of the free width, before the trailing end pins
  const allFixed = columns.every(column => column.width !== undefined && !column.width.endsWith('fr'));
  let fillerBefore: number | null = null;
  if (fillWidth && sized && allFixed) {
    fillerBefore = columns.length;
    while (fillerBefore > 0 && columns[fillerBefore - 1]?.pin === 'end') fillerBefore -= 1;
  }
  const columnPosition = (index: number) => leadingCount + index + (fillerBefore !== null && index >= fillerBefore ? 1 : 0);
  const positionCount = leadingCount + columns.length + (fillerBefore !== null ? 1 : 0);
  // `content-box`: a fixed width and a minimum name the content; the track adds the cell's inline padding
  const contentBoxTrack = (column: EntityListColumn<TItem>, index: number): ListTrack => {
    const position = columnPosition(index);
    const padding = (position === 0 ? 24 : 16) + (position === positionCount - 1 ? 24 : 16);
    const width = column.width?.endsWith('px') ? `${Number.parseFloat(column.width) + padding}px` : column.width;
    return { width, minWidth: column.minWidth === undefined ? undefined : column.minWidth + padding };
  };
  const columnTracks: ListTrack[] = columns.map((column, index) =>
    columnWidthBox === 'content-box' ? contentBoxTrack(column, index) : { width: column.width, minWidth: column.minWidth }
  );
  if (fillerBefore !== null) columnTracks.splice(fillerBefore, 0, { width: '1fr', minWidth: 0 });
  const selectTrackPx = selectionColumnWidth ?? SELECT_TRACK_PX;
  const indexPx = indexColumnWidth ?? indexTrackPx(selection !== undefined);
  const tracks: ListTrack[] = [
    ...(selection ? [{ width: `${selectTrackPx}px` }] : []),
    ...(showRowIndex ? [{ width: `${indexPx}px` }] : []),
    ...columnTracks,
  ];
  // the leading cells' classes and (content-sized table) inline widths; one object while they stay the same
  const leadingCells = useMemo<LeadingCells>(
    () => ({
      selectClassName: cn(SELECT_CELL_CLASS, selectionCellClassName),
      indexClassName: cn(INDEX_CELL_CLASS, indexCellClassName),
      selectStyle: selectionColumnWidth !== undefined && !sized ? { width: selectionColumnWidth, minWidth: selectionColumnWidth } : undefined,
      indexStyle: indexColumnWidth !== undefined && !sized ? { width: indexColumnWidth, minWidth: indexColumnWidth } : undefined,
    }),
    [selectionCellClassName, indexCellClassName, selectionColumnWidth, indexColumnWidth, sized]
  );
  const overlayEdges = pinEdge === 'overlay';
  const surfaceStyle = surface ? ({ '--list-surface': surface } as CSSProperties) : undefined;
  const headerSurfaceClass = surface ? 'bg-(--list-surface)' : undefined;
  const usesLayout = sized || showRowIndex || columns.some(column => column.pin !== undefined);
  const trackSignature = tracks.map(track => `${track.width ?? ''}/${track.minWidth ?? ''}`).join(' ');
  // `'content'` tracks: their header cells are measured like the cells of a content-sized table
  const measuresCells = !sized || tracks.some(isContentTrack);
  // the header sticks to the page while the body scrolls sideways in its own scroller (tables with tracks)
  const pageHeader = stickyHeader === 'page' && sized;
  const headerTopStyle = stickyHeaderTop && !pageHeader ? { top: stickyHeaderTop } : undefined;

  const scrollRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const headerRowRef = useRef<HTMLTableRowElement>(null);
  const pageHostRef = useRef<HTMLDivElement>(null);
  const edgeOriginRef = useRef<HTMLDivElement>(null);
  const edgeStartRef = useRef<HTMLDivElement>(null);
  const edgeEndRef = useRef<HTMLDivElement>(null);
  const [measure, setMeasure] = useState<TableMeasure | null>(null);

  // `pinEdge="overlay"`: one rule per side over header and body, placed at the pinned edge cell of the header row
  // (written to the DOM directly, like the scroll attributes)
  const positionEdgeOverlays = useCallback(() => {
    const scroller = scrollRef.current;
    const origin = edgeOriginRef.current;
    if (!overlayEdges || !scroller || !origin) return;
    const host = pageHeader ? pageHostRef.current : scroller;
    if (!host) return;
    const originRect = origin.getBoundingClientRect();
    const hostRect = host.getBoundingClientRect();
    const scrollerRect = scroller.getBoundingClientRect();
    const tableRect = scroller.querySelector('table')?.getBoundingClientRect();
    const rtl = window.getComputedStyle(scroller).direction === 'rtl';
    const edges: [ListPinPlacement['side'], HTMLDivElement | null][] = [
      ['start', edgeStartRef.current],
      ['end', edgeEndRef.current],
    ];
    for (const [side, element] of edges) {
      if (!element) continue;
      const cell = headerRowRef.current?.querySelector(`[data-list-pin="${side}"][data-list-pin-edge]`);
      element.hidden = !cell;
      if (!cell) continue;
      const cellRect = cell.getBoundingClientRect();
      const towardsEnd = (side === 'start') !== rtl;
      element.setAttribute('data-list-edge-shadow', towardsEnd ? 'right' : 'left');
      element.style.left = `${(towardsEnd ? cellRect.right : cellRect.left) - originRect.left}px`;
      if (pageHeader) {
        element.style.top = '0px';
        element.style.height = `${Math.max(0, scrollerRect.top - hostRect.top + scroller.clientHeight)}px`;
      } else {
        const visibleBottom = Math.min(scrollerRect.top + scroller.clientHeight, tableRect?.bottom ?? scrollerRect.bottom);
        element.style.top = `${scrollerRect.top - originRect.top}px`;
        element.style.height = `${Math.max(0, visibleBottom - scrollerRect.top)}px`;
      }
    }
  }, [overlayEdges, pageHeader]);

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
      const header = headerScrollRef.current;
      const pageHost = overlayEdges ? pageHostRef.current : null;
      for (const element of [scroller, header, pageHost]) {
        if (!element) continue;
        element.toggleAttribute('data-list-overflow-start', overflow > 1 && scrolled > 1);
        element.toggleAttribute('data-list-overflow-end', overflow > 1 && scrolled < overflow - 1);
      }
      if (header && header.scrollLeft !== scroller.scrollLeft) header.scrollLeft = scroller.scrollLeft;
      positionEdgeOverlays();
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
      for (const element of [scroller, headerScrollRef.current, pageHostRef.current]) {
        element?.removeAttribute('data-list-overflow-start');
        element?.removeAttribute('data-list-overflow-end');
      }
    };
  }, [usesLayout, sized, measuresCells, trackSignature, pageHeader, positionEdgeOverlays]);
  // the pinned edge cells move with the placements (a re-render): the overlays follow
  useLayoutEffect(() => {
    if (overlayEdges) positionEdgeOverlays();
  });

  let gridStyle: CSSProperties | undefined;
  let placements: (ListPinPlacement | null)[] | null = null;
  if (usesLayout) {
    const columnPins: ListPinRequest[] = columns.map(column => ({ pin: column.pin }));
    if (fillerBefore !== null) columnPins.splice(fillerBefore, 0, {});
    const pinRequests: ListPinRequest[] = [...Array.from({ length: leadingCount }, () => ({ always: true })), ...columnPins];
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
  // one layout object while the placements stay the same: the memoised rows skip re-rendering
  const placementSignature = placements ? JSON.stringify(placements) : '';
  // biome-ignore lint/correctness/useExhaustiveDependencies: placementSignature stands for placements
  const layout = useMemo<CellLayout>(() => ({ tracks: sized, placements }), [sized, placementSignature]);
  const headerCellProps = (position: number, extraStyle?: CSSProperties) => {
    const pin = pinProps(layout, position, true);
    const style = pin || extraStyle ? { ...extraStyle, ...pin?.style } : undefined;
    return { ...pin, style, role: roleIn(layout, 'columnheader') };
  };
  const indexPosition = selection ? 1 : 0;

  // the rows get a stable setter that always reaches the current selection
  const selectionRef = useRef(selection);
  useLayoutEffect(() => {
    selectionRef.current = selection;
  });
  const onSelect = useCallback(
    (item: TItem, selected: boolean, modifiers: SelectionModifiers) => selectionRef.current?.setItemSelected(item, selected, modifiers),
    []
  );

  /** The column cells of a header-like row, with the filler cell in its place. */
  const withFiller = (cells: ReactNode[], filler: ReactNode) => {
    if (fillerBefore !== null) cells.splice(fillerBefore, 0, filler);
    return cells;
  };

  const header = (
    <TableHeader
      className="[&_tr]:border-0"
      role={roleIn(layout, 'rowgroup')}
      style={sized && headerTopStyle ? headerTopStyle : undefined}
    >
      <TableRow ref={headerRowRef} className="hover:bg-transparent" role={roleIn(layout, 'row')}>
        {selection && (
          <TableHead
            className={cn(HEADER_CELL_CLASS, headerSurfaceClass, 'top-0', leadingCells.selectClassName)}
            onMouseDown={preventShiftSelection}
            {...headerCellProps(0, leadingStyle(headerTopStyle, leadingCells.selectStyle))}
          >
            <SelectAllHeader
              selection={selection}
              disabled={isLoading || items.length === 0}
              label={selectAllLabel?.(items.length, hasMore)}
            />
          </TableHead>
        )}
        {showRowIndex && (
          <TableHead
            className={cn(HEADER_CELL_CLASS, headerSurfaceClass, 'top-0', leadingCells.indexClassName)}
            {...headerCellProps(indexPosition, leadingStyle(headerTopStyle, leadingCells.indexStyle))}
          >
            <span aria-hidden>#</span>
            <span className="sr-only">{t('Row number')}</span>
          </TableHead>
        )}
        {withFiller(
          columns.map((column, index) => {
            const label = typeof column.header === 'string' ? t(column.header) : column.header;
            const sortable = column.sortKey !== undefined && onSortChange !== undefined;
            const direction = sortable && sort && sort.key === column.sortKey ? sort.direction : undefined;
            return (
              <TableHead
                key={column.id}
                className={cn(HEADER_CELL_CLASS, headerSurfaceClass, 'top-0', column.className, column.headerClassName, cellLayoutClass(layout, column.align))}
                aria-sort={
                  direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : sortable && markUnsortedHeaders ? 'none' : undefined
                }
                {...headerCellProps(columnPosition(index), headerTopStyle)}
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
          }),
          <FillerCell key="list-filler" header className={cn(headerSurfaceClass, 'top-0')} />
        )}
      </TableRow>
      {hasFilterRow && (
        <TableRow className="hover:bg-transparent" role={roleIn(layout, 'row')}>
          {selection && (
            <TableHead
              className={cn(HEADER_CELL_CLASS, headerSurfaceClass, 'top-12 py-2.5', leadingCells.selectClassName)}
              {...headerCellProps(0, leadingCells.selectStyle)}
            />
          )}
          {showRowIndex && (
            <TableHead
              className={cn(HEADER_CELL_CLASS, headerSurfaceClass, 'top-12 py-2.5', leadingCells.indexClassName)}
              {...headerCellProps(indexPosition, leadingCells.indexStyle)}
            />
          )}
          {withFiller(
            columns.map((column, index) => (
              <TableHead
                key={column.id}
                className={cn(
                  HEADER_CELL_CLASS,
                  headerSurfaceClass,
                  'top-12 py-2.5 font-normal normal-case',
                  column.className,
                  column.headerClassName,
                  cellLayoutClass(layout, column.align)
                )}
                {...headerCellProps(columnPosition(index))}
              >
                {column.filter === undefined ? column.filter : cellContent(layout, column.filter, column.align)}
              </TableHead>
            )),
            <FillerCell key="list-filler" header className={cn(headerSurfaceClass, 'top-12 py-2.5')} />
          )}
        </TableRow>
      )}
    </TableHeader>
  );

  const body = (
    <TableBody role={roleIn(layout, 'rowgroup')}>
      {isLoading && !error
        ? Array.from({ length: skeletonRows }, (_, row) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder rows
            <TableRow key={row} className="hover:bg-transparent" aria-hidden role={roleIn(layout, 'row')}>
              {selection && (
                <TableCell
                  className={cn(BODY_CELL_CLASS, leadingCells.selectClassName)}
                  role={roleIn(layout, 'cell')}
                  {...withStyle(pinProps(layout, 0, false), leadingCells.selectStyle)}
                >
                  <Skeleton className="size-4" />
                </TableCell>
              )}
              {showRowIndex && (
                <TableCell
                  className={cn(BODY_CELL_CLASS, leadingCells.indexClassName)}
                  role={roleIn(layout, 'cell')}
                  {...withStyle(pinProps(layout, indexPosition, false), leadingCells.indexStyle)}
                >
                  <Skeleton className="h-4 w-5" />
                </TableCell>
              )}
              {withFiller(
                columns.map((column, index) => (
                  <TableCell
                    key={column.id}
                    className={cn(BODY_CELL_CLASS, column.className, column.cellClassName, cellLayoutClass(layout, column.align))}
                    role={roleIn(layout, 'cell')}
                    {...pinProps(layout, columnPosition(index), false)}
                  >
                    <Skeleton className="h-4 w-full min-w-12" />
                  </TableCell>
                )),
                <FillerCell key="list-filler" />
              )}
            </TableRow>
          ))
        : showRows &&
          items.map((item, index) => {
            const rowKey = getRowKey(item);
            const selectionCell: RowSelectionCell | undefined = selection
              ? {
                  selected: selection.isItemSelected(item),
                  selectable: selection.isItemSelectable(item),
                  refused: selection.isItemSelectionDisabled?.(item) ?? false,
                  locked: selection.disabled === true,
                  label: selection.rowLabel?.(item) ?? t('Select row %rowKey%', { replacements: { rowKey } }),
                }
              : undefined;
            return (
              <EntityListTableRow
                key={rowKey}
                rowKey={rowKey}
                item={item}
                columns={columns}
                rowAction={rowAction}
                selection={selectionCell}
                onSelect={onSelect}
                hitArea={selectionHitArea}
                rowNumber={showRowIndex ? index + 1 : undefined}
                layout={layout}
                fillerBefore={fillerBefore}
                className={rowClassName?.(item, index)}
                keyboardActivation={rowKeyboardActivation}
                hoverOnlyWithAction={rowHover === 'action'}
                leadingCells={leadingCells}
              />
            );
          })}
    </TableBody>
  );

  const tableClass = 'w-full caption-bottom text-sm';
  const edgeOverlays = overlayEdges && usesLayout && (
    <>
      <div ref={edgeOriginRef} aria-hidden data-list-edge-origin="" className="pointer-events-none absolute top-0 left-0 size-0" />
      <div ref={edgeStartRef} aria-hidden hidden data-list-edge-overlay="start" />
      <div ref={edgeEndRef} aria-hidden hidden data-list-edge-overlay="end" />
    </>
  );
  const hostAttributes = {
    'data-list-pin-edges': overlayEdges ? 'overlay' : undefined,
    'data-list-surface': surface ? '' : undefined,
  };
  const status = (
    <>
      <EntityListStatus
        itemCount={items.length}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
        noResultsMessage={noResultsMessage}
        isSearchActive={isSearchActive}
        onClearSearch={onClearSearch}
        loadingMessage={loadingMessage}
        error={error}
        emptyAction={emptyAction}
        emptyIcon={emptyIcon}
      />
      <EntityListLoadMore hasMore={showRows && hasMore} isFetchingMore={isFetchingMore} onLoadMore={onLoadMore} />
    </>
  );

  if (pageHeader) {
    // two tables on one set of tracks: the header in a sticky strip that follows the body's sideways scroll
    return (
      <div
        ref={pageHostRef}
        data-list-page-header=""
        {...hostAttributes}
        role="table"
        className={cn('relative md:min-h-0 md:flex-1', className)}
        style={surfaceStyle}
        aria-busy={isLoading || isFetchingMore}
      >
        <div
          ref={headerScrollRef}
          data-list-sticky-header=""
          className="sticky z-(--layer-raised) overflow-hidden"
          style={{ top: stickyHeaderTop ?? '0px' }}
        >
          <table className={tableClass} data-list-tracks="" role="presentation" style={gridStyle}>
            {header}
          </table>
        </div>
        <div ref={scrollRef} data-entity-list-scroll className="overflow-x-auto overflow-y-hidden">
          <table className={tableClass} data-list-tracks="" role="presentation" style={gridStyle}>
            {body}
          </table>
        </div>
        {status}
        {edgeOverlays}
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      data-entity-list-scroll
      {...hostAttributes}
      className={cn('relative overflow-auto md:min-h-0 md:flex-1', className)}
      style={surfaceStyle}
      aria-busy={isLoading || isFetchingMore}
    >
      <table className={tableClass} data-list-tracks={sized ? '' : undefined} role={roleIn(layout, 'table')} style={gridStyle}>
        {header}
        {body}
      </table>
      {status}
      {edgeOverlays}
    </div>
  );
};
