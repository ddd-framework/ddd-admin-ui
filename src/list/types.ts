import type { ReactNode } from 'react';

/** @deprecated moved to logic/pure/displayMode — the re-export is removed in a later minor */
export { LIST_DISPLAY_MODES, parseListDisplayMode } from '../logic/pure/displayMode.ts';
/** @deprecated moved to logic/pure/displayMode — the re-export is removed in a later minor */
export type { ListDisplayMode } from '../logic/pure/displayMode.ts';

/**
 * A list's own view next to table and grid (e.g. a domain-specific tile layout of the same rows): its URL / storage
 * value, the toggle's label and icon. The list draws it itself (`EntityListGrid` `renderItems`); `table` / `grid` are
 * reserved.
 */
export interface ListExtraView<TMode extends string = string> {
  value: TMode;
  label: string;
  icon: ReactNode;
}

/**
 * Returns a row's primary action, or `null` for a row that has none. Clicking anywhere on the row or on its card
 * that is not an interactive control runs it (see `useRowActivation`). Keep it stable (`useCallback`).
 */
export type RowActionResolver<TItem> = (item: TItem) => (() => void) | null;

/**
 * The contract of a grid card. `onActivate` comes from the list's `rowAction`: spread
 * `useRowActivation(onActivate)` onto the card's root instead of a hand-rolled `onClick`, and gate `cursor-pointer`
 * on it.
 */
export interface EntityCardProps<TItem> {
  item: TItem;
  onActivate?: (() => void) | null;
}

/**
 * Draws one grid card. A render prop instead of a `ComponentType` prop: a component defined inside the
 * page would be a new type on every render (remounting every card; Biome `noComponentHookFactories`), while a render
 * function closes over the page's state (world, theme) with no identity trap. The grid supplies the `key`.
 */
export type EntityCardRenderer<TItem> = (props: EntityCardProps<TItem>) => ReactNode;

/** What every view of a list (table, grid) gets: the rows plus first-load, paging, empty and error state. */
export interface EntityListDataProps<TItem> {
  items: TItem[];
  getRowKey: (item: TItem) => string;
  /** First load, no rows yet: skeletons. A background refetch keeps the rows mounted (`EntityListPage.isRefetching`). */
  isLoading?: boolean;
  isFetchingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  /** Shown when the list is empty and no search/filter is active. */
  emptyMessage?: ReactNode;
  /** Shown when the list is empty because of an active search/filter. */
  noResultsMessage?: ReactNode;
  /**
   * One call to action under the empty and the no-results state (e.g. the list's Add button), next to "Clear search";
   * size it like that button (`sm`).
   */
  emptyAction?: ReactNode;
  /** An icon over the empty and the no-results message (a 24–32 px icon; not on the error state). */
  emptyIcon?: ReactNode;
  /** True while a search or filter narrows the list (switches the empty state to "no results" + clear). */
  isSearchActive?: boolean;
  onClearSearch?: () => void;
  /** Accessible name of the loading skeleton. */
  loadingMessage?: string;
  error?: ReactNode;
  /** Whole-row / whole-card click; a card and its row always run the same action. */
  rowAction?: RowActionResolver<TItem>;
  className?: string;
}
