import { translateText } from '../../i18n/store.ts';

/**
 * Server-side validation violations of a DDD error body and where they belong in a form. Pure functions (no React),
 * so the mapping is unit-tested on its own; `FormErrors` applies them.
 */

/** One server-side validation violation (`validationErrors.elements[].elements[]` of a DDD error body). */
export interface FormValidationError {
  /** The violation's property as the server sent it (`placeOfResidence`). */
  propertyName: string;
  /**
   * Full dotted path: the entity's `jsonPath` (`.` for the validated root, `.setting.` for a nested object) plus the
   * property, array keys as segments (`teams[0].name` → `teams.0.name`). The form field it belongs to is matched on it.
   */
  path: string;
  errorMessage: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const elementsOf = (value: unknown): unknown[] => {
  if (!isRecord(value)) return [];
  const { elements } = value;
  return Array.isArray(elements) ? elements : [];
};

/** The dotted path of a violation: its entity's `jsonPath` plus its property path, `[key]` written as `.key`. */
export const violationPath = (jsonPath: unknown, propertyName: string): string =>
  `${typeof jsonPath === 'string' ? jsonPath : ''}.${propertyName}`
    .replace(/\[([^\]]*)\]/g, '.$1')
    .split('.')
    .filter(Boolean)
    .join('.');

/**
 * Flattens a DDD `validationErrors` body (a set of per-entity sets of violations, each with `propertyName` and
 * `errorMessage`, the set carrying the entity's `jsonPath`) into one list; anything else yields none.
 */
export const parseValidationErrors = (validationErrors: unknown): FormValidationError[] =>
  elementsOf(validationErrors).flatMap(group => {
    const jsonPath = isRecord(group) ? group.jsonPath : undefined;
    return elementsOf(group).flatMap(violation => {
      if (!isRecord(violation)) return [];
      const { propertyName, errorMessage } = violation;
      const property = typeof propertyName === 'string' && propertyName ? propertyName : 'unknown';
      return [
        {
          propertyName: property,
          path: violationPath(jsonPath, property) || property,
          errorMessage: typeof errorMessage === 'string' && errorMessage ? errorMessage : translateText('Unknown error'),
        },
      ];
    });
  });

/**
 * The form field a violation belongs to, among the fields the form shows (`fieldNames`), or `undefined`:
 *  1. `aliases` (server path → field name) for a field named differently from the property,
 *  2. the field named like the path,
 *  3. the path without its leading segments (a request wrapper or nested entity the form flattens:
 *     `account.placeOfResidence` → `placeOfResidence`),
 *  4. the entity's own texts in the form's `translations` group (`name` → `translations.name`),
 *  5. the one field nested under any other form group whose name ends in the path.
 */
export const matchViolationField = (
  path: string,
  fieldNames: Iterable<string>,
  aliases: Readonly<Record<string, string>> = {}
): string | undefined => {
  const names = new Set(fieldNames);
  const segments = path.split('.');
  for (let start = 0; start < segments.length; start++) {
    const candidate = segments.slice(start).join('.');
    const alias = aliases[candidate];
    if (alias) return alias;
    if (names.has(candidate)) return candidate;
  }
  if (names.has(`translations.${path}`)) return `translations.${path}`;
  const nested = [...names].filter(name => name.endsWith(`.${path}`));
  return nested.length === 1 ? nested[0] : undefined;
};

const humanizeSegment = (segment: string): string => {
  if (/^\d+$/.test(segment)) return `#${Number(segment) + 1}`;
  const words = segment
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** A readable name for a path no form field shows: `setting.maxSpeed` → `Setting › Max speed`. */
export const humanizeViolationPath = (path: string): string =>
  path
    .split('.')
    .filter(Boolean)
    .map(humanizeSegment)
    .join(' › ');
