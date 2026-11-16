'use client';

import { type MouseEvent, type PointerEvent, useCallback, useRef } from 'react';

import { INTERACTIVE_SELECTOR } from '../pure/rowActivation.ts';

/** Pointer travel (px, per axis) above which a click counts as a drag (text selection, scroll-drag). */
const DRAG_THRESHOLD_PX = 6;

export interface RowActivationHandlers {
  onPointerDown?: (event: PointerEvent<HTMLElement>) => void;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
}

/**
 * Click-anywhere activation for a list row or grid card. Inert without an action; skips modifier clicks, clicks on
 * interactive descendants and drags. The row or card stays out of the tab order on purpose: its own labelled
 * buttons keep the action reachable by keyboard.
 */
export const useRowActivation = (action: (() => void) | null | undefined): RowActivationHandlers => {
  const originRef = useRef<{ x: number; y: number } | null>(null);

  const onPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    originRef.current = { x: event.clientX, y: event.clientY };
  }, []);

  const onClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      if (!action) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (event.target instanceof Element && event.target.closest(INTERACTIVE_SELECTOR)) return;

      const origin = originRef.current;
      originRef.current = null;
      if (
        origin &&
        (Math.abs(event.clientX - origin.x) > DRAG_THRESHOLD_PX || Math.abs(event.clientY - origin.y) > DRAG_THRESHOLD_PX)
      ) {
        return;
      }
      action();
    },
    [action]
  );

  if (!action) return {};
  return { onPointerDown, onClick };
};
