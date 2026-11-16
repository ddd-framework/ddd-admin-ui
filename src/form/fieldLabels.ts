'use client';

import { createContext, type ReactNode, useContext, useEffect } from 'react';

interface FieldLabelEntry {
  label: ReactNode;
  owner: symbol;
}

/**
 * The labels of the fields a `<Form>` shows, by field name. Bound fields register themselves while mounted, so
 * `FormErrors` can put a server violation on its field and name it by its label instead of the property path.
 */
export type FormFieldLabels = Map<string, FieldLabelEntry>;

export const FormFieldLabelsContext = createContext<FormFieldLabels | null>(null);

/** The registry of the surrounding `<Form>` (`null` outside one). */
export const useFormFieldLabels = (): FormFieldLabels | null => useContext(FormFieldLabelsContext);

/** Registers a mounted field's label under its name (no-op outside a `<Form>` or without a label). */
export const useRegisterFieldLabel = (name: string, label: ReactNode): void => {
  const labels = useContext(FormFieldLabelsContext);
  useEffect(() => {
    if (!labels || label === undefined || label === null || label === false) return;
    const owner = Symbol(name);
    labels.set(name, { label, owner });
    return () => {
      if (labels.get(name)?.owner === owner) labels.delete(name);
    };
  });
};
