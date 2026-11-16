'use client';

import { SlidersHorizontal, X } from 'lucide-react';
import { type KeyboardEvent, type ReactNode, useState } from 'react';

import { Button } from '../primitives/index.ts';
import { useTranslate } from '../i18n/index.ts';
import { cn } from '../primitives/cn.ts';
import { SearchField } from './SearchField.tsx';

export interface EntityListSearch {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  'aria-label'?: string;
  /**
   * Replaces the magnifier at the start of the field, at the same spot (`left-3`, the input keeps `pl-9`): a 16 px icon
   * or a small control such as a mode switch (at most 24 px, centred on the icon position).
   */
  leading?: ReactNode;
  /** Passed to the input: Enter / Escape behaviour of a search mode (e.g. run a search on Enter). */
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
}

export interface EntityListToolbarProps {
  search?: EntityListSearch;
  /** Secondary filters, in a collapsible panel behind a "Filters" toggle (use `FilterPanel` + the `Filter*` fields). */
  filters?: ReactNode;
  /**
   * Set filters in the panel (`useUrlListState().activeFilterCount`): a count badge on the Filters toggle; with
   * `onClearFilters` the one "Clear filters" button appears while it is above 0. A link with filters opens the panel.
   */
  activeFilterCount?: number;
  /** Empties every filter (and the search, if the page wants that): the one Clear button of the toolbar. */
  onClearFilters?: () => void;
  /** Always-visible controls at the end of the row (scope pickers such as a world selector). Never filters. */
  trailing?: ReactNode;
  /** The Grid / Table switch (`EntityListViewToggle`), always last in the row. */
  viewToggle?: ReactNode;
  /** `EntityListBulkBar`, shown under the row while rows are selected (it renders nothing otherwise). */
  bulkBar?: ReactNode;
}

const CONTROL_TEXT = 'h-8 shrink-0 text-[13px] font-bold';

/**
 * The list card's fixed chrome: the `SearchField` pill with its clear button, the Filters toggle (with
 * the active-filter count) and its collapsible panel, the one Clear filters button, trailing scope controls, the view
 * switch at the end of the row, and the bulk bar below. Control voice: 32 px controls, 13 px bold text.
 */
export const EntityListToolbar = ({
  search,
  filters,
  activeFilterCount = 0,
  onClearFilters,
  trailing,
  viewToggle,
  bulkBar,
}: EntityListToolbarProps) => {
  const { t } = useTranslate();
  const [filtersOpen, setFiltersOpen] = useState(() => activeFilterCount > 0);
  const showClear = onClearFilters !== undefined && activeFilterCount > 0;

  const filterToggle = filters && (
    <Button
      size="sm"
      variant={filtersOpen ? 'default' : 'outline'}
      onClick={() => setFiltersOpen(open => !open)}
      aria-label={
        activeFilterCount > 0
          ? t('Toggle filters (%count% active)', { replacements: { count: activeFilterCount } })
          : t('Toggle filters')
      }
      aria-expanded={filtersOpen}
      rounded="full"
      className={CONTROL_TEXT}
    >
      <SlidersHorizontal />
      <span className="hidden sm:inline">{t('Filters')}</span>
      {activeFilterCount > 0 && (
        <span
          className={cn(
            'inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[11px] leading-none font-black tabular-nums',
            filtersOpen ? 'bg-primary-foreground text-primary' : 'bg-primary text-primary-foreground'
          )}
        >
          {activeFilterCount}
        </span>
      )}
    </Button>
  );

  const clearButton = showClear && (
    <Button
      size="sm"
      variant="outline"
      rounded="full"
      onClick={onClearFilters}
      className={cn(CONTROL_TEXT, 'self-start sm:self-auto')}
    >
      <X />
      {t('Clear filters')}
    </Button>
  );

  return (
    <div>
      <div className="flex w-full flex-col flex-wrap items-stretch gap-2 sm:flex-row sm:items-center">
        {(search || filterToggle) && (
          <div className="flex w-full items-center gap-2 sm:max-w-md sm:min-w-60 sm:flex-1">
            {search && (
              <SearchField
                size="sm"
                value={search.value}
                onChange={search.onChange}
                onKeyDown={search.onKeyDown}
                leading={search.leading}
                placeholder={search.placeholder ?? t('Search…')}
                aria-label={search['aria-label'] ?? t('Search')}
              />
            )}
            {filterToggle}
          </div>
        )}
        {clearButton}
        {(trailing || viewToggle) && (
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            {trailing}
            {viewToggle}
          </div>
        )}
      </div>

      {filters && (
        <div
          className={cn(
            'grid transition-all duration-200 ease-in-out',
            filtersOpen ? 'mt-3 grid-rows-[1fr]' : 'grid-rows-[0fr]'
          )}
        >
          {/* The clip (needed for the collapse) gets 12 px of room around the fields, pulled back by a negative margin,
              so the fields' glass shadow is never cut. */}
          <div className="-mx-3 overflow-hidden px-3" inert={!filtersOpen}>
            <div className="pt-1 pb-4">{filters}</div>
          </div>
        </div>
      )}

      {bulkBar && <div className="mt-3 empty:hidden">{bulkBar}</div>}
    </div>
  );
};
