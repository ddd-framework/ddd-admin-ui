import { formatUiNumber } from '../i18n/format.ts';

/** Which way a change goes. `flat`: exactly no change. */
export type DeltaDirection = 'up' | 'down' | 'flat';

/** Whether a change is good: `positive` / `negative`; `neutral` for no change or when no side is better. */
export type DeltaTone = 'positive' | 'negative' | 'neutral';

/**
 * How a change is read: `higher` (default) — up is good; `lower` — down is good (costs, errors, durations);
 * `none` — neither side is better (the tone stays neutral, the arrow still shows the direction).
 */
export type DeltaPreference = 'higher' | 'lower' | 'none';

/**
 * How the number is written: `number` (`+12`), `percent` (the value is a fraction: `0.12` → `+12 %`) or explicit
 * `Intl.NumberFormatOptions` (e.g. a currency, always with its code). The sign is always written (`signDisplay`
 * `exceptZero` unless the options say otherwise).
 */
export type DeltaFormat = 'number' | 'percent' | Intl.NumberFormatOptions;

export interface ResolvedDelta {
  direction: DeltaDirection;
  tone: DeltaTone;
  /** The signed number in the UI language, e.g. `+12 %`. */
  text: string;
}

const formatOptionsOf = (format: DeltaFormat): Intl.NumberFormatOptions => {
  if (format === 'percent') return { style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' };
  if (format === 'number') return { maximumFractionDigits: 2, signDisplay: 'exceptZero' };
  return { signDisplay: 'exceptZero', ...format };
};

/** Direction of a change; values within `epsilon` of zero (default 0) count as no change. */
export const deltaDirectionOf = (change: number, epsilon = 0): DeltaDirection =>
  Math.abs(change) <= epsilon ? 'flat' : change > 0 ? 'up' : 'down';

/** Tone of a direction under a preference. */
export const deltaToneOf = (direction: DeltaDirection, preference: DeltaPreference = 'higher'): DeltaTone => {
  if (direction === 'flat' || preference === 'none') return 'neutral';
  const good = preference === 'higher' ? 'up' : 'down';
  return direction === good ? 'positive' : 'negative';
};

/**
 * A change resolved for display: direction, tone and the signed text in the UI language. Call at render time (the
 * text follows the active UI language).
 */
export const resolveDelta = (
  change: number,
  options: { preference?: DeltaPreference; format?: DeltaFormat; epsilon?: number } = {}
): ResolvedDelta => {
  const direction = deltaDirectionOf(change, options.epsilon);
  return {
    direction,
    tone: deltaToneOf(direction, options.preference),
    text: formatUiNumber(direction === 'flat' ? 0 : change, formatOptionsOf(options.format ?? 'number')),
  };
};

/**
 * The relative change from `previous` to `current` as a fraction (`0.25` = +25 %), for `format: 'percent'`.
 * `null` when there is no base to compare against (`previous` is 0, missing or not finite).
 */
export const relativeChange = (current: number, previous: number | null | undefined): number | null => {
  if (previous === null || previous === undefined || !Number.isFinite(previous) || !Number.isFinite(current) || previous === 0) {
    return null;
  }
  return (current - previous) / Math.abs(previous);
};
