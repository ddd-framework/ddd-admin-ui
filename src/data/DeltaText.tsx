'use client';

import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { ReactNode } from 'react';

import { useTranslate } from '../i18n/index.ts';
import { cn } from '../primitives/cn.ts';
import {
  type DeltaDirection,
  type DeltaFormat,
  type DeltaPreference,
  type DeltaTone,
  resolveDelta,
} from './delta.ts';

export interface DeltaTextProps {
  /** The change (`current - previous`, or a fraction with `format="percent"`). `null` / `undefined`: `emptyText` or nothing. */
  value?: number | null;
  /** Which side is good: `higher` (default), `lower` (costs, errors, durations), `none`. */
  preference?: DeltaPreference;
  /** How the number is written (default `number`; `percent` takes a fraction). */
  format?: DeltaFormat;
  /** Values within this distance of zero count as no change. */
  epsilon?: number;
  /** Already formatted text instead of `value` (then `direction` is required; the tone follows `preference`). */
  text?: ReactNode;
  direction?: DeltaDirection;
  /** Overrides the computed tone. */
  tone?: DeltaTone;
  /** Shown muted when there is no value (e.g. "new"); already translated. Without it nothing renders. */
  emptyText?: ReactNode;
  /** Hover text, e.g. what the change is measured against (already translated). */
  title?: string;
  className?: string;
}

const TONE_CLASS: Record<DeltaTone, string> = {
  positive: 'text-success',
  negative: 'text-destructive',
  neutral: 'text-muted-foreground',
};

const ICON = { up: ArrowUpRight, down: ArrowDownRight, flat: Minus } as const;

/**
 * A change against a comparison: arrow + signed number, coloured by whether the change is good. Colour never stands
 * alone: the arrow and the sign carry the direction, and a visually hidden word ("Increase", "Decrease", "No change")
 * names it for screen readers.
 */
export const DeltaText = ({
  value,
  preference = 'higher',
  format,
  epsilon,
  text,
  direction,
  tone,
  emptyText,
  title,
  className,
}: DeltaTextProps) => {
  const { t } = useTranslate();
  let resolved: { direction: DeltaDirection; tone: DeltaTone; text: ReactNode } | null = null;
  if (text !== undefined && text !== null && direction) {
    resolved = { direction, tone: resolveDelta(direction === 'flat' ? 0 : direction === 'up' ? 1 : -1, { preference }).tone, text };
  } else if (typeof value === 'number' && Number.isFinite(value)) {
    resolved = resolveDelta(value, { preference, format, epsilon });
  }
  if (!resolved) {
    if (emptyText === undefined || emptyText === null) return null;
    return (
      <span data-slot="delta-text" className={cn('text-muted-foreground', className)} title={title}>
        {emptyText}
      </span>
    );
  }
  const Icon = ICON[resolved.direction];
  const spoken =
    resolved.direction === 'up' ? t('Increase') : resolved.direction === 'down' ? t('Decrease') : t('No change');
  return (
    <span
      data-slot="delta-text"
      data-direction={resolved.direction}
      data-tone={tone ?? resolved.tone}
      className={cn(
        'inline-flex items-center gap-0.5 font-medium whitespace-nowrap tabular-nums',
        TONE_CLASS[tone ?? resolved.tone],
        className
      )}
      title={title}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <span className="sr-only">{spoken} </span>
      {resolved.text}
    </span>
  );
};
