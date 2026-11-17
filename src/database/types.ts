/**
 * The payloads of Core's `DatabaseModelsControllerTrait` (mgamadeus/ddd 3.35.1 or later), as the endpoints serialise
 * them: every set is `{ elements: [...] }`; a `DBTableDiff` per table with a pending change. Typed here (no host SDK);
 * every field the screen does not need is optional, so an older or newer server stays readable.
 */

/** `DBTableDiff::CHANGE_TYPE_*`. */
export type DBTableChangeType = 'CREATE_TABLE' | 'DROP_TABLE' | 'ALTER_TABLE' | 'NO_CHANGE';

/** `DBTableDiff::SEVERITY_*`: whether applying it can lose or rewrite data. */
export type DBTableDiffSeverity = 'ADDITIVE' | 'DESTRUCTIVE' | 'MIXED';

/** `ADD` / `DROP` / `MODIFY` of a per-aspect diff. */
export type DBDiffChangeKind = 'ADD' | 'DROP' | 'MODIFY';

/** A `{ elements }` set as the framework serialises it. */
export interface DBElements<TElement> {
  elements?: TElement[];
}

/** `ClassWithNamespace` of the diff's entity. */
export interface DBEntityClass {
  name?: string;
  namespace?: string;
}

/** The live definition of a column, index, key or trigger (`DBCanonical*`), shown as is. */
export type DBCanonicalDefinition = Record<string, unknown>;

/** `DBColumnDiff`. */
export interface DBColumnDiff {
  columnName?: string;
  changeKind?: DBDiffChangeKind | string;
  currentDefinition?: DBCanonicalDefinition | null;
  /** The attributes a MODIFY changes (`type`, `nullable`, `default`, …). */
  changedAttributes?: string[];
  /** The column is reset in full (a VECTOR column, a type change the database cannot convert). */
  requiresFullReset?: boolean;
  resetSql?: string | null;
  sql?: string;
}

/** `DBVirtualColumnDiff`. */
export interface DBVirtualColumnDiff {
  columnName?: string;
  changeKind?: DBDiffChangeKind | string;
  currentDefinition?: DBCanonicalDefinition | null;
  changedAttributes?: string[];
  sql?: string;
}

/** `DBIndexDiff`. */
export interface DBIndexDiff {
  matchKey?: string;
  changeKind?: DBDiffChangeKind | string;
  currentIndexName?: string | null;
  targetDefinitionSql?: string | null;
  currentDefinition?: DBCanonicalDefinition | null;
  changedAttributes?: string[];
  sql?: string;
}

/** `DBForeignKeyDiff`. */
export interface DBForeignKeyDiff {
  matchKey?: string;
  changeKind?: DBDiffChangeKind | string;
  currentConstraintName?: string | null;
  currentDefinition?: DBCanonicalDefinition | null;
  changedAttributes?: string[];
  sql?: string;
}

/** `DBTriggerDiff`. */
export interface DBTriggerDiff {
  triggerName?: string;
  tableName?: string;
  changeKind?: DBDiffChangeKind | string;
  targetSql?: string | null;
  currentDefinition?: DBCanonicalDefinition | null;
  sql?: string;
}

/** `DBCollationChange`. */
export interface DBCollationChange {
  from?: string;
  to?: string;
}

/** `DBSqlStatement`: one executable statement, in execution order. */
export interface DBSqlStatement {
  sql?: string;
}

/** `DBCopyForcingOperation`: one operation that forces a table copy. */
export interface DBCopyForcingOperation {
  description?: string;
}

/** `DBTableDiff`: the pending change of one table. */
export interface DBTableDiff {
  sqlTableName?: string;
  /** Null for a DROP_TABLE (the table exists only in the database). */
  entityClassWithNamespace?: DBEntityClass | null;
  changeType?: DBTableChangeType | string;
  severity?: DBTableDiffSeverity | string;
  columnDiffs?: DBElements<DBColumnDiff>;
  virtualColumnDiffs?: DBElements<DBVirtualColumnDiff>;
  indexDiffs?: DBElements<DBIndexDiff>;
  foreignKeyDiffs?: DBElements<DBForeignKeyDiff>;
  triggerDiffs?: DBElements<DBTriggerDiff>;
  collationChange?: DBCollationChange | null;
  /** The statements joined for display. */
  sql?: string;
  /** The statements in execution order. */
  sqlStatements?: DBElements<DBSqlStatement>;
  /** Digest of the diff as shown; sent back with every apply (the signature gate). */
  diffSignature?: string | null;
  /** Live size in MB; null for a CREATE_TABLE. */
  tableSizeMb?: number | null;
  /** Estimated rows; null for a CREATE_TABLE. */
  tableRowCount?: number | null;
  /** The large-table production guard refuses a direct apply: no Apply action for it. */
  directApplyBlocked?: boolean;
  directApplyBlockReason?: string | null;
  copyForcingOperations?: DBElements<DBCopyForcingOperation> | null;
}

/** `DBTableDiffsGetResponseDto` (`GET /diff`, and the answer of both applies: the diff computed afterwards). */
export interface DBTableDiffsResponse {
  diffs: DBElements<DBTableDiff>;
}

/** `DBExpectedDiffSignature`. */
export interface DBExpectedDiffSignature {
  sqlTableName: string;
  signature: string;
}

/** `ApplyDiffRequestDto` (`POST /applyDiff`). */
export interface ApplyDiffArg {
  sqlTableName: string;
  /** The `diffSignature` the operator saw; a changed diff is refused with `[DIFF_SIGNATURE_MISMATCH]`. */
  expectedDiffSignature?: string | null;
  /** Default true (MariaDB). */
  disableForeignKeyChecks?: boolean;
}

/** `ApplyDiffsRequestDto` (`POST /applyDiffs`). */
export interface ApplyDiffsArg {
  /** The tables to apply, a flat list of names; `null` applies every pending diff (an empty list is refused). */
  sqlTableNames: string[] | null;
  /** The signature of every diff the operator saw; narrowed by the server to `sqlTableNames`. */
  expectedDiffSignatures?: DBElements<DBExpectedDiffSignature> | null;
  disableForeignKeyChecks?: boolean;
}

/** `GET /generateForEntity?entityName=` (short or fully qualified class name). */
export interface DoctrineModelForEntityArg {
  entityName: string;
}
