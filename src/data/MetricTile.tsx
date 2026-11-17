import type { ReactNode } from 'react';

import { Card, CardContent, Skeleton } from '../primitives/index.ts';
import { cn } from '../primitives/cn.ts';

export interface MetricTileProps {
  /** The caption (already translated). */
  label: ReactNode;
  /** The figure, already formatted (`formatUiNumber`, the host's money formatter, …). */
  value: ReactNode;
  /** A small icon before the caption (`aria-hidden` is the caller's: icons here are decoration). */
  icon?: ReactNode;
  /** The change against a comparison, under the figure — usually a `DeltaText`. */
  delta?: ReactNode;
  /** One muted line under the change (e.g. the comparison value or the period). */
  hint?: ReactNode;
  /** Render slot for a small chart (a sparkline of the host's chart library), drawn under the texts at full width. */
  sparkline?: ReactNode;
  /** While loading the tile keeps its size and shows placeholders (the caption stays when given). */
  isLoading?: boolean;
  /** `compact` for a drawer or a narrow column. */
  size?: 'default' | 'compact';
  className?: string;
}

const VALUE_CLASS = { default: 'text-[26px] leading-8', compact: 'text-xl leading-7' } as const;

/**
 * A key figure as a tile: caption, the figure, an optional change and a muted hint, a sparkline slot under them.
 * No data loading and no formatting of its own: the screen passes formatted values. Rows of tiles go into a
 * `MetricGrid`.
 */
export const MetricTile = ({
  label,
  value,
  icon,
  delta,
  hint,
  sparkline,
  isLoading = false,
  size = 'default',
  className,
}: MetricTileProps) => (
  <Card data-slot="metric-tile" aria-busy={isLoading || undefined} className={cn('gap-0 py-0', className)}>
    <CardContent className={cn('flex h-full flex-col', size === 'compact' ? 'p-3' : 'p-4')}>
      <p className="flex items-center gap-1.5 text-[11.5px] font-bold tracking-[0.06em] text-muted-foreground uppercase [&_svg]:size-3.5 [&_svg]:shrink-0">
        {icon}
        <span className="truncate">{label}</span>
      </p>
      {isLoading ? (
        <>
          <Skeleton className={cn('mt-1.5 w-2/3', size === 'compact' ? 'h-7' : 'h-8')} />
          <Skeleton className="mt-1.5 h-3.5 w-1/3" />
        </>
      ) : (
        <>
          <p className={cn('mt-1.5 font-semibold tracking-tight tabular-nums', VALUE_CLASS[size])}>{value}</p>
          {delta && <div className="mt-0.5 text-xs">{delta}</div>}
          {hint && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{hint}</p>}
          {sparkline && <div className="mt-auto pt-2">{sparkline}</div>}
        </>
      )}
    </CardContent>
  </Card>
);

/** A placeholder tile of the size of a `MetricTile` (no caption known yet). */
export const MetricTileSkeleton = ({ size = 'default', className }: { size?: 'default' | 'compact'; className?: string }) => (
  <Skeleton
    data-slot="metric-tile-skeleton"
    aria-hidden
    className={cn('rounded-2xl', size === 'compact' ? 'h-[92px]' : 'h-[112px]', className)}
  />
);
