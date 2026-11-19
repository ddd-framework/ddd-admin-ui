import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  computeListTracks,
  hasListTracks,
  LIST_COLUMN_MIN_WIDTH,
  LIST_PIN_MIN_OVERFLOW,
  listTrackTemplate,
  minimumListWidth,
  resolveListPins,
  shouldHonourStartPins,
  listTrackLayoutTemplate,
  isSortIconFirst,
  LIST_CELL_PADDING,
  listCellPaddingAt,
  resolveListCellPadding,
} from './listTracks.ts';

describe('hasListTracks', () => {
  it('opts a table in as soon as one column declares a width', () => {
    assert.equal(hasListTracks([{}, {}]), false);
    assert.equal(hasListTracks([{}, { width: '2fr' }]), true);
    assert.equal(hasListTracks([{ minWidth: 200 }]), false);
  });
});

describe('computeListTracks', () => {
  it('divides the free width by the factors after the fixed lengths', () => {
    const layout = computeListTracks([{ width: '1fr' }, { width: '2fr' }, { width: '100px' }], 1000);
    assert.deepEqual(layout.widths, [300, 600, 100]);
    assert.equal(layout.scrollWidth, 1000);
    assert.equal(layout.overflows, false);
  });

  it('gives a column without width a 1fr share', () => {
    assert.deepEqual(computeListTracks([{}, { width: '1fr' }, { width: '80px' }], 480).widths, [200, 200, 80]);
  });

  it('holds a share at its minimum and divides the rest among the others', () => {
    // 1fr of 600 among 1fr + 5fr is 100 < 120: held at 120, the 5fr column takes the remaining 480
    const layout = computeListTracks([{ width: '1fr' }, { width: '5fr' }], 600);
    assert.deepEqual(layout.widths, [LIST_COLUMN_MIN_WIDTH, 480]);
    assert.equal(layout.overflows, false);
  });

  it('respects a column minWidth, also on a later round', () => {
    // round 1: unit 200 → the second column (min 250) is held; round 2: unit 183 → the first (min 200) is held too
    const layout = computeListTracks([{ width: '1fr', minWidth: 200 }, { width: '1fr', minWidth: 250 }, { width: '2fr' }], 800);
    assert.deepEqual(layout.widths, [200, 250, 350]);
  });

  it('overflows when the minimums exceed the width: every share at its minimum, fixed lengths kept', () => {
    const tracks = [{ width: '1fr' }, { width: '3fr', minWidth: 200 }, { width: '160px' }];
    const layout = computeListTracks(tracks, 390);
    assert.deepEqual(layout.widths, [120, 200, 160]);
    assert.equal(layout.scrollWidth, 480);
    assert.equal(layout.scrollWidth, minimumListWidth(tracks));
    assert.equal(layout.overflows, true);
  });

  it('fills the width exactly in whole pixels', () => {
    const layout = computeListTracks([{ width: '1fr' }, { width: '1fr' }, { width: '1fr' }], 1000);
    assert.ok(layout.widths.every(Number.isInteger));
    assert.equal(layout.scrollWidth, 1000);
  });

  it('treats fractional factors and lengths, and an unreadable width as 1fr', () => {
    assert.deepEqual(computeListTracks([{ width: '0.5fr' }, { width: '1.5fr' }], 800).widths, [200, 600]);
    assert.deepEqual(computeListTracks([{ width: 'auto' }, { width: '1fr' }], 400).widths, [200, 200]);
  });
});

describe('listTrackTemplate', () => {
  it('writes fixed lengths and minmax shares (CSS resolves it like computeListTracks)', () => {
    assert.equal(
      listTrackTemplate([{ width: '40px' }, { width: '2fr' }, { minWidth: 180 }]),
      '40px minmax(120px, 2fr) minmax(180px, 1fr)'
    );
  });
});

describe('shouldHonourStartPins', () => {
  it('is off until the table is measured', () => {
    assert.equal(shouldHonourStartPins(null, 2000, 100), false);
    assert.equal(shouldHonourStartPins(900, null, 100), false);
    assert.equal(shouldHonourStartPins(900, 2000, null), false);
    assert.equal(shouldHonourStartPins(0, 2000, 100), false);
  });

  it('needs a real overflow', () => {
    assert.equal(shouldHonourStartPins(900, 900, 100), false);
    assert.equal(shouldHonourStartPins(900, 900 + LIST_PIN_MIN_OVERFLOW - 1, 100), false);
    assert.equal(shouldHonourStartPins(900, 900 + LIST_PIN_MIN_OVERFLOW, 100), true);
  });

  it('switches at a third of the visible width', () => {
    assert.equal(shouldHonourStartPins(900, 2000, 299), true);
    assert.equal(shouldHonourStartPins(900, 2000, 300), false);
    assert.equal(shouldHonourStartPins(900, 2000, 450), false);
  });
});

describe('resolveListPins', () => {
  const columns = [{ always: true }, { always: true }, { pin: 'start' as const }, {}, {}, { pin: 'end' as const }, { pin: 'end' as const }];
  const widths = [40, 48, 160, 300, 300, 100, 80];

  it('pins always-pinned and start columns in order while the guard holds, end pins from the end', () => {
    const layout = resolveListPins(columns, { widths, visibleWidth: 1300, scrollWidth: 1028 + 400 });
    assert.equal(layout.startPinsHonoured, true);
    assert.deepEqual(layout.placements, [
      { side: 'start', offset: 0, edge: false },
      { side: 'start', offset: 40, edge: false },
      { side: 'start', offset: 88, edge: true },
      null,
      null,
      { side: 'end', offset: 80, edge: true },
      { side: 'end', offset: 0, edge: false },
    ]);
  });

  it('declines the start pin when the table does not overflow; always-pinned and end columns stay', () => {
    const layout = resolveListPins(columns, { widths, visibleWidth: 1400, scrollWidth: 1028 });
    assert.equal(layout.startPinsHonoured, false);
    assert.equal(layout.placements[2], null);
    assert.deepEqual(layout.placements[1], { side: 'start', offset: 40, edge: true });
    assert.deepEqual(layout.placements[5], { side: 'end', offset: 80, edge: true });
  });

  it('declines the start pin when the pinned total reaches a third of the visible width', () => {
    // pinned: 40 + 48 + 160 + 100 + 80 = 428 ≥ 1200 / 3
    const layout = resolveListPins(columns, { widths, visibleWidth: 1200, scrollWidth: 2000 });
    assert.equal(layout.startPinsHonoured, false);
    assert.equal(layout.placements[2], null);
  });

  it('before measurement places only what fixed widths allow', () => {
    const layout = resolveListPins(columns, {
      widths: [40, 48, null, null, null, null, 80],
      visibleWidth: null,
      scrollWidth: null,
    });
    assert.equal(layout.startPinsHonoured, false);
    assert.deepEqual(layout.placements[0], { side: 'start', offset: 0, edge: false });
    assert.deepEqual(layout.placements[1], { side: 'start', offset: 40, edge: true });
    assert.deepEqual(layout.placements[6], { side: 'end', offset: 0, edge: false });
    // the column before the last end pin needs the last one's width: known (80)
    assert.deepEqual(layout.placements[5], { side: 'end', offset: 80, edge: true });
  });

  it('stops placing a side at the first unknown width', () => {
    const layout = resolveListPins([{ pin: 'end' }, { pin: 'end' }, { pin: 'end' }], {
      widths: [100, null, 50],
      visibleWidth: null,
      scrollWidth: null,
    });
    assert.deepEqual(layout.placements, [null, { side: 'end', offset: 50, edge: true }, { side: 'end', offset: 0, edge: false }]);
  });

  it('pins nothing on a table without pins', () => {
    const layout = resolveListPins([{}, {}], { widths: [100, 100], visibleWidth: 100, scrollWidth: 400 });
    assert.deepEqual(layout, { placements: [null, null], startPinsHonoured: false });
  });
});

describe('content tracks', () => {
  it('opts into tracks and renders max-content before the measurement', () => {
    const tracks = [{ width: '1fr' }, { width: 'content' }];
    assert.equal(hasListTracks(tracks), true);
    assert.equal(listTrackTemplate(tracks), 'minmax(120px, 1fr) max-content');
    assert.equal(minimumListWidth(tracks), 120);
  });

  it('takes the measured width out of the free width and keeps max-content in the template', () => {
    const tracks = [{ width: '1fr' }, { width: '2fr' }, { width: 'content', contentWidth: 96 }];
    const layout = computeListTracks(tracks, 696);
    assert.deepEqual(layout.widths, [200, 400, 96]);
    assert.equal(layout.overflows, false);
    assert.equal(listTrackLayoutTemplate(tracks, layout.widths), '200px 400px max-content');
    assert.equal(minimumListWidth(tracks), 120 + 120 + 96);
  });

  it('places an end pin with the measured content width', () => {
    const tracks = [{ width: '1fr' }, { width: 'content', contentWidth: 80 }];
    const layout = computeListTracks(tracks, 500);
    const pins = resolveListPins([{}, { pin: 'end' }], { widths: layout.widths, visibleWidth: 500, scrollWidth: layout.scrollWidth });
    assert.deepEqual(pins.placements[1], { side: 'end', offset: 0, edge: true });
  });
});

describe('cell padding and sort arrow (0.3.9)', () => {
  it('resolves cellPaddingX', () => {
    assert.equal(resolveListCellPadding(undefined), null);
    assert.deepEqual(resolveListCellPadding(12), { inner: 12, edge: 12 });
    assert.deepEqual(resolveListCellPadding({ inner: 8 }), { inner: 8, edge: 8 });
    assert.deepEqual(resolveListCellPadding({ inner: 8, edge: 20 }), { inner: 8, edge: 20 });
    assert.deepEqual(resolveListCellPadding(-4), { inner: 0, edge: 0 });
    assert.deepEqual(resolveListCellPadding({ inner: Number.NaN, edge: 10 }), { inner: 0, edge: 10 });
  });

  it('adds the edge padding on the first and last position, the inner one elsewhere', () => {
    assert.equal(listCellPaddingAt(0, 3), LIST_CELL_PADDING.edge + LIST_CELL_PADDING.inner);
    assert.equal(listCellPaddingAt(1, 3), 32);
    assert.equal(listCellPaddingAt(2, 3), 40);
    assert.equal(listCellPaddingAt(0, 1), 48);
    assert.equal(listCellPaddingAt(1, 3, { inner: 0, edge: 12 }), 0);
    assert.equal(listCellPaddingAt(0, 3, { inner: 6, edge: 12 }), 18);
  });

  it('places the sort arrow by position or alignment', () => {
    assert.equal(isSortIconFirst(undefined, 'end'), true);
    assert.equal(isSortIconFirst('auto', 'start'), false);
    assert.equal(isSortIconFirst('end', 'end'), false);
    assert.equal(isSortIconFirst('start', undefined), true);
  });
});
