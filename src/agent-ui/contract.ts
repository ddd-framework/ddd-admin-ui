/**
 * A structural copy of the client contracts of `@mgamadeus/ddd-agents/ui` 0.3.x (`client-tools`, `agent-ui-state`):
 * the parts the adapters of this entry fill. Copied, not imported, so this package neither depends on the agents
 * package nor loads it; TypeScript matches structurally, so the adapters are assignable to the agents package's own
 * types. Keep it in step with the version named in the README.
 */

/** A URL filter of a list screen: the query parameter, e.g. `customerId`. */
export interface ScreenTargetFilter {
  key: string;
}

/** A screen the user can open: a navigation entry, a record screen or a page below one. */
export interface ScreenTarget {
  /** Stable key the agent passes to `openScreen`: the navigation key, the record kind, or a dotted path below one */
  key: string;
  /** What the user calls it (translated) */
  label: string;
  /** The navigation groups above it (translated), e.g. `Maintenance` */
  group: string | null;
  /** The route with `:parameter` segments, e.g. `/orders/:orderId` */
  routePattern: string;
  /** The route parameters in order */
  parameters: string[];
  /** The tabs (route segments after the pattern) */
  tabs: string[];
  /** The URL filters of a list screen */
  filters: ScreenTargetFilter[];
  /** The views of a list screen (`?view=`) */
  views: string[];
}

/** Where the browser is. */
export interface ScreenLocation {
  /** The route without the basePath, with the query string */
  route: string;
  /** The page heading or the document title */
  title: string;
}

/** Why a navigation would lose the user's work. */
export interface ScreenNavigationBlocker {
  outcome: string;
  /** A short sentence for the model */
  reason: string;
}

export interface ScreenOpenRequest {
  recordIds: number[];
  tab: string | null;
  filters: Record<string, string>;
}

/** Reads the navigation the user really has (rights applied). */
export interface ScreenTargetSource {
  listTargets(): ScreenTarget[];
}

/** Navigates with the application's router and guards. */
export interface ScreenNavigator {
  describeBlockers(): ScreenNavigationBlocker | null;
  open(target: ScreenTarget, request: ScreenOpenRequest): Promise<ScreenLocation>;
  currentLocation(): ScreenLocation;
}

/** One route parameter of the UI state. */
export interface AgentUIRouteParameter {
  name: string;
  value: string;
}

/**
 * What the client reports about its UI with every message and run-state read: tokens only (route path, tab, view,
 * references, dialog key), never field values or labels.
 */
export interface AgentUIState {
  routePath: string | null;
  routeParameters?: AgentUIRouteParameter[] | null;
  tab?: string | null;
  view?: string | null;
  unsavedFieldReferences?: string[];
  invalidFieldReferences?: string[];
  openDialogKey?: string | null;
  visible?: boolean | null;
  capturedAt?: string | null;
}

/** Reads the UI state now. */
export interface AgentUIStateSource {
  readUIState(): AgentUIState | null;
}

/** A region of the viewport in CSS pixels (`ScreenOccludingRect` of the agents package; a `DOMRect` fits). */
export interface ScreenOccludingRect {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

/** What a mark did (`ScreenHighlightEvent` of the agents package, 0.3.2 or later). */
export interface ScreenHighlightEvent {
  /** The references that were marked */
  references: string[];
  /** The marked elements, the first one scrolled into view */
  elements: Element[];
  /** The region reported as covering the page (the agent window), or null */
  occludingRect: ScreenOccludingRect | null;
  /** True when the first element stays covered by that region after the scroll */
  coveredAfterScroll: boolean;
}

/** The refusal codes of a navigation (`CLIENT_TOOL_OUTCOMES` of the agents package). */
export const AGENT_UI_NAVIGATION_OUTCOMES = {
  unsavedChanges: 'UNSAVED_CHANGES',
  dialogOpen: 'DIALOG_OPEN',
} as const;

/** A reference, tab, view or dialog key the server keeps (`AgentUIState::TOKEN_PATTERN`). */
export const AGENT_UI_TOKEN_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;

/** A route path the server keeps (`AgentUIState::ROUTE_PATH_PATTERN`). */
export const AGENT_UI_ROUTE_PATH_PATTERN = /^\/[A-Za-z0-9/_\-.~%:@]{0,511}$/;
