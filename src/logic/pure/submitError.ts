import { normalizeDddError } from '@mgamadeus/ddd-web/contract';

import { type FormValidationError, parseValidationErrors } from './serverViolations.ts';

export { parseValidationErrors };
export type { FormValidationError };

/** A failed save, ready for `FormErrors`. */
export interface FormSubmitError {
  message: string;
  validationErrors: FormValidationError[];
}

/** Turns whatever a save rejected with into the banner's content. */
export const toFormSubmitError = (error: unknown, fallbackMessage: string): FormSubmitError => {
  const normalized = normalizeDddError(error, fallbackMessage);
  return { message: normalized.message, validationErrors: parseValidationErrors(normalized.validationErrors) };
};
