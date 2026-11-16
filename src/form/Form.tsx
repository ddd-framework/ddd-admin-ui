'use client';

import { type ReactNode, useState } from 'react';
import { type FieldValues, FormProvider, type SubmitHandler, type UseFormReturn } from 'react-hook-form';

import type { FormCondition } from '../logic/pure/conditions.ts';
import { useVisibleWhen } from '../logic/react/conditionHooks.ts';
import { type FormFieldLabels, FormFieldLabelsContext } from './fieldLabels.ts';

export interface FormProps<TFieldValues extends FieldValues, TTransformed = TFieldValues> {
  /** `useForm({ resolver: zodResolver(schema), mode: 'onTouched', defaultValues })`. */
  form: UseFormReturn<TFieldValues, unknown, TTransformed>;
  /** Called with the parsed values after the schema passed; awaited, so `formState.isSubmitting` covers the save. */
  onSubmit: SubmitHandler<TTransformed>;
  children: ReactNode;
  id?: string;
  className?: string;
}

/**
 * The form element of an entity form (shadcn `Form` = RHF `FormProvider` + `<form>`): provides the form to every
 * bound field (`FormField`, `FormTranslatableInput`, `FormMediaItemField`, the condition hooks), validates through
 * the resolver on submit, `noValidate` so the browser leaves validation to the schema. Enter in a field submits;
 * the primary button is `type="submit"` (`FormSubmitButton`), Cancel `type="button"`. The bound fields register
 * their labels here, so `FormErrors` can attach a server violation to its field and name it by its label.
 */
export const Form = <TFieldValues extends FieldValues, TTransformed = TFieldValues>({
  form,
  onSubmit,
  children,
  id,
  className,
}: FormProps<TFieldValues, TTransformed>) => {
  const [fieldLabels] = useState<FormFieldLabels>(() => new Map());
  return (
    <FormProvider {...form}>
      <FormFieldLabelsContext.Provider value={fieldLabels}>
        <form id={id} noValidate onSubmit={form.handleSubmit(onSubmit)} className={className}>
          {children}
        </form>
      </FormFieldLabelsContext.Provider>
    </FormProvider>
  );
};

export interface VisibleWhenProps<T extends FieldValues> {
  /** Shown while this holds; hidden fields keep their value (no unregister) unless a `resetWhen` clears it. */
  condition: FormCondition<T>;
  children: ReactNode;
}

/** A block (section, several fields) shown only while `condition` holds — the section-level `visibleWhen`. */
export const VisibleWhen = <T extends FieldValues>({ condition, children }: VisibleWhenProps<T>) =>
  useVisibleWhen(condition) ? children : null;
