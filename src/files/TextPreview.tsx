'use client';

import { useEffect, useState } from 'react';

import { useTranslate } from '../i18n/useTranslate.ts';
import { Skeleton } from '../primitives/skeleton.tsx';
import { parseCsv } from './csvPreview.ts';

/** At most the first 100 KB are read; the download is cancelled after that. */
export const TEXT_PREVIEW_BYTES = 100 * 1024;
const CSV_MAX_ROWS = 100;
const CSV_MAX_COLUMNS = 20;

interface LoadedText {
  text: string;
  truncated: boolean;
}

/** Reads up to `limit` bytes of the URL as UTF-8 and cancels the rest of the download. */
const readTextHead = async (url: string, limit: number, signal: AbortSignal): Promise<LoadedText> => {
  const response = await fetch(url, { signal, credentials: 'omit' });
  if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  let truncated = false;
  while (received < limit) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
  }
  if (received >= limit) {
    truncated = true;
    await reader.cancel();
  }
  const bytes = new Uint8Array(Math.min(received, limit));
  let offset = 0;
  for (const chunk of chunks) {
    const part = chunk.subarray(0, Math.min(chunk.byteLength, bytes.byteLength - offset));
    bytes.set(part, offset);
    offset += part.byteLength;
    if (offset >= bytes.byteLength) break;
  }
  // `stream: true` keeps a multi-byte character cut at the limit from turning into garbage.
  return { text: new TextDecoder('utf-8', { fatal: false }).decode(bytes, { stream: truncated }), truncated };
};

export interface TextPreviewProps {
  url: string;
  fileName: string;
  /** CSV as a small table; otherwise plain text. */
  asTable?: boolean;
}

/** The text / CSV preview of the drawer: the first 100 KB, rendered as text nodes only (React escapes them). */
export const TextPreview = ({ url, fileName, asTable = false }: TextPreviewProps) => {
  const { t } = useTranslate();
  const [loaded, setLoaded] = useState<LoadedText | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoaded(null);
    setError(false);
    readTextHead(url, TEXT_PREVIEW_BYTES, controller.signal)
      .then(setLoaded)
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [url]);

  if (error) return <p className="py-6 text-center text-[13px] text-muted-foreground">{t('This file could not be shown. Download it to open it.')}</p>;
  if (!loaded) {
    return (
      <div className="space-y-2" aria-hidden>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  if (asTable) {
    const rows = parseCsv(loaded.text, CSV_MAX_ROWS);
    const [header, ...body] = rows;
    const columns = Math.min(Math.max(...rows.map(row => row.length), 0), CSV_MAX_COLUMNS);
    return (
      <div className="space-y-2">
        <section className="max-h-96 overflow-auto rounded-lg border" aria-label={t('Preview of %name%', { replacements: { name: fileName } })}>
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
    <section className="space-y-2" aria-label={t('Preview of %name%', { replacements: { name: fileName } })}>
      <pre className="max-h-96 overflow-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap">
        {loaded.text}
      </pre>
      {loaded.truncated && <p className="text-xs text-muted-foreground">{t('Showing the first 100 KB. Download the file to see all of it.')}</p>}
    </section>
  );
};
