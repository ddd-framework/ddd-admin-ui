'use client';

import { type ReactNode, useEffect, useState } from 'react';

import { cn } from '../primitives/cn.ts';

/** Whether the window has scrolled away from the top (read in an effect, never during render). */
const useWindowScrolled = (): boolean => {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 4);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  return scrolled;
};

export interface ShellTopBarProps {
  /** Above the bar, full width (an environment banner); `--nav-h` covers both. */
  banner?: ReactNode;
  /** The menu button (below `lg`). */
  menuButton?: ReactNode;
  /** The logo, usually a link home. */
  brand?: ReactNode;
  /** After the brand (an area tag, a scope switch). */
  start?: ReactNode;
  /** The breadcrumbs: they take the free width, from `md`. */
  breadcrumbs?: ReactNode;
  /** The right-hand cluster (language, notifications, account). Inline-end in RTL. */
  end?: ReactNode;
  className?: string;
  /** Extra classes of the bar's row (its padding, its gap). */
  rowClassName?: string;
  /** `data-*` attributes of the `<header>`. */
  [dataAttribute: `data-${string}`]: string | undefined;
}

const ROW_CLASS = 'flex min-h-0 flex-1 items-center justify-between gap-3 px-3 sm:px-4 lg:ps-5';

/**
 * The fixed top bar, `--nav-h` tall, over everything but overlays (`--layer-chrome`): banner, then one row — menu
 * button, brand, `start`, the breadcrumbs (from `md`), and the `end` cluster. Transparent at the top of the page,
 * frosted with a hairline once the window scrolls (`data-shell-scrolled`).
 */
export const ShellTopBar = ({ banner, menuButton, brand, start, breadcrumbs, end, className, rowClassName, ...rest }: ShellTopBarProps) => {
  const scrolled = useWindowScrolled();
  const dataAttributes = Object.fromEntries(Object.entries(rest).filter(([name]) => name.startsWith('data-')));
  return (
    <header
      {...dataAttributes}
      data-shell-topbar=""
      data-shell-scrolled={scrolled || undefined}
      className={cn(
        'fixed inset-x-0 top-0 z-(--layer-chrome) flex h-(--nav-h) flex-col border-b border-transparent transition-[background-color,border-color,backdrop-filter] duration-200',
        'data-shell-scrolled:border-border data-shell-scrolled:bg-background/85 data-shell-scrolled:backdrop-blur-md',
        className
      )}
    >
      {banner}
      <div className={rowClassName ? cn(ROW_CLASS, rowClassName) : ROW_CLASS}>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {menuButton}
          {brand && <div className="flex shrink-0 items-center gap-2">{brand}</div>}
          {start}
          {breadcrumbs && <div className="hidden min-w-0 flex-1 items-center md:flex">{breadcrumbs}</div>}
        </div>
        {end && <div className="flex shrink-0 items-center gap-2">{end}</div>}
      </div>
    </header>
  );
};
