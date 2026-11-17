'use client';

import { type ChangeEvent, useEffect, useId, useState } from 'react';

import { Input, Popover, PopoverContent, PopoverTrigger } from '../primitives/index.ts';
import { useTranslate } from '../i18n/index.ts';
import { cn } from '../primitives/cn.ts';
import {
  type ColorValueFormat,
  formatHexColor,
  normalizeColorValue,
  parseHexColor,
} from '../logic/pure/colorValue.ts';
import type { FormControlProps } from './FormField.tsx';

export interface ColorValueFieldProps {
  /** The stored colour in `format` (`#rrggbb`, with `hex-alpha` also `#rrggbbaa`); `null` / `''`: none. */
  value: string | null | undefined;
  /** Called with the normalised colour, or `null` when cleared. Never with text that is not a colour of `format`. */
  onChange: (value: string | null) => void;
  /** The value's notation, explicit: `hex` (`#rrggbb`) or `hex-alpha` (`#rrggbb`, `#rrggbbaa` below full opacity). */
  format: ColorValueFormat;
  /** Case of the written hex digits (default `lower`). */
  letterCase?: 'lower' | 'upper';
  /** Accessible name of the swatch and the text input (English UI text, translated). */
  label: string;
  onBlur?: () => void;
  /** Preset colours in the popover (in `format`). */
  swatches?: readonly string[];
  /** A "None" choice in the popover (and an empty text) clears the value; without it an empty text keeps the old one. */
  clearable?: boolean;
  /** What the swatch says without a colour (e.g. "Auto" when the server derives one). Default: "None". */
  emptyLabel?: string;
  disabled?: boolean;
  /** `sm` = 32 px, `default` = 36 px. */
  size?: 'sm' | 'default';
  /** The `FormField` control props (`id`, `aria-invalid`, `aria-describedby`); or just an `id`. */
  control?: FormControlProps;
  id?: string;
  placeholder?: string;
  className?: string;
}

/**
 * A colour value: a swatch opening a picker (the browser's colour input, an opacity slider with `hex-alpha`, the
 * host's presets) next to the value as text, so a colour can be typed or pasted. The text is checked on blur: a colour
 * of `format` is written normalised, an empty text clears (with `clearable`), anything else stays in the field marked
 * invalid and is never passed on. The swatch shows the value itself (entity data, an inline style). No colour library.
 */
export const ColorValueField = ({
  value,
  onChange,
  format,
  letterCase = 'lower',
  label,
  onBlur,
  swatches = [],
  clearable = false,
  emptyLabel,
  disabled = false,
  size = 'default',
  control,
  id,
  placeholder,
  className,
}: ColorValueFieldProps) => {
  const { t } = useTranslate();
  const alphaId = useId();
  const current = value ? parseHexColor(value) : null;
  const [draft, setDraft] = useState(value ?? '');
  const [invalid, setInvalid] = useState(false);

  // a value set from outside (a reset, a preset) replaces the draft
  useEffect(() => {
    setDraft(value ?? '');
    setInvalid(false);
  }, [value]);

  const write = (next: string | null) => {
    setInvalid(false);
    if (next !== (value || null)) onChange(next);
  };

  const commitDraft = () => {
    const normalized = normalizeColorValue(draft, format, letterCase);
    if (normalized === undefined) setInvalid(true);
    else if (normalized === null && !clearable) setDraft(value ?? '');
    else {
      setDraft(normalized ?? '');
      write(normalized);
    }
    onBlur?.();
  };

  const pickRgb = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = parseHexColor(event.target.value);
    if (picked) write(formatHexColor({ ...picked, a: current?.a ?? 1 }, format, letterCase));
  };
  const pickAlpha = (event: ChangeEvent<HTMLInputElement>) => {
    const base = current ?? { r: 0, g: 0, b: 0, a: 1 };
    write(formatHexColor({ ...base, a: Number(event.target.value) / 100 }, format, letterCase));
  };

  const name = t(label);
  const shown = value ?? '';
  const noneText = emptyLabel ? t(emptyLabel) : t('None', { context: 'color-value' });
  const fieldInvalid = invalid || control?.['aria-invalid'] === true;

  return (
    <div className={cn('grid gap-1', className)}>
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              aria-label={
                shown
                  ? t('Pick %label% (current %value%)', { replacements: { label: name, value: shown } })
                  : t('Pick %label% (%none%)', { replacements: { label: name, none: noneText } })
              }
              title={shown || noneText}
              className={cn(
                'relative shrink-0 rounded-xl border border-field-edge transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-field-edge-strong',
                size === 'sm' ? 'size-8' : 'h-9 w-12',
                !shown && 'bg-muted'
              )}
              style={shown ? { background: shown } : undefined}
            >
              {!shown && <span aria-hidden className="absolute inset-x-1.5 top-1/2 h-0.5 -rotate-45 bg-muted-foreground/60" />}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="grid w-60 gap-3">
            <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
              {t('Colour')}
              <input
                type="color"
                value={formatHexColor(current ?? { r: 0, g: 0, b: 0, a: 1 }, 'hex')}
                onChange={pickRgb}
                disabled={disabled}
                className="h-9 w-full cursor-pointer rounded-md border border-border bg-transparent p-0.5"
              />
            </label>
            {format === 'hex-alpha' && (
              <div className="grid gap-1.5">
                <label htmlFor={alphaId} className="flex justify-between text-xs font-medium text-muted-foreground">
                  {t('Opacity')}
                  <span className="tabular-nums">{Math.round((current?.a ?? 1) * 100)} %</span>
                </label>
                <input
                  id={alphaId}
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round((current?.a ?? 1) * 100)}
                  onChange={pickAlpha}
                  disabled={disabled || !current}
                  className="w-full accent-primary"
                />
              </div>
            )}
            {(swatches.length > 0 || clearable) && (
              <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('Presets')}>
                {clearable && (
                  <button
                    type="button"
                    onClick={() => write(null)}
                    aria-pressed={!shown}
                    className={cn(
                      'inline-flex h-7 items-center rounded-md border px-2 text-xs font-medium hover:bg-muted',
                      !shown ? 'border-primary bg-primary/5' : 'border-border'
                    )}
                  >
                    {noneText}
                  </button>
                )}
                {swatches.map(swatch => {
                  const normalized = normalizeColorValue(swatch, format, letterCase) ?? swatch;
                  const selected = normalized === shown;
                  return (
                    <button
                      key={swatch}
                      type="button"
                      onClick={() => write(normalized)}
                      aria-pressed={selected}
                      aria-label={normalized}
                      title={normalized}
                      className={cn(
                        'size-7 rounded-md border-2 transition-colors',
                        selected ? 'border-primary' : 'border-border hover:border-field-edge-strong'
                      )}
                      style={{ background: normalized }}
                    />
                  );
                })}
              </div>
            )}
          </PopoverContent>
        </Popover>
        <Input
          id={id}
          {...control}
          value={draft}
          onChange={event => {
            setDraft(event.target.value);
            if (invalid) setInvalid(false);
          }}
          onBlur={commitDraft}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commitDraft();
            }
          }}
          disabled={disabled}
          placeholder={placeholder ?? (format === 'hex-alpha' ? '#RRGGBB / #RRGGBBAA' : '#RRGGBB')}
          aria-label={name}
          aria-invalid={fieldInvalid}
          spellCheck={false}
          autoComplete="off"
          className={cn('flex-1 font-mono', size === 'sm' ? 'h-8 text-xs' : 'text-sm')}
        />
      </div>
      {invalid && (
        <p className="text-xs text-destructive" role="alert">
          {format === 'hex-alpha'
            ? t('Enter a colour as #RRGGBB or #RRGGBBAA.')
            : t('Enter a colour as #RRGGBB.')}
        </p>
      )}
    </div>
  );
};
