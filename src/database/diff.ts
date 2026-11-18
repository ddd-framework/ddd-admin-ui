import { normalizeDddError } from '@mgamadeus/ddd-web/contract';

import { formatUiNumber } from '../i18n/format.ts';
import { translateText } from '../i18n/store.ts';
import type { DBElements, DBExpectedDiffSignature, DBTableDiff } from './types.ts';

/** The error code of `DatabaseSchemaDiffService` for a diff that changed (or was applied) since it was shown. */
export const DIFF_SIGNATURE_MISMATCH = '[DIFF_SIGNATURE_MISMATCH]';
/** The error code of `DatabaseSchemaDiffService` while another apply holds the lock. */
export const DIFF_APPLY_LOCK_BUSY = '[DIFF_APPLY_LOCK_BUSY]';

/** The large-table production guard's thresholds (`DatabaseSchemaDiffService::LARGE_TABLE_*`), shown next to a blocked table. */
export const LARGE_TABLE_SIZE_THRESHOLD_MB = 100;
export const LARGE_TABLE_ROW_THRESHOLD = 100_000;

/** Counts of the pending diffs per severity. */
export interface DBDiffSeverityCounts {
  total: number;
  additive: number;
  mixed: number;
  destructive: number;
  /** Diffs the production guard refuses to apply directly. */
  blocked: number;
}

export const countDiffSeverities = (diffs: readonly DBTableDiff[]): DBDiffSeverityCounts => {
  const counts: DBDiffSeverityCounts = { total: diffs.length, additive: 0, mixed: 0, destructive: 0, blocked: 0 };
  for (const diff of diffs) {
    if (diff.severity === 'ADDITIVE') counts.additive += 1;
    else if (diff.severity === 'MIXED') counts.mixed += 1;
    else if (diff.severity === 'DESTRUCTIVE') counts.destructive += 1;
    if (diff.directApplyBlocked === true) counts.blocked += 1;
  }
  return counts;
};

/** A diff whose apply can drop or rewrite data (`DESTRUCTIVE` or `MIXED`). */
export const isRiskyDiff = (diff: DBTableDiff): boolean => diff.severity === 'DESTRUCTIVE' || diff.severity === 'MIXED';

/** A diff that can be applied from the screen: it has a table name and is not blocked by the production guard. */
export const isApplicableDiff = (diff: DBTableDiff): boolean => Boolean(diff.sqlTableName) && diff.directApplyBlocked !== true;

interface KindCounts {
  add: number;
  modify: number;
  drop: number;
}

const countKinds = (set: DBElements<{ changeKind?: string }> | undefined): KindCounts => {
  const counts: KindCounts = { add: 0, modify: 0, drop: 0 };
  for (const element of set?.elements ?? []) {
    if (element.changeKind === 'ADD') counts.add += 1;
    else if (element.changeKind === 'MODIFY') counts.modify += 1;
    else if (element.changeKind === 'DROP') counts.drop += 1;
  }
  return counts;
};

/** `+2 ±1 -3`, the parts that are not zero; `null` when all are. */
const signedCounts = ({ add, modify, drop }: KindCounts): string | null => {
  const parts: string[] = [];
  if (add) parts.push(`+${add}`);
  if (modify) parts.push(`±${modify}`);
  if (drop) parts.push(`-${drop}`);
  return parts.length > 0 ? parts.join(' ') : null;
};

/**
 * One line per table: `+2 ±1 -3 columns · -1 index · collation utf8mb4_general_ci → utf8mb4_unicode_ci`; a new or
 * dropped table says so.
 */
export const diffSummary = (diff: DBTableDiff): string => {
  if (diff.changeType === 'CREATE_TABLE') return translateText('New table');
  if (diff.changeType === 'DROP_TABLE') return translateText('Table dropped');
  const parts: string[] = [];
  const add = (counts: KindCounts, label: (count: number) => string) => {
    const signed = signedCounts(counts);
    if (signed) parts.push(`${signed} ${label(counts.add + counts.modify + counts.drop)}`);
  };
  add(countKinds(diff.columnDiffs), count => translateText('{count, plural, one {column} other {columns}}', { count }));
  add(countKinds(diff.virtualColumnDiffs), count => translateText('{count, plural, one {virtual column} other {virtual columns}}', { count }));
  add(countKinds(diff.indexDiffs), count => translateText('{count, plural, one {index} other {indexes}}', { count }));
  add(countKinds(diff.foreignKeyDiffs), count => translateText('{count, plural, one {foreign key} other {foreign keys}}', { count }));
  add(countKinds(diff.triggerDiffs), count => translateText('{count, plural, one {trigger} other {triggers}}', { count }));
  if (diff.collationChange) {
    parts.push(
      translateText('collation %from% → %to%', {
        replacements: { from: diff.collationChange.from ?? '?', to: diff.collationChange.to ?? '?' },
      })
    );
  }
  return parts.length > 0 ? parts.join(' · ') : translateText('No structural change');
};

/** `Namespace\Class` of the diff's entity; `null` without one (a DROP_TABLE). */
export const entityClassNameOf = (diff: DBTableDiff): string | null => {
  const name = diff.entityClassWithNamespace?.name;
  if (!name) return null;
  const namespace = diff.entityClassWithNamespace?.namespace;
  return namespace ? `${namespace}\\${name}` : name;
};

/** The executable statements in order, empty ones left out. */
export const sqlStatementsOf = (diff: DBTableDiff): string[] =>
  (diff.sqlStatements?.elements ?? [])
    .map(statement => statement.sql)
    .filter((sql): sql is string => typeof sql === 'string' && sql.trim() !== '');

/** The statements as one script, each numbered: `-- [1/3]` then the statement and `;`. */
export const sqlScriptOf = (diff: DBTableDiff): string => {
  const statements = sqlStatementsOf(diff);
  return statements.map((statement, index) => `-- [${index + 1}/${statements.length}]\n${statement.replace(/;\s*$/, '')};`).join('\n\n');
};

/** The copy-forcing operations of a blocked diff, as text. */
export const copyForcingDescriptionsOf = (diff: DBTableDiff): string[] =>
  (diff.copyForcingOperations?.elements ?? [])
    .map(operation => operation.description)
    .filter((description): description is string => typeof description === 'string' && description !== '');

/** `374 MB · 290,067 rows` (in the UI language); the known parts only, `null` when neither is known. */
export const formatTableSize = (diff: Pick<DBTableDiff, 'tableSizeMb' | 'tableRowCount'>): string | null => {
  const parts: string[] = [];
  if (typeof diff.tableSizeMb === 'number') parts.push(translateText('%size% MB', { replacements: { size: formatUiNumber(diff.tableSizeMb) } }));
  if (typeof diff.tableRowCount === 'number') {
    parts.push(
      translateText('{count, plural, one {# row} other {%rows% rows}}', {
        count: diff.tableRowCount,
        replacements: { rows: formatUiNumber(diff.tableRowCount) },
      })
    );
  }
  return parts.length > 0 ? parts.join(' · ') : null;
};

/** The signature of every shown diff that has one, as the applies send them (the server narrows them). */
export const expectedSignaturesOf = (diffs: readonly DBTableDiff[]): DBElements<DBExpectedDiffSignature> => ({
  elements: diffs.flatMap(diff =>
    diff.sqlTableName && diff.diffSignature ? [{ sqlTableName: diff.sqlTableName, signature: diff.diffSignature }] : []
  ),
});

/** What an apply's failure means for the screen. */
export type DBApplyFailureKind = 'signature-mismatch' | 'lock-busy' | 'forbidden' | 'not-found' | 'refused';

export interface DBApplyFailure {
  kind: DBApplyFailureKind;
  /** The server's message (with the error code), or the fallback. */
  message: string;
  status: number | string | null;
  /**
   * A 403 that is the schema-write refusal (`APP_SCHEMA_WRITES_DISABLED`: every write of the screen stays off), not
   * another refusal such as the access hook (only this request is refused). See `isSchemaWritesDisabledMessage`.
   */
  schemaWritesDisabled: boolean;
}

/** The start of Core's message for disabled schema writes (`getSchemaWritesDisabledMessage()`). */
export const SCHEMA_WRITES_DISABLED_MESSAGE_PATTERN = /schema writes are disabled/i;

/**
 * Whether a 403's message is the schema-write refusal: Core's default message (`Schema writes are disabled on this
 * process: …`). An application that rewords it (`getSchemaWritesDisabledMessage()`) passes its own test to the screen
 * (`SchemaDiffScreen.isSchemaWritesRefusal`).
 */
export const isSchemaWritesDisabledMessage = (message: string): boolean => SCHEMA_WRITES_DISABLED_MESSAGE_PATTERN.test(message);

/**
 * Sorts an apply's failure: `[DIFF_SIGNATURE_MISMATCH]` (the diff changed since it was shown: reload),
 * `[DIFF_APPLY_LOCK_BUSY]` (another apply runs: retry), 403 (schema writes are disabled on this process), 404 (no pending
 * diff: reload), anything else refused (the production guard, an invalid table list) with its message.
 */
export const classifyApplyFailure = (
  error: unknown,
  fallbackMessage: string,
  isSchemaWritesRefusal: (message: string) => boolean = isSchemaWritesDisabledMessage
): DBApplyFailure => {
  const normalized = normalizeDddError(error, fallbackMessage);
  const { message, status } = normalized;
  const failure = (kind: DBApplyFailureKind, schemaWritesDisabled = false): DBApplyFailure => ({ kind, message, status, schemaWritesDisabled });
  if (message.includes(DIFF_SIGNATURE_MISMATCH)) return failure('signature-mismatch');
  if (message.includes(DIFF_APPLY_LOCK_BUSY)) return failure('lock-busy');
  if (status === 403) return failure('forbidden', isSchemaWritesRefusal(message));
  if (status === 404) return failure('not-found');
  return failure('refused');
};

/** A diff the bulk applies can send: applicable and signed (an unsigned diff is reloaded first). */
export const isBulkApplicableDiff = (diff: DBTableDiff): boolean => isApplicableDiff(diff) && Boolean(diff.diffSignature);

/**
 * The tables whose diff changed between two loads (another signature than before; a table new to the list does not
 * count): the drift since the operator last looked.
 */
export const driftedTableNames = (previous: readonly DBTableDiff[], next: readonly DBTableDiff[]): string[] => {
  const before = new Map(previous.flatMap(diff => (diff.sqlTableName ? [[diff.sqlTableName, diff.diffSignature ?? ''] as const] : [])));
  return next.flatMap(diff => {
    const name = diff.sqlTableName;
    if (!name || !before.has(name)) return [];
    return before.get(name) !== (diff.diffSignature ?? '') ? [name] : [];
  });
};

/** The server's message without its leading error code (`[DIFF_SIGNATURE_MISMATCH] The diff …` → `The diff …`). */
export const withoutErrorCode = (message: string): string => message.replace(/^\s*\[[A-Z_]+\]\s*/, '');
