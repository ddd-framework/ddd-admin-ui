'use client';

import type { ReactNode } from 'react';
import { type Control, type FieldValues, type Path, useController, useFormContext } from 'react-hook-form';

import type { FormCondition } from '../logic/pure/conditions.ts';
import { useDisabledWhen, useVisibleWhen } from '../logic/react/conditionHooks.ts';
import { useRegisterFieldLabel } from '../form/fieldLabels.ts';
import type { MediaItemValue } from '../logic/pure/schemas.ts';
import { MediaItemField } from './MediaItemField.tsx';

/** @deprecated moved to logic/pure/schemas — the re-export is removed in a later minor */
export { mediaItemValueSchema } from '../logic/pure/schemas.ts';
/** @deprecated moved to logic/pure/schemas — the re-export is removed in a later minor */
export type { MediaItemValue } from '../logic/pure/schemas.ts';

const asMediaItemValue = (value: unknown): MediaItemValue | null => {
  if (typeof value !== 'object' || value === null || !('id' in value) || typeof value.id !== 'string') return null;
  const { id } = value;
  const previewUrl = 'previewUrl' in value ? value.previewUrl : null;
  return { id, previewUrl: typeof previewUrl === 'string' ? previewUrl : null };
};

/** What the picker slot of the field gets. */
export interface MediaItemFieldPickerArgs {
  value: MediaItemValue | null;
  /** Sets the form value (marks it dirty; nothing is saved until submit). */
  select: (value: MediaItemValue) => void;
}

export interface FormMediaItemFieldProps<T extends FieldValues> {
  /** Path of a `MediaItemValue | null` in the form values. */
  name: Path<T>;
  control?: Control<T>;
  label: ReactNode;
  alt: string;
  emptyLabel?: string;
  description?: ReactNode;
  /** Opens the app's picker. */
  onOpenPicker: () => void;
  /** The app's picker dialog (`MediaItemPickerDialog` with its data); calls `select` with the picked item. */
  children?: (args: MediaItemFieldPickerArgs) => ReactNode;
  /** Offer "Remove" (sets `null`); leave off when the reference cannot be cleared. */
  removable?: boolean;
  disabled?: boolean;
  visibleWhen?: FormCondition<T>;
  disabledWhen?: FormCondition<T>;
}

/**
 * `MediaItemField` bound to the surrounding `<Form>`: the value at `name` is the picked media item reference; picking
 * only changes the form value (dirty, validated) and the preview.
 */
export const FormMediaItemField = <T extends FieldValues>({
  name,
  control,
  visibleWhen,
  disabledWhen,
  disabled = false,
  ...fieldProps
}: FormMediaItemFieldProps<T>) => {
  const form = useFormContext<T>();
  const isVisible = useVisibleWhen(visibleWhen);
  const isDisabled = useDisabledWhen(disabledWhen) || disabled;
  if (!isVisible) return null;
  return <BoundMediaItemField name={name} control={control ?? form.control} disabled={isDisabled} {...fieldProps} />;
};

type BoundMediaItemFieldProps<T extends FieldValues> = Omit<
  FormMediaItemFieldProps<T>,
  'control' | 'visibleWhen' | 'disabledWhen'
> & { control: Control<T> };

const BoundMediaItemField = <T extends FieldValues>({
  name,
  control,
  label,
  alt,
  emptyLabel,
  description,
  onOpenPicker,
  children,
  removable = false,
  disabled,
}: BoundMediaItemFieldProps<T>) => {
  const { field, fieldState } = useController({ name, control });
  useRegisterFieldLabel(name, label);
  const value = asMediaItemValue(field.value);
  const error = fieldState.error?.message;
  return (
    <>
      <MediaItemField
        label={label}
        previewUrl={value?.previewUrl ?? null}
        alt={alt}
        emptyLabel={emptyLabel}
        onOpenPicker={onOpenPicker}
        onRemove={removable ? () => field.onChange(null) : undefined}
        disabled={disabled}
        description={description}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      {children?.({ value, select: next => field.onChange(next) })}
    </>
  );
};
