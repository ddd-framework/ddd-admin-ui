import type { ReactNode } from 'react';

/**
 * Whether a dialog or drawer description is phrasing content (a string or a number) that fits the `<p>` of
 * `DialogDescription` / `SheetDescription`. Anything else (an element, a fragment, a list) may hold block content and
 * is rendered with `asChild` in a `<div>` with the same classes and id, so no `<p>` nests in a `<p>`.
 */
export const isInlineDescription = (description: ReactNode): boolean =>
  typeof description === 'string' || typeof description === 'number';
