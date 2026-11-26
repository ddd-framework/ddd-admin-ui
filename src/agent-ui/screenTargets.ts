/**
 * The screen targets of the navigation tree (`NavigationItem` with `crumbs`, the tree of `AppShell`): every in-app
 * entry with an `href` is a target under its key; every `:parameter` crumb below it is a record target (keyed by its
 * `entity`, or by the parameter without `Id`, below a record prefixed by the record above it); the literal crumbs
 * right below a target are its tabs. Pure (no React, no DOM).
 */
import {
  type CrumbRoute,
  filterNavigation,
  isNavigationGroup,
  type NavigationAccess,
  type NavigationItem,
} from '../logic/pure/navigation.ts';
import type { ScreenTarget, ScreenTargetFilter } from './contract.ts';

/** A filter of a list screen as a host declares it: its key alone, or the key with its values and hint. */
export type ScreenFilterDeclaration = string | ScreenTargetFilter;

/** The filters per target key, as a host declares them. */
export type ScreenFiltersByTargetKey = Readonly<Record<string, readonly ScreenFilterDeclaration[]>>;

export interface ScreenTargetsOptions {
  /** Translates a label of the tree (the shell translates the same labels with `t(label)`) */
  translate: (label: string) => string;
  /** The rights predicate of the shell: an entry it hides is no target */
  canAccess?: NavigationAccess;
  /**
   * The URL filters per target key (a list screen's `useUrlListState` keys); a filter with fixed values (an
   * enumeration, the sort) names them, so the agent learns them from the screen catalogue and the screen read
   */
  filtersByTargetKey?: ScreenFiltersByTargetKey;
  /** The views per target key (`?view=`) */
  viewsByTargetKey?: Readonly<Record<string, readonly string[]>>;
}

/** A route segment whose values the tree does not know (`:tab`): it adds no record target. */
const FREE_SEGMENT_PARAMETERS = new Set(['tab']);

const parameterNameOf = (segment: string): string | null => (segment.startsWith(':') ? segment.slice(1) : null);

const recordNameOf = (crumb: CrumbRoute<string>, parameterName: string): string => crumb.entity ?? parameterName.replace(/Id$/, '');

const joinRoute = (prefix: string, segment: string): string => `${prefix.replace(/\/+$/, '')}/${segment}`;

interface TargetDraft {
  key: string;
  label: string;
  group: string | null;
  routePattern: string;
  parameters: string[];
}

const addTarget = (
  draft: TargetDraft,
  crumbs: readonly CrumbRoute<string>[],
  options: ScreenTargetsOptions,
  targets: ScreenTarget[]
): void => {
  if (targets.some(existing => existing.key === draft.key)) return;
  const target: ScreenTarget = {
    ...draft,
    tabs: [],
    filters: (options.filtersByTargetKey?.[draft.key] ?? []).map(filter => (typeof filter === 'string' ? { key: filter } : { ...filter })),
    views: [...(options.viewsByTargetKey?.[draft.key] ?? [])],
  };
  targets.push(target);
  collectCrumbTargets(target, crumbs, draft.routePattern, options, targets);
};

const collectCrumbTargets = (
  owner: ScreenTarget,
  crumbs: readonly CrumbRoute<string>[],
  routePrefix: string,
  options: ScreenTargetsOptions,
  targets: ScreenTarget[]
): void => {
  for (const crumb of crumbs) {
    const parameterName = parameterNameOf(crumb.segment);
    if (parameterName !== null) {
      if (FREE_SEGMENT_PARAMETERS.has(parameterName)) continue;
      const recordName = recordNameOf(crumb, parameterName);
      // a record screen below a page of a list (`/items/duplicate/:itemId`) is named after that page
      const pageSegment = routePrefix !== owner.routePattern ? routePrefix.split('/').pop() : undefined;
      const key =
        owner.parameters.length > 0
          ? `${owner.key}.${recordName}`
          : pageSegment && !crumb.entity
            ? `${owner.key}.${pageSegment}`
            : recordName;
      addTarget(
        {
          // a second record screen of the same kind is named after its list
          key: targets.some(existing => existing.key === key) ? `${owner.key}.${recordName}` : key,
          label: typeof crumb.label === 'string' ? options.translate(crumb.label) : `${owner.label} (${recordName})`,
          group: owner.group ? `${owner.group} › ${owner.label}` : owner.label,
          routePattern: joinRoute(routePrefix, crumb.segment),
          parameters: [...owner.parameters, parameterName],
        },
        crumb.children ?? [],
        options,
        targets
      );
      continue;
    }
    // a page right below the owner is a tab of it; record screens below a page are targets of their own
    if (routePrefix === owner.routePattern && crumb.link !== false && !owner.tabs.includes(crumb.segment)) {
      owner.tabs.push(crumb.segment);
    }
    if (crumb.children && crumb.children.length > 0) {
      collectCrumbTargets(owner, crumb.children, joinRoute(routePrefix, crumb.segment), options, targets);
    }
  }
};

/** Every target of a navigation tree the viewer may open, in navigation order. */
export const buildScreenTargets = (items: readonly NavigationItem<string>[], options: ScreenTargetsOptions): ScreenTarget[] => {
  const targets: ScreenTarget[] = [];
  const walk = (levelItems: readonly NavigationItem<string>[], levelGroup: string | null): void => {
    for (const item of levelItems) {
      const label = options.translate(item.label);
      const isGroup = isNavigationGroup(item);
      const isExternal = !isGroup && item.external === true;
      if (item.href && !isExternal) {
        addTarget(
          { key: item.key, label, group: levelGroup, routePattern: item.href.split(/[?#]/)[0] ?? item.href, parameters: [] },
          isGroup ? [] : (item.crumbs ?? []),
          options,
          targets
        );
      }
      if (isGroup) walk(item.children, levelGroup ? `${levelGroup} › ${label}` : label);
    }
  };
  walk(filterNavigation(items, options.canAccess), null);
  return targets;
};

/** The target a pathname shows, its route parameters and its tab. */
export interface ScreenTargetMatch {
  target: ScreenTarget;
  routeParameters: { name: string; value: string }[];
  /** The tab segment after the pattern, when it is one of the target's tabs */
  tab: string | null;
}

const segmentsOf = (path: string): string[] =>
  (path.split(/[?#]/)[0] ?? '').split('/').filter(segment => segment !== '');

const matchOne = (target: ScreenTarget, pathSegments: readonly string[]): ScreenTargetMatch | null => {
  const patternSegments = segmentsOf(target.routePattern);
  if (pathSegments.length < patternSegments.length || pathSegments.length > patternSegments.length + 1) return null;
  const routeParameters: { name: string; value: string }[] = [];
  for (const [index, patternSegment] of patternSegments.entries()) {
    const pathSegment = pathSegments[index] ?? '';
    const parameterName = parameterNameOf(patternSegment);
    if (parameterName !== null) {
      let value = pathSegment;
      try {
        value = decodeURIComponent(pathSegment);
      } catch {
        // a malformed escape: keep the raw segment
      }
      routeParameters.push({ name: parameterName, value });
    } else if (patternSegment !== pathSegment) {
      return null;
    }
  }
  if (pathSegments.length === patternSegments.length) return { target, routeParameters, tab: null };
  const tab = pathSegments[patternSegments.length] ?? '';
  return target.tabs.includes(tab) ? { target, routeParameters, tab } : null;
};

/** How many path segments a match names literally (pattern literals and the tab): more wins over a parameter. */
const literalScoreOf = (match: ScreenTargetMatch): number =>
  segmentsOf(match.target.routePattern).length - match.routeParameters.length + (match.tab === null ? 0 : 1);

/**
 * The target a pathname shows (without the basePath), or `null`: the match naming the most segments literally
 * (`/orders/create` is the list's tab `create`, not the order `create`), then the longest pattern.
 */
export const matchScreenTarget = (targets: readonly ScreenTarget[], pathname: string): ScreenTargetMatch | null => {
  const pathSegments = segmentsOf(pathname);
  let best: ScreenTargetMatch | null = null;
  for (const target of targets) {
    const match = matchOne(target, pathSegments);
    if (!match) continue;
    if (best === null) {
      best = match;
      continue;
    }
    const scoreDifference = literalScoreOf(match) - literalScoreOf(best);
    if (scoreDifference > 0 || (scoreDifference === 0 && segmentsOf(match.target.routePattern).length > segmentsOf(best.target.routePattern).length)) {
      best = match;
    }
  }
  return best;
};

/**
 * The filters of a target on one of its tabs (`null`: its own page): those of every page and those of that tab; a
 * filter declared for the tab replaces the one of every page with the same key.
 */
export const screenTargetFiltersOfTab = (target: ScreenTarget, tab: string | null): ScreenTargetFilter[] => {
  const ofTab = tab === null ? [] : target.filters.filter(filter => filter.tabs?.includes(tab));
  const keysOfTab = new Set(ofTab.map(filter => filter.key));
  return [...target.filters.filter(filter => filter.tabs === undefined && !keysOfTab.has(filter.key)), ...ofTab];
};

/**
 * The open screen as a target with the filters of its open tab only: what the agent may set there, and what the
 * screen read names (a record screen declares the filters of each tab's list with `tabs`).
 */
export const matchOpenScreenTarget = (targets: readonly ScreenTarget[], pathname: string): ScreenTarget | null => {
  const match = matchScreenTarget(targets, pathname);
  return match ? { ...match.target, filters: screenTargetFiltersOfTab(match.target, match.tab) } : null;
};

/** The most characters of one filter value an opened screen gets. */
export const MAX_SCREEN_FILTER_VALUE_CHARS = 100;

/**
 * The href of the open screen with the given filters set (a non-empty value) or removed (an empty value): only the
 * target's declared filters change, the path and every other parameter of the URL stay (the action `setFilters` of
 * `actOnScreen`).
 */
export const buildScreenFiltersHref = (
  target: ScreenTarget,
  pathname: string,
  search: string,
  filters: Readonly<Record<string, string>>
): string => {
  const declaredFilterKeys = new Set(target.filters.map(filter => filter.key));
  const query = new URLSearchParams(search);
  for (const [key, value] of Object.entries(filters)) {
    if (!declaredFilterKeys.has(key)) continue;
    if (value === '') query.delete(key);
    else query.set(key, value.slice(0, MAX_SCREEN_FILTER_VALUE_CHARS));
  }
  const queryText = query.toString();
  return queryText ? `${pathname}?${queryText}` : pathname;
};

/** The most values of one filter the screen read names. */
const MAX_DESCRIBED_FILTER_VALUES = 24;

/**
 * The values of a filter as one phrase. A sort (every value `<key>:asc` or `<key>:desc`, both of each key) names its
 * keys once: `one of id|created, each with :asc or :desc`.
 */
const describeValueList = (values: readonly string[], multiple: boolean): string => {
  const sortKeys = [...new Set(values.map(value => value.replace(/:(asc|desc)$/, '')))];
  const isSort = values.length === sortKeys.length * 2 && sortKeys.every(key => values.includes(`${key}:asc`) && values.includes(`${key}:desc`));
  const named = isSort ? sortKeys : values;
  const list = `${named.slice(0, MAX_DESCRIBED_FILTER_VALUES).join('|')}${named.length > MAX_DESCRIBED_FILTER_VALUES ? '|…' : ''}`;
  if (isSort) return `one of ${list}, each with :asc or :desc`;
  return multiple ? `one or more of ${list}, comma-separated` : `one of ${list}`;
};

/** What the value of a filter is: `one of A|B`, `one or more of A|B, comma-separated`, its hint; `` for a plain key. */
const describeFilterValues = (filter: ScreenTargetFilter): string => {
  const parts: string[] = [];
  if (filter.values !== undefined && filter.values.length > 0) {
    parts.push(describeValueList(filter.values, filter.multiple === true));
  }
  if (filter.hint !== undefined && filter.hint !== '') parts.push(filter.hint);
  return parts.join('; ');
};

/**
 * The declared filters of the open screen for the screen reader, the set ones with their value, each with what its
 * value is where the host named it: `status=OPEN (one of OPEN|SOLVED) · priority · from (date YYYY-MM-DD)`; `null`
 * for a screen without filters.
 */
export const describeScreenFilters = (target: ScreenTarget | null, search: string): string | null => {
  if (!target || target.filters.length === 0) return null;
  const query = new URLSearchParams(search);
  return target.filters
    .map(filter => {
      const value = query.get(filter.key);
      const state = value === null || value === '' ? filter.key : `${filter.key}=${value.slice(0, MAX_SCREEN_FILTER_VALUE_CHARS)}`;
      const values = describeFilterValues(filter);
      return values === '' ? state : `${state} (${values})`;
    })
    .join(' · ');
};

/**
 * The href of a target for the given record ids, tab and filters; `null` when a record id is missing. Only the
 * target's declared filters are set; a tab the target does not have is left out.
 */
export const buildScreenTargetHref = (
  target: ScreenTarget,
  request: { recordIds: readonly number[]; tab: string | null; filters: Readonly<Record<string, string>> }
): string | null => {
  let parameterIndex = 0;
  const segments: string[] = [];
  for (const segment of segmentsOf(target.routePattern)) {
    if (parameterNameOf(segment) === null) {
      segments.push(segment);
      continue;
    }
    const recordId = request.recordIds[parameterIndex];
    parameterIndex += 1;
    if (recordId === undefined || !Number.isInteger(recordId) || recordId <= 0) return null;
    segments.push(String(recordId));
  }
  if (request.tab && target.tabs.includes(request.tab)) segments.push(request.tab);
  // a filter of a tab is set with that tab only
  const declaredFilterKeys = new Set(screenTargetFiltersOfTab(target, request.tab).map(filter => filter.key));
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(request.filters)) {
    if (declaredFilterKeys.has(key)) query.set(key, value.slice(0, MAX_SCREEN_FILTER_VALUE_CHARS));
  }
  const path = `/${segments.join('/')}`;
  const queryText = query.toString();
  return queryText ? `${path}?${queryText}` : path;
};
