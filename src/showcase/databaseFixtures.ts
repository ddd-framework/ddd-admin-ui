// Sample payloads of the ./database endpoints (Core's DatabaseModelsControllerTrait): five pending table diffs (an
// additive change, a mixed one, a new table, a dropped table, a large table the production guard blocks), the
// generated SQL and model code. The showcase and the consumer checks render the screen with them through
// `createStaticDatabaseApi`; a host can use them in its own design reviews.
import type { StaticDatabaseData } from '../database/api.ts';
import type { DBTableDiff, DBTableDiffsResponse } from '../database/types.ts';

const ENTITY_NAMESPACE = 'App\\Domain\\Shop\\Entities';

const accounts: DBTableDiff = {
  sqlTableName: 'Accounts',
  entityClassWithNamespace: { name: 'Account', namespace: 'App\\Domain\\Common\\Entities\\Accounts' },
  changeType: 'ALTER_TABLE',
  severity: 'ADDITIVE',
  columnDiffs: {
    elements: [
      { columnName: 'lastLoginAt', changeKind: 'ADD', changedAttributes: [], sql: 'ADD COLUMN `lastLoginAt` DATETIME NULL' },
      { columnName: 'locale', changeKind: 'ADD', changedAttributes: [], sql: "ADD COLUMN `locale` VARCHAR(16) NOT NULL DEFAULT 'en'" },
    ],
  },
  virtualColumnDiffs: { elements: [] },
  indexDiffs: { elements: [{ matchKey: 'lastLoginAt', changeKind: 'ADD', currentIndexName: null, changedAttributes: [] }] },
  foreignKeyDiffs: { elements: [] },
  triggerDiffs: { elements: [] },
  collationChange: null,
  sqlStatements: {
    elements: [
      { sql: "ALTER TABLE `Accounts` ADD COLUMN `lastLoginAt` DATETIME NULL, ADD COLUMN `locale` VARCHAR(16) NOT NULL DEFAULT 'en'" },
      { sql: 'CREATE INDEX `idx_lastLoginAt` ON `Accounts` (`lastLoginAt`)' },
    ],
  },
  diffSignature: 'a1f3c09e5b2d47e8a6c1f0b9d3e2a7c4',
  tableSizeMb: 12,
  tableRowCount: 48_210,
  directApplyBlocked: false,
  directApplyBlockReason: null,
  copyForcingOperations: null,
};

const orders: DBTableDiff = {
  sqlTableName: 'Orders',
  entityClassWithNamespace: { name: 'Order', namespace: ENTITY_NAMESPACE },
  changeType: 'ALTER_TABLE',
  severity: 'MIXED',
  columnDiffs: {
    elements: [
      { columnName: 'deliveryNote', changeKind: 'ADD', changedAttributes: [] },
      { columnName: 'total', changeKind: 'MODIFY', changedAttributes: ['type', 'nullable'] },
      { columnName: 'legacyCode', changeKind: 'DROP', changedAttributes: [] },
    ],
  },
  virtualColumnDiffs: { elements: [] },
  indexDiffs: { elements: [{ matchKey: 'legacyCode', changeKind: 'DROP', currentIndexName: 'idx_legacyCode', changedAttributes: [] }] },
  foreignKeyDiffs: { elements: [{ matchKey: 'accountId->Accounts.id', changeKind: 'MODIFY', currentConstraintName: 'fk_Orders_accountId', changedAttributes: ['onDelete'] }] },
  triggerDiffs: { elements: [] },
  collationChange: { from: 'utf8mb4_general_ci', to: 'utf8mb4_unicode_ci' },
  sqlStatements: {
    elements: [
      { sql: 'ALTER TABLE `Orders` DROP FOREIGN KEY `fk_Orders_accountId`' },
      { sql: 'DROP INDEX `idx_legacyCode` ON `Orders`' },
      { sql: 'ALTER TABLE `Orders` ADD COLUMN `deliveryNote` TEXT NULL, MODIFY COLUMN `total` DECIMAL(12,2) NOT NULL, DROP COLUMN `legacyCode`' },
      { sql: 'ALTER TABLE `Orders` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci' },
      { sql: 'ALTER TABLE `Orders` ADD CONSTRAINT `fk_Orders_accountId` FOREIGN KEY (`accountId`) REFERENCES `Accounts` (`id`) ON DELETE CASCADE' },
    ],
  },
  diffSignature: '7b9e2d14c6a84f03b5d1e8c2a9f7046d',
  tableSizeMb: 64,
  tableRowCount: 81_532,
  directApplyBlocked: false,
  directApplyBlockReason: null,
  copyForcingOperations: null,
};

const auditEntries: DBTableDiff = {
  sqlTableName: 'AuditEntries',
  entityClassWithNamespace: { name: 'AuditEntry', namespace: 'App\\Domain\\Common\\Entities\\Audit' },
  changeType: 'CREATE_TABLE',
  severity: 'ADDITIVE',
  columnDiffs: { elements: [] },
  virtualColumnDiffs: { elements: [] },
  indexDiffs: { elements: [] },
  foreignKeyDiffs: { elements: [] },
  triggerDiffs: { elements: [] },
  collationChange: null,
  sqlStatements: {
    elements: [
      {
        sql: 'CREATE TABLE `AuditEntries` (\n  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,\n  `action` VARCHAR(64) NOT NULL,\n  `created` DATETIME NOT NULL,\n  PRIMARY KEY (`id`)\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
      },
    ],
  },
  diffSignature: '3c5a8e71f2d94b06a7e1c3d5f9b2084e',
  tableSizeMb: null,
  tableRowCount: null,
  directApplyBlocked: false,
  directApplyBlockReason: null,
  copyForcingOperations: null,
};

const exportJobs: DBTableDiff = {
  sqlTableName: 'ExportJobs',
  entityClassWithNamespace: null,
  changeType: 'DROP_TABLE',
  severity: 'DESTRUCTIVE',
  columnDiffs: { elements: [] },
  virtualColumnDiffs: { elements: [] },
  indexDiffs: { elements: [] },
  foreignKeyDiffs: { elements: [] },
  triggerDiffs: { elements: [] },
  collationChange: null,
  sqlStatements: { elements: [{ sql: 'DROP TABLE `ExportJobs`' }] },
  diffSignature: '9d02f6b3a8c14e57b0f2d6a9c3e5178b',
  tableSizeMb: 3,
  tableRowCount: 1_204,
  directApplyBlocked: false,
  directApplyBlockReason: null,
  copyForcingOperations: null,
};

const products: DBTableDiff = {
  sqlTableName: 'Products',
  entityClassWithNamespace: { name: 'Product', namespace: ENTITY_NAMESPACE },
  changeType: 'ALTER_TABLE',
  severity: 'DESTRUCTIVE',
  columnDiffs: { elements: [{ columnName: 'description', changeKind: 'MODIFY', changedAttributes: ['type', 'length'] }] },
  virtualColumnDiffs: { elements: [] },
  indexDiffs: { elements: [] },
  foreignKeyDiffs: { elements: [] },
  triggerDiffs: { elements: [] },
  collationChange: null,
  sqlStatements: { elements: [{ sql: 'ALTER TABLE `Products` MODIFY COLUMN `description` VARCHAR(500) NULL' }] },
  diffSignature: '5e7c1a93d0b84f26c8a3e1f7b5d9024a',
  tableSizeMb: 374,
  tableRowCount: 290_067,
  directApplyBlocked: true,
  directApplyBlockReason: 'The table is above the large-table thresholds and the diff forces ALGORITHM=COPY.',
  copyForcingOperations: { elements: [{ description: 'MODIFY COLUMN `description`: a type change (TEXT → VARCHAR) rewrites the table' }] },
};

const ALL_DIFFS = [accounts, auditEntries, exportJobs, orders, products];

/** The sample diff without the given tables (what an apply answers). */
const withoutTables = (names: readonly string[]): DBTableDiffsResponse => ({
  diffs: { elements: ALL_DIFFS.filter(diff => !names.includes(diff.sqlTableName ?? '')) },
});

const TABLES_SQL = `CREATE TABLE IF NOT EXISTS \`Accounts\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`email\` VARCHAR(255) NOT NULL,
  \`lastLoginAt\` DATETIME NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uniq_email\` (\`email\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`Orders\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`accountId\` INT UNSIGNED NOT NULL,
  \`total\` DECIMAL(12,2) NOT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const modelCode = (entity: string, table: string) => `<?php

declare(strict_types=1);

namespace App\\Domain\\Shop\\Repo\\DB;

use Doctrine\\ORM\\Mapping as ORM;

#[ORM\\Entity]
#[ORM\\Table(name: '${table}')]
class DB${entity}Model
{
    #[ORM\\Id]
    #[ORM\\GeneratedValue]
    #[ORM\\Column(type: 'integer')]
    public int $id;
}
`;

/** Sample payloads of the database endpoints (five pending diffs, one of them blocked; the generated code). */
export const showcaseDatabaseData: StaticDatabaseData = {
  diff: { diffs: { elements: ALL_DIFFS } },
  applyDiff: ({ sqlTableName }) => withoutTables([sqlTableName]),
  applyDiffs: ({ sqlTableNames }) =>
    withoutTables(sqlTableNames ?? ALL_DIFFS.filter(diff => diff.directApplyBlocked !== true).map(diff => diff.sqlTableName ?? '')),
  databaseTablesSql: TABLES_SQL,
  doctrineModelsCode: `${modelCode('Account', 'Accounts')}\n${modelCode('Order', 'Orders')}`,
  doctrineModelForEntity: ({ entityName }) => modelCode(entityName.replace(/^.*\\/, ''), `${entityName.replace(/^.*\\/, '')}s`),
};
