import type { ReactNode } from 'react';

import { cn } from '../primitives/cn.ts';
import { MetricTileSkeleton } from './MetricTile.tsx';

export interface MetricGridProps {
  children?: ReactNode;
  /** Columns from `lg` up (2 below `lg`, 1 below `sm` when `columns` is 1). Default 4. */
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
  /** While loading (and no tiles are known yet) the grid draws `skeletonCount` placeholder tiles instead of `children`. */
  isLoading?: boolean;
  /** Placeholder tiles while loading (default: `columns`). */
  skeletonCount?: number;
  size?: 'default' | 'compact';
  className?: string;
}

// literal classes, so the host's Tailwind build finds them
const COLUMNS_CLASS: Record<NonNullable<MetricGridProps['columns']>, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-2 lg:grid-cols-5',
  6: 'grid-cols-2 lg:grid-cols-6',
};

/** A row (or rows) of `MetricTile`s: two columns on a phone, `columns` from `lg`, tiles stretch to one height. */
export const MetricGrid = ({ children, columns = 4, isLoading = false, skeletonCount, size, className }: MetricGridProps) => (
  <div data-slot="metric-grid" aria-busy={isLoading || undefined} className={cn('grid gap-3', COLUMNS_CLASS[columns], className)}>
    {isLoading
      ? Array.from({ length: skeletonCount ?? columns }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
          <MetricTileSkeleton key={index} size={size} />
        ))
      : children}
  </div>
);
