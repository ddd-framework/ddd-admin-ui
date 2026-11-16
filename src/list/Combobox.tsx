'use client';

import { Check, ChevronsUpDown } from 'lucide-react';
import { type ReactNode, useState } from 'react';

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
}

export interface ComboboxProps {
  options: readonly ComboboxOption[];
  /** `''` = nothing picked. */
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
  className?: string;
  'aria-label'?: string;
}

/** Single-choice combobox with a search field (client-side filtering). */
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
}: ComboboxProps) => {
  const { t } = useTranslate();
  const [open, setOpen] = useState(false);
  // Labels marked with `m()` (status / type option lists) are translated here; an already translated or a user text
  // (a World name) has no key and stays as it is.
  const options = rawOptions.map(option => ({
    ...option,
    label: t(option.label),
    description: option.description ? t(option.description) : undefined,
  }));
  const selected = options.find(option => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
            className
          )}
        >
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>{selected?.label ?? placeholder ?? t('Select…')}</span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-56 p-0" align="start">
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
                  {options.map(option => (
                    <CommandItem
                      key={option.value}
                      value={`${option.label} ${option.value}`}
                      onSelect={() => {
                        onChange(option.value);
                        setOpen(false);
                      }}
                    >
                      <Check className={cn('size-4', option.value === value ? 'opacity-100' : 'opacity-0')} aria-hidden />
                      {option.icon}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{option.label}</span>
                        {option.description && (
                          <span className="block truncate text-xs text-muted-foreground">{option.description}</span>
                        )}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
