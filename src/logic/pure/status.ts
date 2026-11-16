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
}

/** A status family: every value of one enum → its badge. Define it once per family and reuse it in rows, cards, details. */
export type StatusMap<TValue extends string = string> = Readonly<Record<TValue, StatusDefinition>>;

/** Typed identity helper: `defineStatusMap<Campaign['status'] & string>({ RUNNING: { … }, … })` checks completeness. */
export const defineStatusMap = <TValue extends string>(map: Record<TValue, StatusDefinition>): StatusMap<TValue> => map;
