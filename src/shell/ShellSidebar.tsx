'use client';

import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Direction } from 'radix-ui';
import type { ReactNode } from 'react';

import { useTranslate } from '../i18n/useTranslate.ts';
import type { ActiveNavigation, NavigationItem } from '../logic/pure/navigation.ts';
import { cn } from '../primitives/cn.ts';
import { Tooltip, TooltipContent, TooltipTrigger } from '../primitives/tooltip.tsx';
import { NAV_ICON_CLASS, NAV_ROW_CLASS } from './navClasses.ts';
import { ShellNavList } from './ShellNavList.tsx';
import { ShellNavRail } from './ShellNavRail.tsx';

export interface ShellSidebarProps {
  /** The tree the viewer may see (filtered by the rights predicate). */
  items: readonly NavigationItem<string>[];
  active: ActiveNavigation<string> | null;
  pathname: string | null;
  /** The icon rail instead of the full column. */
  collapsed: boolean;
  onToggleCollapsed: () => void;
  /** The shortcut shown on the toggle (`null`: none). */
  shortcut?: string | null;
  /** The id of the `<aside>` (the toggle's `aria-controls`). */
  id?: string;
  /** The navigation landmark's name (default "Main"). */
  label?: string;
  /** Above the list while expanded (a scope or workspace selector). */
  header?: ReactNode;
  /** Its compact form on the rail. */
  railHeader?: ReactNode;
  /** Between the list and the collapse toggle. */
  footer?: ReactNode;
  className?: string;
  /** Extra classes of the `<nav>` holding the list or the rail (its padding, its scroll area). */
  navClassName?: string;
  /** `data-*` attributes of the `<aside>`. */
  [dataAttribute: `data-${string}`]: string | undefined;
}

const SIDEBAR_NAV_CLASS = 'min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 pt-2 pb-4';

const CollapseToggle =({ collapsed, onToggle, controls, shortcut }: { collapsed: boolean; onToggle: () => void; controls?: string; shortcut: string | null }) => {
  const { t } = useTranslate();
  const label = collapsed ? t('Expand sidebar') : t('Collapse sidebar');
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose;
  const side = Direction.useDirection() === 'rtl' ? 'left' : 'right';
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onToggle}
          aria-label={label}
          aria-expanded={!collapsed}
          aria-controls={controls}
          aria-keyshortcuts={shortcut ?? undefined}
          data-shell-collapse-toggle=""
          data-agent-skip=""
          className={cn(NAV_ROW_CLASS, 'text-muted-foreground hover:text-foreground', collapsed && 'mx-auto w-11 justify-center px-0')}
        >
          <Icon aria-hidden className={cn(NAV_ICON_CLASS, 'rtl:-scale-x-100')} />
          {!collapsed && (
            <>
              <span aria-hidden className="min-w-0 truncate">
                {label}
              </span>
              {shortcut && (
                <kbd aria-hidden className="ms-auto rounded bg-tint-strong px-1.5 font-sans text-[11px] leading-5 text-muted-foreground">
                  {shortcut}
                </kbd>
              )}
            </>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} sideOffset={8}>
        {label}
        {shortcut && <kbd className="ms-1.5 rounded bg-background/20 px-1 font-sans text-[11px]">{shortcut}</kbd>}
      </TooltipContent>
    </Tooltip>
  );
};

/**
 * The desktop sidebar (from `lg`): a fixed column under the top bar, `--sidebar-w` wide, or the icon rail
 * (`--sidebar-rail-w`) while collapsed; the width animates (not with reduced motion). A `<nav>` landmark holds the list
 * (or the rail); the foot row toggles the rail and shows the shortcut. Below `lg` it is hidden: the mobile menu is the
 * navigation there. Its inline-start edge follows the writing direction.
 */
export const ShellSidebar = ({
  items,
  active,
  pathname,
  collapsed,
  onToggleCollapsed,
  shortcut = null,
  id,
  label,
  header,
  railHeader,
  footer,
  className,
  navClassName,
  ...rest
}: ShellSidebarProps) => {
  const { t } = useTranslate();
  const top = collapsed ? railHeader : header;
  const dataAttributes = Object.fromEntries(Object.entries(rest).filter(([name]) => name.startsWith('data-')));
  return (
    <aside
      {...dataAttributes}
      id={id}
      data-shell-sidebar=""
      data-collapsed={collapsed || undefined}
      className={cn(
        'hidden overflow-x-hidden lg:fixed lg:start-0 lg:top-(--nav-h) lg:bottom-0 lg:z-(--layer-chrome) lg:flex lg:flex-col',
        'transition-[width] duration-300 ease-out motion-reduce:transition-none',
        collapsed ? 'lg:w-(--sidebar-rail-w)' : 'lg:w-(--sidebar-w)',
        className
      )}
    >
      {top && <div className={cn('shrink-0 px-3 pt-2 pb-1', collapsed && 'flex justify-center')}>{top}</div>}
      <nav
        aria-label={label ?? t('Main', { context: 'navigation' })}
        className={navClassName ? cn(SIDEBAR_NAV_CLASS, navClassName) : SIDEBAR_NAV_CLASS}
      >
        {collapsed ? <ShellNavRail items={items} active={active} /> : <ShellNavList items={items} active={active} pathname={pathname} />}
      </nav>
      {footer && <div className="shrink-0 px-3 pb-1">{footer}</div>}
      <div className="shrink-0 px-3 py-2">
        <CollapseToggle collapsed={collapsed} onToggle={onToggleCollapsed} controls={id} shortcut={shortcut} />
      </div>
    </aside>
  );
};
