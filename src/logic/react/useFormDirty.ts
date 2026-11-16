'use client';

import { type FieldValues, type Path, type UseFormReturn, useWatch } from 'react-hook-form';

import { formValuesEqual, omitFormPaths } from '../pure/formValues.ts';

export interface UseFormDirtyOptions<T extends FieldValues> {
  /** Fields left out of the comparison (owned by another draft that brings its own dirty flag). */
  ignore?: readonly (Path<T> | (string & {}))[];
}

/**
 * Whether the form's values differ from its baseline (the last `reset()` / `defaultValues`) as a person reads a
 * form. Use it for every unsaved-changes guard instead of `formState.isDirty`, which calls a
 * form dirty for `null` vs `''`, a late-registering field's `undefined` or an emptied translation tab.
 *
 * Baseline from `control._defaultValues` (always current: `reset` replaces it, `resetField` updates it), not
 * `formState.defaultValues`, which RHF rebuilds without the defaults on some re-renders of a never-reset form.
 */
export const useFormDirty = <T extends FieldValues>(
  form: Pick<UseFormReturn<T>, 'control'>,
  { ignore = [] }: UseFormDirtyOptions<T> = {}
): boolean => {
  const values = useWatch({ control: form.control });
  const baseline = form.control._defaultValues;
  return !formValuesEqual(omitFormPaths(values, ignore), omitFormPaths(baseline, ignore));
};
