'use client';

import { X } from 'lucide-react';
import { type ReactNode, useId } from 'react';

import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../primitives/index.ts';
import { useTranslate } from '../i18n/index.ts';
import { cn } from '../primitives/cn.ts';
import { Combobox, type ComboboxOption } from './Combobox.tsx';
import { FILTER_CONTROL_CLASS, FILTER_DATE_CONTROL_CLASS } from './filterClasses.ts';
import type { FilterOption } from './filterOptions.ts';
import { MultiSelect } from './MultiSelect.tsx';

/** @deprecated moved to list/filterClasses — the re-export is removed in a later minor */
export { FILTER_CONTROL_CLASS, FILTER_DATE_CONTROL_CLASS } from './filterClasses.ts';
/** @deprecated moved to list/filterOptions — the re-export is removed in a later minor */
export { YES_NO_FILTER_OPTIONS } from './filterOptions.ts';
/** @deprecated moved to list/filterOptions — the re-export is removed in a later minor */
export type { FilterOption } from './filterOptions.ts';

/** Radix `Select` items cannot carry `''`: the sentinel of the "All" entry. */
const ALL = '__all__';

// ─── Frame ─────────────────────────────────────────────────────────────────────────────────────────────────────────

export interface FilterFieldProps {
  label: string;
  /** Id of the control the caption labels (text / date inputs); comboboxes carry their own `aria-label`. */
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}

/** A filter control with its caption: 12.5 px bold muted label above an `h-8` control. */
export const FilterField = ({ label, htmlFor, children, className }: FilterFieldProps) => (
  <div className={cn('grid min-w-0 gap-1.5', className)}>
    <Label htmlFor={htmlFor} className="text-[12.5px] font-bold text-muted-foreground">
      {label}
    </Label>
    {children}
  </div>
);

export interface FilterPanelProps {
  children: ReactNode;
  className?: string;
}

/**
 * The body of `EntityListToolbar.filters`: the filter fields in one wrapping row, top-aligned — labels on one line, a
 * field that grows (a multi-select with chips) grows downwards.
 */
export const FilterPanel = ({ children, className }: FilterPanelProps) => (
  <div className={cn('flex flex-wrap items-start gap-3', className)}>{children}</div>
);

// ─── Text ──────────────────────────────────────────────────────────────────────────────────────────────────────────

export interface FilterTextProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** `numeric` for id filters (mobile keypad; the value stays a string). */
  inputMode?: 'text' | 'numeric';
  className?: string;
}

/** A free-text or id filter; with `useUrlListState` the request follows 350 ms after the last key. */
export const FilterText = ({ label, value, onChange, placeholder, inputMode = 'text', className }: FilterTextProps) => {
  const id = useId();
  const { t } = useTranslate();
  return (
    <FilterField label={label} htmlFor={id}>
      <div className="relative">
        <Input
          id={id}
          type="text"
          inputMode={inputMode}
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder={placeholder ?? label}
          className={cn(FILTER_CONTROL_CLASS, value && 'pr-7', className)}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label={t('Clear %label%', { replacements: { label } })}
            className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    </FilterField>
  );
};

// ─── Select ────────────────────────────────────────────────────────────────────────────────────────────────────────

export interface FilterSelectProps {
  label: string;
  /** `''` = no filter (the "All" entry). */
  value: string;
  onChange: (value: string) => void;
  options: readonly FilterOption[];
  /** Label of the clearing entry: `All` by default, or `All Worlds`, `All Sources` … */
  allLabel?: string;
  /** A searchable combobox instead of the plain select; on by default from 10 options. */
  searchable?: boolean;
  searchPlaceholder?: string;
  isLoading?: boolean;
  className?: string;
}

/** A single-choice filter whose first entry clears it. Long option lists (worlds, campaigns) become searchable. */
export const FilterSelect = ({
  label,
  value,
  onChange,
  options,
  allLabel,
  searchable,
  searchPlaceholder,
  isLoading,
  className,
}: FilterSelectProps) => {
  const { t } = useTranslate();
  const allText = allLabel ?? t('All', { context: 'filter-option' });
  const translatedOptions = options.map(option => ({ ...option, label: t(option.label) }));
  const asCombobox = searchable ?? options.length >= 10;

  if (asCombobox) {
    // the Combobox translates the option labels itself
    const comboboxOptions: ComboboxOption[] = [{ value: '', label: allText }, ...options];
    return (
      <FilterField label={label}>
        <Combobox
          options={comboboxOptions}
          value={value}
          onChange={onChange}
          placeholder={allText}
          searchPlaceholder={searchPlaceholder}
          isLoading={isLoading}
          aria-label={label}
          size="sm"
          className={cn(FILTER_CONTROL_CLASS, className)}
        />
      </FilterField>
    );
  }

  return (
    <FilterField label={label}>
      <Select value={value || ALL} onValueChange={next => onChange(next === ALL ? '' : next)}>
        <SelectTrigger size="sm" aria-label={label} className={cn(FILTER_CONTROL_CLASS, className)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allText}</SelectItem>
          {translatedOptions.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FilterField>
  );
};

// ─── Multi-select ──────────────────────────────────────────────────────────────────────────────────────────────────

export interface FilterMultiSelectProps {
  label: string;
  /** No entry = no filter. With `useUrlListState` use `getList(key)` / `setList(key, …)`. */
  value: readonly string[];
  onChange: (value: string[]) => void;
  options: readonly FilterOption[];
  /** Trigger text while nothing is picked. */
  allLabel?: string;
  searchPlaceholder?: string;
  isLoading?: boolean;
  className?: string;
}

/** A multi-choice filter (sent as an `in` filter): the shared `MultiSelect` combobox with chips. */
export const FilterMultiSelect = ({
  label,
  value,
  onChange,
  options,
  allLabel,
  searchPlaceholder,
  isLoading,
  className,
}: FilterMultiSelectProps) => {
  const { t } = useTranslate();
  return (
  <FilterField label={label}>
    <MultiSelect
      options={options}
      value={value}
      onChange={onChange}
      placeholder={allLabel ?? t('All', { context: 'filter-option' })}
      searchPlaceholder={searchPlaceholder}
      isLoading={isLoading}
      aria-label={label}
      size="sm"
      maxChips={2}
      className={cn('min-h-8 w-full text-[13px] font-bold sm:w-64', className)}
    />
  </FilterField>
  );
};

// ─── Date range ────────────────────────────────────────────────────────────────────────────────────────────────────

export interface FilterDateRangeProps {
  label: string;
  /** `YYYY-MM-DD` or `''` (open bound). */
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  /** Inline (a toolbar row, a table header): no visible label; the two fields keep accessible names. */
  hideLabel?: boolean;
  /** Accessible name of the first field (default "<label> from"). */
  fromLabel?: string;
  /** Accessible name of the second field (default "<label> to"). */
  toLabel?: string;
  className?: string;
}

/** Two calendar-day bounds (`YYYY-MM-DD`); each bound limits the other. Build the filter with `ge` / `le`. */
export const FilterDateRange = ({
  label,
  from,
  to,
  onFromChange,
  onToChange,
  hideLabel = false,
  fromLabel,
  toLabel,
  className,
}: FilterDateRangeProps) => {
  const id = useId();
  const { t } = useTranslate();
  const fields = (
    <div className={cn('flex items-center gap-1.5', hideLabel && className)} role={hideLabel ? 'group' : undefined} aria-label={hideLabel ? t(label) : undefined}>
      <Input
        id={id}
        type="date"
        value={from}
        max={to || undefined}
        onChange={event => onFromChange(event.target.value)}
        aria-label={fromLabel ? t(fromLabel) : t('%label% from', { replacements: { label } })}
        className={FILTER_DATE_CONTROL_CLASS}
      />
      <span className="text-muted-foreground" aria-hidden>
        –
      </span>
      <Input
        type="date"
        value={to}
        min={from || undefined}
        onChange={event => onToChange(event.target.value)}
        aria-label={toLabel ? t(toLabel) : t('%label% to', { replacements: { label } })}
        className={FILTER_DATE_CONTROL_CLASS}
      />
    </div>
  );
  if (hideLabel) return fields;
  return (
    <FilterField label={label} htmlFor={id} className={className}>
      {fields}
    </FilterField>
  );
};
