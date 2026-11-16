'use client';

import type { ReactNode } from 'react';
import { FormProvider, useForm, type FieldValues, type SubmitHandler } from 'react-hook-form';
import { FieldLabelsProvider, type FieldLabels } from './fieldLabels.tsx';

export interface FormProps<Values extends FieldValues> {
  defaultValues: Values;
  labels: FieldLabels;
  onSubmit: SubmitHandler<Values>;
  children: ReactNode;
  actions?: ReactNode;
}

/** A react-hook-form form that gives its fields their labels; the actions render first (`data-form-actions`). */
export const Form = <Values extends FieldValues>({
  defaultValues,
  labels,
  onSubmit,
  children,
  actions,
}: FormProps<Values>) => {
  // `defaultValues` is typed by the caller; react-hook-form's DefaultValues<> is a deep partial of it.
  const methods = useForm<Values>({ defaultValues: defaultValues as never });
  return (
    <FormProvider {...methods}>
      <FieldLabelsProvider labels={labels}>
        <form className="flex flex-col gap-4" onSubmit={methods.handleSubmit(onSubmit)}>
          {children}
          {actions ? <div data-form-actions="">{actions}</div> : null}
        </form>
      </FieldLabelsProvider>
    </FormProvider>
  );
};
