/**
 * What the screen holds that a navigation would throw away: the forms with unsaved changes and the open package
 * overlays (dialogs, drawers, sheets). The package's forms and overlays write into one store per page (`globalThis`,
 * so two copies of the package on one page share it); `useNavigationGuard` / `canNavigate` read it. No React here.
 */

/** A form with unsaved changes, as `getDirtyForms()` lists it. */
export interface DirtyForm {
  /** The form's id: the one passed to `useUnsavedChangesGuard` (`formId`), else a generated one (stable while mounted). */
  formId: string;
  /** The form's name for a person (`label`; a `FormDialog` passes its title when that is text). */
  label?: string;
  /**
   * The changed fields as dotted paths (`name`, `address.city`, `translations.name.de::FORMAL`), compared as a person
   * reads a form (the rules of `useFormDirty`); empty when the form reports only that it is dirty.
   */
  dirtyFieldNames: string[];
}

/** What a form reports to the store: read when someone asks, so the field names are current. */
export interface DirtyFormEntry {
  formId: string;
  label?: string;
  getDirtyFieldNames?: () => readonly string[];
}

/** The kind of an open package overlay: `dialog` (`DialogContent`), `sheet` (`SheetContent`), `drawer` (`FormDrawer`). */
export type OverlayKind = 'dialog' | 'sheet' | 'drawer';

/** An open package overlay. */
export interface OpenOverlay {
  overlayId: string;
  kind: OverlayKind;
}

/** Why a navigation is refused: a form holds unsaved changes (checked first), or a package overlay is open. */
export type NavigationBlockReason = 'unsaved-changes' | 'dialog-open';

/** The answer of `canNavigate()`. */
export interface NavigationDecision {
  allowed: boolean;
  /** Set exactly when `allowed` is `false`. */
  reason?: NavigationBlockReason;
  dirtyForms: DirtyForm[];
  openOverlays: OpenOverlay[];
}

export interface CanNavigateOptions {
  /** Overlay kinds that do not refuse (e.g. `['drawer']` for a master-detail drawer beside the page). Default: none. */
  ignoreOverlayKinds?: readonly OverlayKind[];
}

/** The decision from what the store holds: unsaved changes first, then open overlays. */
export const decideNavigation = (
  dirtyForms: readonly DirtyForm[],
  openOverlays: readonly OpenOverlay[],
  { ignoreOverlayKinds = [] }: CanNavigateOptions = {}
): NavigationDecision => {
  const forms = [...dirtyForms];
  const overlays = [...openOverlays];
  if (forms.length > 0) return { allowed: false, reason: 'unsaved-changes', dirtyForms: forms, openOverlays: overlays };
  if (overlays.some(overlay => !ignoreOverlayKinds.includes(overlay.kind))) {
    return { allowed: false, reason: 'dialog-open', dirtyForms: forms, openOverlays: overlays };
  }
  return { allowed: true, dirtyForms: forms, openOverlays: overlays };
};

/** The listed form of one store entry (the field names read now, a failing reader lists none). */
export const describeDirtyForm = (entry: DirtyFormEntry): DirtyForm => {
  let dirtyFieldNames: string[] = [];
  try {
    dirtyFieldNames = [...(entry.getDirtyFieldNames?.() ?? [])];
  } catch {
    dirtyFieldNames = [];
  }
  return entry.label === undefined
    ? { formId: entry.formId, dirtyFieldNames }
    : { formId: entry.formId, label: entry.label, dirtyFieldNames };
};

/**
 * The page-wide store. Its shape is shared with the overlay writer of `./primitives` (which may not import `./logic`):
 * change both together.
 */
export interface UiActivityState {
  /** Dirty forms by registration id (a form that is clean is not in the map). */
  forms: Map<string, DirtyFormEntry>;
  /** Open overlays by registration id. */
  overlays: Map<string, OverlayKind>;
  listeners: Set<() => void>;
}

/** The `globalThis` key of the store. */
export const UI_ACTIVITY_KEY = Symbol.for('@mgamadeus/ddd-admin-ui/ui-activity');

/** The page's store (created on first use). */
export const uiActivityState = (): UiActivityState => {
  const holder = globalThis as unknown as Record<symbol, UiActivityState | undefined>;
  let state = holder[UI_ACTIVITY_KEY];
  if (!state) {
    state = { forms: new Map(), overlays: new Map(), listeners: new Set() };
    holder[UI_ACTIVITY_KEY] = state;
  }
  return state;
};

const notify = (state: UiActivityState) => {
  for (const listener of [...state.listeners]) listener();
};

/** Registers (`entry`) or removes (`null`) a dirty form. */
export const setDirtyFormEntry = (registrationId: string, entry: DirtyFormEntry | null, state = uiActivityState()): void => {
  if (entry) state.forms.set(registrationId, entry);
  else if (!state.forms.delete(registrationId)) return;
  notify(state);
};

/** Registers (`kind`) or removes (`null`) an open overlay. */
export const setOpenOverlay = (registrationId: string, kind: OverlayKind | null, state = uiActivityState()): void => {
  if (kind) state.overlays.set(registrationId, kind);
  else if (!state.overlays.delete(registrationId)) return;
  notify(state);
};

/** Every form with unsaved changes on the page, in registration order. */
export const getDirtyForms = (state = uiActivityState()): DirtyForm[] => [...state.forms.values()].map(describeDirtyForm);

/** Every open package overlay on the page, in opening order. */
export const getOpenOverlays = (state = uiActivityState()): OpenOverlay[] =>
  [...state.overlays.entries()].map(([overlayId, kind]) => ({ overlayId, kind }));

/** Whether a navigation may run now (see `decideNavigation`). */
export const canNavigate = (options?: CanNavigateOptions, state = uiActivityState()): NavigationDecision =>
  decideNavigation(getDirtyForms(state), getOpenOverlays(state), options);

/** Calls `listener` after every change of the store; returns the unsubscribe. */
export const subscribeUiActivity = (listener: () => void, state = uiActivityState()): (() => void) => {
  state.listeners.add(listener);
  return () => {
    state.listeners.delete(listener);
  };
};
