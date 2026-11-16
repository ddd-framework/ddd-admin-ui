'use client';

import { parseDddDateTime } from '@mgamadeus/ddd-web/contract';
import { Check, CircleCheck, CircleMinus, Copy } from 'lucide-react';
import { type MouseEvent, useState } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '../primitives/index.ts';
import { cn } from '../primitives/cn.ts';
import { EmptyValue } from './EmptyValue.tsx';
import { useTranslate } from '../i18n/index.ts';
import { formatDate, formatDateTime, formatRelativeTime, isDddDateOnly } from '../logic/pure/format.ts';
import { useCopyToClipboard } from '../logic/react/useCopyToClipboard.ts';

// ─── ID ────────────────────────────────────────────────────────────────────────────────────────────────────────────

export interface IdCellProps {
  id: number | string | null | undefined;
  /** A quiet copy icon next to the id (shown on row hover / focus). The click never runs the row action. */
  copyable?: boolean;
  className?: string;
}

/**
 * The ID column of every table (convention: right after select / image): the id in tabular mono, muted, no `#`.
 * Navigation belongs to the name column and the row action, so the id is no link.
 */
export const IdCell = ({ id, copyable = false, className }: IdCellProps) => {
  const { t } = useTranslate();
  const { copy, copied } = useCopyToClipboard();
  if (id === null || id === undefined || id === '') return <EmptyValue />;
  const text = String(id);

  const handleCopy = (event: MouseEvent) => {
    event.stopPropagation();
    void copy(text);
  };

  return (
    <span className={cn('inline-flex items-center gap-1 font-mono text-[13px] text-muted-foreground tabular-nums', className)}>
      {text}
      {copyable && (
        <button
          type="button"
          onClick={handleCopy}
          aria-label={t('Copy ID %id%', { replacements: { id: text } })}
          title={t('Copy ID')}
          className="inline-flex size-5 items-center justify-center rounded opacity-0 transition-opacity group-hover/row:opacity-70 hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
        </button>
      )}
    </span>
  );
};

// ─── Dates ─────────────────────────────────────────────────────────────────────────────────────────────────────────

export interface DateCellProps {
  /** A backend date-time (offsetless UTC) or date (`Y-m-d`). */
  value: string | null | undefined;
  /** `date` drops the time (Start / End of a day-based range); a `Y-m-d` value never shows a time. */
  format?: 'dateTime' | 'date';
  className?: string;
}

/**
 * Every date column (Created, Updated, Start, End, Sent): the `EntityMetadata` format in the viewer's zone, the relative
 * time on hover, `—` when empty. Never print raw date strings in a table.
 */
export const DateCell = ({ value, format = 'dateTime', className }: DateCellProps) => {
  const date = parseDddDateTime(value);
  if (!value) return <EmptyValue />;
  if (!date) return <span className={cn('whitespace-nowrap', className)}>{value}</span>;
  const text = format === 'date' || isDddDateOnly(value) ? formatDate(value) : formatDateTime(value);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <time dateTime={date.toISOString()} className={cn('cursor-default whitespace-nowrap tabular-nums', className)}>
          {text}
        </time>
      </TooltipTrigger>
      <TooltipContent>{formatRelativeTime(date)}</TooltipContent>
    </Tooltip>
  );
};

// ─── Boolean ───────────────────────────────────────────────────────────────────────────────────────────────────────

export interface BooleanCellProps {
  value: boolean | null | undefined;
  trueLabel?: string;
  falseLabel?: string;
  /** `false` renders `—` instead of the "No" mark (flag columns where only "Yes" matters). */
  showFalse?: boolean;
  className?: string;
}

/** A flag column: success check + "Yes", muted minus + "No", `—` for `null` / `undefined` (colour + icon + label). */
export const BooleanCell = ({ value, trueLabel, falseLabel, showFalse = true, className }: BooleanCellProps) => {
  const { t } = useTranslate();
  if (value === null || value === undefined || (value === false && !showFalse)) return <EmptyValue />;
  return value ? (
    <span className={cn('inline-flex items-center gap-1.5 text-[13px] font-medium text-success', className)}>
      <CircleCheck className="size-4" aria-hidden />
      {trueLabel ?? t('Yes', { context: 'boolean-flag' })}
    </span>
  ) : (
    <span className={cn('inline-flex items-center gap-1.5 text-[13px] text-muted-foreground', className)}>
      <CircleMinus className="size-4" aria-hidden />
      {falseLabel ?? t('No', { context: 'boolean-flag' })}
    </span>
  );
};

// ─── Image ─────────────────────────────────────────────────────────────────────────────────────────────────────────

const IMAGE_SIZE_CLASS = {
  sm: 'size-10',
  md: 'size-12',
  lg: 'size-16',
  wide: 'h-12 w-24',
} as const;

export interface ImageCellProps {
  /** A resolved image URL (the app sizes media URLs before passing them). */
  src: string | null | undefined;
  alt: string;
  /** `md` (48 px square) by default; `wide` for banners and rewards, `lg` for maps and photos. */
  size?: keyof typeof IMAGE_SIZE_CLASS;
  /** `contain` for logos and icons, `cover` for photos and map tiles. */
  fit?: 'contain' | 'cover';
  className?: string;
}

/** The image column (first after select): a lazy thumbnail in a rounded box, `—` without an image or when it fails. */
export const ImageCell = ({ src, alt, size = 'md', fit = 'contain', className }: ImageCellProps) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || failedSrc === src) return <EmptyValue />;
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/30',
        IMAGE_SIZE_CLASS[size],
        className
      )}
    >
      {/* biome-ignore lint/performance/noImgElement: API-served media with its own size parameter, not a Next asset */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={cn('size-full', fit === 'cover' ? 'object-cover' : 'object-contain')}
        onError={() => setFailedSrc(src)}
      />
    </div>
  );
};
