'use client';

import { Direction } from 'radix-ui';
import { Fragment, type ReactNode, useContext, useEffect, useRef, useState } from 'react';

import { useTranslate } from '../i18n/useTranslate.ts';
import {
  type ActiveNavigation,
  isNavigationGroup,
  isNavigationGroupActive,
  type NavigationGroup,
  type NavigationItem,
  type NavigationLeaf,
} from '../logic/pure/navigation.ts';
import { cn } from '../primitives/cn.ts';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../primitives/dropdown-menu.tsx';
import { Tooltip, TooltipContent, TooltipTrigger } from '../primitives/tooltip.tsx';
import { NAV_ICON_CLASS, NAV_RAIL_ROW_CLASS, NAV_ROW_ACTIVE_CLASS, NAV_ROW_CLASS } from './navClasses.ts';
import { MarkedNavIcon, NavItemMarks, useNavMarkText } from './NavItemMarks.tsx';
import { ShellNavLink } from './ShellNavLink.tsx';
import { ShellNavDisplayContext } from './shellContext.ts';

/** Delay before hover opens / closes a group flyout: sweeping along the rail does not flash every menu. */
const FLYOUT_HOVER_DELAY_MS = 150;

const RailLeaf = ({ item, active, side }: { item: NavigationLeaf<string>; active: ActiveNavigation<string> | null; side: 'left' | 'right' }) => {
  const { t } = useTranslate();
  const display = useContext(ShellNavDisplayContext);
  const current = active?.item.key === item.key;
  const marks = useNavMarkText(item);
  const label = t(item.label);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <ShellNavLink
          item={item}
          aria-label={[label, ...(item.badge ? [String(item.badge)] : []), ...marks].join(', ')}
          aria-current={current ? 'page' : undefined}
          className={cn(NAV_ROW_CLASS, NAV_RAIL_ROW_CLASS, display.railRowClassName, current && NAV_ROW_ACTIVE_CLASS)}
        >
          <MarkedNavIcon icon={item.icon} item={item} />
        </ShellNavLink>
      </TooltipTrigger>
      <TooltipContent side={side} sideOffset={8}>
        {label}
        {marks.map(text => (
          <span key={text} className="block opacity-70">
            {text}
          </span>
        ))}
      </TooltipContent>
    </Tooltip>
  );
};

/** The group's entries in its flyout: leaves as items, a nested group as a label over its own entries. */
const FlyoutEntries = ({ items, active }: { items: readonly NavigationItem<string>[]; active: ActiveNavigation<string> | null }): ReactNode => {
  const { t } = useTranslate();
  return items.map(item => {
    if (isNavigationGroup(item)) {
      return (
        <Fragment key={item.key}>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">{t(item.label)}</DropdownMenuLabel>
          {item.href !== undefined && (
            <DropdownMenuItem asChild className={cn('gap-3 text-foreground', active?.item.key === item.key && 'bg-tint-strong font-semibold')}>
              <ShellNavLink item={{ key: item.key, href: item.href }} aria-current={active?.item.key === item.key ? 'page' : undefined}>
                <span className="truncate">{t(item.label)}</span>
              </ShellNavLink>
            </DropdownMenuItem>
          )}
          <FlyoutEntries items={item.children} active={active} />
        </Fragment>
      );
    }
    const current = active?.item.key === item.key;
    const Icon = item.icon;
    return (
      <DropdownMenuItem key={item.key} asChild className={cn('gap-3 text-foreground', current && 'bg-tint-strong font-semibold focus:bg-tint-strong')}>
        <ShellNavLink item={item} aria-current={current ? 'page' : undefined}>
          {Icon && <Icon aria-hidden className={cn('size-4 [stroke-width:1.75]', current && 'text-brand')} />}
          <span className="min-w-0 truncate">{t(item.label)}</span>
          <NavItemMarks item={item} />
        </ShellNavLink>
      </DropdownMenuItem>
    );
  });
};

/**
 * A group on the rail: one icon button opening a labelled flyout beside it — on click, Enter, Space or ↓, or after the
 * pointer rests on it — with the group's entries. The click that follows a hover-open keeps it open. Escape closes it and
 * returns the focus to the icon; a flyout the pointer opened and closed hands the focus back to where it was.
 */
const RailGroup = ({ group, active, side }: { group: NavigationGroup<string>; active: ActiveNavigation<string> | null; side: 'left' | 'right' }) => {
  const { t } = useTranslate();
  const display = useContext(ShellNavDisplayContext);
  const [open, setOpen] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openedByHover = useRef(false);
  const closedByHover = useRef(false);
  const focusBeforeHover = useRef<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const Icon = group.icon;
  const holdsActive = isNavigationGroupActive(group, active);

  const clearHoverTimer = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
  };
  useEffect(() => () => clearHoverTimer(), []);

  const setOpenAfterDelay = (next: boolean) => {
    clearHoverTimer();
    hoverTimer.current = setTimeout(() => {
      if (next && !open) focusBeforeHover.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (!next && open) closedByHover.current = true;
      openedByHover.current = next;
      setOpen(next);
    }, FLYOUT_HOVER_DELAY_MS);
  };

  return (
    <DropdownMenu
      open={open}
      onOpenChange={next => {
        clearHoverTimer();
        openedByHover.current = false;
        setOpen(next);
      }}
      modal={false}
    >
      <DropdownMenuTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          aria-label={t(group.label)}
          data-nav-group={group.key}
          onPointerEnter={event => event.pointerType === 'mouse' && setOpenAfterDelay(true)}
          onPointerLeave={event => event.pointerType === 'mouse' && setOpenAfterDelay(false)}
          onPointerDown={event => {
            if (!openedByHover.current) return;
            openedByHover.current = false;
            event.preventDefault();
          }}
          className={cn(NAV_ROW_CLASS, NAV_RAIL_ROW_CLASS, display.railRowClassName, holdsActive && NAV_ROW_ACTIVE_CLASS)}
        >
          {Icon ? <Icon aria-hidden className={NAV_ICON_CLASS} /> : <span aria-hidden className="text-xs font-semibold">{t(group.label).slice(0, 2)}</span>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={side}
        align="start"
        sideOffset={8}
        className="w-60"
        onPointerEnter={clearHoverTimer}
        onPointerLeave={event => event.pointerType === 'mouse' && setOpenAfterDelay(false)}
        onCloseAutoFocus={event => {
          if (!closedByHover.current) return;
          closedByHover.current = false;
          event.preventDefault();
          focusBeforeHover.current?.focus({ preventScroll: true });
          focusBeforeHover.current = null;
        }}
        // a press on the icon is the trigger's (toggle, or keep a hover-opened flyout), not an outside click
        onInteractOutside={event => {
          if (event.target instanceof Node && triggerRef.current?.contains(event.target)) event.preventDefault();
        }}
      >
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">{t(group.label)}</DropdownMenuLabel>
        {group.href !== undefined && (
          <DropdownMenuItem asChild className={cn('gap-3 text-foreground', active?.item.key === group.key && 'bg-tint-strong font-semibold')}>
            <ShellNavLink item={{ key: group.key, href: group.href }} aria-current={active?.item.key === group.key ? 'page' : undefined}>
              <span className="truncate">{t(group.label)}</span>
            </ShellNavLink>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <FlyoutEntries items={group.children} active={active} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export interface ShellNavRailProps {
  items: readonly NavigationItem<string>[];
  active: ActiveNavigation<string> | null;
}

/**
 * The navigation on the icon rail: every top-level entry as one icon (its label in `aria-label` and a tooltip, its marks
 * on the icon), every group as a flyout menu. Flyouts and tooltips open on the inline-end side (left in RTL).
 */
export const ShellNavRail = ({ items, active }: ShellNavRailProps) => {
  const side = Direction.useDirection() === 'rtl' ? 'left' : 'right';
  return (
    <ul className="space-y-1">
      {items.map(item => (
        <li key={item.key}>
          {isNavigationGroup(item) ? <RailGroup group={item} active={active} side={side} /> : <RailLeaf item={item} active={active} side={side} />}
        </li>
      ))}
    </ul>
  );
};
