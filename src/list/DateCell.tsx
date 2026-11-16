'use client';

import { useTranslate } from '../i18n/useTranslate.ts';
import { formatDate } from '../logic/pure/format.ts';

export interface DateCellProps {
  value: Date | string | number | null | undefined;
  /** IANA time zone; pass one for output that is equal on server and client. */
  timeZone?: string;
}

/** A table cell value: the date in the active language, or an em dash. Re-renders on a language switch. */
export const DateCell = ({ value, timeZone }: DateCellProps) => {
  const { languageCode } = useTranslate();
  if (value === null || value === undefined || value === '') return <span className="text-muted-foreground">—</span>;
  return (
    <time data-slot="date-cell" className="tabular-nums">
      {formatDate(value, { locale: languageCode, ...(timeZone ? { timeZone } : {}) })}
    </time>
  );
};
