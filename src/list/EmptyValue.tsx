import type { ReactNode } from 'react';

import { cn } from '../primitives/cn.ts';
import { EMPTY_MARKER } from '../logic/pure/format.ts';

export interface EmptyValueProps {
  /** Replaces the marker (e.g. `Never`, `Inherited`); keep it short and muted. */
  children?: ReactNode;
  className?: string;
}

/**
 * The one "no value" marker of every table cell, card line, definition list and metadata item: a muted `—`
 * (never `-`, `N/A` or an empty cell).
 */
export const EmptyValue = ({ children = EMPTY_MARKER, className }: EmptyValueProps) => (
  <span className={cn('text-muted-foreground', className)}>{children}</span>
);

/** `value` when it is set (not `null`, `undefined` or `''`), else `EmptyValue` — the default of a text cell. */
export const orEmpty = (value: ReactNode): ReactNode =>
  value === null || value === undefined || value === '' ? <EmptyValue /> : value;
