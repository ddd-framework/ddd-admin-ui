/**
 * The in-place views of one list: the same rows as a table or as a card grid. A page offers `grid` only when it
 * passes a `renderCard`.
 */
export type ListDisplayMode = 'table' | 'grid';

export const LIST_DISPLAY_MODES: readonly ListDisplayMode[] = ['table', 'grid'];

/**
 * Reads a persisted or URL value back into a mode. Anything unknown, or `grid` on a list without a card, falls back,
 * so a stale link never traps a page in a view it cannot draw. `extraModes`: the list's own views (`ListExtraView`).
 */
export const parseListDisplayMode = <TExtra extends string = never>(
  raw: string | null | undefined,
  fallback: ListDisplayMode | TExtra,
  hasGrid = true,
  extraModes: readonly TExtra[] = []
): ListDisplayMode | TExtra => {
  const modes: readonly (ListDisplayMode | TExtra)[] = [...LIST_DISPLAY_MODES, ...extraModes];
  const mode = modes.find(candidate => candidate === raw) ?? fallback;
  return mode === 'grid' && !hasGrid ? 'table' : mode;
};
