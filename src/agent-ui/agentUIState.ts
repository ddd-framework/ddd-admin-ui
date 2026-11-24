/**
 * The UI state and the navigation blockers of screens built from this package's blocks, from the page-wide store of
 * the forms and overlays (`navigationGuard`): the unsaved and the invalid fields as the references the agents
 * package's screen reader gives them (`f.<field name>`), an open package dialog, drawer or sheet, the route's target,
 * parameters, tab and view. Pure (no React, no DOM).
 */
import type { DirtyForm, NavigationDecision, OpenOverlay } from '../logic/pure/navigationGuard.ts';
import {
  AGENT_UI_NAVIGATION_OUTCOMES,
  AGENT_UI_ROUTE_PATH_PATTERN,
  AGENT_UI_TOKEN_PATTERN,
  type AgentUIState,
  type ScreenNavigationBlocker,
  type ScreenTarget,
} from './contract.ts';
import { matchScreenTarget } from './screenTargets.ts';

/** The most field references of one kind in a state. */
export const MAX_AGENT_UI_FIELD_REFERENCES = 30;

/** Whether a value is a token the server keeps. */
export const isAgentUIToken = (value: unknown): value is string => typeof value === 'string' && AGENT_UI_TOKEN_PATTERN.test(value);

/**
 * The reference of a field by its name, as the screen reader writes it: `f.` and the name (`order.endDate` stays,
 * other characters become `-`, at most 60 characters).
 */
export const fieldReferenceOf = (fieldName: string): string =>
  `f.${fieldName.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^[^A-Za-z0-9]+/, '').slice(0, 60) || 'x'}`;

const uniqueReferencesOf = (fieldNames: readonly string[]): string[] => {
  const references: string[] = [];
  for (const fieldName of fieldNames) {
    const reference = fieldReferenceOf(fieldName);
    if (isAgentUIToken(reference) && !references.includes(reference)) references.push(reference);
    if (references.length >= MAX_AGENT_UI_FIELD_REFERENCES) break;
  }
  return references;
};

/** `Edit item (name, endDate); a form`: the dirty forms for the model (at most three forms, six fields each). */
export const describeDirtyForms = (dirtyForms: readonly DirtyForm[]): string =>
  dirtyForms
    .slice(0, 3)
    .map(dirtyForm => {
      const fields = dirtyForm.dirtyFieldNames.slice(0, 6).join(', ');
      return `${dirtyForm.label ?? 'a form'}${fields ? ` (${fields})` : ''}`;
    })
    .join('; ');

/** The screen reader's line on unsaved changes: `no`, or `yes (<forms>)`. */
export const describeUnsavedChanges = (dirtyForms: readonly DirtyForm[]): string =>
  dirtyForms.length === 0 ? 'no' : `yes (${describeDirtyForms(dirtyForms)})`;

/** The blocker of a navigation from the guard's decision: unsaved changes first, then an open dialog. */
export const describeNavigationBlocker = (decision: NavigationDecision): ScreenNavigationBlocker | null => {
  if (decision.allowed) return null;
  if (decision.reason === 'unsaved-changes') {
    return { outcome: AGENT_UI_NAVIGATION_OUTCOMES.unsavedChanges, reason: `Unsaved changes: ${describeDirtyForms(decision.dirtyForms)}.` };
  }
  const kinds = [...new Set(decision.openOverlays.map(overlay => overlay.kind))];
  return { outcome: AGENT_UI_NAVIGATION_OUTCOMES.dialogOpen, reason: `A ${kinds.join(' and a ') || 'dialog'} is open.` };
};

export interface AgentUIStateInput {
  /** The pathname without the basePath */
  pathname: string | null;
  /** The query string (with or without `?`) */
  search?: string;
  targets: readonly ScreenTarget[];
  dirtyForms: readonly DirtyForm[];
  openOverlays: readonly OpenOverlay[];
  /** The names of the fields marked invalid on the screen */
  invalidFieldNames?: readonly string[];
  visible?: boolean | null;
  /** ISO time of the capture */
  capturedAt?: string | null;
}

/** The UI state of the screen: tokens only, every value the server would drop left out. */
export const buildAgentUIState = (input: AgentUIStateInput): AgentUIState => {
  const pathname = input.pathname ? (input.pathname.split(/[?#]/)[0] ?? '') : null;
  const routePath = pathname && AGENT_UI_ROUTE_PATH_PATTERN.test(pathname) ? pathname : null;
  const searchParams = new URLSearchParams(input.search ?? '');
  const match = routePath ? matchScreenTarget(input.targets, routePath) : null;
  const tab = match?.tab ?? searchParams.get('tab');
  const view = searchParams.get('view');
  const lastOverlay = input.openOverlays[input.openOverlays.length - 1];
  return {
    routePath,
    routeParameters: match && match.routeParameters.length > 0 ? match.routeParameters.filter(parameter => isAgentUIToken(parameter.value)) : null,
    tab: isAgentUIToken(tab) ? tab : null,
    view: isAgentUIToken(view) ? view : null,
    unsavedFieldReferences: uniqueReferencesOf(input.dirtyForms.flatMap(dirtyForm => dirtyForm.dirtyFieldNames)),
    invalidFieldReferences: uniqueReferencesOf(input.invalidFieldNames ?? []),
    openDialogKey: lastOverlay ? lastOverlay.kind : null,
    visible: input.visible ?? null,
    capturedAt: input.capturedAt ?? null,
  };
};
