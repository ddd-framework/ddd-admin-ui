'use client';

import { useTranslate } from '../i18n/useTranslate.ts';
import { cn } from '../primitives/cn.ts';
import { Skeleton } from '../primitives/skeleton.tsx';
import { parseCsv } from './csvPreview.ts';
import { TEXT_PREVIEW_BYTES, type TextHead, useTextHead } from './useTextHead.ts';

export { TEXT_PREVIEW_BYTES } from './useTextHead.ts';

const CSV_MAX_ROWS = 100;
const CSV_MAX_COLUMNS = 20;

export interface TextPreviewProps {
  url: string;
  fileName: string;
  /** CSV as a small table; otherwise plain text. */
  asTable?: boolean;
  /** `canvas`: the text fills the height it is given instead of a box of fixed height. Default `drawer`. */
  layout?: 'drawer' | 'canvas';
  /** How much of the file is read (bytes); default the first 100 KB. */
  maxBytes?: number;
}

/** The sentence under a text that was cut at the read limit. */
export const TruncatedTextNote = ({ maxBytes }: { maxBytes: number }) => {
  const { t } = useTranslate();
  if (maxBytes === TEXT_PREVIEW_BYTES) return <p className="text-xs text-muted-foreground">{t('Showing the first 100 KB. Download the file to see all of it.')}</p>;
  return (
    <p className="text-xs text-muted-foreground">
      {t('Showing the first %size%. Download the file to see all of it.', { replacements: { size: formatLimit(maxBytes) } })}
    </p>
  );
};

const formatLimit = (bytes: number): string => (bytes >= 1024 * 1024 ? `${Math.round(bytes / (1024 * 1024))} MB` : `${Math.round(bytes / 1024)} KB`);

/** Three lines of skeleton while a text loads. */
export const TextPreviewSkeleton = () => (
  <div className="space-y-2" aria-hidden>
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-5/6" />
    <Skeleton className="h-4 w-2/3" />
  </div>
);

/** The text / CSV preview: the first 100 KB (or `maxBytes`), rendered as text nodes only (React escapes them). */
export const TextPreview = ({ url, fileName, asTable = false, layout = 'drawer', maxBytes = TEXT_PREVIEW_BYTES }: TextPreviewProps) => {
  const { t } = useTranslate();
  const head = useTextHead(url, maxBytes);
  const fills = layout === 'canvas';

  if (head.status === 'failed') return <p className="py-6 text-center text-[13px] text-muted-foreground">{t('This file could not be shown. Download it to open it.')}</p>;
  if (head.status === 'loading') return <TextPreviewSkeleton />;
  const loaded: TextHead = head;

  if (asTable) {
    const rows = parseCsv(loaded.text, CSV_MAX_ROWS);
    const [header, ...body] = rows;
    const columns = Math.min(Math.max(...rows.map(row => row.length), 0), CSV_MAX_COLUMNS);
    return (
      <div className={cn('space-y-2', fills && 'flex min-h-0 flex-1 flex-col')}>
        <section className={cn('overflow-auto rounded-lg border', fills ? 'min-h-0 flex-1' : 'max-h-96')} aria-label={t('Preview of %name%', { replacements: { name: fileName } })}>
          <table className="w-full text-left text-xs">
            {header && (
              <thead className="sticky top-0 bg-muted">
                <tr>
                  {Array.from({ length: columns }, (_, index) => (
                    <th key={index} className="px-2.5 py-1.5 font-semibold whitespace-nowrap">
                      {header[index] ?? ''}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody className="divide-y">
              {body.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {Array.from({ length: columns }, (_, index) => (
                    <td key={index} className="max-w-56 truncate px-2.5 py-1 whitespace-nowrap tabular-nums">
                      {row[index] ?? ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        {(loaded.truncated || rows.length >= CSV_MAX_ROWS) && (
          <p className="text-xs text-muted-foreground">
            {t('Showing the first %count% rows. Download the file to see all of it.', { replacements: { count: Math.min(rows.length, CSV_MAX_ROWS) } })}
          </p>
        )}
      </div>
    );
  }

  return (
    <section className={cn('space-y-2', fills && 'flex min-h-0 flex-1 flex-col')} aria-label={t('Preview of %name%', { replacements: { name: fileName } })}>
      <pre
        className={cn(
          'overflow-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap',
          fills ? 'min-h-0 flex-1' : 'max-h-96'
        )}
      >
        {loaded.text}
      </pre>
      {loaded.truncated && <TruncatedTextNote maxBytes={maxBytes} />}
    </section>
  );
};
