import type { FieldValues, Path, PathValue } from 'react-hook-form';

const PROTOTYPE_KEYWORDS = ['__proto__', 'constructor', 'prototype'];
const IS_KEY_RE = /^\w*$/;
const FIELD_PATH_RE = /[.[\]'"]/;

const isValueObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);

/**
 * The value at a form path (`reward.title`, `items.0.name`, `items[0].name`) — the same lookup as react-hook-form's
 * `get`, written here so pure condition code runs without the form library's React build: a plain key is read
 * directly, a dotted or bracketed path step by step (`null` / `undefined` on the way yields `undefined`), prototype keys
 * are refused, and a path that resolves to nothing falls back to a key with that literal name.
 */
export function getFieldValue<T extends FieldValues, P extends Path<T>>(values: T, path: P): PathValue<T, P>;
export function getFieldValue(values: unknown, path: string): unknown {
  if (!path || !isValueObject(values)) return undefined;
  const keys = IS_KEY_RE.test(path) ? [path] : path.split(FIELD_PATH_RE).filter(Boolean);
  if (keys.some(key => PROTOTYPE_KEYWORDS.includes(key))) return undefined;
  let result: unknown = values;
  for (const key of keys) {
    result = result === null || result === undefined ? undefined : Reflect.get(Object(result), key);
  }
  return result === undefined || result === values ? values[path] : result;
}
