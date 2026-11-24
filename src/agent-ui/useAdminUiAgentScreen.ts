'use client';

import { useMemo, useRef } from 'react';

import { useTranslate } from '../i18n/useTranslate.ts';
import type { NavigationAccess, NavigationItem } from '../logic/pure/navigation.ts';
import { canNavigate, getDirtyForms, getOpenOverlays, type OverlayKind } from '../logic/pure/navigationGuard.ts';
import { useCurrentPathname } from '../primitives/pathname.tsx';
import { findAgentPanelByAttribute, findOccludingRectOfAgentPanel } from './agentPanel.ts';
import { buildAgentUIState, describeNavigationBlocker, describeUnsavedChanges } from './agentUIState.ts';
import type {
  AgentUIStateSource,
  ScreenHighlightEvent,
  ScreenLocation,
  ScreenOccludingRect,
  ScreenNavigator,
  ScreenTarget,
  ScreenTargetSource,
} from './contract.ts';
import { buildScreenTargetHref, buildScreenTargets } from './screenTargets.ts';

/** The longest wait for an opened screen to settle. */
export const AGENT_SCREEN_SETTLE_MAX_MS = 6000;

/** How long an opened screen must stay without a loading state. */
export const AGENT_SCREEN_SETTLE_QUIET_MS = 300;

/** What marks a loading screen: the package's skeletons and busy regions. */
const BUSY_SELECTOR = '[aria-busy="true"], [data-slot="skeleton"]';

/** Elements the agent never reads (the agent window itself). */
const SKIP_SELECTOR = '[data-agent-skip]';

export interface AdminUiAgentScreenOptions {
  /** The navigation tree of `AppShell` (one tree for sidebar, breadcrumbs and the agent's targets) */
  navigation: readonly NavigationItem<string>[];
  /** The shell's rights predicate */
  canAccess?: NavigationAccess;
  /** Opens an href with the host's router (`router.push`) */
  navigate: (href: string) => void;
  /** The URL filters per target key (a list screen's `useUrlListState` keys, imported from the screen's own constant) */
  filtersByTargetKey?: Readonly<Record<string, readonly string[]>>;
  /** The views per target key (`?view=`) */
  viewsByTargetKey?: Readonly<Record<string, readonly string[]>>;
  /** Overlay kinds that neither block a navigation nor count as an open dialog (the agent window, when it is a sheet) */
  ignoreOverlayKinds?: readonly OverlayKind[];
  /** The content root the reader reads (default: the shell's `<main>`) */
  findRoot?: () => Element | null;
  /** Called after an opened screen settled (e.g. to make room for the page beside the agent window) */
  onOpened?: (target: ScreenTarget, location: ScreenLocation) => void;
  /**
   * The agent window, so a mark is scrolled beside it (default: the first element with `data-agent-panel`). A window
   * docked beside the page never overlaps a mark and changes nothing.
   */
  findAgentPanel?: () => Element | null;
  /**
   * Called after every mark (agents package 0.3.2 or later), e.g. to make the compact agent window smaller or move it
   * when `coveredAfterScroll` says the marked element is still under it.
   */
  onHighlight?: (event: ScreenHighlightEvent) => void;
}

/** The options `DomScreenHighlighter` of `@mgamadeus/ddd-agents/ui` (0.3.2 or later) takes besides registry and announce. */
export interface AdminUiScreenHighlighterOptions {
  getOccludingRect: () => ScreenOccludingRect | null;
  onHighlight: (event: ScreenHighlightEvent) => void;
}

/** The options `DomScreenReader` of `@mgamadeus/ddd-agents/ui` takes besides its registry. */
export interface AdminUiScreenReaderOptions {
  findRoot: () => Element | null;
  currentLocation: () => ScreenLocation;
  describeUnsavedChanges: () => string;
}

/** The parts of the agent's screen adapters for screens built from this package's blocks. */
export interface AdminUiAgentScreen {
  targets: ScreenTargetSource;
  navigator: ScreenNavigator;
  /** Whether the tab is visible now */
  isVisible: () => boolean;
  /** Pass to `new DomScreenReader({ ...readerOptions, registry })` */
  readerOptions: AdminUiScreenReaderOptions;
  /** Pass to `useAgentUIClient(adapters, uiStateSource)` */
  uiStateSource: AgentUIStateSource;
  /** Pass to `new DomScreenHighlighter({ ...highlighterOptions, registry, announce })` */
  highlighterOptions: AdminUiScreenHighlighterOptions;
}

const wait = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

const defaultFindRoot = (): Element | null => (typeof document === 'undefined' ? null : document.querySelector('main'));

const invalidFieldNamesIn = (root: Element | null): string[] => {
  if (!root) return [];
  return Array.from(root.querySelectorAll('[aria-invalid="true"][name]'))
    .filter(element => element.closest(SKIP_SELECTOR) === null)
    .map(element => element.getAttribute('name') ?? '')
    .filter(name => name !== '');
};

/**
 * The agent's view of an admin built from this package (`Agent.UI` of `@mgamadeus/ddd-agents`): the screen targets
 * from the shell's navigation tree (rights applied), the navigator over the host's router with the package's
 * navigation guard (unsaved changes in a form, an open dialog, drawer or sheet refuse), the options of the DOM reader,
 * the UI state source (route, tab, view, unsaved and invalid fields, open dialog), and the highlighter options that
 * scroll a mark beside the agent window and report each mark to the host. Stable for the component's
 * lifetime; every call reads the newest options and pathname.
 */
export const useAdminUiAgentScreen = (options: AdminUiAgentScreenOptions): AdminUiAgentScreen => {
  const { t } = useTranslate();
  const pathname = useCurrentPathname();
  const latest = useRef({ options, t, pathname });
  latest.current = { options, t, pathname };

  return useMemo<AdminUiAgentScreen>(() => {
    const listTargets = (): ScreenTarget[] => {
      const current = latest.current;
      return buildScreenTargets(current.options.navigation, {
        translate: label => current.t(label),
        canAccess: current.options.canAccess,
        filtersByTargetKey: current.options.filtersByTargetKey,
        viewsByTargetKey: current.options.viewsByTargetKey,
      });
    };
    const findRoot = (): Element | null => (latest.current.options.findRoot ?? defaultFindRoot)();
    const currentPathname = (): string => latest.current.pathname ?? (typeof window === 'undefined' ? '/' : window.location.pathname);
    const currentLocation = (): ScreenLocation => {
      const search = typeof window === 'undefined' ? '' : window.location.search;
      const heading = findRoot()?.querySelector('h1');
      return {
        route: `${currentPathname()}${search}`,
        title: (heading?.textContent ?? '').trim() || (typeof document === 'undefined' ? '' : document.title),
      };
    };
    const navigationDecision = () => canNavigate({ ignoreOverlayKinds: latest.current.options.ignoreOverlayKinds ?? [] });

    const navigator: ScreenNavigator = {
      describeBlockers: () => describeNavigationBlocker(navigationDecision()),
      currentLocation,
      open: async (target, request) => {
        const href = buildScreenTargetHref(target, request) ?? target.routePattern;
        const path = href.split('?')[0] ?? href;
        latest.current.options.navigate(href);
        const startedAt = Date.now();
        let quietSince: number | null = null;
        while (Date.now() - startedAt < AGENT_SCREEN_SETTLE_MAX_MS) {
          await wait(100);
          const arrived = latest.current.pathname === path || window.location.pathname.endsWith(path);
          const busy = findRoot()?.querySelector(BUSY_SELECTOR) != null;
          if (!arrived || busy) {
            quietSince = null;
            continue;
          }
          quietSince ??= Date.now();
          if (Date.now() - quietSince >= AGENT_SCREEN_SETTLE_QUIET_MS) break;
        }
        const location = currentLocation();
        latest.current.options.onOpened?.(target, location);
        return location;
      },
    };

    const getOccludingRect = (): ScreenOccludingRect | null => {
      if (typeof window === 'undefined') return null;
      const agentPanel = (latest.current.options.findAgentPanel ?? findAgentPanelByAttribute)();
      return findOccludingRectOfAgentPanel(agentPanel, { width: window.innerWidth, height: window.innerHeight });
    };

    return {
      targets: { listTargets },
      highlighterOptions: {
        getOccludingRect,
        onHighlight: event => latest.current.options.onHighlight?.(event),
      },
      navigator,
      isVisible: () => typeof document !== 'undefined' && document.visibilityState === 'visible',
      readerOptions: {
        findRoot,
        currentLocation,
        describeUnsavedChanges: () => describeUnsavedChanges(getDirtyForms()),
      },
      uiStateSource: {
        readUIState: () => {
          const ignoredKinds = latest.current.options.ignoreOverlayKinds ?? [];
          return buildAgentUIState({
            pathname: currentPathname(),
            search: typeof window === 'undefined' ? '' : window.location.search,
            targets: listTargets(),
            dirtyForms: getDirtyForms(),
            openOverlays: getOpenOverlays().filter(overlay => !ignoredKinds.includes(overlay.kind)),
            invalidFieldNames: invalidFieldNamesIn(findRoot()),
            visible: typeof document === 'undefined' ? null : document.visibilityState === 'visible',
            capturedAt: new Date().toISOString(),
          });
        },
      },
    };
  }, []);
};
