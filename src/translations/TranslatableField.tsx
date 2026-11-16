'use client';

import type { PropertyTranslations } from '@mgamadeus/ddd-web/contract';
import { Loader2, Sparkles, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button, Label } from '../primitives/index.ts';
import { useConfirmDialog } from '../form/useConfirmDialog.tsx';
import { useTranslate } from '../i18n/index.ts';
import { cn } from '../primitives/cn.ts';
import type { TranslatableLocale } from '../logic/pure/locales.ts';
import { useLocaleName } from '../logic/react/useLocaleName.ts';
import type { ConfirmFn } from '../logic/react/useUnsavedChangesGuard.ts';

/** Props every translatable input shares (keyed by full `locale::style`). */
export interface TranslatableFieldBaseProps {
  /** Full translation key → text of this field. */
  value: PropertyTranslations;
  onChange: (value: PropertyTranslations) => void;
  /** Tabs, from `useEntityTranslations().locales`. */
  locales: TranslatableLocale[];
  /** The form-wide tab (`useEntityTranslations().activeLocale`). */
  activeLocale: string;
  onActiveLocaleChange: (key: string) => void;
  /** Optional AI slot: shows "Auto-translate" only when set (AI calls cost money; off unless the app enables it). */
  onAutoGenerate?: () => void;
  isGenerating?: boolean;
  label?: ReactNode;
  required?: boolean;
  /** Validation message of the field (e.g. the default locale is required). */
  error?: string;
  /** Hint line under the editor (what the field is for, a fallback). */
  description?: ReactNode;
  disabled?: boolean;
  /** Id of the control, for an outer `<label htmlFor>`. */
  id?: string;
  className?: string;
  /** The host's confirmation service for "Clear all translations?". Default: the package dialog (`useConfirmDialog`). */
  confirm?: ConfirmFn;
}

interface TranslatableFieldProps extends TranslatableFieldBaseProps {
  /** The editor for the active locale's text. */
  children: (args: { id?: string; text: string; setText: (text: string) => void; localeLabel: string }) => ReactNode;
}

/**
 * Shared frame of `TranslatableInput` and `TranslatableMarkdown`, compact: one header row with the label left and, right of it, one tab per full `locale::style` key (filled tabs
 * carry a dot, the tooltip spells the language out; the row scrolls sideways when there are many), the icon-only
 * "Clear all" and the optional "Auto-translate"; then the editor for the active tab, the error and the optional hint.
 * In a narrow container (≤ 400 px) the tabs move under the label.
 */
export const TranslatableField = ({
  value,
  onChange,
  locales,
  activeLocale,
  onActiveLocaleChange,
  onAutoGenerate,
  isGenerating = false,
  label,
  required,
  error,
  description,
  disabled = false,
  id,
  className,
  confirm: hostConfirm,
  children,
}: TranslatableFieldProps) => {
  const { t } = useTranslate();
  const localeName = useLocaleName();
  const packageConfirm = useConfirmDialog();
  const confirm = hostConfirm ?? packageConfirm.confirm;
  const active = locales.find(locale => locale.key === activeLocale);
  const activeLabel = active?.label ?? activeLocale;
  const hasAnyContent = Object.values(value).some(text => text.trim() !== '');

  const handleClearAll = async () => {
    const confirmed = await confirm({
      title: t('Clear all translations?'),
      description: t('This removes the text for every language. It is gone once you save.'),
      confirmLabel: t('Clear all', { context: 'translations-action' }),
      confirmVariant: 'destructive',
    });
    if (confirmed) onChange({});
  };

  return (
    <div className={cn('@container flex flex-col gap-2', className)}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {label && (
          <Label htmlFor={id} className={cn('min-h-6', error && 'text-destructive')}>
            {label}
            {required && (
              <span aria-hidden className="text-destructive">
                *
              </span>
            )}
          </Label>
        )}

        {/* Takes the rest of the label row (at least 8 rem, else it wraps under the label as a whole). */}
        <div className="flex min-w-32 flex-1 items-center gap-1.5 @max-[400px]:basis-full">
          <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:thin]">
            <div
              className={cn('flex w-max items-center gap-1', label && 'ml-auto @max-[400px]:ml-0')}
              role="tablist"
              aria-label={t('Languages')}
            >
              {locales.map(locale => {
                const isActive = locale.key === activeLocale;
                const hasText = (value[locale.key] ?? '').trim() !== '';
                return (
                  <button
                    key={locale.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    title={localeName(locale.key)}
                    onClick={() => onActiveLocaleChange(locale.key)}
                    className={cn(
                      'inline-flex h-6 shrink-0 items-center justify-center rounded-md px-2 text-xs font-semibold transition-colors',
                      isActive && 'bg-primary text-primary-foreground shadow-xs',
                      !isActive && hasText && 'bg-primary/15 text-primary-emphasis hover:bg-primary/25',
                      !isActive && !hasText && 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                    )}
                  >
                    {locale.label}
                    {hasText && (
                      <span
                        aria-hidden
                        className={cn('ml-1 size-1.5 rounded-full', isActive ? 'bg-primary-foreground/60' : 'bg-primary')}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {onAutoGenerate && (
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={onAutoGenerate}
              disabled={disabled || isGenerating}
              className="shrink-0"
            >
              {isGenerating ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
              {isGenerating ? t('Translating…') : t('Auto-translate')}
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={handleClearAll}
            disabled={disabled || isGenerating || !hasAnyContent}
            aria-label={t('Clear all translations')}
            title={t('Clear all translations')}
            className="shrink-0 text-muted-foreground hover:text-destructive"
          >
            <Trash2 aria-hidden />
          </Button>
        </div>
      </div>

      {children({
        id,
        text: value[activeLocale] ?? '',
        setText: text => onChange({ ...value, [activeLocale]: text }),
        localeLabel: activeLabel,
      })}

      {error && <p className="text-sm text-destructive">{error}</p>}
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      {hostConfirm ? null : packageConfirm.dialog}
    </div>
  );
};
