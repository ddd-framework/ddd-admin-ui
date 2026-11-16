'use client';

import type { ReactNode } from 'react';

import { useTranslate } from '../i18n/index.ts';
import { cn } from '../primitives/cn.ts';
import { GlassPill } from './GlassPill.tsx';

export interface QuickFilterOption {
  value: string;
  label: string;
  icon?: ReactNode;
  /** Only when the screen already has the number (never an extra request for it). */
  count?: number;
}

interface QuickFilterPillsBaseProps {
  options: readonly QuickFilterOption[];
  /** A leading "All" pill that clears the filter (`''` / `[]`). */
  allLabel?: string;
  'aria-label': string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

interface QuickFilterPillsSingleProps extends QuickFilterPillsBaseProps {
  mode?: 'single';
  /** The list state's value of the filter key (`''` = all). */
  value: string;
  onChange: (value: string) => void;
}

interface QuickFilterPillsMultiProps extends QuickFilterPillsBaseProps {
  mode: 'multi';
  value: readonly string[];
  onChange: (value: string[]) => void;
}

export type QuickFilterPillsProps = QuickFilterPillsSingleProps | QuickFilterPillsMultiProps;

/**
 * Status quick filters as a row of glass pills on the clouds. They write the **same** list-state key as the
 * Filters panel's status field (`list.setValue('status', …)` / `list.setList('status', …)`), so the request, the URL
 * and the panel stay one state; the panel keeps its field. Single mode: a pill picks its value, the picked pill again
 * (or "All") clears it. Multi mode: each pill toggles its value.
 */
export const QuickFilterPills = (props: QuickFilterPillsProps) => {
  const { options, allLabel, disabled, size = 'md', className } = props;
  const { t } = useTranslate();
  const isActive = (value: string) => (props.mode === 'multi' ? props.value.includes(value) : props.value === value);
  const nothingPicked = props.mode === 'multi' ? props.value.length === 0 : props.value === '';

  const toggle = (value: string) => {
    if (props.mode === 'multi') {
      props.onChange(
        props.value.includes(value) ? props.value.filter(item => item !== value) : [...props.value, value]
      );
      return;
    }
    props.onChange(props.value === value ? '' : value);
  };
  const clear = () => (props.mode === 'multi' ? props.onChange([]) : props.onChange(''));

  return (
    <fieldset
      aria-label={props['aria-label']}
      className={cn('m-0 flex min-w-0 flex-wrap items-center gap-2 border-0 p-0', className)}
    >
      {allLabel && (
        <GlassPill size={size} active={nothingPicked} aria-pressed={nothingPicked} disabled={disabled} onClick={clear}>
          {t(allLabel)}
        </GlassPill>
      )}
      {options.map(option => {
        const active = isActive(option.value);
        return (
          <GlassPill
            key={option.value}
            size={size}
            icon={option.icon}
            count={option.count}
            active={active}
            aria-pressed={active}
            disabled={disabled}
            onClick={() => toggle(option.value)}
          >
            {t(option.label)}
          </GlassPill>
        );
      })}
    </fieldset>
  );
};
