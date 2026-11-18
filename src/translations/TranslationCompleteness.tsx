'use client';

import { normalizeDddError } from '@mgamadeus/ddd-web/contract';
import { useMemo, useState } from 'react';

import { useTranslate } from '../i18n/useTranslate.ts';
import { notify } from '../logic/pure/notify.ts';
import { useConfirm } from '../logic/react/useConfirm.ts';
import { useWriteAccess } from '../logic/react/writeAccess.ts';
import { Button } from '../primitives/button.tsx';
import { cn } from '../primitives/cn.ts';
import { Skeleton } from '../primitives/skeleton.tsx';
import type { AppTranslationCompleteness, AppTranslationWritingStyle } from './adminTypes.ts';
import { completenessPercent, supportedWritingStylesOf, writingStyleLabel } from './adminFormat.ts';
import type { TranslationsApi } from './api.ts';
import { APP_TRANSLATIONS_LANGUAGES_ARG } from './appTranslationsList.ts';
import {
  type AppTranslationsGenerationEstimateRenderer,
  type AppTranslationsGenerationPreviewLoader,
  type AppTranslationsGenerationScope,
  GenerationEstimate,
  startGenerationPreview,
} from './GenerationEstimate.tsx';

const barClass = (percent: number) => (percent >= 90 ? 'bg-success' : percent >= 50 ? 'bg-warning' : 'bg-destructive');

const CompletenessBar = ({ label, count, total }: { label: string; count: number; total: number }) => {
  const percent = completenessPercent(count, total);
  return (
    <div className="flex items-center gap-1.5" title={`${label}: ${count}/${total}`}>
      <span className="w-14 shrink-0 text-[10px] text-muted-foreground">{label}</span>
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div className={cn('h-full rounded-full', barClass(percent))} style={{ width: `${percent}%` }} />
      </div>
      <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
        {count}/{total}
      </span>
    </div>
  );
};

const localeCode = (completeness: AppTranslationCompleteness): string =>
  [completeness.locale?.languageCode, completeness.locale?.countryShortCode].filter(Boolean).join('-');

export interface TranslationCompletenessProps {
  api: TranslationsApi;
  /**
   * Asks the cost estimate first (`previewOnly`: the missing keys and the AI requests) and generates only after a
   * confirmation (default true); false generates on the click, as before.
   */
  confirmGeneration?: boolean;
  /**
   * Loads the host's estimate of a generation when its confirmation opens (`{ kind: 'locale', localeId, writingStyle,
   * locale }`); the answer goes to `renderGenerationEstimate`. Without it the renderer gets the package's estimate.
   */
  loadGenerationPreview?: AppTranslationsGenerationPreviewLoader;
  /** Host content in the confirmation, below the package's text (a skeleton while `loadGenerationPreview` loads). */
  renderGenerationEstimate?: AppTranslationsGenerationEstimateRenderer;
}

/**
 * Translation completeness per active locale: informal and formal bars with translated / total counts, and a button
 * per missing style the locale's language supports that AI-generates the missing values of that locale and style
 * (asynchronous on the backend), after a cost estimate and a confirmation. One generation at a time; the buttons follow
 * `WriteAccessProvider`. Nothing without an active locale.
 */
export const TranslationCompleteness = ({ api, confirmGeneration = true, loadGenerationPreview, renderGenerationEstimate }: TranslationCompletenessProps) => {
  const { t } = useTranslate();
  const writeAccess = useWriteAccess();
  const confirm = useConfirm();
  const query = api.useAppTranslationCompletenessQuery(undefined);
  const languagesQuery = api.useLanguagesQuery(APP_TRANSLATIONS_LANGUAGES_ARG);
  const languageByCode = useMemo(
    () => new Map((languagesQuery.data?.languages.elements ?? []).map(language => [language.languageCode ?? '', language])),
    [languagesQuery.data]
  );
  const [generate] = api.useGenerateAppTranslationsMutation();
  const [generatingKey, setGeneratingKey] = useState<string | null>(null);

  const handleGenerate = async (completeness: AppTranslationCompleteness, writingStyle: AppTranslationWritingStyle) => {
    const localeId = completeness.locale?.id;
    if (!writeAccess.allowed || generatingKey !== null || localeId === null || localeId === undefined) return;
    setGeneratingKey(`${localeId}-${writingStyle}`);
    const locale = localeCode(completeness);
    const style = t(writingStyleLabel(writingStyle));
    try {
      if (confirmGeneration) {
        const scope: AppTranslationsGenerationScope = { kind: 'locale', localeId, writingStyle, locale };
        // the host's estimate starts with the package's, so both load at once
        const hostPreview =
          renderGenerationEstimate && loadGenerationPreview ? startGenerationPreview(() => loadGenerationPreview(scope)) : null;
        const previewResponse = await generate({ localeId, writingStyle, previewOnly: true }).unwrap();
        const preview = previewResponse.appTranslationsResult;
        const keys = preview?.translatedKeysCount ?? null;
        const apiCalls = preview?.apiCalls ?? null;
        const text = [
          keys === null ? t('The number of missing keys is not known.') : t('{count, plural, one {# key is missing.} other {# keys are missing.}}', { count: keys }),
          apiCalls === null ? null : t('{count, plural, one {About # AI request.} other {About # AI requests.}}', { count: apiCalls }),
          t('The generation runs in the background.'),
        ]
          .filter(Boolean)
          .join(' ');
        const confirmed = await confirm({
          title: t('Generate the missing %style% values for %locale%?', { replacements: { style, locale } }),
          description: renderGenerationEstimate ? (
            <div>
              <p>{text}</p>
              <GenerationEstimate preview={hostPreview ?? Promise.resolve(previewResponse)} scope={scope} render={renderGenerationEstimate} />
            </div>
          ) : (
            text
          ),
          confirmLabel: t('Generate', { context: 'action' }),
        });
        if (!confirmed) return;
      }
      const data = await generate({ localeId, writingStyle }).unwrap();
      const count = data.appTranslationsResult?.translatedKeysCount;
      notify.success(
        count !== null && count !== undefined
          ? t('{count, plural, one {Generation started for %locale% (%style%): # key} other {Generation started for %locale% (%style%): # keys}}', {
              count,
              replacements: { locale, style },
            })
          : t('Generation started for %locale% (%style%)', { replacements: { locale, style } })
      );
    } catch (error) {
      notify.error(normalizeDddError(error, t('Failed to generate translations')).message);
    } finally {
      setGeneratingKey(null);
    }
  };

  if (query.isLoading) {
    return (
      <div className="flex flex-wrap gap-2" role="status" aria-label={t('Loading completeness')}>
        {[0, 1, 2, 3].map(index => (
          <Skeleton key={index} className="h-16 w-44 rounded-lg" />
        ))}
      </div>
    );
  }
  const elements = query.data?.appTranslationCompletenesses.elements ?? [];
  if (elements.length === 0) return null;

  return (
    <section data-slot="translation-completeness">
      <h2 className="mb-1.5 text-xs font-semibold text-muted-foreground">{t('Translation completeness')}</h2>
      <ul className="flex flex-wrap gap-2">
        {elements.map(completeness => {
          const total = completeness.totalKeys ?? 0;
          const informal = completeness.informalTranslatedCount ?? 0;
          const formal = completeness.formalTranslatedCount ?? 0;
          const localeId = completeness.locale?.id;
          const code = localeCode(completeness);
          const supported = supportedWritingStylesOf(languageByCode.get(completeness.locale?.languageCode ?? ''));
          const missing: AppTranslationWritingStyle[] = [
            ...(informal < total ? (['INFORMAL'] as const) : []),
            ...(formal < total ? (['FORMAL'] as const) : []),
          ].filter(style => supported.includes(style));
          return (
            <li key={code || String(localeId)} className="surface w-44 rounded-xl px-2.5 py-2">
              <div className="mb-1.5 text-[11px] font-semibold uppercase">{code}</div>
              <div className="space-y-1">
                <CompletenessBar label={t('Informal')} count={informal} total={total} />
                <CompletenessBar label={t('Formal')} count={formal} total={total} />
              </div>
              {missing.length > 0 && localeId !== null && localeId !== undefined && (
                <div className="mt-1.5 flex gap-1">
                  {missing.map(style => {
                    const label =
                      style === 'INFORMAL'
                        ? t('Generate missing informal translations for %locale%', { replacements: { locale: code } })
                        : t('Generate missing formal translations for %locale%', { replacements: { locale: code } });
                    return (
                      <Button
                        key={style}
                        type="button"
                        variant="outline"
                        size="xs"
                        className="flex-1"
                        onClick={() => void handleGenerate(completeness, style)}
                        disabled={!writeAccess.allowed || generatingKey !== null}
                        title={writeAccess.allowed ? label : writeAccess.reason}
                        aria-label={label}
                      >
                        {generatingKey === `${localeId}-${style}` ? '…' : style === 'INFORMAL' ? t('Informal') : t('Formal')}
                      </Button>
                    );
                  })}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};
