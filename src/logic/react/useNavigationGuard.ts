'use client';

import { useMemo } from 'react';

import {
  type CanNavigateOptions,
  canNavigate,
  type DirtyForm,
  getDirtyForms,
  getOpenOverlays,
  type NavigationDecision,
  type OpenOverlay,
} from '../pure/navigationGuard.ts';

/** What `useNavigationGuard` returns: functions that read the page's state when called. */
export interface NavigationGuard {
  /**
   * Whether a navigation may run now: refused (`reason: 'unsaved-changes'`) while a form reports unsaved changes,
   * else refused (`reason: 'dialog-open'`) while a package dialog, drawer or sheet is open (`ignoreOverlayKinds` lets
   * kinds through). Always lists the dirty forms and the open overlays.
   */
  canNavigate: (options?: CanNavigateOptions) => NavigationDecision;
  /** The forms with unsaved changes and their changed fields. */
  getDirtyForms: () => DirtyForm[];
  /** The open package overlays. */
  getOpenOverlays: () => OpenOverlay[];
}

/**
 * The navigation guard for a host's own navigation (a router call, an agent's tool): ask `canNavigate()` before
 * navigating and leave the page as it is when it answers `allowed: false`. It reads the forms that use
 * `useUnsavedChangesGuard` or `FormDialog isDirty`, and the overlays drawn with the package's `DialogContent` /
 * `SheetContent` (`FormDrawer`, `FormDialog`, confirmations; not the shell's mobile menu). Works without a provider;
 * outside React use `canNavigate` / `getDirtyForms` from `./logic` directly. The returned object is stable.
 */
export const useNavigationGuard = (): NavigationGuard =>
  useMemo(
    () => ({
      canNavigate: options => canNavigate(options),
      getDirtyForms: () => getDirtyForms(),
      getOpenOverlays: () => getOpenOverlays(),
    }),
    []
  );
