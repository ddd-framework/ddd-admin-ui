import { normalizeDddError } from '@mgamadeus/ddd-web/contract';

import { translateDddErrorBody } from '../i18n/serverMessages.ts';
import { translateText } from '../i18n/store.ts';

/**
 * How one upload reaches the API — supplied by the host's adapter, so this helper honours the same contract as the
 * host's base query without importing a store, a token or an API:
 * - `isWriteAllowed()` is the client half of a write guard; `false` refuses the upload before any request
 *   (`UploadError` `WRITE_LOCKED`).
 * - `getHeaders()` is read fresh before every attempt (the session's Bearer, client markers); `null` = no session
 *   (`UNAUTHENTICATED`, no request).
 * - `renew()` runs after a 401 and resolves `true` when a new token is in place: the upload is then sent once more.
 * - `onResponse` sees every response's headers.
 */
export interface UploadTransport {
  /** API origin; `''` = same origin. */
  baseUrl: string;
  isWriteAllowed: () => boolean;
  getHeaders: () => Readonly<Record<string, string>> | null;
  renew: () => Promise<boolean>;
  onResponse?: (readHeader: (name: string) => string | null) => void;
}

/** One multipart upload: a form field with the JSON envelope plus exactly one file. */
export interface UploadRequest {
  /** Path relative to `baseUrl`. */
  path: string;
  /** The JSON envelope, sent as the form field `bodyField`. */
  body: unknown;
  file: File;
  /** Default `file`. */
  fileField?: string;
  /** Default `body` (a DDD `RequestDto` reads the JSON of a multipart request from it). */
  bodyField?: string;
  /** Default `POST`. */
  method?: 'POST' | 'PUT';
}

export interface UploadProgressCallbacks {
  /** Bytes sent so far of the request body (≈ the file). */
  onProgress?: (loaded: number, total: number) => void;
  /** Aborting cancels the request (`UploadError` `ABORTED`). */
  signal?: AbortSignal;
}

/** Why an upload failed: an HTTP status, or one of the client-side reasons. */
export type UploadFailure = number | 'ABORTED' | 'NETWORK' | 'WRITE_LOCKED' | 'UNAUTHENTICATED';

export class UploadError extends Error {
  readonly failure: UploadFailure;
  /** The backend's `validationErrors`, when the response carried them. */
  readonly validationErrors: unknown;

  constructor(failure: UploadFailure, message: string, validationErrors: unknown = null) {
    super(message);
    this.name = 'UploadError';
    this.failure = failure;
    this.validationErrors = validationErrors;
  }
}

export const isUploadAborted = (error: unknown): boolean =>
  (error instanceof UploadError && error.failure === 'ABORTED') || (error instanceof Error && error.name === 'AbortError');

/** The message to show for a failed upload (an `UploadError`, or anything an adapter rejected with). */
export const uploadErrorMessage = (error: unknown): string =>
  error instanceof Error && error.name === 'UploadError' ? error.message : normalizeDddError(error, translateText('Upload failed')).message;

interface XhrOutcome {
  status: number;
  body: unknown;
}

const parseBody = (xhr: XMLHttpRequest): unknown => {
  const text = xhr.responseText;
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const send = (
  transport: UploadTransport,
  request: UploadRequest,
  headers: Readonly<Record<string, string>>,
  { onProgress, signal }: UploadProgressCallbacks
): Promise<XhrOutcome> =>
  new Promise<XhrOutcome>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new UploadError('ABORTED', translateText('Upload cancelled')));
      return;
    }
    const formData = new FormData();
    formData.append(request.bodyField ?? 'body', JSON.stringify(request.body));
    formData.append(request.fileField ?? 'file', request.file, request.file.name);

    const xhr = new XMLHttpRequest();
    const onAbort = () => xhr.abort();
    signal?.addEventListener('abort', onAbort, { once: true });
    const done = () => signal?.removeEventListener('abort', onAbort);

    xhr.open(request.method ?? 'POST', `${transport.baseUrl}${request.path}`);
    // The browser sets the multipart boundary itself; only the session and client headers are added.
    for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = event => {
      if (event.lengthComputable) onProgress?.(event.loaded, event.total);
    };
    xhr.onload = () => {
      done();
      transport.onResponse?.(name => xhr.getResponseHeader(name));
      resolve({ status: xhr.status, body: parseBody(xhr) });
    };
    xhr.onerror = () => {
      done();
      reject(new UploadError('NETWORK', translateText('The upload did not reach the server. Check the connection and try again.')));
    };
    xhr.onabort = () => {
      done();
      reject(new UploadError('ABORTED', translateText('Upload cancelled')));
    };
    xhr.send(formData);
  });

const failureOf = (outcome: XhrOutcome): UploadError => {
  const normalized = normalizeDddError({ status: outcome.status, data: translateDddErrorBody(outcome.body) }, translateText('Upload failed'));
  return new UploadError(outcome.status, normalized.message, normalized.validationErrors);
};

/**
 * Uploads one file with progress (XHR: `fetch` has no upload progress). Resolves with the parsed JSON response (the
 * adapter maps it onto a `FileView`); rejects with an `UploadError` (write guard, no session, network, cancelled, or the
 * backend's message for an HTTP error). A 401 renews the session through the transport and retries once.
 */
export const uploadWithProgress = async (
  transport: UploadTransport,
  request: UploadRequest,
  callbacks: UploadProgressCallbacks = {}
): Promise<unknown> => {
  if (!transport.isWriteAllowed()) {
    throw new UploadError('WRITE_LOCKED', translateText('Writes are switched off on this server.'));
  }
  const attempt = async (): Promise<XhrOutcome> => {
    const headers = transport.getHeaders();
    if (!headers) throw new UploadError('UNAUTHENTICATED', translateText('Your session has ended. Log in again to upload.'));
    return send(transport, request, headers, callbacks);
  };

  let outcome = await attempt();
  if (outcome.status === 401 && (await transport.renew())) {
    callbacks.onProgress?.(0, request.file.size);
    outcome = await attempt();
  }
  if (outcome.status === 401) throw new UploadError(401, translateText('Your session has ended. Log in again to upload.'));
  if (outcome.status < 200 || outcome.status >= 300) throw failureOf(outcome);
  return outcome.body;
};
