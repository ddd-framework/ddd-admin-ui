'use client';

import { Check, ChevronsUpDown, Plus, X } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';

import {
  CONTROL_SURFACE_CLASS,
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Skeleton,
} from '../primitives/index.ts';
import { useTranslate } from '../i18n/index.ts';
import { cn } from '../primitives/cn.ts';

export interface ComboboxOption {
  value: string;
  label: string;
  /** Second line in the list (e.g. an id or a parent). */
  description?: string;
  icon?: ReactNode;
  /** Heading the option is listed under; groups keep the order in which they first appear. */
  group?: string;
  /** A small marker after the label (a count, a status). */
  badge?: ReactNode;
}

/** Wait (ms) after the last keystroke before `onSearch` runs. */
export const COMBOBOX_SEARCH_DEBOUNCE_MS = 300;

export interface ComboboxProps {
  options: readonly ComboboxOption[];
  /** `''` = nothing picked (unless an option has the value `''`: then it is an ordinary option). */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  isLoading?: boolean;
  disabled?: boolean;
  /** `sm` = the 32 px toolbar / filter height, `default` = the 36 px form height. */
  size?: 'sm' | 'default';
  /**
   * `field` (default): a picker in a form or the Filters panel — the 12 px field with its edge. `pill`: a scope picker
   * in a bar (the list toolbar's `trailing`) — the tint pill without an edge (shape by role).
   */
  shape?: 'field' | 'pill';
  id?: string;
  /** Classes of the trigger; with `clearable`, of the wrapper around trigger and clear button (size it there). */
  className?: string;
  'aria-label'?: string;
  /**
   * A clear control (`value` → `''`) while something is picked; picking the picked option again clears it too. Without
   * it, picking the picked option keeps the value.
   */
  clearable?: boolean;
  /**
   * Server search: the block stops filtering and calls this with the typed term, debounced
   * (`COMBOBOX_SEARCH_DEBOUNCE_MS`), and with `''` when the popover closes. Pass the answer as `options` and
   * `isSearching` while a request runs; until the answer to the current term is in, the list shows the searching
   * state, never the previous term's options. Drop answers to older terms (`useLatestSearch` does both).
   */
  onSearch?: (term: string) => void;
  /** A search request is in flight (with `onSearch`). */
  isSearching?: boolean;
  /**
   * Offers a "Create “…”" row while the trimmed term matches no option label (case-insensitive). Choosing it calls this
   * with the trimmed term, closes the popover and clears the term; the host creates the entry and sets `value`.
   */
  onRequestCreate?: (term: string) => void;
  /** The picked option when it is not among `options` (a server search result list without it): its label shows. */
  selectedOption?: ComboboxOption;
  /** Classes of the popover (e.g. a wider list than the trigger). */
  popoverClassName?: string;
}

/** Groups in the order they first appear; options without a group first. */
const groupOptions = <TOption extends { group?: string }>(options: readonly TOption[]) => {
  const groups = new Map<string, TOption[]>();
  for (const option of options) {
    const key = option.group ?? '';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)?.push(option);
  }
  const ungrouped = groups.get('');
  if (ungrouped) {
    groups.delete('');
    return [['', ungrouped] as const, ...groups.entries()];
  }
  return [...groups.entries()];
};

/** Single-choice combobox with a search field: client-side filtering, or a server search through `onSearch`. */
export const Combobox = ({
  options: rawOptions,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  isLoading = false,
  disabled,
  size = 'default',
  shape = 'field',
  id,
  className,
  'aria-label': ariaLabel,
  clearable = false,
  onSearch,
  isSearching = false,
  onRequestCreate,
  selectedOption,
  popoverClassName,
}: ComboboxProps) => {
  const { t } = useTranslate();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  // the last term handed to `onSearch`: until it equals the typed term and the answer is in, options are stale
  const [sentTerm, setSentTerm] = useState('');
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;

  // Labels marked with `m()` (status / type option lists) are translated here; an already translated or a user text
  // (a name) has no key and stays as it is.
  const translate = (option: ComboboxOption) => ({
    ...option,
    label: t(option.label),
    description: option.description ? t(option.description) : undefined,
  });
  const options = rawOptions.map(translate);
  const selected =
    options.find(option => option.value === value) ??
    (selectedOption && selectedOption.value === value ? translate(selectedOption) : undefined);

  const serverSearch = onSearch !== undefined;
  useEffect(() => {
    if (!serverSearch || !open || term === sentTerm) return;
    const timer = setTimeout(() => {
      setSentTerm(term);
      onSearchRef.current?.(term);
    }, COMBOBOX_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [serverSearch, open, term, sentTerm]);

  const setOpenState = (next: boolean) => {
    setOpen(next);
    if (next) return;
    // closing resets the search: the next opening starts from the full (or the host's default) list
    if (serverSearch && (term !== '' || sentTerm !== '')) onSearchRef.current?.('');
    setTerm('');
    setSentTerm('');
  };

  const pick = (option: ComboboxOption) => {
    onChange(clearable && option.value === value ? '' : option.value);
    setOpenState(false);
  };

  const trimmed = term.trim();
  const canCreate =
    onRequestCreate !== undefined &&
    trimmed !== '' &&
    !options.some(option => option.label.trim().toLowerCase() === trimmed.toLowerCase());
  const searching = isLoading || (serverSearch && (isSearching || term !== sentTerm));
  const showClear = clearable && value !== '' && !disabled;

  const trigger = (
    <Popover open={open} onOpenChange={setOpenState}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="field"
          rounded={shape === 'pill' ? 'full' : 'default'}
          data-control={shape}
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn(
            'justify-between',
            shape === 'pill'
              ? cn(CONTROL_SURFACE_CLASS, 'data-[state=open]:bg-tint-strong')
              : 'data-[state=open]:border-field-edge-strong',
            size === 'sm' ? 'h-8' : 'h-9',
            selected && selected.value !== '' && 'font-bold',
            clearable ? cn('w-full', showClear && 'pr-14') : className
          )}
        >
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>{selected?.label ?? placeholder ?? t('Select…')}</span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn('w-(--radix-popover-trigger-width) min-w-56 p-0', popoverClassName)} align="start">
        <Command shouldFilter={!serverSearch}>
          <CommandInput placeholder={searchPlaceholder ?? t('Search…')} value={term} onValueChange={setTerm} />
          <CommandList>
            {searching ? (
              <div className="space-y-2 p-2" aria-busy>
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-3/4" />
              </div>
            ) : (
              <>
                <CommandEmpty>{emptyMessage ?? t('No results')}</CommandEmpty>
                {groupOptions(options).map(([group, groupOptionsList]) => (
                  <CommandGroup key={group || '__ungrouped__'} heading={group ? t(group) : undefined}>
                    {groupOptionsList.map(option => (
                      <CommandItem key={option.value} value={`${option.label} ${option.value}`} onSelect={() => pick(option)}>
                        <Check className={cn('size-4', option.value === value ? 'opacity-100' : 'opacity-0')} aria-hidden />
                        {option.icon}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{option.label}</span>
                          {option.description && (
                            <span className="block truncate text-xs text-muted-foreground">{option.description}</span>
                          )}
                        </span>
                        {option.badge !== undefined && <span className="shrink-0">{option.badge}</span>}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </>
            )}
            {canCreate && !searching && (
              <CommandGroup forceMount>
                <CommandItem
                  forceMount
                  value={`__create__ ${trimmed}`}
                  onSelect={() => {
                    onRequestCreate?.(trimmed);
                    setOpenState(false);
                  }}
                >
                  <Plus className="size-4" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{t('Create “%term%”', { replacements: { term: trimmed } })}</span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );

  if (!clearable) return trigger;
  return (
    <div className={cn('relative', className)}>
      {trigger}
      {showClear && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label={t('Clear')}
          title={t('Clear')}
          className="absolute top-1/2 right-8 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-tint hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      )}
    </div>
  );
};
