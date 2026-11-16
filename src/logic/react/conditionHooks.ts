'use client';

import { useEffect, useRef } from 'react';
import { type FieldValues, type UseFormReturn, useFormContext, useWatch } from 'react-hook-form';

import type { FormCondition, ResetWhenRule } from '../pure/conditions.ts';

/**
 * Evaluates a condition against the live values of the surrounding `<Form>` (re-renders on every value change via
 * `useWatch`). `undefined` = no condition → `fallback`.
 */
export const useCondition = <T extends FieldValues>(
  formCondition: FormCondition<T> | undefined,
  fallback: boolean
): boolean => {
  const { control, getValues } = useFormContext<T>();
  // Subscribes only when there is a condition, so a plain field does not re-render on every keystroke elsewhere.
  useWatch({ control, disabled: formCondition === undefined });
  return formCondition ? formCondition.test(getValues()) : fallback;
};

/** Shown unless the condition is false. */
export const useVisibleWhen = <T extends FieldValues>(formCondition?: FormCondition<T>): boolean =>
  useCondition(formCondition, true);

/** Required (marker; the schema enforces it with `requiredWhen`) only while the condition holds. */
export const useRequiredWhen = <T extends FieldValues>(formCondition?: FormCondition<T>): boolean =>
  useCondition(formCondition, false);

/** Disabled only while the condition holds. */
export const useDisabledWhen = <T extends FieldValues>(formCondition?: FormCondition<T>): boolean =>
  useCondition(formCondition, false);

/**
 * Sets `path` to `value` when the condition flips from false to true **through a user edit** (an input's
 * `onChange`), like a hand-written `useEffect(() => { if (type === …) setValue(…) }, [type])`. Hydration (`reset`) and
 * programmatic `setValue` never trigger it, so a loaded entity keeps its stored values.
 */
export const useResetWhen = <T extends FieldValues>(
  form: Pick<UseFormReturn<T>, 'watch' | 'getValues' | 'setValue' | 'formState'>,
  rule: ResetWhenRule<T> | undefined
): void => {
  const ruleRef = useRef(rule);
  ruleRef.current = rule;
  const { watch, getValues, setValue, formState } = form;
  const isSubmittedRef = useRef(formState.isSubmitted);
  isSubmittedRef.current = formState.isSubmitted;
  const enabled = rule !== undefined;

  useEffect(() => {
    if (!enabled) return;
    const current = ruleRef.current;
    let wasActive = current ? current.condition.test(getValues()) : false;
    const subscription = watch((_values, info) => {
      const active = ruleRef.current;
      if (!active) return;
      const isActive = active.condition.test(getValues());
      const flippedOn = isActive && !wasActive;
      wasActive = isActive;
      if (!flippedOn || info.type !== 'change') return;
      setValue(active.path, active.value, { shouldDirty: true, shouldValidate: isSubmittedRef.current });
    });
    return () => subscription.unsubscribe();
  }, [enabled, watch, getValues, setValue]);
};
