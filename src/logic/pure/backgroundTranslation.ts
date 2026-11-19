/**
 * The progress of a translation that runs on the server (no React, no dependency): the parts of the watched runs
 * (one per record and language, as the host's api returns them) folded into one row per language, the rows that
 * `BackgroundTranslationControls` (`./translations`) draws.
 */

/** The status of one language's background translation. */
export type BackgroundTranslationStatus = 'pending' | 'running' | 'done' | 'failed';

/** Why texts of a language were not translated. */
export interface BackgroundTranslationFailure {
  /** The server's reason code (`PROVIDER_ERROR`, `BUDGET_EXCEEDED`, …); `OTHER` when the part names none. */
  reason: string;
  /** The properties that failed for this reason; empty when the message names none. */
  propertyNames: string[];
  /** The server's detail (the provider's message, …); `null` without one. */
  detail: string | null;
}

/** One row of the progress list: a language (or a full locale key) with its status and the failures of its parts. */
export interface BackgroundTranslationRow {
  /** A language code (`fr`) or a full key (`fr::FORMAL`); matched to the form's locale chips for the label. */
  locale: string;
  status: BackgroundTranslationStatus;
  failures: BackgroundTranslationFailure[];
}

/** A part of a run as the progress reads it: `QUEUED`, `RUNNING`, `COMPLETED` or `FAILED`. */
export interface BackgroundTranslationPart {
  id?: number | string | null;
  languageCode?: string | null;
  status?: string | null;
  failureReason?: string | null;
  failureMessage?: string | null;
}

const OPEN_PART_STATUSES = ['QUEUED', 'RUNNING'];
const ENDED_PART_STATUSES = ['COMPLETED', 'FAILED'];
const FAILURE_PIECE_PATTERN = /^([A-Z][A-Z_]*): (.*)$/;

/** Whether a part still waits for or is with a worker. */
export const isOpenTranslationPart = (part: BackgroundTranslationPart): boolean => OPEN_PART_STATUSES.includes(part.status ?? '');

/** Whether any part is still open (keep polling). */
export const hasOpenTranslationPart = (parts: readonly BackgroundTranslationPart[]): boolean => parts.some(isOpenTranslationPart);

/**
 * The ids of the parts that ended (completed or failed). A form compares them with the ids it has seen: a newly ended
 * part means the record holds newer texts (reload it and rebase the form).
 */
export const endedTranslationPartIds = (parts: readonly BackgroundTranslationPart[]): number[] =>
  parts
    .filter(part => ENDED_PART_STATUSES.includes(part.status ?? ''))
    .map(part => Number(part.id))
    .filter(id => Number.isFinite(id) && id > 0);

/**
 * A part's failure as reasons with their properties. The message form `REASON: property, property; REASON: property
 * (detail)` is read into one failure per reason (sharing the detail); any other message (a stalled part, a record that
 * is gone) is the detail of the part's own reason.
 */
export const parseTranslationFailureMessage = (
  failureReason: string | null | undefined,
  failureMessage: string | null | undefined
): BackgroundTranslationFailure[] => {
  const fallbackReason = failureReason || 'OTHER';
  const message = (failureMessage ?? '').trim();
  if (message === '') return [{ reason: fallbackReason, propertyNames: [], detail: null }];
  let body = message;
  let detail: string | null = null;
  const detailStart = message.indexOf(' (');
  if (detailStart > 0 && message.endsWith(')')) {
    body = message.slice(0, detailStart);
    detail = message.slice(detailStart + 2, -1).trim() || null;
  }
  const failures: BackgroundTranslationFailure[] = [];
  for (const piece of body.split('; ')) {
    const match = FAILURE_PIECE_PATTERN.exec(piece.trim());
    if (!match) return [{ reason: fallbackReason, propertyNames: [], detail: message }];
    failures.push({
      reason: match[1] ?? fallbackReason,
      propertyNames: (match[2] ?? '')
        .split(',')
        .map(propertyName => propertyName.trim())
        .filter(propertyName => propertyName !== ''),
      detail,
    });
  }
  return failures;
};

/**
 * One row per language, in the order the languages first appear: `running` while a part of the language is with a
 * worker, else `pending` while one waits, else `failed` when one failed (with every failure of the language), else
 * `done`. Language codes are lower-cased; a part without a language is skipped.
 */
export const translationProgressRowsOf = (parts: readonly BackgroundTranslationPart[]): BackgroundTranslationRow[] => {
  const byLanguage = new Map<string, BackgroundTranslationPart[]>();
  for (const part of parts) {
    const languageCode = (part.languageCode ?? '').toLowerCase();
    if (languageCode === '') continue;
    byLanguage.set(languageCode, [...(byLanguage.get(languageCode) ?? []), part]);
  }
  const rows: BackgroundTranslationRow[] = [];
  for (const [languageCode, languageParts] of byLanguage) {
    const failed = languageParts.filter(part => part.status === 'FAILED');
    const status: BackgroundTranslationStatus = languageParts.some(part => part.status === 'RUNNING')
      ? 'running'
      : languageParts.some(part => part.status === 'QUEUED')
        ? 'pending'
        : failed.length > 0
          ? 'failed'
          : 'done';
    rows.push({
      locale: languageCode,
      status,
      failures: failed.flatMap(part => parseTranslationFailureMessage(part.failureReason, part.failureMessage)),
    });
  }
  return rows;
};

/** Whether a row still waits or runs. */
export const isOpenTranslationRow = (row: BackgroundTranslationRow): boolean => row.status === 'pending' || row.status === 'running';

/**
 * The bare language of a content locale key, for naming a language to the server: `fr::FORMAL` → `fr`,
 * `pt-BR::FORMAL` → `pt`.
 */
export const translationLanguageCodeOf = (localeKey: string): string =>
  (localeKey.split('::')[0] ?? '').split(/[-_:]/)[0]?.toLowerCase() ?? '';

/** The distinct languages of the given locale keys, in their order. */
export const translationLanguageCodesOf = (localeKeys: readonly string[]): string[] => [
  ...new Set(localeKeys.map(translationLanguageCodeOf).filter(code => code !== '')),
];
