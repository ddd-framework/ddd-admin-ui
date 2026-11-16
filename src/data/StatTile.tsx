import { formatUiNumber } from '../logic/pure/format.ts';
import { cn } from '../primitives/cn.ts';

export interface StatTileProps {
  label: string;
  value: number;
  className?: string;
}

/** One key figure. Presentation only; data and polling stay with the caller. */
export const StatTile = ({ label, value, className }: StatTileProps) => (
  <div className={cn('surface flex flex-col gap-1 rounded-lg p-4', className)}>
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-2xl font-semibold tabular-nums">{formatUiNumber(value)}</span>
  </div>
);
