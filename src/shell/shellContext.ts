'use client';

import { createContext, useContext } from 'react';

import type { CrumbParams, NavigationAccess, NavigationItem } from '../logic/pure/navigation.ts';

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
}

export const ShellNavDisplayContext = createContext<ShellNavDisplay>({ childIconsInList: true });
