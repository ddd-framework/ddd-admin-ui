// The database entry: the schema diff screen of Core's `DatabaseModelsControllerTrait` on the host's RTK Query api
// (`createDatabaseApi`), its parts, the generated-code previews, the payload types, the status maps and the pure helpers.

// API
export { buildDatabaseRequests, createDatabaseApi, createStaticDatabaseApi, DATABASE_TAG, databaseEndpointDefinitions } from './api.ts';
export type { CreateDatabaseApiOptions, DatabaseApi, StaticDatabaseData } from './api.ts';
export type * from './types.ts';

// Screens and parts
export { APPLY_ALL_PHRASE, APPLY_SELECTED_PHRASE, SchemaDiffScreen } from './SchemaDiffScreen.tsx';
export type { SchemaDiffScreenProps } from './SchemaDiffScreen.tsx';
export { SchemaDiffCard } from './SchemaDiffCard.tsx';
export type { SchemaDiffCardProps } from './SchemaDiffCard.tsx';
export { CodeBlock, downloadText, GeneratedCodePanel } from './GeneratedCode.tsx';
export type { CodeBlockProps, GeneratedCodeKind, GeneratedCodePanelProps } from './GeneratedCode.tsx';

// Status maps and helpers
export { DB_APPLY_BLOCKED_ICON, DB_DIFF_SEVERITY, DB_TABLE_CHANGE_TYPE } from './status.ts';
export {
  classifyApplyFailure,
  copyForcingDescriptionsOf,
  countDiffSeverities,
  DIFF_APPLY_LOCK_BUSY,
  DIFF_SIGNATURE_MISMATCH,
  diffSummary,
  entityClassNameOf,
  expectedSignaturesOf,
  formatTableSize,
  isApplicableDiff,
  isRiskyDiff,
  LARGE_TABLE_ROW_THRESHOLD,
  LARGE_TABLE_SIZE_THRESHOLD_MB,
  sqlScriptOf,
  sqlStatementsOf,
  withoutErrorCode,
} from './diff.ts';
export type { DBApplyFailure, DBApplyFailureKind, DBDiffSeverityCounts } from './diff.ts';
