'use client';

import { createContext, useContext, type ReactNode } from 'react';

/** Field name → visible label. One context for `./form`, `./translations` and `./media`. */
export type FieldLabels = Readonly<Record<string, string>>;

const FieldLabelsContext = createContext<FieldLabels>({});

export const FieldLabelsProvider = ({ labels, children }: { labels: FieldLabels; children: ReactNode }) => (
  <FieldLabelsContext.Provider value={labels}>{children}</FieldLabelsContext.Provider>
);

/** The label of a field, or its name when the form declares none. */
export const useFieldLabel = (name: string): string => useContext(FieldLabelsContext)[name] ?? name;
