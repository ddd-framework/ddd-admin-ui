'use client';

import { Check, CircleAlert, Languages, Loader2, X } from 'lucide-react';

import { Badge, Button, Label } from '../primitives/index.ts';
import { cn } from '../primitives/cn.ts';
import type { TranslatableLocale } from '../logic/pure/locales.ts';
import { useLocaleName } from '../logic/react/useLocaleName.ts';
import { m, useTranslate } from '../i18n/index.ts';
import type { TranslationTaskProgress } from '../logic/react/useTranslationRunner.ts';
import { markerCountOf, TranslationChipMarker, TranslationMarkerSummary } from './translationMarkers.tsx';

export interface TranslationControlsProps {
  /** Every tab of the form; the default locale is the source and never a target. */
  locales: TranslatableLocale[];
  defaultLocale: string;
  /** Target locales picked for "Translate". */
  selected: readonly string[];
  onSelectedChange: (keys: string[]) => void;
  onTranslate: () => void;
  onCancel: () => void;
  onDismiss: () => void;
  progress: TranslationTaskProgress[];
  isRunning: boolean;
  disabled?: boolean;
  /** The form has unsaved changes: the button reads "Save and translate" (for a host that saves before it translates). */
  isDirty?: boolean;
  /**
   * A count per target, by full key (`fr::FORMAL`) or bare language (`fr`): drawn on the chip with an icon and listed
   * in a summary line (e.g. texts whose source changed after their translation). Absent or `0`: no marker.
   */
  localeMarkers?: Readonly<Record<string, number>>;
  /** What a marker means (screen-reader text of the chip's marker); default "Source changed after the translation". */
  markerLabel?: string;
  /** The start of the summary line; default "The source text changed after the translation:". `null`: no summary line. */
  markerSummaryLabel?: string | null;
}

/** Status words of one locale's translation task (context `translation-status`: `Done` here is no button). */
const STATUS_CONTEXT = 'translation-status';
const STATUS_LABEL: Record<TranslationTaskProgress['status'], string> = {
  pending: m('Waiting', { context: 'translation-status' }),
  running: m('Translating', { context: 'translation-status' }),
  done: m('Done', { context: 'translation-status' }),
  failed: m('Failed', { context: 'translation-status' }),
  cancelled: m('Cancelled', { context: 'translation-status' }),
};

/**
 * The AI-translation slot of a translatable form: pick target locales, translate them one request per locale, watch the progress,
 * cancel or dismiss it. Render it only when the app enables AI translation.
 */
export const TranslationControls = ({
  locales,
  defaultLocale,
  selected,
  onSelectedChange,
  onTranslate,
  onCancel,
  onDismiss,
  progress,
  isRunning,
  disabled = false,
  isDirty = false,
  localeMarkers,
  markerLabel,
  markerSummaryLabel,
}: TranslationControlsProps) => {
  const { t } = useTranslate();
  const localeName = useLocaleName();
  const targets = locales.filter(locale => locale.key !== defaultLocale);
  const toggle = (key: string) =>
    onSelectedChange(selected.includes(key) ? selected.filter(item => item !== key) : [...selected, key]);

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>{t('Translate to')}</Label>
        <div className="flex min-w-0 flex-wrap gap-2">
          {isRunning ? (
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              <X aria-hidden />
              {t('Cancel')}
            </Button>
          ) : (
            progress.length > 0 && (
              <Button type="button" variant="outline" size="sm" onClick={onDismiss}>
                {t('Dismiss')}
              </Button>
            )
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onTranslate}
            disabled={disabled || isRunning || selected.length === 0}
            // In a narrow column the label wraps instead of pushing the button out of the box.
            className="h-auto min-h-8 max-w-full py-1.5 text-left whitespace-normal"
          >
            {isRunning ? <Loader2 className="animate-spin" aria-hidden /> : <Languages aria-hidden />}
            {isRunning ? t('Translating…') : isDirty ? t('Save and translate') : t('Translate to selected locales')}
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
              title={localeName(locale.key)}
              disabled={isRunning}
              onClick={() => toggle(locale.key)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-50',
                count > 0 && 'inline-flex items-center gap-1',
                isSelected ? 'bg-secondary text-secondary-foreground ring-1 ring-ring' : 'bg-muted text-muted-foreground'
              )}
            >
              {locale.label}
              {count > 0 && <TranslationChipMarker count={count} label={markerLabel ?? t('Source changed after the translation')} />}
            </button>
          );
        })}
      </div>
      {markerSummaryLabel !== null && localeMarkers && (
        <TranslationMarkerSummary
          targets={targets}
          markers={localeMarkers}
          label={markerSummaryLabel ?? t('The source text changed after the translation:')}
        />
      )}
      {progress.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-live="polite">
          {progress.map(item => (
            <li key={item.locale}>
              <Badge
                variant={item.status === 'done' ? 'success' : item.status === 'failed' ? 'destructive' : 'secondary'}
                title={item.error}
              >
                {item.status === 'running' && <Loader2 className="animate-spin" aria-hidden />}
                {item.status === 'done' && <Check aria-hidden />}
                {item.status === 'failed' && <CircleAlert aria-hidden />}
                {item.locale} · {t(STATUS_LABEL[item.status], { context: STATUS_CONTEXT })}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
