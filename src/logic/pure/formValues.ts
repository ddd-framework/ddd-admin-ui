/**
 * Form-value comparison as a person reads a form, used by
 * `useFormDirty` instead of RHF's strict `formState.isDirty`. Blank is blank whatever its type (`null`, `undefined`,
 * `''`, a whitespace-only string, an empty array, a translation map of blanks `{ 'de::FORMAL': '' }`), a number
 * equals its numeric string. A non-blank string is compared exactly (no trim): a form that only changed whitespace
 * still counts as edited.
 */

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

/** Nullish, NaN or a blank string: a scalar slot with nothing in it. */
const isAbsent = (value: unknown): boolean =>
  value === null ||
  value === undefined ||
  (typeof value === 'number' && Number.isNaN(value)) ||
  (typeof value === 'string' && value.trim() === '');

/** Absent, or a container of absent values only. */
export const isBlankFormValue = (value: unknown): boolean => {
  if (isAbsent(value)) return true;
  if (Array.isArray(value)) return value.every(isBlankFormValue);
  if (isPlainObject(value)) return Object.values(value).every(isBlankFormValue);
  return false;
};

const toComparableNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
};

/** Deep equality under the rules above; array order matters. */
export const formValuesEqual = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) return true;
  if (isAbsent(left) || isAbsent(right)) return isBlankFormValue(left) && isBlankFormValue(right);
  if (typeof left === 'string' && typeof right === 'string') return left === right;
  if (typeof left === 'number' || typeof right === 'number') {
    const a = toComparableNumber(left);
    const b = toComparableNumber(right);
    return a !== null && b !== null && a === b;
  }
  if (left instanceof Date && right instanceof Date) return left.getTime() === right.getTime();
  if (Array.isArray(left) && Array.isArray(right)) {
    if (isBlankFormValue(left) && isBlankFormValue(right)) return true;
    return left.length === right.length && left.every((item, index) => formValuesEqual(item, right[index]));
  }
  if (isPlainObject(left) && isPlainObject(right)) {
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    for (const key of keys) if (!formValuesEqual(left[key], right[key])) return false;
    return true;
  }
  return false;
};

/** A copy of `values` without the given (dotted) paths. */
export const omitFormPaths = (values: unknown, paths: readonly string[]): unknown => {
  if (paths.length === 0 || !isPlainObject(values)) return values;
  const out: Record<string, unknown> = { ...values };
  for (const path of paths) {
    const [head, ...rest] = path.split('.');
    if (!(head in out)) continue;
    if (rest.length === 0) delete out[head];
    else out[head] = omitFormPaths(out[head], [rest.join('.')]);
  }
  return out;
};
