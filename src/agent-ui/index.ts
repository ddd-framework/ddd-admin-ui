/**
 * `./agent-ui`: the adapters of `Agent.UI` (`@mgamadeus/ddd-agents/ui`) for an admin built from this package — the
 * screen targets from the shell's navigation tree, the navigator with the package's navigation guard, the options of
 * the agents package's DOM reader and highlighter (a mark scrolled beside the agent window), and the UI state source (route, tab, view, unsaved and invalid fields, open
 * dialog). Never imports the agents package: `contract.ts` is a structural copy of the contracts the adapters fill.
 */
export {
  AGENT_UI_NAVIGATION_OUTCOMES,
  AGENT_UI_ROUTE_PATH_PATTERN,
  AGENT_UI_TOKEN_PATTERN,
} from './contract.ts';
export type {
  AgentUIRouteParameter,
  AgentUIState,
  AgentUIStateSource,
  ScreenHighlightEvent,
  ScreenLocation,
  ScreenNavigationBlocker,
  ScreenNavigator,
  ScreenOccludingRect,
  ScreenOpenRequest,
  ScreenTarget,
  ScreenTargetFilter,
  ScreenTargetSource,
} from './contract.ts';
export {
  buildScreenTargetHref,
  buildScreenTargets,
  matchScreenTarget,
  MAX_SCREEN_FILTER_VALUE_CHARS,
} from './screenTargets.ts';
export type { ScreenTargetMatch, ScreenTargetsOptions } from './screenTargets.ts';
export {
  buildAgentUIState,
  describeDirtyForms,
  describeNavigationBlocker,
  describeUnsavedChanges,
  fieldReferenceOf,
  isAgentUIToken,
  MAX_AGENT_UI_FIELD_REFERENCES,
} from './agentUIState.ts';
export type { AgentUIStateInput } from './agentUIState.ts';
export {
  AGENT_SCREEN_SETTLE_MAX_MS,
  AGENT_SCREEN_SETTLE_QUIET_MS,
  useAdminUiAgentScreen,
} from './useAdminUiAgentScreen.ts';
export type {
  AdminUiAgentScreen,
  AdminUiAgentScreenOptions,
  AdminUiScreenHighlighterOptions,
  AdminUiScreenReaderOptions,
} from './useAdminUiAgentScreen.ts';
export { AGENT_PANEL_ATTRIBUTE, findAgentPanelByAttribute, findOccludingRectOfAgentPanel } from './agentPanel.ts';
export type { ViewportBoxSource } from './agentPanel.ts';
