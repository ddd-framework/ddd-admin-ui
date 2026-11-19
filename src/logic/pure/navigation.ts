import { type TranslateFn, translateText } from '../../i18n/store.ts';

/**
 * The navigation model of a host: ONE tree that feeds the sidebar, the breadcrumbs and the document title. Pure (no
 * React at run time), so server code (`generateMetadata`) and tests use the same resolver as the shell.
 *
 * Labels are UI texts: the English text (or an already translated one), translated when rendered (`t(label)`), so a
 * host marks them with `m()` for its text export.
 */

/** The props the shell passes to a navigation icon. */
export interface NavigationIconProps {
  className?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
}

/**
 * An icon component (`lucide-react` icons fit): a function or class component taking `NavigationIconProps`. Typed
 * without React's types, so the navigation model (and `./logic/pure`) loads without React.
 */
// biome-ignore lint/suspicious/noExplicitAny: a component's return type (a React node) without importing React's types
export type NavigationIcon = ((props: NavigationIconProps) => any) | (new (props: NavigationIconProps) => any);

/** Route parameters matched below a navigation leaf (`{ itemId: '42' }`), decoded. */
export type CrumbParams = Readonly<Record<string, string>>;

/** A crumb text: fixed UI text (translated when resolved), or built from the matched segment. */
export type CrumbLabel = string | ((segment: string, t: TranslateFn, params: CrumbParams) => string);

/**
 * One URL segment below a navigation leaf. `segment` is a literal (`create`) or a parameter (`:itemId`); a literal wins
 * over a parameter on the same level. A route with neither `label` nor `entity` adds no crumb (a segment without a page
 * of its own) but its children still match. An unmatched segment ends the trail.
 */
export interface CrumbRoute<TEntity extends string = string> {
  segment: string;
  label?: CrumbLabel;
  /** The crumb shows this entity's name, resolved by the host's `useEntityLabel` hook (the segment is the id). */
  entity?: TEntity;
  /** `false`: no page renders at this path (a redirect): the crumb is text, never a link. Default `true`. */
  link?: boolean;
  children?: readonly CrumbRoute<TEntity>[];
  /** Crumbs from the query string while this route is the deepest matched one (a tab: `?tab=members`). */
  queryCrumbs?: readonly QueryCrumb[];
}

/**
 * A crumb from a query parameter of the current URL (a tab, a view): shown when the parameter has a value, after the
 * segment crumbs. `label`: a fixed UI text, a text built from the value, or a map value → UI text (a value missing
 * from the map adds no crumb). Its `href` keeps the query crumbs before it. `link: false`: text, never a link.
 */
export interface QueryCrumb {
  param: string;
  label: CrumbLabel | Readonly<Record<string, string>>;
  link?: boolean;
}

/**
 * A crumb before the navigation's own (a scope: the workspace, the client). UI text translated unless `translate:
 * false` (a name from the server); a link with `href`. Never part of the document title.
 */
export interface LeadingCrumb {
  key: string;
  label: string;
  href?: string;
  translate?: boolean;
}

interface NavigationItemBase {
  /** Stable id: React key, `data-nav-key`, the rights predicate's handle. Unique within the tree. */
  key: string;
  /** UI text, translated when rendered. */
  label: string;
  icon?: NavigationIcon;
  /** `false`: this item's crumb is text, never a link (a redirect, a page without content of its own). */
  crumbLink?: boolean;
  /** `true`: no crumb for this item (a silent level, a home entry the trail does not name). */
  crumbHidden?: boolean;
  /**
   * Extra props of this item's in-app links (sidebar row, rail, flyout, mobile menu), passed to the host's link
   * component (`{ prefetch: false }` for a Next link); over the shell's `navLinkProps`. Not on an `external` entry.
   */
  linkProps?: Readonly<Record<string, unknown>>;
}

/** An entry that opens a page. */
export interface NavigationLeaf<TEntity extends string = string> extends NavigationItemBase {
  href: string;
  /** Active only on exactly `href`, not below it (an overview whose sibling entries live below its route). */
  exact?: boolean;
  /** Work waiting on that page (a count with a deadline, not a row count). `0` and absent render nothing. */
  badge?: number;
  /**
   * UI text (translated): what this entry's page is locked by (a plan, a missing setup). The entry stays a link, marked
   * with a lock; the page explains. An entry the viewer may not see is removed by the rights predicate instead.
   */
  lockedReason?: string;
  /** Opens outside the app (another application, an old screen): a plain `<a>` (full page load), marked as such. */
  external?: boolean;
  /** UI text read with the external mark; default "Opens outside this app". */
  externalLabel?: string;
  /** Child segments for the breadcrumbs below `href`. */
  crumbs?: readonly CrumbRoute<TEntity>[];
  /** Crumbs from the query string on this entry's own page (see `QueryCrumb`). */
  queryCrumbs?: readonly QueryCrumb[];
  /**
   * Only for the breadcrumbs and the document title: not drawn in the sidebar, the rail or the mobile menu
   * (`menuNavigation`); its groups still count as active on its page.
   */
  crumbOnly?: boolean;
}

/** A group of entries (groups nest). A group with an own `href` is also a page: its label links there. */
export interface NavigationGroup<TEntity extends string = string> extends NavigationItemBase {
  href?: string;
  children: readonly NavigationItem<TEntity>[];
}

export type NavigationItem<TEntity extends string = string> = NavigationLeaf<TEntity> | NavigationGroup<TEntity>;

/** The host's rights predicate: `false` hides the item from the sidebar and turns its crumb into text. */
export type NavigationAccess = (item: NavigationItem<string>) => boolean;

export const isNavigationGroup = <TEntity extends string>(item: NavigationItem<TEntity>): item is NavigationGroup<TEntity> =>
  Array.isArray((item as NavigationGroup<TEntity>).children);

/** The path of an href or a pathname: no query, no hash, no trailing slash (`/` stays `/`). */
export const normalisePathname = (value: string): string => {
  const path = value.split(/[?#]/)[0] ?? '';
  const trimmed = path.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
};

const isWithin = (href: string, pathname: string): boolean =>
  pathname === href || (href === '/' ? pathname.startsWith('/') : pathname.startsWith(`${href}/`));

/** Whether a leaf is the entry of `pathname`: its own path, or below it unless `exact`. */
export const isNavigationLeafActive = (leaf: Pick<NavigationLeaf, 'href' | 'exact' | 'external'>, pathname: string | null): boolean => {
  if (pathname === null || leaf.external) return false;
  const href = normalisePathname(leaf.href);
  const path = normalisePathname(pathname);
  return leaf.exact ? path === href : isWithin(href, path);
};

export interface ActiveNavigation<TEntity extends string = string> {
  /** The leaf (or a group with its own page) the path is in. */
  item: NavigationItem<TEntity>;
  /** The groups above it, outermost first. */
  groups: readonly NavigationGroup<TEntity>[];
}

/**
 * The entry of `pathname`: the leaf with the longest matching `href` (an `exact` leaf only on its own path); without
 * one, the group whose own `href` matches longest. `null` outside the tree. Ties keep the first in tree order.
 */
export const findActiveNavigation = <TEntity extends string>(
  items: readonly NavigationItem<TEntity>[],
  pathname: string | null
): ActiveNavigation<TEntity> | null => {
  if (pathname === null) return null;
  type Candidate = { found: ActiveNavigation<TEntity>; length: number };
  const best: { leaf: Candidate | null; group: Candidate | null } = { leaf: null, group: null };
  const visit = (list: readonly NavigationItem<TEntity>[], groups: readonly NavigationGroup<TEntity>[]) => {
    for (const item of list) {
      if (isNavigationGroup(item)) {
        if (item.href !== undefined && isNavigationLeafActive({ href: item.href }, pathname)) {
          const length = normalisePathname(item.href).length;
          if (!best.group || length > best.group.length) best.group = { found: { item, groups }, length };
        }
        visit(item.children, [...groups, item]);
      } else if (isNavigationLeafActive(item, pathname)) {
        const length = normalisePathname(item.href).length;
        if (!best.leaf || length > best.leaf.length) best.leaf = { found: { item, groups }, length };
      }
    }
  };
  visit(items, []);
  return (best.leaf ?? best.group)?.found ?? null;
};

/** Whether `group` holds the active entry (at any depth) or is it, by key (`findActiveNavigation`'s result). */
export const isNavigationGroupActive = (
  group: Pick<NavigationGroup<string>, 'key'>,
  active: ActiveNavigation<string> | null
): boolean => active !== null && (active.item.key === group.key || active.groups.some(candidate => candidate.key === group.key));

/**
 * The tree the menus draw: `crumbOnly` leaves removed, and groups left without children and without an own page.
 */
export const menuNavigation = <TEntity extends string>(items: readonly NavigationItem<TEntity>[]): NavigationItem<TEntity>[] =>
  items.flatMap((item): NavigationItem<TEntity>[] => {
    if (!isNavigationGroup(item)) return item.crumbOnly ? [] : [item];
    const children = menuNavigation(item.children);
    if (children.length === 0 && item.href === undefined && item.children.length > 0) return [];
    return [children.length === item.children.length && children.every((child, index) => child === item.children[index]) ? item : { ...item, children }];
  });

/** Whether a tree holds a `crumbOnly` leaf at any depth. */
const hasCrumbOnly = (items: readonly NavigationItem<string>[]): boolean =>
  items.some(item => (isNavigationGroup(item) ? hasCrumbOnly(item.children) : item.crumbOnly === true));

/** `menuNavigation`, returning the same array when nothing is crumb-only (stable for memoised menus). */
export const menuNavigationOf = <TEntity extends string>(items: readonly NavigationItem<TEntity>[]): readonly NavigationItem<TEntity>[] =>
  hasCrumbOnly(items as readonly NavigationItem<string>[]) ? menuNavigation(items) : items;

/**
 * The tree the viewer may see: items `canAccess` refuses are dropped; a group left without children is dropped too,
 * unless it has its own page and is allowed. Hiding is presentation; the server still checks every request.
 */
export const filterNavigation = <TEntity extends string>(
  items: readonly NavigationItem<TEntity>[],
  canAccess?: NavigationAccess
): NavigationItem<TEntity>[] => {
  if (!canAccess) return [...items];
  return items.flatMap((item): NavigationItem<TEntity>[] => {
    if (!canAccess(item)) return [];
    if (!isNavigationGroup(item)) return [item];
    const children = filterNavigation(item.children, canAccess);
    if (children.length === 0 && item.href === undefined) return [];
    return [{ ...item, children }];
  });
};

interface ResolvedCrumbBase {
  key: string;
  /** The path this crumb names. */
  href: string;
  /** Whether it may render as a link (a page renders there and the viewer may open it). The last crumb never links. */
  link: boolean;
}

export type ResolvedCrumb<TEntity extends string = string> =
  /** A navigation group: its label; a link only when it has an own page. */
  | (ResolvedCrumbBase & { kind: 'group'; label: string; item: NavigationGroup<TEntity> })
  /** The navigation entry the path is in. */
  | (ResolvedCrumbBase & { kind: 'leaf'; label: string; item: NavigationItem<TEntity>; external: boolean })
  /**
   * A segment below the entry with a fixed or built text; with `scope` a leading crumb (`leadingCrumbs`), with `query`
   * a crumb of that query parameter (`queryCrumbs`).
   */
  | (ResolvedCrumbBase & { kind: 'text'; label: string; scope?: true; query?: string })
  /** A segment naming an entity: the host's hook resolves its name. */
  | (ResolvedCrumbBase & { kind: 'entity'; entity: TEntity; id: string; params: CrumbParams });

export interface ResolveCrumbsOptions {
  /** Translates labels; default the package's text store (`translateText`). */
  t?: TranslateFn;
  /** The rights predicate: a crumb of a refused item stays as text (the trail never breaks). */
  canAccess?: NavigationAccess;
  /** Rights on any crumb (segments and query crumbs included): `false` turns it into text. */
  canAccessCrumb?: (crumb: ResolvedCrumb<string>) => boolean;
  /** Crumbs before the navigation's own (scope crumbs). */
  leadingCrumbs?: readonly LeadingCrumb[];
  /** The query string for `queryCrumbs` (`?tab=members`, `tab=members` or `URLSearchParams`); default the pathname's own. */
  search?: string | URLSearchParams | null;
}

const decodeSegment = (segment: string): string => {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

const matchRoute = <TEntity extends string>(
  routes: readonly CrumbRoute<TEntity>[],
  segment: string
): CrumbRoute<TEntity> | undefined =>
  routes.find(route => route.segment === segment) ?? routes.find(route => route.segment.startsWith(':'));

/**
 * The crumbs of `pathname`: the groups above the entry (text, or a link to a group's own page), the entry itself, then
 * one crumb per matched segment of the entry's `crumbs`, each naming the path up to its segment. A group whose label
 * and page equal its entry's (`Users › Users`) folds into the entry. Outside the tree: no crumbs. Resolve against the
 * whole tree (the viewer is already on the page) and pass the rights predicate: a refused crumb is text.
 */
export const resolveCrumbs = <TEntity extends string>(
  pathname: string | null,
  items: readonly NavigationItem<TEntity>[],
  options: ResolveCrumbsOptions = {}
): ResolvedCrumb<TEntity>[] => {
  const { t = translateText, canAccess = () => true, canAccessCrumb, leadingCrumbs = [] } = options;
  const active = findActiveNavigation(items, pathname);
  if (!active || pathname === null) return [];
  const query =
    options.search instanceof URLSearchParams
      ? options.search
      : new URLSearchParams(options.search ?? (pathname.includes('?') ? (pathname.split('?')[1] ?? '').split('#')[0] : ''));
  const path = normalisePathname(pathname);
  const { item, groups } = active;
  const itemHref = normalisePathname(item.href ?? '/');
  const crumbs: ResolvedCrumb<TEntity>[] = leadingCrumbs.map(leading => ({
    kind: 'text' as const,
    key: `scope:${leading.key}`,
    label: leading.translate === false ? leading.label : t(leading.label),
    href: leading.href ?? '',
    link: leading.href !== undefined,
    scope: true as const,
  }));

  for (const group of groups) {
    const groupHref = group.href === undefined ? undefined : normalisePathname(group.href);
    if (groupHref === itemHref && group.label === item.label) continue;
    if (group.crumbHidden) continue;
    crumbs.push({
      kind: 'group',
      key: `group:${group.key}`,
      label: t(group.label),
      item: group,
      href: groupHref ?? '',
      link: groupHref !== undefined && groupHref !== itemHref && group.crumbLink !== false && canAccess(group),
    });
  }
  if (!item.crumbHidden) {
    crumbs.push({
      kind: 'leaf',
      key: `nav:${item.key}`,
      label: t(item.label),
      item,
      href: itemHref,
      external: !isNavigationGroup(item) && item.external === true,
      link: item.crumbLink !== false && canAccess(item),
    });
  }

  const params: Record<string, string> = {};
  let routes: readonly CrumbRoute<TEntity>[] = isNavigationGroup(item) ? [] : (item.crumbs ?? []);
  let href = itemHref === '/' ? '' : itemHref;
  const rest = path === itemHref ? '' : path.slice(itemHref === '/' ? 0 : itemHref.length);
  let queryCrumbs: readonly QueryCrumb[] | undefined = isNavigationGroup(item) ? undefined : item.queryCrumbs;
  for (const rawSegment of rest.split('/').filter(Boolean)) {
    const route = matchRoute(routes, rawSegment);
    if (!route) break;
    queryCrumbs = route.queryCrumbs;
    const segment = decodeSegment(rawSegment);
    href = `${href}/${rawSegment}`;
    if (route.segment.startsWith(':')) params[route.segment.slice(1)] = segment;
    const link = route.link !== false;
    if (route.entity !== undefined) {
      crumbs.push({ kind: 'entity', key: `entity:${href}`, entity: route.entity, id: segment, params: { ...params }, href, link });
    } else if (route.label !== undefined) {
      const label = typeof route.label === 'string' ? t(route.label) : route.label(segment, t, { ...params });
      crumbs.push({ kind: 'text', key: `text:${href}`, label, href, link });
    }
    routes = route.children ?? [];
  }

  const kept = new URLSearchParams();
  for (const queryCrumb of queryCrumbs ?? []) {
    const value = query.get(queryCrumb.param);
    if (value === null || value === '') continue;
    const { label: labelSource } = queryCrumb;
    const label =
      typeof labelSource === 'string'
        ? t(labelSource)
        : typeof labelSource === 'function'
          ? labelSource(value, t, { ...params })
          : labelSource[value] !== undefined
            ? t(labelSource[value] as string)
            : undefined;
    if (label === undefined) continue;
    kept.set(queryCrumb.param, value);
    const queryHref = `${href === '' ? '/' : href}?${kept.toString()}`;
    crumbs.push({ kind: 'text', key: `query:${queryHref}`, label, href: queryHref, link: queryCrumb.link !== false, query: queryCrumb.param });
  }

  return canAccessCrumb
    ? crumbs.map(crumb => (crumb.link && !canAccessCrumb(crumb as ResolvedCrumb<string>) ? { ...crumb, link: false } : crumb))
    : crumbs;
};

export interface DocumentTitleOptions {
  /** Translates labels; default the package's text store. */
  t?: TranslateFn;
  /** Appended last (`Items · Admin`); already translated. */
  appName?: string;
  /** How many crumbs, from the current one up, name the page (default 2: `Details · Item 42 · Admin`). */
  depth?: number;
  /** Between the parts; default ` · `. */
  separator?: string;
  /** Passed on to `resolveCrumbs` (the scope crumbs never name the page). */
  leadingCrumbs?: readonly LeadingCrumb[];
  /** Passed on to `resolveCrumbs`: query crumbs can name the page. */
  search?: string | URLSearchParams | null;
  /** The text of an entity crumb (by crumb key); default its id. */
  entityText?: (crumb: Extract<ResolvedCrumb<string>, { kind: 'entity' }>) => string | null | undefined;
}

/** The parts of a document title, current page first (groups never name a page). */
export const documentTitleParts = <TEntity extends string>(
  crumbs: readonly ResolvedCrumb<TEntity>[],
  options: Pick<DocumentTitleOptions, 'depth' | 'entityText' | 'appName'> = {}
): string[] => {
  const { depth = 2, entityText, appName } = options;
  const parts = crumbs
    .filter(crumb => crumb.kind !== 'group' && !(crumb.kind === 'text' && crumb.scope))
    .slice(-Math.max(1, depth))
    .reverse()
    .map(crumb => (crumb.kind === 'entity' ? (entityText?.(crumb as Extract<ResolvedCrumb<string>, { kind: 'entity' }>) || crumb.id) : crumb.label));
  if (appName) parts.push(appName);
  return parts.filter((part, index) => part !== '' && part !== parts[index - 1]);
};

/**
 * The document title of `pathname` from the navigation (`Details · 42 · Admin`); `appName` alone outside the tree
 * (`null` without one). Pure: a server's `generateMetadata` gets the same title as `ShellDocumentTitle` before the
 * entity names load.
 */
export const resolveDocumentTitle = <TEntity extends string>(
  pathname: string | null,
  items: readonly NavigationItem<TEntity>[],
  options: DocumentTitleOptions = {}
): string | null => {
  const { separator = ' · ', t, leadingCrumbs, search } = options;
  const parts = documentTitleParts(resolveCrumbs(pathname, items, { t, leadingCrumbs, search }), options);
  return parts.length > 0 ? parts.join(separator) : null;
};
