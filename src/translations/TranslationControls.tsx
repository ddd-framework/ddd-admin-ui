'use client';

import { Check, CircleAlert, Languages, Loader2, X } from 'lucide-react';

import { Badge, Button, Label } from '../primitives/index.ts';
import { cn } from '../primitives/cn.ts';
import type { TranslatableLocale } from '../logic/pure/locales.ts';
import { useLocaleName } from '../logic/react/useLocaleName.ts';
import { m, useTranslate } from '../i18n/index.ts';
import type { TranslationTaskProgress } from '../logic/react/useTranslationRunner.ts';

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
}

const STATUS_LABEL: Record<TranslationTaskProgress['status'], string> = {
  pending: m('Waiting'),
  running: m('Translating'),
  done: m('Done'),
  failed: m('Failed'),
  cancelled: m('Cancelled'),
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
            {isRunning ? t('Translating…') : t('Translate to selected locales')}
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {targets.map(locale => {
          const isSelected = selected.includes(locale.key);
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
                isSelected ? 'bg-secondary text-secondary-foreground ring-1 ring-ring' : 'bg-muted text-muted-foreground'
              )}
            >
              {locale.label}
            </button>
          );
        })}
      </div>
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
                {item.locale} · {t(STATUS_LABEL[item.status])}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
