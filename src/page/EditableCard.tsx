'use client';

import { Pencil } from 'lucide-react';
import type { ReactNode } from 'react';

import { useTranslate } from '../i18n/index.ts';
import { cn } from '../primitives/cn.ts';

export interface EditableCardProps {
  /** The card title (card-title size, semibold). */
  title: ReactNode;
  /** Opens the edit form; without it the card has no edit button. */
  onEdit?: () => void;
  /** Accessible name of the edit button (`Edit general settings`). */
  editLabel?: string;
  /** The write guard (`!useWritesAllowed()`) or a missing right. */
  editDisabled?: boolean;
  /** Extra controls left of the edit button. */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * The read-first settings card: title top-left, a square ghost edit button
 * top-right (navy 6 % fill, 10 % on hover), then the read-only content — usually `IconValueRow`s. A clouds surface
 * (`.surface`: radius 16 px, no border, soft shadow, padding 24 px). Only the button edits; the card itself is not
 * clickable, so text stays selectable and a screen reader meets one control.
 */
export const EditableCard = ({
  title,
  onEdit,
  editLabel,
  editDisabled = false,
  actions,
  children,
  className,
}: EditableCardProps) => {
  const { t } = useTranslate();
  const editButtonLabel = editLabel ?? t('Edit', { context: 'action' });
  return (
    <section className={cn('surface flex flex-col gap-4 rounded-2xl p-6 text-card-foreground', className)}>
      <div className="flex items-start gap-3">
        <h3 className="min-w-0 flex-1 text-title-card font-semibold tracking-tight">{title}</h3>
        {(actions || onEdit) && (
          <div className="flex shrink-0 items-center gap-2">
            {actions}
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                disabled={editDisabled}
                aria-label={editButtonLabel}
                title={editButtonLabel}
                className="inline-flex size-8 items-center justify-center rounded-md bg-tint text-foreground transition-colors duration-150 outline-none hover:bg-tint-strong focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
              >
                <Pencil className="size-4" aria-hidden />
              </button>
            )}
          </div>
        )}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
};

export interface IconValueProps {
  /** A `lucide-react` icon element (`<Globe />`); drawn 16 px in the muted colour. */
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}

/** One fact of a read-first card: a muted outline icon and the value. */
export const IconValue = ({ icon, children, className }: IconValueProps) => (
  <div className={cn('inline-flex min-w-0 items-center gap-2 text-sm', className)}>
    <span className="shrink-0 text-muted-foreground [&_svg]:size-4" aria-hidden>
      {icon}
    </span>
    <span className="min-w-0">{children}</span>
  </div>
);

export interface IconValueRowProps {
  children: ReactNode;
  /** `stack` = one fact per line (default, settings cards); `wrap` = facts side by side, wrapping. */
  layout?: 'stack' | 'wrap';
  className?: string;
}

/** The facts of a read-first card: `IconValue`s one per line (gap 12 px) or side by side (column gap 12 px). */
export const IconValueRow = ({ children, layout = 'stack', className }: IconValueRowProps) => (
  <div className={cn(layout === 'stack' ? 'flex flex-col gap-3' : 'flex flex-wrap gap-x-3 gap-y-2', className)}>
    {children}
  </div>
);
