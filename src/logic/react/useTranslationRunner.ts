'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useTranslate } from '../../i18n/useTranslate.ts';

export type TranslationTaskStatus = 'pending' | 'running' | 'done' | 'failed' | 'cancelled';

export interface TranslationTaskProgress {
  locale: string;
  status: TranslationTaskStatus;
  error?: string;
}

export interface TranslationRunResult {
  failed: number;
  cancelled: boolean;
}

export interface TranslationRunner {
  /** Runs `task` once per locale, at most `concurrency` at a time; each result is applied by the task itself. */
  run: (locales: readonly string[], task: (locale: string, signal: AbortSignal) => Promise<void>) => Promise<TranslationRunResult>;
  /** Aborts the requests in flight and skips the pending locales. */
  cancel: () => void;
  /** Clears the finished progress list. */
  dismiss: () => void;
  progress: TranslationTaskProgress[];
  isRunning: boolean;
}

const messageOf = (error: unknown, fallback: string): string => (error instanceof Error ? error.message : fallback);

/**
 * One request per target locale instead of all locales in one POST (a long entity × many locales in one call runs
 * into gateway timeouts). Results land progressively;
 * a failed locale does not stop the others.
 */
export const useTranslationRunner = (concurrency = 3): TranslationRunner => {
  const { t } = useTranslate();
  const [progress, setProgress] = useState<TranslationTaskProgress[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const update = useCallback((locale: string, patch: Partial<TranslationTaskProgress>) => {
    setProgress(previous => previous.map(item => (item.locale === locale ? { ...item, ...patch } : item)));
  }, []);

  const run = useCallback<TranslationRunner['run']>(
    async (locales, task) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setProgress(locales.map(locale => ({ locale, status: 'pending' })));
      setIsRunning(true);

      let failed = 0;
      const queue = [...locales];
      const worker = async () => {
        for (let locale = queue.shift(); locale !== undefined; locale = queue.shift()) {
          if (controller.signal.aborted) {
            update(locale, { status: 'cancelled' });
            continue;
          }
          update(locale, { status: 'running' });
          try {
            await task(locale, controller.signal);
            update(locale, { status: 'done' });
          } catch (error) {
            if (controller.signal.aborted) {
              update(locale, { status: 'cancelled' });
            } else {
              failed += 1;
              update(locale, { status: 'failed', error: messageOf(error, t('Translation failed')) });
            }
          }
        }
      };
      await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, locales.length)) }, worker));
      setIsRunning(false);
      return { failed, cancelled: controller.signal.aborted };
    },
    [concurrency, update, t]
  );

  const cancel = useCallback(() => controllerRef.current?.abort(), []);
  const dismiss = useCallback(() => setProgress([]), []);

  return { run, cancel, dismiss, progress, isRunning };
};
