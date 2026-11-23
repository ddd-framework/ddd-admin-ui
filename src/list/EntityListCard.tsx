'use client';

import type { ReactNode } from 'react';

import { useTranslate } from '../i18n/index.ts';
import { cn } from '../primitives/cn.ts';

export interface EntityListCardProps {
  /** Accessible name of the list (`World teams`). */
  label?: string;
  /** Translation context of `label`; mark the label with the same context. */
  labelContext?: string;
  /** The card's fixed chrome, usually an `EntityListToolbar`. */
  toolbar?: ReactNode;
  /** A background refetch is in flight: a thin sweeping bar over the toolbar's bottom rule; rows stay mounted. */
  isRefetching?: boolean;
  /** `true` inside a full-height frame: the card takes the room left and the body scrolls inside it (from `md`). */
  fill?: boolean;
  /** The body: `EntityListBody`, `EntityListTable` or `EntityListGrid`. */
  children: ReactNode;
  className?: string;
}

/**
 * The list card (`.surface`, no border): the toolbar as fixed chrome (`px-4 py-3`, bottom rule) above the table or
 * card grid. The one frame of every list — the list page (`EntityListPage`) and every list inside a detail tab — so a
 * toolbar never touches the card edge and the grid view turns frameless the same way everywhere (host CSS: in grid
 * view the card drops its surface and the toolbar becomes a frosted bar of its own, flush with the cards below).
 */
export const EntityListCard = ({ label, labelContext, toolbar, isRefetching = false, fill = false, children, className }: EntityListCardProps) => {
  const { t } = useTranslate();
  return (
  <section
    aria-label={label ? t(label, labelContext ? { context: labelContext } : undefined) : undefined}
    aria-busy={isRefetching}
    className={cn('surface flex flex-col overflow-hidden rounded-3xl', fill && 'md:min-h-0 md:flex-1', className)}
  >
    {toolbar && (
      <div data-list-toolbar className="relative shrink-0 border-b px-4 py-3">
        {toolbar}
        <div className="absolute inset-x-0 -bottom-px h-0.5 overflow-hidden">
          {isRefetching && (
            <div
              role="progressbar"
              aria-label={t('Refreshing list')}
              className="absolute inset-0 animate-shimmer bg-linear-to-r from-transparent via-primary to-transparent"
            />
          )}
        </div>
      </div>
    )}
    <div className={cn('flex min-h-0 flex-col', fill && 'md:flex-1')}>{children}</div>
  </section>
  );
};
