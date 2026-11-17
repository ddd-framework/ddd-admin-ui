/**
 * Length limits of text fields, counted in Unicode code points (an emoji or an accented letter typed as one character
 * counts once, as the backend's `mb_strlen` does), never cut: a field over its limit is marked and its value kept.
 */

/** Code points of `text` (`'é'` and `'😀'` count 1). */
export const countCodePoints = (text: string): number => {
  let count = 0;
  for (const _ of text) count += 1;
  return count;
};

/** How a field counts its text (default `countCodePoints`; a host may count UTF-16 units or graphemes). */
export type TextCounter = (text: string) => number;

/** The kinds of text field a host sets default limits for. */
export interface TextLimits {
  /** Single-line inputs. */
  singleLine?: number;
  /** Text areas and markdown. */
  multiline?: number;
}

/** The keys of a translations map whose text is longer than `limit` (in the map's order); none without a limit. */
export const overLimitKeys = (
  value: Readonly<Record<string, string>>,
  limit: number | undefined,
  count: TextCounter = countCodePoints
): string[] => (limit === undefined ? [] : Object.entries(value).filter(([, text]) => count(text) > limit).map(([key]) => key));
