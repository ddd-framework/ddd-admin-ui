import type { EntityListSort } from './listSort.ts';

/**
 * What an entity list shows, as `onListStateChange` reports it (`EntityListBody`, `EntityListTable`, `EntityListGrid`):
 * for a host tool that reads the screen (an agent, a test) without parsing the DOM.
 */
export interface EntityListState {
  /** `table`, `grid` or the list's own view (`displayMode` of `EntityListBody`). */
  view: string;
  /** The keys of the loaded rows in their order (`getRowKey`; the `data-row-key` of each row and card). Empty while loading. */
  rowKeys: string[];
  /** The keys of the selected rows among them (table selection); empty without a selection. */
  selectedRowKeys: string[];
  /** The ids of the table's columns in their order; empty in the card grid and the list's own views. */
  columnIds: string[];
  /** The non-empty `activeFilters` the host passed (e.g. `list.debounced`); `{}` without them. */
  filters: Record<string, string>;
  /** The table's sort; `null` when unsorted or not passed. */
  sort: EntityListSort | null;
  /** First load: no rows yet. */
  isLoading: boolean;
  /** The list shows its error block. */
  hasError: boolean;
}

export interface EntityListStateInput<TItem> {
  view: string;
  items: readonly TItem[];
  getRowKey: (item: TItem) => string;
  isItemSelected?: (item: TItem) => boolean;
  columnIds?: readonly string[];
  activeFilters?: Readonly<Record<string, string | null | undefined>>;
  sort?: EntityListSort | null;
  isLoading?: boolean;
  hasError?: boolean;
}

/** The reported state from the list's props; rows only once loaded and without an error (what the list draws). */
export const buildEntityListState = <TItem>({
  view,
  items,
  getRowKey,
  isItemSelected,
  columnIds = [],
  activeFilters,
  sort = null,
  isLoading = false,
  hasError = false,
}: EntityListStateInput<TItem>): EntityListState => {
  const shown = isLoading || hasError ? [] : items;
  const filters: Record<string, string> = {};
  for (const [key, value] of Object.entries(activeFilters ?? {})) {
    if (typeof value === 'string' && value.trim() !== '') filters[key] = value;
  }
  return {
    view,
    rowKeys: shown.map(getRowKey),
    selectedRowKeys: isItemSelected ? shown.filter(item => isItemSelected(item)).map(getRowKey) : [],
    columnIds: [...columnIds],
    filters,
    sort: sort ? { key: sort.key, direction: sort.direction } : null,
    isLoading,
    hasError,
  };
};

/** Whether two reported states are the same (the list reports only a change). */
export const sameEntityListState = (left: EntityListState | null, right: EntityListState): boolean =>
  left !== null && JSON.stringify(left) === JSON.stringify(right);
