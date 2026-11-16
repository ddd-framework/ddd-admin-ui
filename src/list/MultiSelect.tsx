'use client';

import { Check, ChevronsUpDown, X } from 'lucide-react';
import { type MouseEvent, type ReactNode, useState } from 'react';

import {
  FIELD_FOCUS_WITHIN_CLASS,
  FIELD_RADIUS_CLASS,
  FIELD_SURFACE_CLASS,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
  Skeleton,
} from '../primitives/index.ts';
import { useTranslate } from '../i18n/index.ts';
import { cn } from '../primitives/cn.ts';

export interface MultiSelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  /** Shown but not pickable (a picked disabled value stays and keeps its chip, without a remove button). */
  disabled?: boolean;
}

export interface MultiSelectProps {
  options: readonly MultiSelectOption[];
  value: readonly string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  isLoading?: boolean;
  disabled?: boolean;
  /** Chips shown in the trigger before `+n`; `Infinity` shows all (forms with a few values, e.g. roles). */
  maxChips?: number;
  /** `sm` = the 32 px toolbar / filter height, `default` = the 36 px form height. */
  size?: 'sm' | 'default';
  id?: string;
  className?: string;
  'aria-label'?: string;
}

/**
 * The one multi-select (languages, roles, statuses and the like — in filters and forms): a
 * searchable combobox whose picks show as removable chips in the trigger. The list stays open while picking; "Select
 * all" / "Clear" act on the options shown. Values keep the caller's order of `options`.
 */
export const MultiSelect = ({
  options: rawOptions,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  isLoading = false,
  disabled = false,
  maxChips = 3,
  size = 'default',
  id,
  className,
  'aria-label': ariaLabel,
}: MultiSelectProps) => {
  const { t } = useTranslate();
  const [open, setOpen] = useState(false);
  // Labels marked with `m()` are translated here; an already translated or a user text has no key and stays as it is.
  const options = rawOptions.map(option => ({
    ...option,
    label: t(option.label),
    description: option.description ? t(option.description) : undefined,
  }));
  const selected = new Set(value);
  const selectedOptions = options.filter(option => selected.has(option.value));
  // Picked values the options do not (yet) list still show — never drop a stored value silently.
  const unknownValues = value.filter(item => !options.some(option => option.value === item));
  const chips: MultiSelectOption[] = [...selectedOptions, ...unknownValues.map(item => ({ value: item, label: item }))];
  const visibleChips = chips.slice(0, maxChips);
  const hiddenCount = chips.length - visibleChips.length;

  const ordered = (next: Set<string>) => [
    ...options.filter(option => next.has(option.value)).map(option => option.value),
    ...[...next].filter(item => !options.some(option => option.value === item)),
  ];

  const toggle = (item: string) => {
    const next = new Set(selected);
    if (next.has(item)) next.delete(item);
    else next.add(item);
    onChange(ordered(next));
  };

  const remove = (event: MouseEvent, item: string) => {
    event.stopPropagation();
    const next = new Set(selected);
    next.delete(item);
    onChange(ordered(next));
  };

  const pickable = options.filter(option => !option.disabled);
  const allPicked = pickable.length > 0 && pickable.every(option => selected.has(option.value));
  const lockedPicks = options.filter(option => option.disabled && selected.has(option.value)).map(option => option.value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div
          data-slot="multi-select"
          className={cn(
            // Shape by role: a form field — 12 px, card fill, quiet edge, strong edge on hover / while open.
            'flex w-full items-center gap-1 px-2',
            FIELD_SURFACE_CLASS,
            FIELD_RADIUS_CLASS,
            FIELD_FOCUS_WITHIN_CLASS,
            open && 'border-field-edge-strong',
            size === 'sm' ? 'min-h-8 py-0.5' : 'min-h-9 py-1',
            disabled && 'cursor-not-allowed opacity-50',
            className
          )}
        >
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
            {visibleChips.map(chip => {
              const locked = options.some(option => option.value === chip.value && option.disabled);
              return (
                <span
                  key={chip.value}
                  data-slot="multi-select-chip"
                  className="inline-flex h-5 max-w-40 items-center gap-0.5 rounded-full bg-tint-strong pr-0.5 pl-2 text-[12px] font-semibold text-foreground"
                >
                  <span className="truncate">{chip.label}</span>
                  {!disabled && !locked && (
                    <button
                      type="button"
                      onClick={event => remove(event, chip.value)}
                      aria-label={t('Remove %label%', { replacements: { label: chip.label } })}
                      className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </span>
              );
            })}
            {hiddenCount > 0 && <span className="px-1 text-[12px] font-semibold text-muted-foreground">+{hiddenCount}</span>}
            <PopoverTrigger asChild>
              <button
                id={id}
                type="button"
                role="combobox"
                aria-expanded={open}
                aria-label={ariaLabel}
                disabled={disabled}
                className={cn(
                  'flex h-6 min-w-12 flex-1 items-center justify-between gap-2 rounded-sm px-1 text-left outline-none disabled:cursor-not-allowed',
                  chips.length === 0 && 'font-normal text-muted-foreground'
                )}
              >
                <span className="truncate">{chips.length === 0 ? (placeholder ?? t('Select…')) : ''}</span>
                <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </button>
            </PopoverTrigger>
          </div>
        </div>
      </PopoverAnchor>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-60 p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder ?? t('Search…')} />
          <CommandList>
            {isLoading ? (
              <div className="space-y-2 p-2" aria-busy>
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-3/4" />
              </div>
            ) : (
              <>
                <CommandEmpty>{emptyMessage ?? t('No results')}</CommandEmpty>
                <CommandGroup>
                  {options.map(option => {
                    const isPicked = selected.has(option.value);
                    return (
                      <CommandItem
                        key={option.value}
                        value={`${option.label} ${option.value}`}
                        disabled={option.disabled}
                        onSelect={() => toggle(option.value)}
                        aria-selected={isPicked}
                      >
                        <span
                          className={cn(
                            'flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input',
                            isPicked && 'border-primary bg-primary text-primary-foreground'
                          )}
                          aria-hidden
                        >
                          {isPicked && <Check className="size-3 text-current" />}
                        </span>
                        {option.icon}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{option.label}</span>
                          {option.description && (
                            <span className="block truncate text-xs text-muted-foreground">{option.description}</span>
                          )}
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
                {pickable.length > 1 && (
                  <>
                    <CommandSeparator />
                    <CommandGroup>
                      <CommandItem
                        value="__multi-select-toggle-all__"
                        onSelect={() =>
                          onChange(allPicked ? lockedPicks : ordered(new Set([...value, ...pickable.map(option => option.value)])))
                        }
                        className="justify-center text-[13px] font-semibold"
                      >
                        {allPicked ? t('Clear all') : t('Select all')}
                      </CommandItem>
                    </CommandGroup>
                  </>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
