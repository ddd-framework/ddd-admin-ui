'use client';

import { useEffect, useState } from 'react';

/** At most the first 100 KB are read by default; the download is cancelled after that. */
export const TEXT_PREVIEW_BYTES = 100 * 1024;
/** What a canvas reads of a text file (the first megabyte). */
export const TEXT_VIEWER_BYTES = 1024 * 1024;

export interface TextHead {
  text: string;
  /** The file is longer than what was read. */
  truncated: boolean;
}

/** Reads up to `limit` bytes of the URL as UTF-8 and cancels the rest of the download. */
export const readTextHead = async (url: string, limit: number, signal: AbortSignal): Promise<TextHead> => {
  const response = await fetch(url, { signal, credentials: 'omit' });
  if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  let truncated = false;
  while (received <= limit) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
  }
  if (received > limit) {
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

export type TextHeadState = { status: 'loading' } | { status: 'failed' } | ({ status: 'ready' } & TextHead);

/**
 * The head of a text file behind a URL: `loading`, then `ready` with at most `limit` bytes decoded as UTF-8, or
 * `failed`. Another URL reads again; the request of the previous one is aborted. The text is data: callers render it
 * as text nodes, never as HTML.
 */
export const useTextHead = (url: string, limit: number = TEXT_PREVIEW_BYTES): TextHeadState => {
  const [state, setState] = useState<{ key: string; value: TextHeadState }>({ key: '', value: { status: 'loading' } });
  const key = `${limit}:${url}`;

  useEffect(() => {
    const controller = new AbortController();
    readTextHead(url, limit, controller.signal)
      .then(head => setState({ key, value: { status: 'ready', ...head } }))
      .catch(() => {
        if (!controller.signal.aborted) setState({ key, value: { status: 'failed' } });
      });
    return () => controller.abort();
  }, [url, limit, key]);

  return state.key === key ? state.value : { status: 'loading' };
};
