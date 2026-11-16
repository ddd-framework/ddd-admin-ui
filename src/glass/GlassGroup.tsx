'use client';

import { ChevronDown } from 'lucide-react';
import { Children, type ReactNode, useId, useState } from 'react';

import { useTranslate } from '../i18n/index.ts';
import { cn } from '../primitives/cn.ts';
import { GlassPill } from './GlassPill.tsx';

export interface GlassGroupProps {
  /** The group's name in the header pill (`Running`). */
  title: string;
  /** The number of items (header pill count); defaults to the children's count. */
  count?: number;
  /** Collapsed groups render as a bare glass pill (next to the open group). Default: open when it has items. */
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Show the first `limit` rows and a floating "Show all (n)" / "Show less" pill at the bottom edge. */
  limit?: number;
  /** Shown inside an open group without rows. */
  emptyText?: ReactNode;
  /** The rows (`ActionRow`s or anything solid). */
  children?: ReactNode;
  className?: string;
}

/**
 * A glass group panel: a very translucent container (radius 24 px) with a glass pill
 * header (title + count) and a round chevron toggle, stacked solid rows inside, and a small floating pill at the
 * bottom edge to show all / fewer rows. The panel itself casts no shadow; only the
 * solid rows inside do. Collapsed, the group is only its pill, so collapsed groups line up as pills.
 */
export const GlassGroup = ({
  title,
  count,
  defaultOpen,
  open: openProp,
  onOpenChange,
  limit,
  emptyText,
  children,
  className,
}: GlassGroupProps) => {
  const { t } = useTranslate();
  const rows = Children.toArray(children);
  const total = count ?? rows.length;
  const [openState, setOpenState] = useState(defaultOpen ?? rows.length > 0);
  const [expanded, setExpanded] = useState(false);
  const open = openProp ?? openState;
  const bodyId = useId();
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setOpenState(next);
    onOpenChange?.(next);
  };

  if (!open) {
    return (
      <GlassPill
        className={className}
        count={total}
        countTone={total > 0 ? 'accent' : 'quiet'}
        aria-expanded={false}
        aria-controls={bodyId}
        onClick={() => setOpen(true)}
      >
        {title}
        <ChevronDown className="-mr-1 size-4 text-muted-foreground" aria-hidden />
      </GlassPill>
    );
  }

  const visible = limit !== undefined && !expanded ? rows.slice(0, limit) : rows;
  const hidden = rows.length - visible.length;

  return (
    <section aria-label={title} className={cn('surface-glass relative rounded-3xl p-3 shadow-none', limit !== undefined && rows.length > limit && 'pb-6', className)}>
      <div className="mb-3 flex items-center gap-2">
        <GlassPill as="span" active count={total} countTone={total > 0 ? 'accent' : 'quiet'}>
          {title}
        </GlassPill>
        <button
          type="button"
          aria-label={t('Collapse %title%', { replacements: { title } })}
          aria-expanded
          aria-controls={bodyId}
          onClick={() => setOpen(false)}
          className="ml-auto inline-flex size-8 items-center justify-center rounded-full bg-tint text-foreground outline-none transition-colors hover:bg-tint-strong focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronDown className="size-4 rotate-180" aria-hidden />
        </button>
      </div>
      <div id={bodyId} className="flex flex-col gap-2">
        {visible.length > 0 ? visible : emptyText && <p className="px-2 py-3 text-[13px] text-muted-foreground">{emptyText}</p>}
      </div>
      {limit !== undefined && rows.length > limit && (
        <button
          type="button"
          onClick={() => setExpanded(value => !value)}
          className="absolute -bottom-3.5 left-1/2 inline-flex h-7 -translate-x-1/2 items-center rounded-full bg-card px-3 text-[12px] font-semibold text-foreground shadow-[var(--surface-shadow-raised)] outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {expanded ? t('Show less') : t('Show all (%count%)', { replacements: { count: hidden + visible.length } })}
        </button>
      )}
    </section>
  );
};
