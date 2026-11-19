'use client';

import { type ReactNode, useMemo } from 'react';

import { type ShellNavDisplay, ShellNavDisplayContext } from './shellContext.ts';

export interface ShellNavDisplayProviderProps extends Partial<ShellNavDisplay> {
  children: ReactNode;
}

/**
 * The row display of `AppShell` without the frame: `ShellSidebar`, `ShellNavList`, `ShellNavRail` and `ShellMobileMenu`
 * used on their own read it (row classes, child icons, badge and list classes, loading rows, controlled open groups,
 * the rail flyout, row and active classes, the rail's flyout items and tooltip delay, link props).
 */
export const ShellNavDisplayProvider = ({
  children,
  childIconsInList = true,
  rowClassName,
  railRowClassName,
  badgeClassName,
  childListClassName,
  listClassName,
  loading,
  openGroupKeys,
  onOpenGroupKeysChange,
  railFlyoutClassName,
  railGroupPageRow,
  groupRowHover,
  groupToggleClassName,
  activeRowClassName,
  activeGroupClassName,
  rowClassNameFor,
  railFlyoutItemClassName,
  railFlyoutActiveItemClassName,
  railTooltipDelayMs,
  linkProps,
}: ShellNavDisplayProviderProps) => {
  const value = useMemo<ShellNavDisplay>(
    () => ({
      childIconsInList,
      rowClassName,
      railRowClassName,
      badgeClassName,
      childListClassName,
      listClassName,
      loading,
      openGroupKeys,
      onOpenGroupKeysChange,
      railFlyoutClassName,
      railGroupPageRow,
      groupRowHover,
      groupToggleClassName,
      activeRowClassName,
      activeGroupClassName,
      rowClassNameFor,
      railFlyoutItemClassName,
      railFlyoutActiveItemClassName,
      railTooltipDelayMs,
      linkProps,
    }),
    [
      childIconsInList,
      rowClassName,
      railRowClassName,
      badgeClassName,
      childListClassName,
      listClassName,
      loading,
      openGroupKeys,
      onOpenGroupKeysChange,
      railFlyoutClassName,
      railGroupPageRow,
      groupRowHover,
      groupToggleClassName,
      activeRowClassName,
      activeGroupClassName,
      rowClassNameFor,
      railFlyoutItemClassName,
      railFlyoutActiveItemClassName,
      railTooltipDelayMs,
      linkProps,
    ]
  );
  return <ShellNavDisplayContext.Provider value={value}>{children}</ShellNavDisplayContext.Provider>;
};
