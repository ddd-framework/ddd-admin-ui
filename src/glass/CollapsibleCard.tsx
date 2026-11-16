'use client';

import { ChevronDown, Minus, Plus } from 'lucide-react';
import { type ReactNode, useId, useState } from 'react';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../primitives/index.ts';
import { cn } from '../primitives/cn.ts';

export interface CollapsibleCardProps {
  title: ReactNode;
  /** One muted line under the title (what the section holds). */
  description?: ReactNode;
  /** Leading icon of the `solid` variant (a highlight accordion). */
  icon?: ReactNode;
  /**
   * `glass` (default): very translucent card, round ghost +/− toggle, a touch more opaque while open.
   * `solid`: the normal card surface with icon + title + chevron (a highlight accordion).
   */
  variant?: 'glass' | 'solid';
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Non-interactive facts in the title row before the toggle (a colour swatch, a count). */
  meta?: ReactNode;
  /** Controls right of the title (they never toggle the card). */
  actions?: ReactNode;
  /** `compact`: a group inside a card or form section (16 px padding, 14 px title, radius 16 px). */
  density?: 'default' | 'compact';
  /** Keep the body mounted while closed (form fields that must stay registered). Default `true`. */
  forceMount?: boolean;
  /** `h2` on the page, `h3` inside a section (default). */
  as?: 'h2' | 'h3' | 'h4';
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

/**
 * A collapsible card: title row + toggle, the body below. The whole title row toggles; the
 * toggle is a real button (`aria-expanded`, `aria-controls`). Form sections keep their fields mounted while closed
 * (`forceMount`, hidden), so a collapsed group never drops values or validation.
 */
export const CollapsibleCard = ({
  title,
  description,
  icon,
  variant = 'glass',
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  meta,
  actions,
  density = 'default',
  forceMount = true,
  as: Heading = 'h3',
  children,
  className,
  contentClassName,
}: CollapsibleCardProps) => {
  const [openState, setOpenState] = useState(defaultOpen);
  const open = openProp ?? openState;
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setOpenState(next);
    onOpenChange?.(next);
  };
  const titleId = useId();
  const isGlass = variant === 'glass';
  const compact = density === 'compact';

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn(
        compact ? 'rounded-2xl' : 'rounded-3xl',
        'transition-[background-color] duration-200 motion-reduce:transition-none',
        // A glass container casts no shadow: only the solid rows / fields inside it do.
        isGlass ? (open ? 'surface-glass-strong shadow-none' : 'surface-glass shadow-none') : 'surface',
        className
      )}
    >
      <div className={cn('flex items-center gap-3', compact ? 'px-4 py-3' : 'px-6 py-4')}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            aria-labelledby={titleId}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {!isGlass && icon && (
              <span className="text-muted-foreground [&_svg]:size-5" aria-hidden>
                {icon}
              </span>
            )}
            <span className="min-w-0 flex-1">
              <Heading
                id={titleId}
                className={cn('font-semibold tracking-tight', compact ? 'text-sm' : 'text-title-card')}
              >
                {title}
              </Heading>
              {description && (
                <span className={cn('mt-0.5 block text-muted-foreground', compact ? 'text-xs' : 'text-[13px]')}>
                  {description}
                </span>
              )}
            </span>
            {meta && <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">{meta}</span>}
            {isGlass ? (
              <span
                className={cn(
                  'inline-flex shrink-0 items-center justify-center rounded-full bg-tint text-foreground transition-colors hover:bg-tint-strong',
                  compact ? 'size-7' : 'size-8'
                )}
                aria-hidden
              >
                {open ? <Minus className="size-4" /> : <Plus className="size-4" />}
              </span>
            ) : (
              <ChevronDown
                className={cn(
                  'size-5 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none',
                  open && 'rotate-180'
                )}
                aria-hidden
              />
            )}
          </button>
        </CollapsibleTrigger>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      <CollapsibleContent forceMount={forceMount ? true : undefined} className="data-[state=closed]:hidden">
        <div className={cn(compact ? 'px-4 pb-4' : 'px-6 pb-6', contentClassName)}>{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
};
