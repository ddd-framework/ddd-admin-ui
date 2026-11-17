/**
 * Value-axis ticks of the workers charts. Pure: the chart calls a `WorkerTickGenerator` with the highest value it
 * draws and puts a grid line and a label on every tick it answers (the last tick is the top of the axis).
 */

/** The ticks of a value axis from 0 to at least `maximum` (ascending; the last one is the top of the axis). */
export type WorkerTickGenerator = (maximum: number) => number[];

export interface NiceTicksOptions {
  /** Whole-number steps only (counts: no 0.25, 0.5 or 2.5 between two messages). */
  integer?: boolean;
}

const roundTick = (value: number): number => Number(value.toFixed(10));

/** Ticks from 0 in steps of `step` up to the first one at or above `maximum`. */
const ticksOfStep = (maximum: number, step: number): number[] => {
  const ticks: number[] = [];
  for (let tick = 0; tick < maximum + step * 0.999; tick += step) ticks.push(roundTick(tick));
  if ((ticks[ticks.length - 1] ?? 0) < maximum) ticks.push(roundTick(ticks.length * step));
  return ticks;
};

/**
 * Round ticks from 0 to at least `maximum` (about `count` steps of 1, 2, 2.5 or 5 times a power of ten). With
 * `integer` the steps are whole numbers of 1, 2 or 5 times a power of ten (a maximum of 1 gets the ticks 0 and 1).
 */
export const niceTicks = (maximum: number, count = 4, options: NiceTicksOptions = {}): number[] => {
  if (!(maximum > 0)) return [0, 1];
  const raw = maximum / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const factors = options.integer ? [1, 2, 5, 10] : [1, 2, 2.5, 5, 10];
  const candidate = factors.map(factor => factor * magnitude).find(step => step >= raw) ?? raw;
  const step = options.integer ? Math.max(1, Math.ceil(candidate)) : candidate;
  return ticksOfStep(maximum, step);
};

/** Whole-number ticks for counts (messages, processes): `niceTicks(maximum, 4, { integer: true })`. */
export const countTicks: WorkerTickGenerator = maximum => niceTicks(maximum, 4, { integer: true });

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;

/** Steps of a duration axis in ms: round milliseconds, seconds, minutes, hours and days. */
export const DURATION_TICK_STEPS_MS: readonly number[] = [
  1, 2, 5, 10, 20, 50, 100, 200, 250, 500,
  SECOND_MS, 2 * SECOND_MS, 5 * SECOND_MS, 10 * SECOND_MS, 15 * SECOND_MS, 30 * SECOND_MS,
  MINUTE_MS, 2 * MINUTE_MS, 5 * MINUTE_MS, 10 * MINUTE_MS, 15 * MINUTE_MS, 30 * MINUTE_MS,
  HOUR_MS, 2 * HOUR_MS, 3 * HOUR_MS, 6 * HOUR_MS, 12 * HOUR_MS, 24 * HOUR_MS,
];

/** Ticks of a duration axis (ms) on round time units (`0, 15 s, 30 s, 45 s, 1 min`), about `count` steps. */
export const durationTicks = (maximumMs: number, count = 4): number[] => {
  if (!(maximumMs > 0)) return [0, SECOND_MS];
  const raw = maximumMs / count;
  const step = DURATION_TICK_STEPS_MS.find(candidate => candidate >= raw) ?? Math.ceil(raw / (24 * HOUR_MS)) * 24 * HOUR_MS;
  return ticksOfStep(maximumMs, step);
};
