/**
 * Column tracks and pins of a list table, as pure functions: the table measures its visible width after hydration and
 * applies what these return. Nothing here reads the DOM.
 */

/** Width of a column track: a share of the free width (`'1fr'`, `'2fr'`) or a fixed length (`'120px'`). */
export type ListColumnWidth = `${number}fr` | `${number}px`;

/** Edge a column stays at while the table scrolls sideways. */
export type ListColumnPin = 'start' | 'end';

/** Horizontal alignment of a column's header and cells. */
export type ListColumnAlign = 'start' | 'center' | 'end';

/** Lower bound (px) of a share column without its own `minWidth`. */
export const LIST_COLUMN_MIN_WIDTH = 120;

/** A start pin is honoured only while the pinned columns together take less than this share of the visible width. */
export const LIST_PIN_MAX_VISIBLE_SHARE = 1 / 3;

/**
 * A start pin is honoured only while the table overflows its visible width by at least this much (px): a sliver of
 * sideways scroll is not worth a column that never moves.
 */
export const LIST_PIN_MIN_OVERFLOW = 120;

/** One track as the table declares it. */
export interface ListTrack {
  /** `'<n>fr'` or `'<n>px'`; absent (or anything else) is `'1fr'`. */
  width?: string;
  /** Lower bound in px of a share track (default `LIST_COLUMN_MIN_WIDTH`); a fixed track keeps its length. */
  minWidth?: number;
}

type ParsedTrack = { kind: 'fixed'; length: number } | { kind: 'share'; factor: number; minimum: number };

const FIXED = /^(\d+(?:\.\d+)?|\.\d+)px$/;
const SHARE = /^(\d+(?:\.\d+)?|\.\d+)fr$/;

const parseTrack = ({ width, minWidth }: ListTrack): ParsedTrack => {
  const fixed = width ? FIXED.exec(width.trim()) : null;
  if (fixed) return { kind: 'fixed', length: Number(fixed[1]) };
  const share = width ? SHARE.exec(width.trim()) : null;
  const factor = share ? Number(share[1]) : 1;
  return {
    kind: 'share',
    factor: factor > 0 ? factor : 1,
    minimum: Math.max(0, minWidth ?? LIST_COLUMN_MIN_WIDTH),
  };
};

/** Does the table opt into tracks? As soon as one column declares a `width`. */
export const hasListTracks = (tracks: readonly ListTrack[]): boolean => tracks.some(track => track.width !== undefined);

/** The narrowest the table can be: fixed lengths plus the minimum of every share track (px). */
export const minimumListWidth = (tracks: readonly ListTrack[]): number =>
  tracks.reduce((sum, track) => {
    const parsed = parseTrack(track);
    return sum + (parsed.kind === 'fixed' ? parsed.length : parsed.minimum);
  }, 0);

/**
 * The CSS `grid-template-columns` of the tracks, before the visible width is known (server render, hydration): fixed
 * lengths and `minmax(<minimum>px, <n>fr)`. CSS resolves it to the same widths as `computeListTracks`.
 */
export const listTrackTemplate = (tracks: readonly ListTrack[]): string =>
  tracks
    .map(track => {
      const parsed = parseTrack(track);
      return parsed.kind === 'fixed' ? `${parsed.length}px` : `minmax(${parsed.minimum}px, ${parsed.factor}fr)`;
    })
    .join(' ');

/** Track widths for one visible width. */
export interface ListTrackLayout {
  /** px per track, in track order. */
  widths: number[];
  /** Sum of the widths: the table's width, larger than the visible width when it overflows. */
  scrollWidth: number;
  /** `scrollWidth` exceeds the visible width: the table scrolls sideways inside its card. */
  overflows: boolean;
}

/**
 * Divides `availableWidth` (the visible width of the table, px) among the tracks. Fixed tracks keep their length. Share
 * tracks divide what is left by their factors; a track whose share falls below its minimum is held at the minimum and
 * the rest is divided again among the others (the CSS `fr` rule). When the minimums do not fit, every share track sits
 * at its minimum and the table overflows. Widths are whole pixels; rounding goes to the last free share track, so a
 * table that fits fills the width exactly.
 */
export const computeListTracks = (tracks: readonly ListTrack[], availableWidth: number): ListTrackLayout => {
  const available = Math.max(0, Math.floor(availableWidth));
  const parsed = tracks.map(parseTrack);
  const widths = parsed.map(track => (track.kind === 'fixed' ? track.length : track.minimum));
  const fixedTotal = parsed.reduce((sum, track) => sum + (track.kind === 'fixed' ? track.length : 0), 0);

  let free = available - fixedTotal;
  let open = parsed.flatMap((track, index) => (track.kind === 'share' ? [index] : []));
  while (open.length > 0) {
    const factors = open.reduce((sum, index) => sum + (parsed[index] as { factor: number }).factor, 0);
    const unit = free / factors;
    const held = open.filter(index => {
      const track = parsed[index] as { factor: number; minimum: number };
      return track.factor * unit < track.minimum;
    });
    if (held.length === 0) {
      let assigned = 0;
      for (const index of open) {
        const width = Math.floor((parsed[index] as { factor: number }).factor * unit);
        widths[index] = width;
        assigned += width;
      }
      const last = open[open.length - 1] as number;
      widths[last] = (widths[last] as number) + (free - assigned);
      break;
    }
    for (const index of held) free -= (parsed[index] as { minimum: number }).minimum;
    open = open.filter(index => !held.includes(index));
  }

  const scrollWidth = widths.reduce((sum, width) => sum + width, 0);
  return { widths, scrollWidth, overflows: scrollWidth > available };
};

/** One column as the pin layout sees it. */
export interface ListPinRequest {
  pin?: ListColumnPin;
  /** Pinned at the start whatever the guard says (the selection and row index columns). */
  always?: boolean;
}

/** Where a pinned column sticks: its edge and the distance (px) from that edge of the scroll area. */
export interface ListPinPlacement {
  side: ListColumnPin;
  offset: number;
  /** The innermost pinned column of its side: it draws the separating edge while content scrolls under it. */
  edge: boolean;
}

/** The measured or computed sizes the pin layout works from; `null` while unknown (before hydration). */
export interface ListPinMeasure {
  /** px per column, `null` for a column whose width is not known yet. */
  widths: readonly (number | null)[];
  visibleWidth: number | null;
  scrollWidth: number | null;
}

/**
 * The pin guard: requested start pins hold only while the table overflows by at least `LIST_PIN_MIN_OVERFLOW` and all
 * pinned columns (start, end and the always-pinned ones) take less than a third of the visible width. Otherwise the
 * columns that asked for a start pin scroll like the others.
 */
export const shouldHonourStartPins = (visibleWidth: number | null, scrollWidth: number | null, pinnedWidth: number | null): boolean => {
  if (visibleWidth === null || scrollWidth === null || pinnedWidth === null || visibleWidth <= 0) return false;
  if (scrollWidth - visibleWidth < LIST_PIN_MIN_OVERFLOW) return false;
  return pinnedWidth < visibleWidth * LIST_PIN_MAX_VISIBLE_SHARE;
};

/** The pin layout of a table: a placement per column (`null` = scrolls) and whether the start pins are honoured. */
export interface ListPinLayout {
  placements: (ListPinPlacement | null)[];
  startPinsHonoured: boolean;
}

/**
 * Places the pinned columns. Always-pinned columns and (when the guard allows) start pins stick at the start, each
 * offset by the pinned columns before it; end pins always stick at the end, offset by the end pins after them. A column
 * whose offset depends on a width not known yet is not placed (before hydration only fixed widths are known).
 */
export const resolveListPins = (columns: readonly ListPinRequest[], measure: ListPinMeasure): ListPinLayout => {
  const widthAt = (index: number): number | null => measure.widths[index] ?? null;
  const pinnedIndexes = columns.flatMap((column, index) => (column.always || column.pin ? [index] : []));
  const requestsStart = columns.some(column => !column.always && column.pin === 'start');
  let pinnedWidth: number | null = 0;
  for (const index of pinnedIndexes) {
    const width = widthAt(index);
    pinnedWidth = pinnedWidth === null || width === null ? null : pinnedWidth + width;
  }
  const startPinsHonoured = requestsStart && shouldHonourStartPins(measure.visibleWidth, measure.scrollWidth, pinnedWidth);

  const placements: (ListPinPlacement | null)[] = columns.map(() => null);
  let startOffset: number | null = 0;
  let lastStart = -1;
  columns.forEach((column, index) => {
    if (!(column.always || (column.pin === 'start' && startPinsHonoured)) || startOffset === null) return;
    placements[index] = { side: 'start', offset: startOffset, edge: false };
    lastStart = index;
    const width = widthAt(index);
    startOffset = width === null ? null : startOffset + width;
  });
  let endOffset: number | null = 0;
  let firstEnd = -1;
  for (let index = columns.length - 1; index >= 0; index -= 1) {
    const column = columns[index] as ListPinRequest;
    if (column.always || column.pin !== 'end' || endOffset === null) continue;
    placements[index] = { side: 'end', offset: endOffset, edge: false };
    firstEnd = index;
    const width = widthAt(index);
    endOffset = width === null ? null : endOffset + width;
  }
  if (lastStart !== -1) (placements[lastStart] as ListPinPlacement).edge = true;
  if (firstEnd !== -1) (placements[firstEnd] as ListPinPlacement).edge = true;
  return { placements, startPinsHonoured };
};
