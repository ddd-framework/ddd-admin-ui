'use client';

import { Menu } from 'lucide-react';
import { Direction } from 'radix-ui';
import { type ReactNode, useEffect, useRef } from 'react';

import { useTranslate } from '../i18n/useTranslate.ts';
import type { ActiveNavigation, NavigationItem } from '../logic/pure/navigation.ts';
import { cn } from '../primitives/cn.ts';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from '../primitives/sheet.tsx';
import { ShellNavList } from './ShellNavList.tsx';

export interface ShellMenuButtonProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The id of the menu's content (`aria-controls`). */
  controls?: string;
  className?: string;
}

/** The round menu button of the top bar below `lg`: it opens the mobile menu. Hidden from `lg` (the sidebar shows). */
export const ShellMenuButton = ({ open, onOpenChange, controls, className }: ShellMenuButtonProps) => {
  const { t } = useTranslate();
  return (
    <button
      type="button"
      aria-label={t('Open navigation')}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={open ? controls : undefined}
      data-shell-menu-button=""
      onClick={() => onOpenChange(!open)}
      className={cn(
        'inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-tint hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring lg:hidden',
        className
      )}
    >
      <Menu aria-hidden className="size-4" />
    </button>
  );
};

export interface ShellMobileMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: readonly NavigationItem<string>[];
  active: ActiveNavigation<string> | null;
  pathname: string | null;
  id?: string;
  /** The navigation landmark's name (default "Main"). */
  label?: string;
  /** Over the list (the brand, a scope selector). */
  header?: ReactNode;
  /** Under the list (the account, sign out). */
  footer?: ReactNode;
  className?: string;
  /** Classes of the header row (it is `--nav-h` tall: a host whose banner makes `--nav-h` taller sets `h-14`). */
  headerClassName?: string;
  /** Classes of the overlay behind the sheet. */
  overlayClassName?: string;
  /**
   * The close button instead of the default one (top end corner): a button element, wrapped so that it closes the
   * menu; give it an accessible name. `false`: no close button (Escape and the overlay still close).
   */
  closeButton?: ReactNode | false;
  /** Extra classes of the `<nav>` holding the list. */
  navClassName?: string;
  /** Extra classes of the footer. */
  footerClassName?: string;
  /** A description of the menu for assistive technology, wired as the dialog's `aria-describedby` (not shown). */
  description?: ReactNode;
}

/**
 * The navigation below `lg`: a sheet from the inline-start edge (left, right in RTL) with every entry one tap away, a
 * header and a footer slot. A followed link closes it, so does a route change; the focus returns to the menu button.
 * A dialog with its own name ("Navigation") holding a `<nav>` landmark.
 */
export const ShellMobileMenu = ({
  open,
  onOpenChange,
  items,
  active,
  pathname,
  id,
  label,
  header,
  footer,
  className,
  headerClassName,
  overlayClassName,
  closeButton,
  navClassName,
  footerClassName,
  description,
}: ShellMobileMenuProps) => {
  const { t } = useTranslate();
  const side = Direction.useDirection() === 'rtl' ? 'right' : 'left';
  // a route change (a link, back / forward) closes the menu
  const lastPathname = useRef(pathname);
  useEffect(() => {
    if (lastPathname.current === pathname) return;
    lastPathname.current = pathname;
    onOpenChange(false);
  }, [pathname, onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        id={id}
        side={side}
        // without a description the dialog has none (Radix would warn); with one Radix wires it
        {...(description === undefined || description === null ? { 'aria-describedby': undefined } : {})}
        data-shell-mobile-menu=""
        className={cn('w-72 gap-0 bg-card p-0 lg:hidden', className)}
        overlayClassName={overlayClassName}
        showCloseButton={closeButton === undefined}
      >
        <SheetTitle className="sr-only">{t('Navigation')}</SheetTitle>
        {description !== undefined && description !== null && <SheetDescription className="sr-only">{description}</SheetDescription>}
        {header && <div className={cn('flex h-(--nav-h) shrink-0 items-center gap-2 border-b px-4 pe-12', headerClassName)}>{header}</div>}
        <nav
          aria-label={label ?? t('Main', { context: 'navigation' })}
          className={navClassName ? cn('min-h-0 flex-1 overflow-y-auto px-2 py-4', navClassName) : 'min-h-0 flex-1 overflow-y-auto px-2 py-4'}
        >
          <ShellNavList items={items} active={active} pathname={pathname} onNavigate={() => onOpenChange(false)} />
        </nav>
        {footer && <div className={footerClassName ? cn('shrink-0 space-y-2 border-t p-3', footerClassName) : 'shrink-0 space-y-2 border-t p-3'}>{footer}</div>}
        {closeButton !== undefined && closeButton !== false && <SheetClose asChild>{closeButton}</SheetClose>}
      </SheetContent>
    </Sheet>
  );
};
