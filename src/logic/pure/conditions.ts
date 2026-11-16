import type { FieldValues, Path, PathValue } from 'react-hook-form';
import type { core } from 'zod';

import { getFieldValue } from './fieldPath.ts';
import { isBlankFormValue } from './formValues.ts';

/**
 * Conditional form logic, declared once and used by the UI (show / require / disable / reset) and by the zod schema
 * (conditional validation), so every condition of a form is one named object next to its field. Pure: no React,
 * so a schema or payload module (server or client) can build conditions and rules; the hooks that evaluate them live
 * in `../react/conditionHooks`.
 *
 * `id` is an optional stable identifier of the condition (a requirement or test id): a search for the id lands on the
 * code that implements it.
 */
export interface FormCondition<T extends FieldValues> {
  id?: string;
  /** Pure predicate over the current form values. */
  test: (values: T) => boolean;
}

/** A condition from a predicate. */
export const condition = <T extends FieldValues>(test: (values: T) => boolean, id?: string): FormCondition<T> => ({
  id,
  test,
});

/** `path` equals `value` (`Object.is`). */
export const fieldEquals = <T extends FieldValues, P extends Path<T>>(
  path: P,
  value: PathValue<T, P>,
  id?: string
): FormCondition<T> => condition<T>(values => Object.is(getFieldValue(values, path), value), id);

/** `path` is one of `options`. */
export const fieldIn = <T extends FieldValues, P extends Path<T>>(
  path: P,
  options: readonly PathValue<T, P>[],
  id?: string
): FormCondition<T> => condition<T>(values => options.includes(getFieldValue(values, path)), id);

/** `path` holds something (not blank: see `isBlankFormValue`; `false` counts as filled). */
export const fieldFilled = <T extends FieldValues>(path: Path<T>, id?: string): FormCondition<T> =>
  condition<T>(values => !isBlankFormValue(getFieldValue(values, path)), id);

export const not = <T extends FieldValues>(inner: FormCondition<T>, id?: string): FormCondition<T> =>
  condition<T>(values => !inner.test(values), id ?? inner.id);

export const allOf = <T extends FieldValues>(...conditions: FormCondition<T>[]): FormCondition<T> =>
  condition<T>(values => conditions.every(item => item.test(values)));

export const anyOf = <T extends FieldValues>(...conditions: FormCondition<T>[]): FormCondition<T> =>
  condition<T>(values => conditions.some(item => item.test(values)));

export interface ResetWhenRule<T extends FieldValues, P extends Path<T> = Path<T>> {
  condition: FormCondition<T>;
  path: P;
  /** The value the field takes when the condition starts to hold (the cleared value: `''`, `null`, …). */
  value: PathValue<T, P>;
}

/** A zod `superRefine` rule of a form schema. */
export type FormRule<T> = (values: T, ctx: core.$RefinementCtx<T>) => void;

const issuePath = (path: string): PropertyKey[] => path.split('.').map(part => (/^\d+$/.test(part) ? Number(part) : part));

/**
 * Conditional required for the zod schema: while `formCondition` holds, a blank `path` is an issue with `message`.
 * Use it with the same condition object the field's `requiredWhen` gets:
 * `schema.superRefine(formRules(requiredWhen(isMission, 'missionDescription', 'Mission description is required')))`.
 */
export const requiredWhen = <T extends FieldValues>(
  formCondition: FormCondition<T>,
  path: Path<T>,
  message: string
): FormRule<T> => (values, ctx) => {
  if (formCondition.test(values) && isBlankFormValue(getFieldValue(values, path))) {
    ctx.addIssue({ code: 'custom', path: issuePath(path), message });
  }
};

/** Any conditional check: while `formCondition` holds, `isValid(value)` must be true. */
export const validWhen = <T extends FieldValues, P extends Path<T>>(
  formCondition: FormCondition<T>,
  path: P,
  isValid: (value: PathValue<T, P>, values: T) => boolean,
  message: string
): FormRule<T> => (values, ctx) => {
  if (formCondition.test(values) && !isValid(getFieldValue(values, path), values)) {
    ctx.addIssue({ code: 'custom', path: issuePath(path), message });
  }
};

/** Runs several rules in one `superRefine`. */
export const formRules =
  <T,>(...rules: FormRule<T>[]): FormRule<T> =>
  (values, ctx) => {
    for (const rule of rules) rule(values, ctx);
  };
