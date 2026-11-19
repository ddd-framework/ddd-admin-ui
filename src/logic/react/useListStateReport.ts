'use client';

import { useEffect, useRef } from 'react';

import { type EntityListState, sameEntityListState } from '../pure/listState.ts';

/**
 * Calls `onChange` after the first render and after every render that changed the state (compared by value), never
 * during the server render. `buildState` runs only after a render and only with `onChange`; the latest `onChange` is
 * called, so neither needs to be stable.
 */
export const useListStateReport = (
  onChange: ((state: EntityListState) => void) | undefined,
  buildState: () => EntityListState
): void => {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const buildRef = useRef(buildState);
  buildRef.current = buildState;
  const lastReported = useRef<EntityListState | null>(null);
  const enabled = onChange !== undefined;
  useEffect(() => {
    if (!enabled) {
      lastReported.current = null;
      return;
    }
    const state = buildRef.current();
    if (sameEntityListState(lastReported.current, state)) return;
    lastReported.current = state;
    onChangeRef.current?.(state);
  });
};
