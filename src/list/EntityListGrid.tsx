'use client';

import { cloneElement, Fragment, isValidElement, type ReactElement, type ReactNode, useEffect, useRef } from 'react';

import { buildEntityListState } from '../logic/pure/listState.ts';
import { useListStateReport } from '../logic/react/useListStateReport.ts';

import { Skeleton } from '../primitives/index.ts';
import { cn } from '../primitives/cn.ts';
import { EntityListLoadMore } from './EntityListLoadMore.tsx';
import { EntityListStatus } from './EntityListStatus.tsx';
import type { EntityCardRenderer, EntityListDataProps } from './types.ts';

/** The card grid: one column on a phone, then as many ≥ 320 px columns as fit; always `gap-4`. */
const GRID_CLASS = 'grid grid-cols-1 items-stretch gap-4 md:grid-cols-[repeat(auto-fill,minmax(320px,1fr))]';

export interface EntityListGridProps<TItem> extends EntityListDataProps<TItem> {
  /** Draws one card per item from `item` and `onActivate` (resolved from `rowAction`). */
  renderCard?: EntityCardRenderer<TItem>;
  /**
   * Draws the loaded items in a layout of the list's own (a `ListExtraView`: sections, tiles of different sizes)
   * instead of the card grid; skeletons, empty / error state and the infinite-scroll tail stay the grid's.
   */
  renderItems?: (items: TItem[]) => ReactNode;
  /** Skeleton cards while the first page loads. */
  skeletonCards?: number;
  /**
   * The grid is the chosen view (default): the list card frame steps aside so the cards sit on the background. `false`
   * for the phone fallback that `EntityListBody` renders next to a table (the table keeps its card frame).
   */
  isGridView?: boolean;
  /**
   * `false`: the grid sits in the page flow instead of filling and scrolling its card from `md` (no `md:flex-1
   * md:min-h-0 md:overflow-y-auto`). Default `true`.
   */
  scroll?: boolean;
}

/**
 * The card with `data-row-key`: set on the element the renderer returns (a DOM element, or a component that passes
 * `data-*` props to its root) unless it sets its own; a fragment or text stays as it is.
 */
const withRowKey = (card: ReactNode, rowKey: string): ReactNode => {
  if (!isValidElement(card) || card.type === Fragment) return card;
  const props = card.props as Record<string, unknown>;
  if (props['data-row-key'] !== undefined) return card;
  return cloneElement(card as ReactElement<Record<string, unknown>>, { 'data-row-key': rowKey });
};

let warnedCardsWithoutRowKey = false;

/**
 * Development only, once per page: the cards rendered but none carries `data-row-key` — the card component does not
 * pass `data-*` props to its DOM root, so agents and tests cannot find a card by its row. The fix is in the card
 * (spread the props, or set `data-row-key={rowKey}` from `EntityCardProps.rowKey`).
 */
const useWarnCardsWithoutRowKey = (cardGrid: { current: HTMLDivElement | null }, cardCount: number): void => {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || warnedCardsWithoutRowKey || cardCount === 0) return;
    const gridElement = cardGrid.current;
    if (!gridElement || gridElement.childElementCount === 0 || gridElement.querySelector('[data-row-key]')) return;
    warnedCardsWithoutRowKey = true;
    console.warn(
      '[ddd-admin-ui] EntityListGrid: no rendered card carries data-row-key. The card component drops unknown data-* props; ' +
        'spread them onto its root or set data-row-key from EntityCardProps.rowKey.'
    );
  }, [cardGrid, cardCount]);
};

/** Placeholder cards of the first load. */
export const EntityListGridSkeleton = ({ count = 6 }: { count?: number }) => (
  <div className={GRID_CLASS} aria-hidden>
    {Array.from({ length: count }, (_, index) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder cards
      <div key={index} className="surface space-y-3 rounded-2xl p-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="mt-4 flex gap-2">
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-8 flex-1" />
        </div>
      </div>
    ))}
  </div>
);

/**
 * Grid view of an entity list: a padded region that scrolls inside the list card from
 * `md` (the window scrolls on a phone), skeleton cards on the first load, the shared empty / no-results / error
 * block and the infinite-scroll tail.
 */
export const EntityListGrid = <TItem,>({
  renderCard,
  renderItems,
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
  skeletonCards = 6,
  isGridView = true,
  scroll = true,
  showEmptyState = true,
  className,
  onListStateChange,
  activeFilters,
}: EntityListGridProps<TItem>) => {
  const showCards = !error && !isLoading && items.length > 0;
  const cardGrid = useRef<HTMLDivElement | null>(null);
  useWarnCardsWithoutRowKey(cardGrid, showCards && !renderItems && renderCard ? items.length : 0);
  useListStateReport(onListStateChange, () =>
    buildEntityListState({ view: 'grid', items, getRowKey, activeFilters, isLoading, hasError: Boolean(error) })
  );

  return (
    <div
      data-entity-list-scroll
      // A card grid takes the full content width, like a table (host CSS `[data-page-shell]`).
      data-wide-content
      // Marks the list card as a grid: the card frame steps aside so the grid cards sit on the background.
      data-entity-grid={isGridView ? '' : undefined}
      className={cn(scroll ? 'p-4 md:min-h-0 md:flex-1 md:overflow-y-auto' : 'p-4', className)}
      aria-busy={isLoading || isFetchingMore}
    >
      {isLoading && !error && <EntityListGridSkeleton count={skeletonCards} />}
      {showCards && renderItems?.(items)}
      {showCards && !renderItems && renderCard && (
        <div ref={cardGrid} className={GRID_CLASS}>
          {items.map(item => {
            const rowKey = getRowKey(item);
            return (
              <Fragment key={rowKey}>
                {withRowKey(renderCard({ item, onActivate: rowAction ? rowAction(item) : undefined, rowKey }), rowKey)}
              </Fragment>
            );
          })}
        </div>
      )}
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
        showEmptyState={showEmptyState}
      />
      <EntityListLoadMore hasMore={showCards && hasMore} isFetchingMore={isFetchingMore} onLoadMore={onLoadMore} />
    </div>
  );
};
