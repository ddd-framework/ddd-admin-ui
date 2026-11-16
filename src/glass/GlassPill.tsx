import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '../primitives/cn.ts';

export interface GlassPillProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: ReactNode;
  /** Leading icon (`size-4`, muted). */
  icon?: ReactNode;
  /** A count after the label (`Open 5`); accent-filled while the pill is active or `countTone="accent"`. */
  count?: ReactNode;
  countTone?: 'auto' | 'accent' | 'quiet';
  /** The picked quick filter / the open group: navy bold text on the stronger glass. */
  active?: boolean;
  /** `span` for a pill that is only a label (a group header inside its own toggle button). */
  as?: 'button' | 'span';
  size?: 'sm' | 'md';
}

/** Pill geometry + glass tone, shared by `GlassPill`, `GlassGroup` and the header pills. */
export const GLASS_PILL_CLASS =
  'inline-flex shrink-0 items-center gap-2 rounded-full whitespace-nowrap transition-[background-color,color,box-shadow] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none';

/**
 * A glass pill (e.g. quick filters `Open 5 · Planned 0`): rounded-full, very translucent card colour + blur,
 * soft wide shadow; active = navy bold on a solid white (dark: card) pill with an accent count, idle = muted text on
 * the glass.
 */
export const GlassPill = ({
  children,
  icon,
  count,
  countTone = 'auto',
  active = false,
  as = 'button',
  size = 'md',
  className,
  type = 'button',
  ...buttonProps
}: GlassPillProps) => {
  const accentCount = countTone === 'accent' || (countTone === 'auto' && active);
  const content = (
    <>
      {icon && (
        <span className={cn('[&_svg]:size-4', active ? 'text-foreground' : 'text-muted-foreground')} aria-hidden>
          {icon}
        </span>
      )}
      <span className="inline-flex items-center gap-1.5">{children}</span>
      {count !== undefined && count !== null && (
        <span
          className={cn(
            'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] leading-none font-black tabular-nums',
            accentCount ? 'bg-primary text-primary-foreground' : 'bg-tint text-muted-foreground'
          )}
        >
          {count}
        </span>
      )}
    </>
  );
  const classes = cn(
    GLASS_PILL_CLASS,
    size === 'sm' ? 'h-8 px-3 text-[13px]' : 'h-9 px-4 text-sm',
    active
      ? 'bg-card font-bold text-foreground shadow-[var(--surface-shadow-raised)]'
      : 'surface-glass font-semibold text-muted-foreground hover:text-foreground',
    className
  );
  if (as === 'span') return <span className={classes}>{content}</span>;
  return (
    <button type={type} className={classes} {...buttonProps}>
      {content}
    </button>
  );
};
