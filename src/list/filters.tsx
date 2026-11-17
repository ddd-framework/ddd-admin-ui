'use client';

import { X } from 'lucide-react';
import { type ReactNode, useId, useState } from 'react';

import {
  Input,
  Label,
  SegmentedControl,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../primitives/index.ts';
import { formatDate } from '../logic/pure/format.ts';
import {
  CUSTOM_DATE_RANGE_PRESET,
  DEFAULT_DATE_RANGE_PRESETS,
  type DateRange,
  type DateRangePreset,
  dateRangePresetOf,
  localToday,
} from '../logic/pure/dateRangePresets.ts';
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
  /**
   * Presets above the fields (`true`: all time, today, last 7 days, last 30 days, custom; or the host's list): a
   * segmented control; a preset writes its bounds through `onRangeChange` (or the two callbacks), the same
   * `YYYY-MM-DD` values typed dates give, so "Clear filters" (both bounds `''`) is "All time" again. The resolved range
   * shows next to the label; the custom preset reveals the two date fields (no second visible label).
   */
  presets?: boolean | readonly DateRangePreset[];
  /**
   * The picked preset, when the host keeps it (e.g. in the URL, so "Last 7 days" rolls forward). Without it the filter
   * derives the preset from the bounds (a range equal to no preset is custom).
   */
  preset?: string;
  onPresetChange?: (preset: string) => void;
  /** Both bounds at once (one URL write); without it a preset calls `onFromChange` and `onToChange`. */
  onRangeChange?: (range: DateRange) => void;
  /** The local day presets resolve from (default: the viewer's clock). */
  today?: string;
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
  presets,
  preset,
  onPresetChange,
  onRangeChange,
  today,
}: FilterDateRangeProps) => {
  const id = useId();
  const { t } = useTranslate();
  if (presets) {
    return (
      <FilterDateRangePresets
        label={label}
        from={from}
        to={to}
        onFromChange={onFromChange}
        onToChange={onToChange}
        fromLabel={fromLabel}
        toLabel={toLabel}
        className={className}
        presets={presets === true ? DEFAULT_DATE_RANGE_PRESETS : presets}
        preset={preset}
        onPresetChange={onPresetChange}
        onRangeChange={onRangeChange}
        today={today}
      />
    );
  }
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

type FilterDateRangePresetsProps = Omit<FilterDateRangeProps, 'presets' | 'hideLabel'> & { presets: readonly DateRangePreset[] };

/** The preset form of `FilterDateRange`: label with the resolved range, a segmented control, the fields under custom. */
const FilterDateRangePresets = ({
  label,
  from,
  to,
  onFromChange,
  onToChange,
  fromLabel,
  toLabel,
  className,
  presets,
  preset: hostPreset,
  onPresetChange,
  onRangeChange,
  today: fixedToday,
}: FilterDateRangePresetsProps) => {
  const { t } = useTranslate();
  const labelId = useId();
  const today = fixedToday ?? localToday();
  const customId = presets.find(item => !item.resolve)?.id ?? CUSTOM_DATE_RANGE_PRESET;
  // "Custom" picked while the bounds still equal a preset: kept until the bounds change from outside
  const [customPickedFor, setCustomPickedFor] = useState<string | null>(null);
  const derived = dateRangePresetOf({ from, to }, presets, today);
  const rangeKey = `${from}|${to}`;
  const active = hostPreset ?? (customPickedFor === rangeKey ? customId : derived);
  const isCustom = !presets.find(item => item.id === active)?.resolve;

  const writeRange = (range: DateRange) => {
    if (onRangeChange) onRangeChange(range);
    else {
      if (range.from !== from) onFromChange(range.from);
      if (range.to !== to) onToChange(range.to);
    }
  };
  const pick = (next: string) => {
    onPresetChange?.(next);
    const resolved = presets.find(item => item.id === next)?.resolve?.(today);
    if (resolved) {
      setCustomPickedFor(null);
      writeRange(resolved);
    } else setCustomPickedFor(rangeKey);
  };

  const rangeText =
    isCustom || (from === '' && to === '')
      ? null
      : from === to
        ? formatDate(from)
        : `${from ? formatDate(from) : '…'} – ${to ? formatDate(to) : '…'}`;

  return (
    <div className={cn('grid min-w-0 grid-cols-[minmax(0,1fr)] gap-1.5', className)} role="group" aria-labelledby={labelId}>
      <div className="flex min-w-0 items-baseline gap-2">
        <span id={labelId} className="text-[12.5px] font-bold text-muted-foreground">
          {label}
        </span>
        {rangeText && <span className="truncate text-[12px] text-muted-foreground tabular-nums">{rangeText}</span>}
      </div>
      <SegmentedControl
        aria-label={label}
        value={active}
        onValueChange={pick}
        options={presets.map(item => ({ value: item.id, label: item.label, context: item.context }))}
        className="max-w-full"
      />
      {isCustom && (
        <FilterDateRange
          label={label}
          from={from}
          to={to}
          onFromChange={onFromChange}
          onToChange={onToChange}
          hideLabel
          fromLabel={fromLabel}
          toLabel={toLabel}
        />
      )}
    </div>
  );
};
