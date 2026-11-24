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
import type { ScreenTarget } from './contract.ts';

export interface ScreenTargetsOptions {
  /** Translates a label of the tree (the shell translates the same labels with `t(label)`) */
  translate: (label: string) => string;
  /** The rights predicate of the shell: an entry it hides is no target */
  canAccess?: NavigationAccess;
  /** The URL filters per target key (a list screen's `useUrlListState` keys) */
  filtersByTargetKey?: Readonly<Record<string, readonly string[]>>;
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
    filters: (options.filtersByTargetKey?.[draft.key] ?? []).map(key => ({ key })),
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

/** The most characters of one filter value an opened screen gets. */
export const MAX_SCREEN_FILTER_VALUE_CHARS = 100;

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
  const declaredFilterKeys = new Set(target.filters.map(filter => filter.key));
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(request.filters)) {
    if (declaredFilterKeys.has(key)) query.set(key, value.slice(0, MAX_SCREEN_FILTER_VALUE_CHARS));
  }
  const path = `/${segments.join('/')}`;
  const queryText = query.toString();
  return queryText ? `${path}?${queryText}` : path;
};
