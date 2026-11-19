'use client';

import { Check, CircleAlert, Languages, Loader2 } from 'lucide-react';

import { Badge, Button, Label } from '../primitives/index.ts';
import { cn } from '../primitives/cn.ts';
import type { TranslatableLocale } from '../logic/pure/locales.ts';
import { useLocaleName } from '../logic/react/useLocaleName.ts';
import {
  type BackgroundTranslationFailure,
  type BackgroundTranslationRow,
  type BackgroundTranslationStatus,
  isOpenTranslationRow,
  translationLanguageCodeOf,
} from '../logic/pure/backgroundTranslation.ts';
import { m, useTranslate } from '../i18n/index.ts';
import { markerCountOf, TranslationChipMarker, TranslationMarkerSummary } from './translationMarkers.tsx';

export interface BackgroundTranslationControlsProps {
  /** Every tab of the form; the default locale is the source and never a target. */
  locales: readonly TranslatableLocale[];
  defaultLocale: string;
  /** Target locales picked for "Translate". */
  selected: readonly string[];
  onSelectedChange: (keys: string[]) => void;
  /** Starts the translation: the host saves the form when it has changes (`isDirty`), then queues the picked locales. */
  onTranslate: () => void;
  /**
   * The progress rows the host reads from the server (one per language, e.g. `translationProgressRowsOf(parts)` of the
   * watched runs). The control keeps no progress of its own and offers no cancel: a queued translation runs on.
   */
  rows: readonly BackgroundTranslationRow[];
  /** A row still waits or runs (default: derived from `rows`); "Dismiss" is offered only when nothing runs. */
  isRunning?: boolean;
  /** The queue request or the save before it is on its way: the button spins, the chips and the button are disabled. */
  isBusy?: boolean;
  /** Hides the ended rows (the host drops them); without it no "Dismiss" button. */
  onDismiss?: () => void;
  /** The form has unsaved changes: the button reads "Save and translate" (the server translates the stored texts). */
  isDirty?: boolean;
  disabled?: boolean;
  /** Why translating is not possible (an unsaved record, …), shown under the chips. */
  disabledReason?: string;
  /**
   * A count per target, by full key (`fr::FORMAL`) or bare language (`fr`): drawn on the chip with an icon and listed
   * in the summary line (e.g. texts whose source changed after their translation). Absent or `0`: no marker.
   */
  localeMarkers?: Readonly<Record<string, number>>;
  /** What a marker means (screen-reader text of the chip's marker); default "Source changed after the translation". */
  markerLabel?: string;
  /** The start of the summary line; default "The source text changed after the translation:". `null`: no summary line. */
  markerSummaryLabel?: string | null;
  /** Words for the failure reasons of the host's server (merged over the package's; an unknown reason reads as `OTHER`). */
  failureReasonLabels?: Readonly<Record<string, string>>;
  className?: string;
}

/** Status words of one language (the same texts and context as `TranslationControls`). */
const STATUS_CONTEXT = 'translation-status';
const STATUS_LABEL: Record<BackgroundTranslationStatus, string> = {
  pending: m('Waiting', { context: 'translation-status' }),
  running: m('Translating', { context: 'translation-status' }),
  done: m('Done', { context: 'translation-status' }),
  failed: m('Failed', { context: 'translation-status' }),
};

/** Why texts of a language were not translated (a server's reason codes). */
const FAILURE_CONTEXT = 'translation-failure';
const FAILURE_REASON_LABEL: Record<string, string> = {
  PROVIDER_ERROR: m('The translation service did not answer', { context: 'translation-failure' }),
  INCOMPLETE_ANSWER: m('The translation service left texts out', { context: 'translation-failure' }),
  BUDGET_EXCEEDED: m('The AI budget is used up', { context: 'translation-failure' }),
  SOURCE_MISSING: m('The source text is gone', { context: 'translation-failure' }),
  STALLED: m('The translation got stuck', { context: 'translation-failure' }),
  OTHER: m('The translation failed', { context: 'translation-failure' }),
};

const BADGE_VARIANT: Record<BackgroundTranslationStatus, 'success' | 'destructive' | 'secondary'> = {
  pending: 'secondary',
  running: 'secondary',
  done: 'success',
  failed: 'destructive',
};

/**
 * "Translate to" of a form whose texts the server translates in the background: the target chips (with an optional
 * marker per locale and a summary line), the start button ("Save and translate" while the form is dirty), one progress
 * row per language from the host's rows (waiting, translating, done, failed with reason and detail) and an optional
 * "Dismiss". No cancel. The texts land on the server: the form rebases on the reloaded record
 * (`useEntityTranslations().rebase`) and saves in delta mode, so they are never overwritten.
 */
export const BackgroundTranslationControls = ({
  locales,
  defaultLocale,
  selected,
  onSelectedChange,
  onTranslate,
  rows,
  isRunning,
  isBusy = false,
  onDismiss,
  isDirty = false,
  disabled = false,
  disabledReason,
  localeMarkers,
  markerLabel,
  markerSummaryLabel,
  failureReasonLabels,
  className,
}: BackgroundTranslationControlsProps) => {
  const { t } = useTranslate();
  const localeName = useLocaleName();
  const targets = locales.filter(locale => locale.key !== defaultLocale);
  const running = isRunning ?? rows.some(isOpenTranslationRow);
  const toggle = (key: string) =>
    onSelectedChange(selected.includes(key) ? selected.filter(item => item !== key) : [...selected, key]);
  const chipMarkerLabel = markerLabel ?? t('Source changed after the translation');
  const summaryLabel = markerSummaryLabel === undefined ? t('The source text changed after the translation:') : markerSummaryLabel;
  const failedRows = rows.filter(row => row.status === 'failed');

  const rowLabel = (row: BackgroundTranslationRow): string => {
    const exact = locales.find(locale => locale.key === row.locale);
    if (exact) return exact.label;
    return translationLanguageCodeOf(row.locale).toUpperCase() || row.locale;
  };
  const failureText = (failure: BackgroundTranslationFailure): string => {
    const own = failureReasonLabels?.[failure.reason];
    const reason = own ?? t(FAILURE_REASON_LABEL[failure.reason] ?? FAILURE_REASON_LABEL.OTHER ?? '', { context: FAILURE_CONTEXT });
    const properties = failure.propertyNames.length > 0 ? ` (${failure.propertyNames.join(', ')})` : '';
    return failure.detail ? `${reason}${properties}: ${failure.detail}` : `${reason}${properties}`;
  };

  return (
    <div className={cn('space-y-3 rounded-lg border bg-muted/30 p-3', className)} data-slot="background-translation-controls">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>{t('Translate to')}</Label>
        <div className="flex min-w-0 flex-wrap gap-2">
          {onDismiss && !running && rows.length > 0 && (
            <Button type="button" variant="outline" size="sm" onClick={onDismiss}>
              {t('Dismiss')}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onTranslate}
            disabled={disabled || isBusy || selected.length === 0}
            // In a narrow column the label wraps instead of pushing the button out of the box.
            className="h-auto min-h-8 max-w-full py-1.5 text-left whitespace-normal"
          >
            {isBusy ? <Loader2 className="animate-spin" aria-hidden /> : <Languages aria-hidden />}
            {isDirty ? t('Save and translate') : t('Translate to selected locales')}
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {targets.map(locale => {
          const isSelected = selected.includes(locale.key);
          const count = markerCountOf(localeMarkers, locale.key);
          return (
            <button
              key={locale.key}
              type="button"
              aria-pressed={isSelected}
              disabled={isBusy}
              onClick={() => toggle(locale.key)}
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-50',
                isSelected ? 'bg-secondary text-secondary-foreground ring-1 ring-ring' : 'bg-muted text-muted-foreground'
              )}
            >
              <span aria-hidden>{locale.label}</span>
              <span className="sr-only">{localeName(locale.key)}</span>
              {count > 0 && <TranslationChipMarker count={count} label={chipMarkerLabel} />}
            </button>
          );
        })}
      </div>
      {summaryLabel !== null && <TranslationMarkerSummary targets={targets} markers={localeMarkers} label={summaryLabel} />}
      {rows.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-live="polite">
          {rows.map(row => (
            <li key={row.locale} data-translation-status={row.status}>
              <Badge variant={BADGE_VARIANT[row.status]}>
                {row.status === 'running' && <Loader2 className="animate-spin" aria-hidden />}
                {row.status === 'done' && <Check aria-hidden />}
                {row.status === 'failed' && <CircleAlert aria-hidden />}
                {rowLabel(row)} · {t(STATUS_LABEL[row.status], { context: STATUS_CONTEXT })}
              </Badge>
            </li>
          ))}
        </ul>
      )}
      {failedRows.length > 0 && (
        <ul className="grid gap-1 text-xs text-destructive" aria-live="polite">
          {failedRows.flatMap(row =>
            row.failures.map(failure => (
              <li key={`${row.locale}-${failure.reason}-${failure.propertyNames.join(',')}-${failure.detail ?? ''}`}>
                <span className="font-semibold">{rowLabel(row)}</span> · {failureText(failure)}
              </li>
            ))
          )}
        </ul>
      )}
      {disabledReason && <p className="text-xs text-muted-foreground">{disabledReason}</p>}
    </div>
  );
};
