'use client';

import { Check } from 'lucide-react';
import type { ReactNode } from 'react';

import { useTranslate } from '../i18n/index.ts';
import { cn } from '../primitives/cn.ts';

export interface ChipToggleOption {
  value: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  /** Tooltip (e.g. what the choice means), when the label alone does not say it. */
  title?: string;
}

interface ChipToggleGroupBaseProps {
  options: readonly ChipToggleOption[];
  disabled?: boolean;
  /** Accessible name of the group (the field label). */
  'aria-label': string;
  className?: string;
}

interface ChipToggleGroupMultipleProps extends ChipToggleGroupBaseProps {
  mode?: 'multiple';
  value: readonly string[];
  onChange: (value: string[]) => void;
}

interface ChipToggleGroupSingleProps extends ChipToggleGroupBaseProps {
  mode: 'single';
  /** `''` = none; clicking the picked chip again clears it. */
  value: string;
  onChange: (value: string) => void;
}

export type ChipToggleGroupProps = ChipToggleGroupMultipleProps | ChipToggleGroupSingleProps;

/**
 * A short, fully visible set of choices as toggle chips (≤ ~8 options: content languages, weekdays, sources). Longer
 * or growing lists use `MultiSelect`. Picked = primary tint with a check (colour + icon), unpicked = quiet outline.
 * Values keep the order of `options`.
 */
export const ChipToggleGroup = (props: ChipToggleGroupProps) => {
  const { options, disabled, className } = props;
  const { t } = useTranslate();
  const isPicked = (value: string) => (props.mode === 'single' ? props.value === value : props.value.includes(value));

  const toggle = (value: string) => {
    if (props.mode === 'single') {
      props.onChange(props.value === value ? '' : value);
      return;
    }
    const next = new Set(props.value);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    props.onChange(options.filter(option => next.has(option.value)).map(option => option.value));
  };

  return (
    <fieldset className={cn('flex min-w-0 flex-wrap gap-2 border-0 p-0', className)} aria-label={props['aria-label']}>
      {options.map(option => {
        const picked = isPicked(option.value);
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={picked}
            disabled={disabled || option.disabled}
            title={option.title ? t(option.title) : undefined}
            onClick={() => toggle(option.value)}
            className={cn(
              'inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs font-semibold transition-colors',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
              picked
                ? 'border-primary bg-primary/15 text-primary-emphasis'
                : 'border-border bg-card text-muted-foreground hover:text-foreground'
            )}
          >
            {picked ? <Check className="size-3" aria-hidden /> : option.icon}
            {t(option.label)}
          </button>
        );
      })}
    </fieldset>
  );
};
