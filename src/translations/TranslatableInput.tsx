'use client';

import { Input } from '../primitives/index.ts';
import { Textarea } from '../primitives/textarea.tsx';
import { useTranslate } from '../i18n/index.ts';
import { TranslatableField, type TranslatableFieldBaseProps } from './TranslatableField.tsx';

export interface TranslatableInputProps extends TranslatableFieldBaseProps {
  /** A `<textarea>` instead of a single-line input. */
  multiline?: boolean;
  /** Textarea rows (multiline only). */
  rows?: number;
  placeholder?: string;
}

/**
 * A text field with one value per content locale (full `locale::style` keys): the tabs switch the
 * locale form-wide, the input edits the active `locale::style` text only.
 */
export const TranslatableInput = ({ multiline = false, rows = 4, placeholder, ...fieldProps }: TranslatableInputProps) => {
  const { t } = useTranslate();
  return (
  <TranslatableField {...fieldProps}>
    {({ id, text, setText, localeLabel }) =>
      multiline ? (
        <Textarea
          id={id}
          value={text}
          onChange={event => setText(event.target.value)}
          placeholder={placeholder ?? t('Enter %language% text…', { replacements: { language: localeLabel } })}
          rows={rows}
          disabled={fieldProps.disabled}
          aria-invalid={!!fieldProps.error}
          className="field-sizing-fixed resize-y"
        />
      ) : (
        <Input
          id={id}
          value={text}
          onChange={event => setText(event.target.value)}
          placeholder={placeholder ?? t('Enter %language% text…', { replacements: { language: localeLabel } })}
          disabled={fieldProps.disabled}
          aria-invalid={!!fieldProps.error}
        />
      )
    }
  </TranslatableField>
  );
};
