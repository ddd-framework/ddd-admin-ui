'use client';

import type { ReactNode } from 'react';

import { cn } from '../primitives/cn.ts';
import { EntityListGrid } from './EntityListGrid.tsx';
import { type EntityListColumn, EntityListTable, type EntityListTableProps } from './EntityListTable.tsx';
import type { EntityCardRenderer, EntityListDataProps, ListDisplayMode } from './types.ts';
import type { EntityListSelection } from '../logic/react/useRowSelection.ts';
import { buildEntityListState } from '../logic/pure/listState.ts';
import { useListStateReport } from '../logic/react/useListStateReport.ts';

export interface EntityListBodyProps<TItem, TExtra extends string = never>
  extends EntityListDataProps<TItem>,
    Pick<
      EntityListTableProps<TItem>,
      | 'sort'
      | 'onSortChange'
      | 'sortRequired'
      | 'showRowIndex'
      | 'rowClassName'
      | 'rowKeyboardActivation'
      | 'selectionHitArea'
      | 'fillWidth'
      | 'stickyHeader'
      | 'stickyHeaderTop'
      | 'markUnsortedHeaders'
      | 'rowHover'
      | 'pinEdge'
      | 'selectionColumnWidth'
      | 'indexColumnWidth'
      | 'selectionCellClassName'
      | 'indexCellClassName'
      | 'surface'
      | 'selectAllLabel'
      | 'columnWidthBox'
      | 'cellPaddingX'
      | 'sortIconPosition'
      | 'sortButtonClassName'
      | 'headerRowClassName'
      | 'headerCellClassName'
      | 'tableClassName'
      | 'skeletonClassName'
      | 'scroll'
    > {
  displayMode: ListDisplayMode | TExtra;
  columns: EntityListColumn<TItem>[];
  /** Card of the grid view. Absent → table only (and no view toggle). */
  renderCard?: EntityCardRenderer<TItem>;
  skeletonRows?: number;
  skeletonCards?: number;
  /** Row selection of the table view (`useRowSelection()`); the grid has no checkboxes. */
  selection?: EntityListSelection<TItem>;
  /**
   * Draws the list's own views (`ListExtraView`, `displayMode` other than table / grid) from the loaded items, inside
   * the list card with the grid's skeletons, empty states and infinite-scroll tail. Absent → such a mode shows the
   * table.
   */
  renderExtraView?: (mode: TExtra, items: TItem[]) => ReactNode;
  /**
   * A view that owns its data and its states (e.g. a tree loaded by its own query): drawn in the list card as is,
   * without the paged list's skeletons, empty and error states and infinite-scroll tail. Returns `undefined` for a mode
   * it does not own (then `renderExtraView`, then the table apply). While it is shown, the host leaves the toolbar's
   * search, filters and clear button out when they do not act on it.
   */
  renderOwnView?: (mode: TExtra) => ReactNode | undefined;
  /**
   * From which width the table view shows a table (a list with `renderCard`): `md` (default), `lg` (a table with many
   * columns that is cramped at `md`), or `always` (the table at every width, no cards for it). Pass the same value to
   * `EntityListViewToggle`.
   */
  tableBreakpoint?: ListTableBreakpoint;
}

/** Where the table view of a list with cards switches between cards (below) and the table (from it on). */
export type ListTableBreakpoint = 'md' | 'lg' | 'always';

const TABLE_FROM_CLASS = { md: 'hidden md:block', lg: 'hidden lg:block' } as const;
const CARDS_BELOW_CLASS = { md: 'md:hidden', lg: 'lg:hidden' } as const;

const isExtraMode = <TExtra extends string>(mode: ListDisplayMode | TExtra): mode is TExtra =>
  mode !== 'table' && mode !== 'grid';

/**
 * The list card's body: the table or the card grid of the same rows, each with its own
 * scroll container, empty states and infinite-scroll tail. Below `md` a list with a card always shows cards (the
 * toggle is hidden there), because a multi-column table does not fit a phone.
 */
export const EntityListBody = <TItem, TExtra extends string = never>({
  displayMode,
  columns,
  renderCard,
  skeletonRows,
  skeletonCards,
  selection,
  renderExtraView,
  renderOwnView,
  sort,
  onSortChange,
  sortRequired,
  showRowIndex,
  rowKeyboardActivation,
  rowClassName,
  selectionHitArea,
  fillWidth,
  stickyHeader,
  stickyHeaderTop,
  markUnsortedHeaders,
  rowHover,
  pinEdge,
  selectionColumnWidth,
  indexColumnWidth,
  selectionCellClassName,
  indexCellClassName,
  surface,
  selectAllLabel,
  columnWidthBox,
  cellPaddingX,
  sortIconPosition,
  sortButtonClassName,
  headerRowClassName,
  headerCellClassName,
  tableClassName,
  skeletonClassName,
  scroll,
  className,
  tableBreakpoint = 'md',
  onListStateChange,
  activeFilters,
  ...data
}: EntityListBodyProps<TItem, TExtra>) => {
  // one report for the body (its table and phone cards draw the same rows); the views below report nothing
  const ownView = isExtraMode(displayMode) && renderOwnView ? renderOwnView(displayMode) : undefined;
  const showsTable =
    ownView === undefined &&
    !(isExtraMode(displayMode) && renderExtraView) &&
    (!renderCard || displayMode !== 'grid');
  useListStateReport(onListStateChange, () =>
    buildEntityListState({
      view: displayMode,
      items: ownView === undefined ? data.items : [],
      getRowKey: data.getRowKey,
      isItemSelected: showsTable ? selection?.isItemSelected : undefined,
      columnIds: showsTable ? columns.map(column => column.id) : [],
      activeFilters,
      sort: sort ?? null,
      isLoading: ownView === undefined && data.isLoading === true,
      hasError: ownView === undefined && Boolean(data.error),
    })
  );
  if (ownView !== undefined) return ownView;
  const tableProps = {
    sort,
    onSortChange,
    sortRequired,
    showRowIndex,
    rowClassName,
    rowKeyboardActivation,
    selectionHitArea,
    fillWidth,
    stickyHeader,
    stickyHeaderTop,
    markUnsortedHeaders,
    rowHover,
    pinEdge,
    selectionColumnWidth,
    indexColumnWidth,
    selectionCellClassName,
    indexCellClassName,
    surface,
    selectAllLabel,
    columnWidthBox,
    cellPaddingX,
    sortIconPosition,
    sortButtonClassName,
    headerRowClassName,
    headerCellClassName,
    tableClassName,
    skeletonClassName,
    scroll,
  };
  if (isExtraMode(displayMode) && renderExtraView) {
    return (
      <EntityListGrid
        {...data}
        renderItems={items => renderExtraView(displayMode, items)}
        skeletonCards={skeletonCards}
        isGridView={false}
        scroll={scroll}
        className={className}
      />
    );
  }
  if (!renderCard || (tableBreakpoint === 'always' && displayMode !== 'grid')) {
    return (
      <EntityListTable
        {...data}
        {...tableProps}
        columns={columns}
        skeletonRows={skeletonRows}
        selection={selection}
        className={className}
      />
    );
  }
  if (displayMode === 'grid') {
    return <EntityListGrid {...data} renderCard={renderCard} skeletonCards={skeletonCards} scroll={scroll} className={className} />;
  }
  return (
    <>
      <EntityListTable
        {...data}
        {...tableProps}
        columns={columns}
        skeletonRows={skeletonRows}
        selection={selection}
        className={cn(TABLE_FROM_CLASS[tableBreakpoint as 'md' | 'lg'], className)}
      />
      <EntityListGrid
        {...data}
        renderCard={renderCard}
        skeletonCards={skeletonCards}
        isGridView={false}
        scroll={scroll}
        className={cn(CARDS_BELOW_CLASS[tableBreakpoint as 'md' | 'lg'], className)}
      />
    </>
  );
};
