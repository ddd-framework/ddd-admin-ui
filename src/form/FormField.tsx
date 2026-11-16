'use client';

import { type ReactNode, useId } from 'react';
import {
  type Control,
  type ControllerFieldState,
  type ControllerRenderProps,
  type FieldValues,
  type Path,
  useController,
  useFormContext,
} from 'react-hook-form';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, Label } from '../primitives/index.ts';
import { useTranslate } from '../i18n/index.ts';
import { cn } from '../primitives/cn.ts';
import type { FormCondition, ResetWhenRule } from '../logic/pure/conditions.ts';
import { useDisabledWhen, useRequiredWhen, useResetWhen, useVisibleWhen } from '../logic/react/conditionHooks.ts';
import { useRegisterFieldLabel } from './fieldLabels.ts';

/** Ids and ARIA wiring for the control inside a field; spread onto the input. */
export interface FormControlProps {
  id: string;
  'aria-invalid': boolean;
  'aria-describedby'?: string;
}

export interface FormFieldFrameProps {
  label: ReactNode;
  required?: boolean;
  /** One-line helper under the control. */
  description?: ReactNode;
  /**
   * Validation message; shown under the control and marks it `aria-invalid`. A schema message marked with `m()` is
   * translated here (an already translated one has no key and stays as it is).
   */
  error?: string;
  /** Renders the control with its ids (`<Input {...control} />`). */
  children: (control: FormControlProps) => ReactNode;
  className?: string;
}

/**
 * Label, control, helper and error, id-linked (shadcn `FormItem` / `FormLabel` / `FormDescription` /
 * `FormMessage`). Unbound: `FormField` uses it with the RHF state; a custom control can use it directly.
 */
export const FormFieldFrame = ({ label, required, description, error, children, className }: FormFieldFrameProps) => {
  const { t } = useTranslate();
  const id = useId();
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('grid gap-2', className)}>
      <Label htmlFor={id} className={cn(error && 'text-destructive')}>
        {label}
        {required && (
          <span aria-hidden className="text-destructive">
            *
          </span>
        )}
      </Label>
      {children({ id, 'aria-invalid': !!error, 'aria-describedby': describedBy })}
      {description && (
        <p id={descriptionId} className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {t(error)}
        </p>
      )}
    </div>
  );
};

/** What a bound field's render function gets. */
export interface FormFieldRenderArgs<T extends FieldValues, N extends Path<T>> {
  /** `value`, `onChange`, `onBlur`, `name`, `ref` from RHF; spread onto the input (`<Input {...control} {...field} />`). */
  field: ControllerRenderProps<T, N>;
  fieldState: ControllerFieldState;
  /** Ids and ARIA wiring. */
  control: FormControlProps;
  /** `disabledWhen` (or `disabled`) result; pass it to the input. Never set on RHF itself (that drops the value). */
  disabled: boolean;
}

export interface FormFieldProps<T extends FieldValues, N extends Path<T>> {
  name: N;
  /** Optional: infers `T` for typed `name`s; the surrounding `<Form>` is used otherwise. */
  control?: Control<T>;
  label: ReactNode;
  /** Static required marker (the schema enforces it). */
  required?: boolean;
  description?: ReactNode;
  /** Static disabled (e.g. pending save); combined with `disabledWhen`. */
  disabled?: boolean;
  /** Rendered only while this holds; the value stays in the form when hidden (unless `resetWhen` clears it). */
  visibleWhen?: FormCondition<T>;
  /** Required marker only while this holds; pair it with `requiredWhen(condition, name, message)` in the schema. */
  requiredWhen?: FormCondition<T>;
  disabledWhen?: FormCondition<T>;
  /** Sets the field to `value` when the condition starts to hold through a user edit (see `useResetWhen`). */
  resetWhen?: Omit<ResetWhenRule<T, N>, 'path'>;
  children: (args: FormFieldRenderArgs<T, N>) => ReactNode;
  className?: string;
}

/**
 * A field bound to the surrounding `<Form>` through `useController` (shadcn `FormField` + `FormItem`): label with the
 * required marker, the control, helper and the field's validation message (shown once RHF reports it: with
 * `mode: 'onTouched'` after the first blur or a submit). Conditions are declarative props, so each condition sits on
 * its field.
 */
export const FormField = <T extends FieldValues, N extends Path<T>>({
  name,
  control,
  label,
  required = false,
  description,
  disabled = false,
  visibleWhen,
  requiredWhen,
  disabledWhen,
  resetWhen,
  children,
  className,
}: FormFieldProps<T, N>) => {
  const form = useFormContext<T>();
  const isVisible = useVisibleWhen(visibleWhen);
  const isRequired = useRequiredWhen(requiredWhen) || required;
  const isDisabled = useDisabledWhen(disabledWhen) || disabled;
  useResetWhen(form, resetWhen ? { ...resetWhen, path: name } : undefined);
  if (!isVisible) return null;
  return (
    <BoundField
      name={name}
      control={control ?? form.control}
      label={label}
      required={isRequired}
      description={description}
      disabled={isDisabled}
      className={className}
    >
      {children}
    </BoundField>
  );
};

interface BoundFieldProps<T extends FieldValues, N extends Path<T>> {
  name: N;
  control: Control<T>;
  label: ReactNode;
  required: boolean;
  description?: ReactNode;
  disabled: boolean;
  children: (args: FormFieldRenderArgs<T, N>) => ReactNode;
  className?: string;
}

/** Mounted only while visible, so a hidden field has no controller (its value stays in the form). */
const BoundField = <T extends FieldValues, N extends Path<T>>({
  name,
  control,
  label,
  required,
  description,
  disabled,
  children,
  className,
}: BoundFieldProps<T, N>) => {
  const { field, fieldState } = useController({ name, control });
  useRegisterFieldLabel(name, label);
  return (
    <FormFieldFrame
      label={label}
      required={required}
      description={description}
      error={fieldState.error?.message}
      className={className}
    >
      {controlProps => children({ field, fieldState, control: controlProps, disabled })}
    </FormFieldFrame>
  );
};

export interface FormSectionProps {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** A group of fields in its own card (`space-y-4` between fields, the form rhythm); conditional: `VisibleWhen`. */
export const FormSection = ({ title, description, children, className }: FormSectionProps) => (
  <Card className={cn('gap-4', className)}>
    <CardHeader>
      <CardTitle className="text-title-card leading-snug font-semibold">{title}</CardTitle>
      {description && <CardDescription>{description}</CardDescription>}
    </CardHeader>
    <CardContent className="space-y-4">{children}</CardContent>
  </Card>
);
