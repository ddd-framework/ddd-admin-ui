// @translations-ignore-file — the doc examples below are not UI texts

import type { LucideIcon } from 'lucide-react';

/**
 * The status tones (one badge style per status family):
 * `neutral` not started / inactive / unknown · `info` informational or finished · `success` running / done / active ·
 * `warning` paused / pending / needs attention · `danger` failed / cancelled / blocked · `highlight` a featured flag
 * (yellow fill, e.g. "Electric") · `brand` an identity mark (cyan tint).
 */
export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'highlight' | 'brand';

/** One value of a status family: label, tone and (strongly recommended — never colour alone) an icon. */
export interface StatusDefinition {
  label: string;
  tone: StatusTone;
  icon?: LucideIcon;
  /** Hover text (e.g. what the status means). */
  description?: string;
  /**
   * Translation context of `label` and `description` (key `<text>__<context>`), for a word that means something else
   * elsewhere (`Open` as a status vs. as an action). Mark the label with the same context so text exports find the
   * key: `label: m('Failed', { context: 'import-status' })`.
   */
  context?: string;
}

/** Options of a whole status family. */
export interface StatusMapOptions {
  /** Translation context of every definition without its own `context`. */
  context?: string;
}

/** A status family: every value of one enum → its badge. Define it once per family and reuse it in rows, cards, details. */
export type StatusMap<TValue extends string = string> = Readonly<Record<TValue, StatusDefinition>>;

/**
 * Typed helper: `defineStatusMap<Item['status'] & string>({ RUNNING: { … }, … })` checks completeness. Without options
 * it returns the map itself; with a `context` every definition without its own gets it (the definition's wins):
 *
 * ```ts
 * const IMPORT_STATUS = defineStatusMap(
 *   { FAILED: { label: m('Failed', { context: 'import-status' }), tone: 'danger', icon: CircleX } },
 *   { context: 'import-status' },
 * );
 * ```
 */
export const defineStatusMap = <TValue extends string>(
  map: Record<TValue, StatusDefinition>,
  options?: StatusMapOptions
): StatusMap<TValue> => {
  const context = options?.context;
  if (!context) return map;
  const withContext = {} as Record<TValue, StatusDefinition>;
  for (const value of Object.keys(map) as TValue[]) {
    const definition = map[value];
    withContext[value] = definition.context ? definition : { ...definition, context };
  }
  return withContext;
};
