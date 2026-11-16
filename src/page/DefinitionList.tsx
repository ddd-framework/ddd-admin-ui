'use client';

import type { ReactNode } from 'react';

import { useTranslate } from '../i18n/index.ts';
import { cn } from '../primitives/cn.ts';
import { orEmpty } from '../list/EmptyValue.tsx';

export interface DefinitionItem {
  /** Stable key (defaults to the label). */
  id?: string;
  label: string;
  /** `null` / `undefined` / `''` → `—`. Use the list cells (`DateCell`, `BooleanCell`, `StatusBadge`) for typed values. */
  value: ReactNode;
  /** A muted line under the value. */
  hint?: ReactNode;
  /** Spans the whole row (long text, a list of chips). */
  wide?: boolean;
}

export interface DefinitionListProps {
  items: readonly DefinitionItem[];
  /** Columns from `sm` (1 on a phone); the `grid` layout only. */
  columns?: 1 | 2 | 3 | 4;
  /**
   * `grid` (default): label above value, in columns. `rows`: one divided row per item, label left, value right (a
   * summary card, a side panel).
   */
  layout?: 'grid' | 'rows';
  className?: string;
}

const COLUMNS_CLASS = {
  1: '',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
} as const;

/**
 * Read-only facts of an entity (replaces the local `Row` / `InfoRow` / `Detail` helpers): small uppercase label, value
 * below, `—` when empty, in a responsive grid. Put it inside a `Card`.
 */
export const DefinitionList = ({ items, columns = 2, layout = 'grid', className }: DefinitionListProps) => {
  const { t } = useTranslate();
  if (layout === 'rows') {
    return (
      <dl className={cn('divide-y', className)}>
        {items.map(item => (
          <div key={item.id ?? item.label} className="flex min-w-0 items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
            <dt className="shrink-0 text-sm text-muted-foreground">{t(item.label)}</dt>
            <dd className="min-w-0 text-right text-sm break-words">
              {orEmpty(item.value)}
              {item.hint && (
                <span className="block text-xs text-muted-foreground">{typeof item.hint === 'string' ? t(item.hint) : item.hint}</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    );
  }
  return (
  <dl className={cn('grid grid-cols-1 gap-x-6 gap-y-4', COLUMNS_CLASS[columns], className)}>
    {items.map(item => (
      <div key={item.id ?? item.label} className={cn('min-w-0', item.wide && 'col-span-full')}>
        <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t(item.label)}</dt>
        <dd className="mt-1 text-sm break-words">{orEmpty(item.value)}</dd>
        {item.hint && (
          <dd className="mt-0.5 text-xs text-muted-foreground">{typeof item.hint === 'string' ? t(item.hint) : item.hint}</dd>
        )}
      </div>
    ))}
  </dl>
  );
};
