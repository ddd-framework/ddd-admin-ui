/**
 * Keyboard and pointer mechanics of `SegmentedControl`, as pure functions: which option a key or a pointer position
 * lands on. Disabled options are skipped; arrows wrap around; in a right-to-left control the horizontal arrows swap.
 */

/** The keys the control handles; anything else is left to the browser. */
export type SegmentedKey = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown' | 'Home' | 'End';

const SEGMENTED_KEYS: readonly string[] = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];

export const isSegmentedKey = (key: string): key is SegmentedKey => SEGMENTED_KEYS.includes(key);

/**
 * The index a key moves to from `current` among `disabled.length` options (`disabled[i]` true = skipped). Arrow right /
 * down go forward (left in RTL), arrow left / up go back, Home / End to the first / last enabled option. `current` when
 * no other enabled option exists.
 */
export const segmentedIndexForKey = (
  disabled: readonly boolean[],
  current: number,
  key: SegmentedKey,
  direction: 'ltr' | 'rtl' = 'ltr'
): number => {
  const count = disabled.length;
  if (count === 0) return current;
  const enabled = (index: number) => !disabled[index];
  if (key === 'Home' || key === 'End') {
    const order = Array.from({ length: count }, (_, index) => index);
    if (key === 'End') order.reverse();
    return order.find(enabled) ?? current;
  }
  const forwardKey = direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
  const step = key === forwardKey || key === 'ArrowDown' ? 1 : -1;
  for (let offset = 1; offset < count; offset += 1) {
    const index = (((current + step * offset) % count) + count) % count;
    if (enabled(index)) return index;
  }
  return current;
};

/** One option's horizontal extent on screen (px, viewport coordinates). */
export interface SegmentedRect {
  left: number;
  right: number;
}

/**
 * The enabled option under a pointer at `x` during a drag: the option whose extent holds `x`, else the nearest one
 * (a pointer dragged past the ends lands on the first / last). `-1` when every option is disabled.
 */
export const segmentedIndexAtPoint = (rects: readonly SegmentedRect[], disabled: readonly boolean[], x: number): number => {
  let best = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  rects.forEach((rect, index) => {
    if (disabled[index]) return;
    const distance = x < rect.left ? rect.left - x : x > rect.right ? x - rect.right : 0;
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  return best;
};

/** A touch drag starts only after this much horizontal movement (px), and only when it is more horizontal than vertical. */
export const SEGMENTED_TOUCH_SLOP = 8;

/**
 * Does a pointer movement of (`dx`, `dy`) since the press start a drag? Mouse and pen at once; touch only past the slop
 * and mostly sideways, so a vertical swipe keeps scrolling the page. `'abandon'`: a touch that moved vertically first.
 */
export const segmentedDragDecision = (
  pointerType: string,
  dx: number,
  dy: number
): 'drag' | 'wait' | 'abandon' => {
  if (pointerType !== 'touch') return 'drag';
  const horizontal = Math.abs(dx);
  const vertical = Math.abs(dy);
  if (horizontal < SEGMENTED_TOUCH_SLOP && vertical < SEGMENTED_TOUCH_SLOP) return 'wait';
  return horizontal > vertical ? 'drag' : 'abandon';
};
