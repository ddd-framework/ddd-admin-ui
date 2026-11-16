'use client';

import type { ReactNode } from 'react';

import { cn } from '../primitives/cn.ts';
import { EntityListGrid } from './EntityListGrid.tsx';
import { type EntityListColumn, EntityListTable } from './EntityListTable.tsx';
import type { EntityCardRenderer, EntityListDataProps, ListDisplayMode } from './types.ts';
import type { EntityListSelection } from '../logic/react/useRowSelection.ts';

export interface EntityListBodyProps<TItem, TExtra extends string = never> extends EntityListDataProps<TItem> {
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
}

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
  className,
  ...data
}: EntityListBodyProps<TItem, TExtra>) => {
  if (isExtraMode(displayMode) && renderExtraView) {
    return (
      <EntityListGrid
        {...data}
        renderItems={items => renderExtraView(displayMode, items)}
        skeletonCards={skeletonCards}
        isGridView={false}
        className={className}
      />
    );
  }
  if (!renderCard) {
    return <EntityListTable {...data} columns={columns} skeletonRows={skeletonRows} selection={selection} className={className} />;
  }
  if (displayMode === 'grid') {
    return <EntityListGrid {...data} renderCard={renderCard} skeletonCards={skeletonCards} className={className} />;
  }
  return (
    <>
      <EntityListTable
        {...data}
        columns={columns}
        skeletonRows={skeletonRows}
        selection={selection}
        className={cn('hidden md:block', className)}
      />
      <EntityListGrid {...data} renderCard={renderCard} skeletonCards={skeletonCards} isGridView={false} className={cn('md:hidden', className)} />
    </>
  );
};
