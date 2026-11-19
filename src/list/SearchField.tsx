'use client';

import { Search, X } from 'lucide-react';
import { type ComponentProps, type KeyboardEvent, type ReactNode, useRef } from 'react';

import { CONTROL_SURFACE_CLASS, Input } from '../primitives/index.ts';
import { useTranslate } from '../i18n/index.ts';
import { cn } from '../primitives/cn.ts';

type SearchFieldSize = 'sm' | 'default' | 'lg';

const SIZE_CLASSES: Record<SearchFieldSize, { input: string; withClear: string; icon: string; clear: string }> = {
  sm: { input: 'h-8 pl-9 text-[13px] font-bold placeholder:font-normal', withClear: 'pr-8', icon: 'left-3', clear: 'right-1.5 size-5' },
  default: { input: 'h-9 pl-10', withClear: 'pr-9', icon: 'left-3.5', clear: 'right-2 size-6' },
  lg: { input: 'h-10 pl-10', withClear: 'pr-10', icon: 'left-3.5', clear: 'right-2 size-6' },
};

export interface SearchFieldProps extends Omit<ComponentProps<typeof Input>, 'type' | 'size' | 'value' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  /** A round clear button while there is text; Esc clears too (without closing a drawer around the field). */
  clearable?: boolean;
  /** `sm` 32 px (the compact list toolbar), `default` 36 px, `lg` 40 px — as tall as the control beside it. */
  size?: SearchFieldSize;
  /** Replaces the magnifier at the same spot: a 16 px icon or a small control (at most 24 px). */
  leading?: ReactNode;
  /** Classes for the input; `className` sizes and places the whole field. */
  inputClassName?: string;
}

/**
 * The one search box: the tint pill — a control in a bar, not a form field, so it
 * keeps the pill even inside a form — with the magnifier inside on the left and a round clear button once there is
 * text. Every search uses it, never an `Input` beside a positioned icon. In the list toolbar on the clouds it turns
 * glass (`[data-list-toolbar] [data-control="pill"]`, host CSS).
 */
export const SearchField = ({
  value,
  onChange,
  clearable = true,
  size = 'default',
  leading,
  className,
  inputClassName,
  onKeyDown,
  placeholder,
  'aria-label': ariaLabel,
  ...inputProps
}: SearchFieldProps) => {
  const { t } = useTranslate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const sizeClasses = SIZE_CLASSES[size];
  const canClear = clearable && value.length > 0;

  const clear = () => {
    onChange('');
    // The button disappears with the text: keep the focus in the field.
    inputRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key === 'Escape' && canClear) {
      // Only the text goes: a drawer or dialog around the field stays open.
      event.preventDefault();
      event.stopPropagation();
      clear();
    }
  };

  return (
    <div className={cn('relative w-full', className)}>
      {/* Raised layer: the glass field (own backdrop / stacking context) would otherwise paint over the icon. */}
      {leading ? (
        <div
          className={cn(
            'absolute top-1/2 z-(--layer-raised) flex size-4 -translate-y-1/2 items-center justify-center',
            sizeClasses.icon
          )}
        >
          {leading}
        </div>
      ) : (
        <Search
          aria-hidden
          className={cn(
            'pointer-events-none absolute top-1/2 z-(--layer-raised) size-4 -translate-y-1/2 text-muted-foreground',
            sizeClasses.icon
          )}
        />
      )}
      <Input
        ref={inputRef}
        type="search"
        enterKeyHint="search"
        data-control="pill"
        value={value}
        onChange={event => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder ?? t('Search')}
        className={cn(
          CONTROL_SURFACE_CLASS,
          'appearance-none [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none',
          sizeClasses.input,
          canClear && sizeClasses.withClear,
          inputClassName
        )}
        {...inputProps}
      />
      {canClear && (
        <button
          type="button"
          onClick={clear}
          aria-label={t('Clear search')}
          data-agent-skip=""
          className={cn(
            'absolute top-1/2 z-(--layer-raised) grid -translate-y-1/2 place-items-center rounded-full bg-tint-strong text-muted-foreground transition-colors hover:bg-foreground/15 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            sizeClasses.clear
          )}
        >
          <X aria-hidden className="size-3" strokeWidth={2.25} />
        </button>
      )}
    </div>
  );
};
