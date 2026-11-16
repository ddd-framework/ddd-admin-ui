'use client';

import { CircleAlert } from 'lucide-react';
import { type ReactNode, useEffect } from 'react';
import { type FieldValues, type Path, type UseFormReturn, useFormContext } from 'react-hook-form';

import { Alert, AlertDescription, AlertTitle } from '../primitives/index.ts';
import { translateText } from '../i18n/index.ts';
import { useFormFieldLabels } from './fieldLabels.ts';
import { humanizeViolationPath, matchViolationField } from '../logic/pure/serverViolations.ts';
import type { FormSubmitError } from '../logic/pure/submitError.ts';

export interface FormErrorsProps {
  error: FormSubmitError | null;
  /**
   * Server path → form field name, for a field named differently from the entity property (`bikeType` →
   * `bikeTypeId`). Fields named like the property (or nested under a form group, `translations.name`) match on
   * their own.
   */
  fieldPaths?: Readonly<Record<string, string>>;
  /** Server path → label, for a violation on a property no field of the form shows. */
  labels?: Readonly<Record<string, ReactNode>>;
  className?: string;
}

/**
 * The server's answer to a failed save, kept in the form: its message plus every validation violation (the toast
 * from `notify.submitError` goes away; this list stays until the next submit). Inside a `<Form>`, a violation whose
 * path matches a shown field is also set as that field's error (cleared by the next submit or a valid edit) and is
 * named here by the field's label; any other violation by `labels` or its humanised path, never the raw path.
 */
export const FormErrors = ({ error, fieldPaths, labels, className }: FormErrorsProps) => {
  // `null` outside a `<Form>`: the banner still lists the violations, nothing is set on fields.
  const form: UseFormReturn<FieldValues> | null = useFormContext<FieldValues>();
  const fieldLabels = useFormFieldLabels();

  const rows = (error?.validationErrors ?? []).map(violation => {
    const fieldName = fieldLabels ? matchViolationField(violation.path, fieldLabels.keys(), fieldPaths) : undefined;
    const label =
      (fieldName ? fieldLabels?.get(fieldName)?.label : undefined) ??
      labels?.[violation.path] ??
      translateText(humanizeViolationPath(violation.path));
    return { violation, fieldName, label };
  });

  // Each new error puts its violations on their fields (several on one field: one message).
  // biome-ignore lint/correctness/useExhaustiveDependencies: applied once per failed save (the error object)
  useEffect(() => {
    if (!form) return;
    const messages = new Map<string, string[]>();
    for (const { violation, fieldName } of rows) {
      if (!fieldName) continue;
      messages.set(fieldName, [...(messages.get(fieldName) ?? []), violation.errorMessage]);
    }
    for (const [name, fieldMessages] of messages) {
      form.setError(name as Path<FieldValues>, { type: 'server', message: fieldMessages.join(' ') });
    }
  }, [error]);

  if (!error) return null;
  return (
    <Alert variant="destructive" className={className}>
      <CircleAlert aria-hidden />
      <AlertTitle>{error.message}</AlertTitle>
      {rows.length > 0 && (
        <AlertDescription>
          <ul className="list-disc space-y-0.5 pl-4">
            {rows.map(({ violation, label }) => (
              <li key={`${violation.path}:${violation.errorMessage}`}>
                <span className="font-semibold">{label}</span>: {violation.errorMessage}
              </li>
            ))}
          </ul>
        </AlertDescription>
      )}
    </Alert>
  );
};
