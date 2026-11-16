import { normalizeDddError } from '@mgamadeus/ddd-web/contract';

import { translateText } from '../../i18n/store.ts';
import { notify } from './notify.ts';

export interface SequentialFailure<TKey> {
  key: TKey;
  message: string;
}

export interface SequentialOutcome<TKey> {
  succeeded: TKey[];
  failed: SequentialFailure<TKey>[];
  total: number;
}

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
  for (const key of keys) {
    try {
      await run(key);
      succeeded.push(key);
    } catch (error) {
      failed.push({ key, message: normalizeDddError(error).message });
    }
    onProgress?.(succeeded.length + failed.length, keys.length);
  }
  return { succeeded, failed, total: keys.length };
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

  const succeeded = outcome.succeeded.length;
  if (outcome.failed.length === 0) {
    notify.success(
      translateText('%done% %count% %noun%', { replacements: { done: labels.done, count: succeeded, noun: countNoun(succeeded, labels) } }),
      { id: toastId }
    );
  } else {
    notify.error(
      translateText('%done% %succeeded% of %total% %noun% · %failed% failed', {
        replacements: { done: labels.done, succeeded, total, noun: countNoun(total, labels), failed: outcome.failed.length },
      }),
      { id: toastId, description: outcome.failed[0]?.message, duration: 8000 }
    );
  }
  return outcome;
};
