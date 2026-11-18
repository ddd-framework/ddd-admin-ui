'use client';

import { type CSSProperties, type ReactNode, useCallback, useEffect, useId, useMemo, useState } from 'react';

import { useTranslate } from '../i18n/useTranslate.ts';
import {
  filterNavigation,
  findActiveNavigation,
  type LeadingCrumb,
  menuNavigationOf,
  type NavigationAccess,
  type NavigationItem,
  type ResolvedCrumb,
} from '../logic/pure/navigation.ts';
import { cn } from '../primitives/cn.ts';
import { useCurrentPathname } from '../primitives/pathname.tsx';
import { type BreadcrumbFoldWidths, ShellBreadcrumbs } from './ShellBreadcrumbs.tsx';
import {
  type ShellNavDisplay,
  ShellNavDisplayContext,
  type ShellNavigationValue,
  ShellNavigationContext,
  type UseEntityLabel,
} from './shellContext.ts';
import { ShellDocumentTitle, type ShellDocumentTitleProps } from './ShellDocumentTitle.tsx';
import { ShellMenuButton, ShellMobileMenu } from './ShellMobileMenu.tsx';
import { ShellSidebar } from './ShellSidebar.tsx';
import { ShellTopBar } from './ShellTopBar.tsx';
import { SIDEBAR_COLLAPSED_STORAGE_KEY, type SidebarCollapsedStorageValues, useSidebarCollapsed } from './useSidebarCollapsed.ts';
import { type ShellShortcutOptions, SIDEBAR_SHORTCUT_KEY, useShellShortcut } from './useShellShortcut.ts';

export interface ShellNavigationProviderProps<TEntity extends string = string> {
  /** The whole navigation tree. */
  navigation: readonly NavigationItem<TEntity>[];
  canAccess?: NavigationAccess;
  useEntityLabel?: UseEntityLabel<TEntity>;
  /** Overrides the provider's pathname hook. */
  pathname?: string | null;
  /** Crumbs before the navigation's own (scope crumbs) for the breadcrumbs (never in the document title). */
  leadingCrumbs?: readonly LeadingCrumb[];
  /** The query string the query crumbs read (the host's search parameters; default the pathname's own). */
  search?: string | URLSearchParams | null;
  /** Rights on any crumb (segments and query crumbs included): `false` turns it into text. A stable function. */
  canAccessCrumb?: (crumb: ResolvedCrumb<string>) => boolean;
  children: ReactNode;
}

/** The navigation context of `AppShell` without the shell: breadcrumbs and the document title in a host's own frame. */
export const ShellNavigationProvider = <TEntity extends string = string>({
  navigation,
  canAccess,
  useEntityLabel,
  pathname,
  leadingCrumbs,
  search,
  canAccessCrumb,
  children,
}: ShellNavigationProviderProps<TEntity>) => {
  const adapterPathname = useCurrentPathname();
  const path = pathname !== undefined ? pathname : adapterPathname;
  const value = useMemo<ShellNavigationValue>(
    () => ({
      items: navigation as readonly NavigationItem<string>[],
      canAccess,
      useEntityLabel: useEntityLabel as UseEntityLabel<string> | undefined,
      pathname: path,
      ...(leadingCrumbs !== undefined ? { leadingCrumbs } : {}),
      ...(search !== undefined ? { search } : {}),
      ...(canAccessCrumb !== undefined ? { canAccessCrumb } : {}),
    }),
    [navigation, canAccess, useEntityLabel, path, leadingCrumbs, search, canAccessCrumb]
  );
  return <ShellNavigationContext.Provider value={value}>{children}</ShellNavigationContext.Provider>;
};

export interface AppShellProps<TEntity extends string = string> {
  /** The ONE navigation tree: sidebar, mobile menu, breadcrumbs and document title read it. A stable value. */
  navigation: readonly NavigationItem<TEntity>[];
  /** The rights predicate: refused items leave the sidebar; their crumbs turn into text. A stable function. */
  canAccess?: NavigationAccess;
  /** Names entity crumbs (a hook passed by reference). */
  useEntityLabel?: UseEntityLabel<TEntity>;
  /** Overrides the provider's pathname hook (`AdminUiProvider.usePathname`). */
  pathname?: string | null;

  /** The logo (a home link), in the top bar and the mobile menu's header. */
  brand?: ReactNode;
  /** Top bar, after the brand. */
  topBarStart?: ReactNode;
  /** Top bar, the end cluster (language menu, account menu, shortcuts). */
  topBarEnd?: ReactNode;
  /** Above the top bar row; `--nav-h` covers both. */
  banner?: ReactNode;
  /** `true` (default): the breadcrumbs of the navigation; a node: the host's own; `false`: none. */
  breadcrumbs?: boolean | ReactNode;
  /** Over the sidebar list while expanded (a scope selector), and its compact form on the rail. */
  sidebarHeader?: ReactNode;
  sidebarRailHeader?: ReactNode;
  /** Between the sidebar list and its collapse toggle. */
  sidebarFooter?: ReactNode;
  /** The mobile menu's footer (account, sign out); its header shows `brand`. */
  mobileMenuFooter?: ReactNode;
  /** Behind everything (e.g. `ShaderBackground` from `./shell-background`, a separate entry). */
  background?: ReactNode;
  /** Keeps `document.title` on the navigation (`{ appName }`); absent or `false`: the title is left alone. */
  documentTitle?: false | Omit<ShellDocumentTitleProps<TEntity>, 'navigation' | 'useEntityLabel' | 'pathname'>;

  /** localStorage key of the collapsed sidebar (one per area). */
  collapsedStorageKey?: string;
  /** The key toggling the sidebar (default `[`); `null`: no shortcut. */
  collapseShortcut?: string | null;
  /** The navigation landmarks' name (default "Main"). */
  navigationLabel?: string;
  className?: string;
  /** Classes of `<main>` (the page inset is the page's: `PageFrame` brings one). */
  contentClassName?: string;
  /** Inline style of the frame root (e.g. `--nav-h` for a taller banner). */
  style?: CSSProperties;
  /** Inline style of `<main>`. */
  contentStyle?: CSSProperties;
  /** `data-*` attributes of `<main>` (the root takes `data-*` props directly). */
  contentAttributes?: Readonly<Record<`data-${string}`, string | undefined>>;
  /** `data-*` attributes of the frame root. */
  [dataAttribute: `data-${string}`]: string | undefined;
  /** Extra classes of every navigation row in the sidebar column and the mobile menu (height, text size, gap). */
  navRowClassName?: string;
  /** Extra classes of every icon of the collapsed rail. */
  navRailRowClassName?: string;
  /** A child entry's icon in the list (default `true`); `false` hides it there and keeps it in the rail's flyout. */
  childIconsInList?: boolean;
  /** Classes of the menu button below `lg` (a host surface behind it). */
  menuButtonClassName?: string;
  /** Classes of the mobile menu's sheet. */
  mobileMenuClassName?: string;
  /** Classes of the mobile menu's header row (`--nav-h` tall by default). */
  mobileMenuHeaderClassName?: string;
  /** Called with the collapsed state after hydration and on every change (fixed elements outside the frame). */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Mirrors the collapsed state as `data-shell-collapsed` on `<html>` (for fixed elements outside the frame). */
  markDocumentCollapsed?: boolean;
  /** The mobile menu's header instead of `brand` (`null`: no header row). */
  mobileMenuHeader?: ReactNode;
  /** Extra classes of the waiting count on a list row. */
  navBadgeClassName?: string;
  /** Extra classes of a group's sub-list in the list (after its indent `ms-5 pt-1`). */
  navChildListClassName?: string;
  /** Extra classes of the list's top level (sidebar column and mobile menu). */
  navListClassName?: string;
  /** Extra classes of the sidebar's `<nav>` (its padding, its scroll area). */
  sidebarNavClassName?: string;
  /** The navigation is still loading (the rights arrive later): skeleton rows in the list and the rail (`true`: 6). */
  navigationLoading?: boolean | number;
  /**
   * Controlled open groups of the list (keys, any level; one open per level). The list reports every change, a toggle
   * or the group of a new route, through `onNavOpenGroupKeysChange`. Absent: the list keeps its own state.
   */
  navOpenGroupKeys?: readonly string[];
  onNavOpenGroupKeysChange?: (keys: string[]) => void;
  /** Extra classes of a group's flyout on the rail (its width: default `w-60`). */
  railFlyoutClassName?: string;
  /** `false`: on the rail a group's flyout heading links to the group's own page instead of a row of its own under it. */
  railGroupPageRow?: boolean;
  /** Classes of the top bar (`<header>`). */
  topBarClassName?: string;
  /** Extra classes of the top bar's row. */
  topBarRowClassName?: string;
  /** Crumbs before the navigation's own (a scope), never in the document title. */
  leadingCrumbs?: readonly LeadingCrumb[];
  /** The query string the query crumbs read (the host's search parameters; default the pathname's own). */
  search?: string | URLSearchParams | null;
  /** Rights on any crumb (segments and query crumbs included): `false` turns it into text. A stable function. */
  canAccessCrumb?: (crumb: ResolvedCrumb<string>) => boolean;
  /** Where the built-in breadcrumbs fold (default full from 40rem, the current crumb alone under 14rem). */
  breadcrumbFoldWidths?: BreadcrumbFoldWidths;
  /** The strings stored for the collapsed state (default `'1'` / `'0'`). */
  collapsedStorageValues?: SidebarCollapsedStorageValues;
  /** Options of the collapse shortcut (`media`, `ignoreSelector`). */
  collapseShortcutOptions?: ShellShortcutOptions;
  children: ReactNode;
}

/**
 * The application frame: a fixed top bar (`ShellTopBar`: menu button, brand, slots, breadcrumbs), a fixed sidebar from
 * `lg` (`ShellSidebar`: the list, or the icon rail while collapsed — remembered per `collapsedStorageKey`, toggled by its
 * foot row and the `[` key), the mobile menu below `lg` (`ShellMobileMenu`), the content frame (`<main>`, reserving the
 * sidebar's width through `data-shell-collapsed`), an optional background and document title. Mechanism only: the
 * navigation, the rights predicate, the slots' content, the link component and the pathname come from the host.
 *
 * Hydration-safe: the stored collapse state applies right after hydration (the server renders the full column); the
 * scrolled state and the shortcut are read in effects. A "Skip to content" link is the first tab stop.
 */
export const AppShell = <TEntity extends string = string>({
  navigation,
  canAccess,
  useEntityLabel,
  pathname,
  brand,
  topBarStart,
  topBarEnd,
  banner,
  breadcrumbs = true,
  sidebarHeader,
  sidebarRailHeader,
  sidebarFooter,
  mobileMenuFooter,
  background,
  documentTitle = false,
  collapsedStorageKey = SIDEBAR_COLLAPSED_STORAGE_KEY,
  collapseShortcut = SIDEBAR_SHORTCUT_KEY,
  navigationLabel,
  className,
  contentClassName,
  style,
  contentStyle,
  contentAttributes,
  navRowClassName,
  navRailRowClassName,
  childIconsInList = true,
  menuButtonClassName,
  mobileMenuClassName,
  mobileMenuHeaderClassName,
  onCollapsedChange,
  markDocumentCollapsed = false,
  mobileMenuHeader,
  navBadgeClassName,
  navChildListClassName,
  navListClassName,
  sidebarNavClassName,
  navigationLoading,
  navOpenGroupKeys,
  onNavOpenGroupKeysChange,
  railFlyoutClassName,
  railGroupPageRow,
  topBarClassName,
  topBarRowClassName,
  leadingCrumbs,
  search,
  canAccessCrumb,
  breadcrumbFoldWidths,
  collapsedStorageValues,
  collapseShortcutOptions,
  children,
  ...rootAttributes
}: AppShellProps<TEntity>) => {
  const { t } = useTranslate();
  const adapterPathname = useCurrentPathname();
  const path = pathname !== undefined ? pathname : adapterPathname;
  const [collapsed, setCollapsed] = useSidebarCollapsed(collapsedStorageKey, { values: collapsedStorageValues });
  const toggleCollapsed = useCallback(() => setCollapsed(), [setCollapsed]);
  useShellShortcut(collapseShortcut, toggleCollapsed, collapseShortcutOptions);
  const [mobileOpen, setMobileOpen] = useState(false);
  // the collapsed state for elements outside the frame (after hydration, like the frame's own attribute)
  useEffect(() => {
    onCollapsedChange?.(collapsed);
  }, [collapsed, onCollapsedChange]);
  useEffect(() => {
    if (!markDocumentCollapsed) return;
    const root = document.documentElement;
    root.toggleAttribute('data-shell-collapsed', collapsed);
    return () => root.removeAttribute('data-shell-collapsed');
  }, [collapsed, markDocumentCollapsed]);
  const navDisplay = useMemo<ShellNavDisplay>(
    () => ({
      rowClassName: navRowClassName,
      railRowClassName: navRailRowClassName,
      childIconsInList,
      badgeClassName: navBadgeClassName,
      childListClassName: navChildListClassName,
      listClassName: navListClassName,
      loading: navigationLoading,
      openGroupKeys: navOpenGroupKeys,
      onOpenGroupKeysChange: onNavOpenGroupKeysChange,
      railFlyoutClassName,
      railGroupPageRow,
    }),
    [
      navRowClassName,
      navRailRowClassName,
      childIconsInList,
      navBadgeClassName,
      navChildListClassName,
      navListClassName,
      navigationLoading,
      navOpenGroupKeys,
      onNavOpenGroupKeysChange,
      railFlyoutClassName,
      railGroupPageRow,
    ]
  );
  const dataAttributes = Object.fromEntries(Object.entries(rootAttributes).filter(([name]) => name.startsWith('data-')));
  const ids = useId();
  const sidebarId = `${ids}-sidebar`;
  const mobileMenuId = `${ids}-menu`;
  const mainId = `${ids}-main`;

  const items = navigation as readonly NavigationItem<string>[];
  const visible = useMemo(() => filterNavigation(items, canAccess), [items, canAccess]);
  const active = useMemo(() => findActiveNavigation(visible, path), [visible, path]);
  // crumb-only entries resolve the active entry and the crumbs, but the menus do not draw them
  const menuItems = useMemo(() => menuNavigationOf(visible), [visible]);
  const value = useMemo<ShellNavigationValue>(
    () => ({
      items,
      canAccess,
      useEntityLabel: useEntityLabel as UseEntityLabel<string> | undefined,
      pathname: path,
      ...(leadingCrumbs !== undefined ? { leadingCrumbs } : {}),
      ...(search !== undefined ? { search } : {}),
      ...(canAccessCrumb !== undefined ? { canAccessCrumb } : {}),
    }),
    [items, canAccess, useEntityLabel, path, leadingCrumbs, search, canAccessCrumb]
  );

  return (
    <ShellNavigationContext.Provider value={value}>
      <ShellNavDisplayContext.Provider value={navDisplay}>
      <div {...dataAttributes} data-shell="" data-shell-collapsed={collapsed || undefined} className={cn('min-h-svh pt-(--nav-h)', className)} style={style}>
        <a
          href={`#${mainId}`}
          className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-(--layer-popover) focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow-surface-raised focus:ring-2 focus:ring-ring"
        >
          {t('Skip to content')}
        </a>
        {background}
        <ShellTopBar
          banner={banner}
          menuButton={<ShellMenuButton open={mobileOpen} onOpenChange={setMobileOpen} controls={mobileMenuId} className={menuButtonClassName} />}
          brand={brand}
          start={topBarStart}
          breadcrumbs={breadcrumbs === true ? <ShellBreadcrumbs foldWidths={breadcrumbFoldWidths} /> : breadcrumbs === false ? null : breadcrumbs}
          end={topBarEnd}
          className={topBarClassName}
          rowClassName={topBarRowClassName}
        />
        <ShellSidebar
          id={sidebarId}
          items={menuItems}
          active={active}
          pathname={path}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
          shortcut={collapseShortcut}
          label={navigationLabel}
          header={sidebarHeader}
          railHeader={sidebarRailHeader}
          footer={sidebarFooter}
          navClassName={sidebarNavClassName}
        />
        <ShellMobileMenu
          id={mobileMenuId}
          open={mobileOpen}
          onOpenChange={setMobileOpen}
          items={menuItems}
          active={active}
          pathname={path}
          label={navigationLabel}
          header={mobileMenuHeader !== undefined ? mobileMenuHeader : brand}
          footer={mobileMenuFooter}
          className={mobileMenuClassName}
          headerClassName={mobileMenuHeaderClassName}
        />
        <div data-shell-content="">
          <main {...contentAttributes} id={mainId} tabIndex={-1} className={cn('w-full outline-none', contentClassName)} style={contentStyle}>
            {children}
          </main>
        </div>
        {documentTitle && <ShellDocumentTitle {...documentTitle} />}
      </div>
      </ShellNavDisplayContext.Provider>
    </ShellNavigationContext.Provider>
  );
};
