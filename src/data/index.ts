// Key figures: tiles with a change and a sparkline slot, their grid, footnotes, and the delta helpers.
export { DeltaText, type DeltaTextProps } from './DeltaText.tsx';
export {
  type DeltaDirection,
  type DeltaFormat,
  type DeltaPreference,
  type DeltaTone,
  deltaDirectionOf,
  deltaToneOf,
  relativeChange,
  type ResolvedDelta,
  resolveDelta,
} from './delta.ts';
export { MetricGrid, type MetricGridProps } from './MetricGrid.tsx';
export { MetricTile, type MetricTileProps, MetricTileSkeleton } from './MetricTile.tsx';
export { type NoteItem, NoteList, type NoteListProps, type NoteTone } from './NoteList.tsx';
