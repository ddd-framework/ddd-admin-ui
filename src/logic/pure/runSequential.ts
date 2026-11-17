import { normalizeDddError } from '@mgamadeus/ddd-web/contract';

import { translateText } from '../../i18n/store.ts';
import { notify } from './notify.ts';

export interface SequentialFailure<TKey> {
  key: TKey;
  message: string;
}

/** A key the run left alone on purpose (already in that state, not allowed for this row), with the reason code. */
export interface SequentialSkip<TKey> {
  key: TKey;
  reason?: string;
}

export interface SequentialOutcome<TKey> {
  succeeded: TKey[];
  failed: SequentialFailure<TKey>[];
  /** Keys whose run returned `skipSequential()`: neither done nor failed (always set by `runSequential`). */
  skipped?: SequentialSkip<TKey>[];
  total: number;
}

const SKIP_MARK = Symbol.for('ddd-admin-ui.sequential-skip');

/** What a run of `runSequential` returns to record its key as skipped (not done, not failed). */
export interface SequentialSkipMark {
  readonly [SKIP_MARK]: true;
  readonly reason?: string;
}

/** Return this from a run to record the key as skipped (`return skipSequential('already-active')`). */
export const skipSequential = (reason?: string): SequentialSkipMark => ({ [SKIP_MARK]: true, reason });

const isSkipMark = (value: unknown): value is SequentialSkipMark =>
  typeof value === 'object' && value !== null && SKIP_MARK in value;

/**
 * Runs one request per key, strictly one after another (the old bulk loops; never `Promise.all` — the backend and the
 * write guard see one write at a time, and the order is the list order). A failure is recorded and the loop goes on.
 */
export const runSequential = async <TKey>(
  keys: readonly TKey[],
  run: (key: TKey) => Promise<unknown>,
  onProgress?: (done: number, total: number) => void
): Promise<SequentialOutcome<TKey>> => {
  const succeeded: TKey[] = [];
  const failed: SequentialFailure<TKey>[] = [];
  const skipped: SequentialSkip<TKey>[] = [];
  for (const key of keys) {
    try {
      const result = await run(key);
      if (isSkipMark(result)) skipped.push(result.reason === undefined ? { key } : { key, reason: result.reason });
      else succeeded.push(key);
    } catch (error) {
      failed.push({ key, message: normalizeDddError(error).message });
    }
    onProgress?.(succeeded.length + failed.length + skipped.length, keys.length);
  }
  return { succeeded, failed, skipped, total: keys.length };
};

/** The counts of a bulk run, from `runSequential` or from a bulk endpoint's answer. */
export interface BulkOutcomeCounts {
  succeeded: number;
  failed: number;
  skipped: number;
  /** Default: the sum of the three. */
  total?: number;
}

/** The counts of a `runSequential` outcome. */
export const bulkOutcomeCounts = <TKey>(outcome: SequentialOutcome<TKey>): BulkOutcomeCounts => ({
  succeeded: outcome.succeeded.length,
  failed: outcome.failed.length,
  skipped: outcome.skipped?.length ?? 0,
  total: outcome.total,
});

/**
 * The skipped rows grouped by reason, one clause per reason the host labels (`{ 'already-active': n => … }`, each a
 * translated plural), the rest as "N skipped"; `''` when nothing was skipped. Reasons unknown to the host (a server
 * code added later) degrade to the plain count, never to an empty message.
 */
export const summarizeSkipReasons = (
  skipped: readonly { reason?: string | null }[],
  labels: Readonly<Record<string, (count: number) => string>> = {}
): string => {
  const counts = new Map<string, number>();
  for (const item of skipped) counts.set(item.reason ?? '', (counts.get(item.reason ?? '') ?? 0) + 1);
  const clauses: string[] = [];
  let unlabelled = 0;
  for (const [reason, count] of counts) {
    const label = labels[reason];
    if (label) clauses.push(label(count));
    else unlabelled += count;
  }
  if (unlabelled > 0) clauses.push(translateText('%count% skipped', { replacements: { count: unlabelled } }));
  return clauses.join(', ');
};

export interface SequentialSummaryLabels {
  /** `Deleting` — the progress toast reads `Deleting tracks… 2/5`. */
  progress: string;
  /** `Deleted` — the summary reads `Deleted 5 tracks` / `Deleted 3 of 5 tracks · 2 failed`. */
  done: string;
  /** Singular noun (`track`). */
  noun: string;
  /** Plural noun, default `noun + 's'`. */
  nounPlural?: string;
  /** Clauses per skip reason for the summary (see `summarizeSkipReasons`); without them: "N skipped". */
  skipReasons?: Readonly<Record<string, (count: number) => string>>;
}

const countNoun = (count: number, labels: SequentialSummaryLabels) =>
  count === 1 ? labels.noun : (labels.nounPlural ?? `${labels.noun}s`);

/**
 * `runSequential` with the standard toasts: one progress toast that counts up, replaced by the summary (success when
 * every call passed, an error with the first failure's message otherwise). Returns the outcome for follow-ups (clear
 * the selection, refetch, a result dialog).
 */
export const runSequentialWithSummary = async <TKey>(
  keys: readonly TKey[],
  run: (key: TKey) => Promise<unknown>,
  labels: SequentialSummaryLabels
): Promise<SequentialOutcome<TKey>> => {
  const total = keys.length;
  const plural = countNoun(2, labels);
  const toastId = notify.loading(
    translateText('%progress% %nouns%… %done%/%total%', { replacements: { progress: labels.progress, nouns: plural, done: 0, total } })
  );
  const outcome = await runSequential(keys, run, done => {
    notify.loading(
      translateText('%progress% %nouns%… %done%/%total%', { replacements: { progress: labels.progress, nouns: plural, done, total } }),
      { id: toastId }
    );
  });

  const message = bulkSummaryText(bulkOutcomeCounts(outcome), labels, labels.skipReasons ? summarizeSkipReasons(outcome.skipped ?? [], labels.skipReasons) : undefined);
  if (outcome.failed.length === 0) notify.success(message, { id: toastId });
  else notify.error(message, { id: toastId, description: outcome.failed[0]?.message, duration: 8000 });
  return outcome;
};

/**
 * The summary line of a bulk run: `Deleted 5 tracks`, `Deleted 3 of 5 tracks · 2 failed`, `Deleted 3 of 5 tracks · 2
 * skipped`, `Deleted 2 of 5 tracks · 1 failed · 2 skipped`. `skipText` replaces the "N skipped" clause (e.g.
 * `summarizeSkipReasons`). For a bulk endpoint's answer as well (`notify.success(bulkSummaryText(…))`).
 */
export const bulkSummaryText = (counts: BulkOutcomeCounts, labels: SequentialSummaryLabels, skipText?: string): string => {
  const { succeeded, failed, skipped } = counts;
  const total = counts.total ?? succeeded + failed + skipped;
  if (failed === 0 && skipped === 0) {
    return translateText('%done% %count% %noun%', { replacements: { done: labels.done, count: succeeded, noun: countNoun(succeeded, labels) } });
  }
  const replacements = { done: labels.done, succeeded, total, noun: countNoun(total, labels), failed, skipped };
  const head =
    failed > 0
      ? translateText('%done% %succeeded% of %total% %noun% · %failed% failed', { replacements })
      : translateText('%done% %succeeded% of %total% %noun%', { replacements });
  if (skipped === 0) return head;
  return `${head} · ${skipText || translateText('%count% skipped', { replacements: { count: skipped } })}`;
};
