'use client';

import { useFormContext } from 'react-hook-form';
import { useFieldLabel } from '../form/fieldLabels.tsx';

export interface MediaItemFieldProps {
  name: string;
}

/** The URL of a media item as a form field; the label comes from the form. */
export const MediaItemField = ({ name }: MediaItemFieldProps) => {
  const label = useFieldLabel(name);
  const { register } = useFormContext();
  return (
    <div className="flex flex-col gap-1" data-slot="media-item-field">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <input id={name} type="url" className="h-9 rounded-md border border-input px-3" {...register(name)} />
    </div>
  );
};
