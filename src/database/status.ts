import { CirclePlus, Combine, PencilLine, ShieldCheck, Trash2, TriangleAlert, OctagonX } from 'lucide-react';

import { m } from '../i18n/store.ts';
import { defineStatusMap } from '../logic/pure/status.ts';
import type { DBTableChangeType, DBTableDiffSeverity } from './types.ts';

/** `DBTableDiff.changeType`. */
export const DB_TABLE_CHANGE_TYPE = defineStatusMap<DBTableChangeType>(
  {
    CREATE_TABLE: {
      label: m('Create table', { context: 'schema-diff-change' }),
      tone: 'info',
      icon: CirclePlus,
      description: m('The table exists for the entity but not in the database', { context: 'schema-diff-change' }),
    },
    ALTER_TABLE: {
      label: m('Alter table', { context: 'schema-diff-change' }),
      tone: 'neutral',
      icon: PencilLine,
      description: m('The table exists on both sides and differs', { context: 'schema-diff-change' }),
    },
    DROP_TABLE: {
      label: m('Drop table', { context: 'schema-diff-change' }),
      tone: 'danger',
      icon: Trash2,
      description: m('The table exists in the database but no entity defines it', { context: 'schema-diff-change' }),
    },
    NO_CHANGE: {
      label: m('No change', { context: 'schema-diff-change' }),
      tone: 'neutral',
      icon: ShieldCheck,
    },
  },
  { context: 'schema-diff-change' }
);

/** `DBTableDiff.severity`: whether applying it can lose or rewrite data. */
export const DB_DIFF_SEVERITY = defineStatusMap<DBTableDiffSeverity>(
  {
    ADDITIVE: {
      label: m('Additive', { context: 'schema-diff-severity' }),
      tone: 'success',
      icon: ShieldCheck,
      description: m('Only adds: no data is dropped or rewritten', { context: 'schema-diff-severity' }),
    },
    MIXED: {
      label: m('Mixed', { context: 'schema-diff-severity' }),
      tone: 'warning',
      icon: Combine,
      description: m('Adds and changes: some data may be rewritten', { context: 'schema-diff-severity' }),
    },
    DESTRUCTIVE: {
      label: m('Destructive', { context: 'schema-diff-severity' }),
      tone: 'danger',
      icon: TriangleAlert,
      description: m('Drops or narrows: data is lost or rewritten', { context: 'schema-diff-severity' }),
    },
  },
  { context: 'schema-diff-severity' }
);

/** The icon of a diff the production guard refuses to apply directly. */
export const DB_APPLY_BLOCKED_ICON = OctagonX;
