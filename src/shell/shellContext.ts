'use client';

import { createContext, type ReactNode, useContext } from 'react';

import type { CrumbParams, LeadingCrumb, NavigationAccess, NavigationItem, ResolvedCrumb } from '../logic/pure/navigation.ts';

/** What the host's entity hook is asked: the crumb's entity kind, its id (the URL segment) and the matched params. */
export interface EntityLabelRequest<TEntity extends string = string> {
  entity: TEntity;
  id: string;
  params: CrumbParams;
}

/** The hook's answer: the display name (`null` / absent: the id is shown), and whether it is still loading. */
export interface EntityLabelResult {
  text?: string | null;
  isLoading?: boolean;
  /**
   * Drawn in the breadcrumbs instead of `text` (the name with a muted id, an access mark); the document title, the
   * crumb's tooltip and the ellipsis menu's screen-reader text keep `text`.
   */
  node?: ReactNode;
  /** `false`: the crumb is text, never a link (the viewer may not open the entity, it is gone). */
  link?: boolean;
  /** A state of the entity for styling (`forbidden`, `missing`): `data-crumb-state` on the crumb's text or link. */
  state?: string;
}

/**
 * The host's hook naming an entity crumb (`item 12` → `Blue widget (12)`), typically reading the page's own query so no
 * extra request is sent. Passed by reference (a module-level function, the same identity on every render); called once
 * per entity crumb, with the same order of hooks on every render of that crumb.
 */
export type UseEntityLabel<TEntity extends string = string> = (request: EntityLabelRequest<TEntity>) => EntityLabelResult;

/** The navigation the shell's parts share: the whole tree, the rights predicate, the entity hook and the pathname. */
export interface ShellNavigationValue {
  items: readonly NavigationItem<string>[];
  canAccess?: NavigationAccess;
  useEntityLabel?: UseEntityLabel<string>;
  pathname: string | null;
  /** Crumbs before the navigation's own (scope crumbs). */
  leadingCrumbs?: readonly LeadingCrumb[];
  /** The query string the query crumbs read (default the pathname's own). */
  search?: string | URLSearchParams | null;
  /** Rights on any crumb: `false` turns it into text. */
  canAccessCrumb?: (crumb: ResolvedCrumb<string>) => boolean;
}

/** Set by `AppShell` (or `ShellNavigationProvider` without the shell); read by the breadcrumbs and the document title. */
export const ShellNavigationContext = createContext<ShellNavigationValue | null>(null);

/** The nearest shell's navigation, `null` outside one. */
export const useShellNavigation = (): ShellNavigationValue | null => useContext(ShellNavigationContext);

/** How the shell draws its navigation rows (set by `AppShell`; the defaults apply outside one). */
export interface ShellNavDisplay {
  /** Extra classes of every row of the list (sidebar column and mobile menu): height, text size, gap. */
  rowClassName?: string;
  /** Extra classes of every icon of the rail. */
  railRowClassName?: string;
  /** A child entry's icon in the list (`false`: hidden in the list, still shown in the rail's flyout). */
  childIconsInList: boolean;
  /** Extra classes of the waiting count on a list row. */
  badgeClassName?: string;
  /** Extra classes of a group's sub-list in the list (after the indent `ms-5 pt-1`). */
  childListClassName?: string;
  /** Extra classes of the list's top level (`<ul>`; sidebar column and mobile menu). */
  listClassName?: string;
  /** The navigation is still loading: skeleton rows in the list and the rail (`true`: 6; a number: that many). */
  loading?: boolean | number;
  /**
   * Controlled open groups of the list (keys, any level; one open per level). With it the list opens what it says and
   * reports every change (a toggle, the group of a new route) through `onOpenGroupKeysChange`.
   */
  openGroupKeys?: readonly string[];
  onOpenGroupKeysChange?: (keys: string[]) => void;
  /** Extra classes of a group's flyout on the rail (its width: default `w-60`). */
  railFlyoutClassName?: string;
  /**
   * A group with its own page on the rail: `true` (default) its flyout has a row for that page under the heading;
   * `false` the heading itself links to the page.
   */
  railGroupPageRow?: boolean;
  /**
   * What tints on hover in the row of a group with its own page (a link and a caret button): `label` (default) each
   * part on its own, `row` the whole row at once.
   */
  groupRowHover?: 'label' | 'row';
  /** Extra classes of a group's toggle: the caret button of a group with its own page, the row button of one without. */
  groupToggleClassName?: string;
  /** Extra classes of the current entry's row in the list (after the package's active classes). */
  activeRowClassName?: string;
  /** Extra classes of the row of a group that holds the current entry, in the list. */
  activeGroupClassName?: string;
  /** Extra classes of one row of the list (entries and groups), by item. A stable function. */
  rowClassNameFor?: (item: NavigationItem<string>) => string | undefined;
  /** Extra classes of every entry in a rail flyout (leaves, group pages, heading links). */
  railFlyoutItemClassName?: string;
  /** Extra classes of the current entry in a rail flyout. */
  railFlyoutActiveItemClassName?: string;
  /** Delay in ms before a rail icon's tooltip opens (default: the provider's `tooltipDelayMs`). */
  railTooltipDelayMs?: number;
  /**
   * Extra props of every in-app link the shell draws through `ShellNavLink` (rows, rail, flyouts, mobile menu,
   * breadcrumbs, account entries): an object, or a function of the link's `{ key, href }` (a stable function). Passed to
   * the host's link component (`{ prefetch: false }`); an item's own `linkProps` win. Never on `external` links.
   */
  linkProps?: ShellNavLinkPropsOption;
}

/** `ShellNavDisplay.linkProps` / `AppShell.navLinkProps`: the same props for every link, or per link. */
export type ShellNavLinkPropsOption =
  | Readonly<Record<string, unknown>>
  | ((link: { key: string; href: string }) => Readonly<Record<string, unknown>> | undefined);

/** How the navigation rows are drawn (set by `AppShell` or `ShellNavDisplayProvider`; read by the list, rail and menu). */
export const ShellNavDisplayContext = createContext<ShellNavDisplay>({ childIconsInList: true });
