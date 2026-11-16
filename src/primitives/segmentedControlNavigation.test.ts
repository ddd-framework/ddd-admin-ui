import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isSegmentedKey,
  SEGMENTED_TOUCH_SLOP,
  segmentedDragDecision,
  segmentedIndexAtPoint,
  segmentedIndexForKey,
} from './segmentedControlNavigation.ts';

describe('segmentedIndexForKey', () => {
  const none = [false, false, false, false];

  it('moves forward and back with the arrows and wraps around', () => {
    assert.equal(segmentedIndexForKey(none, 0, 'ArrowRight'), 1);
    assert.equal(segmentedIndexForKey(none, 0, 'ArrowDown'), 1);
    assert.equal(segmentedIndexForKey(none, 3, 'ArrowRight'), 0);
    assert.equal(segmentedIndexForKey(none, 0, 'ArrowLeft'), 3);
    assert.equal(segmentedIndexForKey(none, 2, 'ArrowUp'), 1);
  });

  it('swaps the horizontal arrows right to left (up / down unchanged)', () => {
    assert.equal(segmentedIndexForKey(none, 1, 'ArrowLeft', 'rtl'), 2);
    assert.equal(segmentedIndexForKey(none, 1, 'ArrowRight', 'rtl'), 0);
    assert.equal(segmentedIndexForKey(none, 1, 'ArrowDown', 'rtl'), 2);
  });

  it('goes to the first / last enabled option with Home / End', () => {
    const disabled = [true, false, false, true];
    assert.equal(segmentedIndexForKey(disabled, 2, 'Home'), 1);
    assert.equal(segmentedIndexForKey(disabled, 1, 'End'), 2);
  });

  it('skips disabled options', () => {
    const disabled = [false, true, false, true];
    assert.equal(segmentedIndexForKey(disabled, 0, 'ArrowRight'), 2);
    assert.equal(segmentedIndexForKey(disabled, 2, 'ArrowRight'), 0);
    assert.equal(segmentedIndexForKey(disabled, 0, 'ArrowLeft'), 2);
  });

  it('stays put when no other option is enabled', () => {
    assert.equal(segmentedIndexForKey([false, true, true], 0, 'ArrowRight'), 0);
    assert.equal(segmentedIndexForKey([], 0, 'End'), 0);
  });

  it('knows its keys', () => {
    assert.ok(isSegmentedKey('Home'));
    assert.ok(!isSegmentedKey('Tab'));
    assert.ok(!isSegmentedKey(' '));
  });
});

describe('segmentedIndexAtPoint', () => {
  const rects = [
    { left: 0, right: 60 },
    { left: 62, right: 120 },
    { left: 122, right: 200 },
  ];

  it('finds the option under the pointer, the nearest one in a gap or past the ends', () => {
    assert.equal(segmentedIndexAtPoint(rects, [false, false, false], 90), 1);
    assert.equal(segmentedIndexAtPoint(rects, [false, false, false], 61), 0);
    assert.equal(segmentedIndexAtPoint(rects, [false, false, false], -40), 0);
    assert.equal(segmentedIndexAtPoint(rects, [false, false, false], 500), 2);
  });

  it('never lands on a disabled option', () => {
    assert.equal(segmentedIndexAtPoint(rects, [false, true, false], 90), 0);
    assert.equal(segmentedIndexAtPoint(rects, [true, true, true], 90), -1);
  });
});

describe('segmentedDragDecision', () => {
  it('drags a mouse or pen at once', () => {
    assert.equal(segmentedDragDecision('mouse', 1, 0), 'drag');
    assert.equal(segmentedDragDecision('pen', 0, 3), 'drag');
  });

  it('waits for a touch to pass the slop, then drags sideways or abandons a vertical swipe', () => {
    assert.equal(segmentedDragDecision('touch', SEGMENTED_TOUCH_SLOP - 1, 2), 'wait');
    assert.equal(segmentedDragDecision('touch', SEGMENTED_TOUCH_SLOP + 2, 3), 'drag');
    assert.equal(segmentedDragDecision('touch', 3, SEGMENTED_TOUCH_SLOP + 2), 'abandon');
  });
});
