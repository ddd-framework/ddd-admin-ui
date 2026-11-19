'use client';

import { normalizeDddError } from '@mgamadeus/ddd-web/contract';
import { type ReactNode, useEffect, useState } from 'react';

import { useTranslate } from '../i18n/useTranslate.ts';
import { Skeleton } from '../primitives/skeleton.tsx';
import type { AppTranslationWritingStyle } from './adminTypes.ts';

/**
 * What a generation covers, as the confirmation before it asks the host (`loadGenerationPreview(scope)`,
 * `renderGenerationEstimate(preview, scope)`): one locale and writing style (the completeness block), or every missing
 * value (`Generate all missing`).
 */
export type AppTranslationsGenerationScope =
  | {
      kind: 'locale';
      localeId: string | number;
      writingStyle: AppTranslationWritingStyle;
      /** The locale as the block shows it (`de-AT`). */
      locale: string;
    }
  | { kind: 'all' };

/** Loads the host's estimate of a generation (any shape: it goes to `renderGenerationEstimate` as it is). */
export type AppTranslationsGenerationPreviewLoader = (scope: AppTranslationsGenerationScope) => Promise<unknown>;

/**
 * Draws the host's estimate inside the confirmation. `preview` is the answer of `loadGenerationPreview`; without a
 * loader the package's own estimate (`AppTranslationsGenerateResponse` of the `previewOnly` request) for a locale, and
 * `undefined` for every missing value.
 */
export type AppTranslationsGenerationEstimateRenderer = (preview: unknown, scope: AppTranslationsGenerationScope) => ReactNode;

/** A started load whose rejection is caught right away (the confirmation may close before it settles). */
export const startGenerationPreview = (load: () => Promise<unknown>): Promise<unknown> => {
  let started: Promise<unknown>;
  try {
    started = Promise.resolve(load());
  } catch (error) {
    started = Promise.reject(error);
  }
  started.catch(() => undefined);
  return started;
};

/**
 * Whether the renderer has nothing to show for a generation: it answers `null` for the settled preview. A failed load is
 * never empty (the confirmation shows the error). Used by `confirmGenerateAll="auto"` before the dialog opens.
 */
export const isGenerationEstimateEmpty = async (
  preview: Promise<unknown>,
  scope: AppTranslationsGenerationScope,
  render: AppTranslationsGenerationEstimateRenderer
): Promise<boolean> => {
  try {
    return render(await preview, scope) === null;
  } catch {
    return false;
  }
};

type EstimateState = { status: 'loading' } | { status: 'ready'; preview: unknown } | { status: 'error'; error: unknown };

export interface GenerationEstimateProps {
  /** The started load (`startGenerationPreview`). */
  preview: Promise<unknown>;
  scope: AppTranslationsGenerationScope;
  render: AppTranslationsGenerationEstimateRenderer;
}

/** The host's estimate in the confirmation dialog: a skeleton while it loads, the error when it fails, else `render`. */
export const GenerationEstimate = ({ preview, scope, render }: GenerationEstimateProps) => {
  const { t } = useTranslate();
  const [state, setState] = useState<EstimateState>({ status: 'loading' });
  useEffect(() => {
    let current = true;
    setState({ status: 'loading' });
    preview.then(
      answer => {
        if (current) setState({ status: 'ready', preview: answer });
      },
      error => {
        if (current) setState({ status: 'error', error });
      }
    );
    return () => {
      current = false;
    };
  }, [preview]);

  return (
    <div className="mt-3" data-slot="translation-generation-estimate" data-state={state.status} aria-live="polite">
      {state.status === 'loading' ? (
        <div role="status" aria-label={t('Loading the estimate')} className="space-y-1.5">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : state.status === 'error' ? (
        <p role="alert" className="text-sm text-destructive">
          {normalizeDddError(state.error, t('The estimate could not be loaded.')).message}
        </p>
      ) : (
        render(state.preview, scope)
      )}
    </div>
  );
};
