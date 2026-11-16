'use client';

import { useFormContext } from 'react-hook-form';
import { useFieldLabel } from '../form/fieldLabels.tsx';

export interface TranslatableInputFieldProps {
  name: string;
  /** Language of this input, shown next to the label. */
  languageCode: string;
}

/** A text input for one language of a translatable property; the label comes from the form. */
export const TranslatableInputField = ({ name, languageCode }: TranslatableInputFieldProps) => {
  const label = useFieldLabel(name);
  const { register } = useFormContext();
  const inputId = `${name}-${languageCode}`;
  return (
    <div className="flex flex-col gap-1" data-slot="translatable-input">
      <label htmlFor={inputId} className="text-sm font-medium">
        {label} <span className="text-muted-foreground uppercase">{languageCode}</span>
      </label>
      <input id={inputId} className="h-9 rounded-md border border-input px-3" {...register(`${name}.${languageCode}`)} />
    </div>
  );
};
