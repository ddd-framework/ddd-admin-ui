'use client';

import { useEffect, useId } from 'react';

/**
 * The overlay writer of the page-wide activity store that `useNavigationGuard` / `canNavigate` (`./logic`) read.
 * `./primitives` may not import `./logic`, so this file writes the store by its shared shape and key (see
 * `logic/pure/navigationGuard.ts`, `UiActivityState`): change both together.
 */

/** The kind of an open package overlay (`OverlayKind` of `./logic`). */
export type OverlayPresenceKind = 'dialog' | 'sheet' | 'drawer';

interface UiActivityStateShape {
  forms: Map<string, unknown>;
  overlays: Map<string, OverlayPresenceKind>;
  listeners: Set<() => void>;
}

const UI_ACTIVITY_KEY = Symbol.for('@mgamadeus/ddd-admin-ui/ui-activity');

const activityState = (): UiActivityStateShape => {
  const holder = globalThis as unknown as Record<symbol, UiActivityStateShape | undefined>;
  let state = holder[UI_ACTIVITY_KEY];
  if (!state) {
    state = { forms: new Map(), overlays: new Map(), listeners: new Set() };
    holder[UI_ACTIVITY_KEY] = state;
  }
  return state;
};

const notify = (state: UiActivityStateShape) => {
  for (const listener of [...state.listeners]) listener();
};

/**
 * Reports a mounted overlay as open while it is mounted (Radix mounts a dialog's content only while it is open, until
 * its close animation ends). `null`: not reported.
 */
export const useOverlayPresence = (kind: OverlayPresenceKind | null): void => {
  const registrationId = useId();
  useEffect(() => {
    if (!kind) return;
    const state = activityState();
    state.overlays.set(registrationId, kind);
    notify(state);
    return () => {
      if (state.overlays.delete(registrationId)) notify(state);
    };
  }, [registrationId, kind]);
};

/**
 * Renders nothing and reports `kind` while it is mounted. Placed INSIDE a Radix content element, which Radix mounts
 * only while the overlay is open (and until its close animation ends): a dialog or sheet a host keeps mounted while
 * closed is then never reported. The wrapper component around the content renders while closed too, so it must not
 * report itself.
 */
export const OverlayPresenceMarker = ({ kind }: { kind: OverlayPresenceKind | null }): null => {
  useOverlayPresence(kind);
  return null;
};
