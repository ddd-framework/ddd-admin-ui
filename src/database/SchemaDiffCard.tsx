'use client';

import { ChevronDown, Database, Play } from 'lucide-react';
import { useState } from 'react';

import { formatUiNumber } from '../i18n/format.ts';
import { type TranslateFn, useTranslate } from '../i18n/useTranslate.ts';
import { useWriteAccess } from '../logic/react/writeAccess.ts';
import { StatusBadge } from '../list/StatusBadge.tsx';
import { StatusCallout } from '../page/StatusCallout.tsx';
import { Button } from '../primitives/button.tsx';
import { Card, CardContent } from '../primitives/card.tsx';
import { Checkbox } from '../primitives/checkbox.tsx';
import { cn } from '../primitives/cn.ts';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../primitives/collapsible.tsx';
import { CodeBlock } from './GeneratedCode.tsx';
import {
  copyForcingDescriptionsOf,
  diffSummary,
  entityClassNameOf,
  formatTableSize,
  isRiskyDiff,
  LARGE_TABLE_ROW_THRESHOLD,
  LARGE_TABLE_SIZE_THRESHOLD_MB,
  sqlScriptOf,
  sqlStatementsOf,
} from './diff.ts';
import { DB_APPLY_BLOCKED_ICON, DB_DIFF_SEVERITY, DB_TABLE_CHANGE_TYPE } from './status.ts';
import type { DBTableDiff } from './types.ts';
import type { StatusMap } from '../logic/pure/status.ts';

// plain strings on the wire: a value the maps do not know shows as a neutral badge with it
const CHANGE_TYPE_MAP: StatusMap = DB_TABLE_CHANGE_TYPE;
const SEVERITY_MAP: StatusMap = DB_DIFF_SEVERITY;

/** One row of the per-aspect list: what changes, its name, the attributes a MODIFY changes. */
interface AspectRow {
  key: string;
  aspect: string;
  kind: string;
  name: string;
  attributes: string[];
  note?: string;
}

const KIND_MARK: Record<string, string> = { ADD: '+', DROP: '−', MODIFY: '±' };

const aspectRowsOf = (diff: DBTableDiff, t: TranslateFn): AspectRow[] => {
  const rows: AspectRow[] = [];
  const push = (aspect: string, elements: readonly { changeKind?: string; changedAttributes?: string[] }[] | undefined, nameOf: (element: never) => string | null | undefined, noteOf?: (element: never) => string | undefined) => {
    (elements ?? []).forEach((element, index) => {
      rows.push({
        key: `${aspect}-${index}`,
        aspect,
        kind: element.changeKind ?? '',
        name: nameOf(element as never) || '—',
        attributes: element.changeKind === 'MODIFY' ? (element.changedAttributes ?? []) : [],
        note: noteOf?.(element as never),
      });
    });
  };
  push(t('Column'), diff.columnDiffs?.elements, (element: { columnName?: string }) => element.columnName, (element: { requiresFullReset?: boolean }) =>
    element.requiresFullReset ? t('reset in full') : undefined
  );
  push(t('Virtual column'), diff.virtualColumnDiffs?.elements, (element: { columnName?: string }) => element.columnName);
  push(t('Index'), diff.indexDiffs?.elements, (element: { currentIndexName?: string | null; matchKey?: string }) => element.currentIndexName ?? element.matchKey);
  push(
    t('Foreign key'),
    diff.foreignKeyDiffs?.elements,
    (element: { currentConstraintName?: string | null; matchKey?: string }) => element.currentConstraintName ?? element.matchKey
  );
  push(t('Trigger'), diff.triggerDiffs?.elements, (element: { triggerName?: string }) => element.triggerName);
  return rows;
};

export interface SchemaDiffCardProps {
  diff: DBTableDiff;
  /** Applies this table's diff (the screen confirms and sends the signature); absent on a blocked diff. */
  onApply?: (diff: DBTableDiff) => void;
  /** This table's apply is running. */
  isApplying?: boolean;
  /** Another apply runs: Apply is off. */
  busy?: boolean;
  /** The selection checkbox (`Apply selected`); absent = no checkbox. */
  selected?: boolean;
  onSelectedChange?: (selected: boolean) => void;
  /** The details (per-aspect changes and statements) start open. */
  defaultExpanded?: boolean;
}

/**
 * One table with a pending change: name, entity class, change type, severity, size, the summary, Apply, and folded
 * details (per-aspect changes with the attributes a MODIFY changes, the statements in execution order). A diff the
 * production guard blocks has no Apply action at all and says why, with the table's size against the thresholds and
 * the operations that force a table copy.
 */
export const SchemaDiffCard = ({
  diff,
  onApply,
  isApplying = false,
  busy = false,
  selected,
  onSelectedChange,
  defaultExpanded = false,
}: SchemaDiffCardProps) => {
  const { t } = useTranslate();
  const writeAccess = useWriteAccess();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const tableName = diff.sqlTableName ?? '';
  const entityClass = entityClassNameOf(diff);
  const blocked = diff.directApplyBlocked === true;
  const size = formatTableSize(diff);
  const statements = sqlStatementsOf(diff);
  const aspects = aspectRowsOf(diff, t);
  const copyForcing = copyForcingDescriptionsOf(diff);
  const missingSignature = !diff.diffSignature;
  const applyDisabledReason = !writeAccess.allowed
    ? (writeAccess.reason ?? t('Writes are switched off'))
    : missingSignature
      ? t('This diff has no signature: reload it first.')
      : undefined;

  return (
    <Card
      data-slot="schema-diff-card"
      data-table={tableName}
      data-blocked={blocked ? '' : undefined}
      aria-label={t('Diff of %table%', { replacements: { table: tableName } })}
      className={cn('min-w-0 gap-0 py-0', blocked && 'ring-2 ring-destructive/40')}
    >
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          {onSelectedChange && !blocked && (
            <Checkbox
              className="mt-1"
              checked={selected === true}
              onCheckedChange={value => onSelectedChange(value === true)}
              disabled={busy || !writeAccess.allowed}
              aria-label={t('Select %table%', { replacements: { table: tableName } })}
            />
          )}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <code className="font-mono text-sm font-semibold break-all">{tableName}</code>
              <StatusBadge value={diff.changeType} map={CHANGE_TYPE_MAP} />
              <StatusBadge value={diff.severity} map={SEVERITY_MAP} />
              {size && <StatusBadge tone="neutral" icon={Database} label={size} />}
              {blocked && <StatusBadge tone="danger" icon={DB_APPLY_BLOCKED_ICON} label={t('Apply blocked')} />}
            </div>
            {entityClass && (
              <p className="truncate font-mono text-xs text-muted-foreground" title={entityClass}>
                {entityClass}
              </p>
            )}
            <p className="text-sm text-muted-foreground">{diffSummary(diff)}</p>
          </div>
          {!blocked && onApply && (
            <span className="inline-flex shrink-0 self-start" title={applyDisabledReason}>
              <Button
                type="button"
                variant={isRiskyDiff(diff) ? 'outline' : 'default'}
                size="sm"
                disabled={busy || Boolean(applyDisabledReason)}
                onClick={() => {
                  if (!writeAccess.allowed || busy) return;
                  onApply(diff);
                }}
                aria-label={t('Apply the diff of %table%', { replacements: { table: tableName } })}
              >
                <Play aria-hidden />
                {isApplying ? t('Applying…') : t('Apply', { context: 'schema-diff' })}
              </Button>
            </span>
          )}
        </div>

        {blocked && (
          <StatusCallout
            tone="destructive"
            size="compact"
            title={t('Direct apply blocked by the large-table guard')}
            description={
              <div className="space-y-2">
                <p>
                  {t('The table holds %size% (thresholds: %sizeThreshold% MB or %rowThreshold% rows), and the diff forces a copy of the whole table:', {
                    replacements: {
                      size: size ?? t('an unknown size'),
                      sizeThreshold: formatUiNumber(LARGE_TABLE_SIZE_THRESHOLD_MB),
                      rowThreshold: formatUiNumber(LARGE_TABLE_ROW_THRESHOLD),
                    },
                  })}
                </p>
                {copyForcing.length > 0 && (
                  <ul className="list-disc space-y-0.5 ps-5">
                    {copyForcing.map(description => (
                      <li key={description}>{description}</li>
                    ))}
                  </ul>
                )}
                <p>{t('Apply it with an online schema change (pt-online-schema-change) from the console, outside this screen.')}</p>
              </div>
            }
          />
        )}

        {isRiskyDiff(diff) && !blocked && (
          <p className="text-sm text-warning">
            {t('This diff drops or rewrites data. Before applying, decide which side is wrong: the entity or the live database.')}
          </p>
        )}

        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" size="sm" aria-expanded={expanded}>
              <ChevronDown aria-hidden className={cn('transition-transform motion-reduce:transition-none', expanded && 'rotate-180')} />
              {expanded ? t('Hide details') : t('Show details')}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-3">
            {aspects.length > 0 && (
              <ul data-slot="schema-diff-aspects" className="divide-y rounded-xl bg-tint text-sm">
                {aspects.map(row => (
                  <li key={row.key} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 px-3 py-2">
                    <span className="w-4 shrink-0 font-mono font-semibold" aria-hidden>
                      {KIND_MARK[row.kind] ?? '·'}
                    </span>
                    <span className="text-muted-foreground">{row.aspect}</span>
                    <code className="font-mono break-all">{row.name}</code>
                    <span className="sr-only">{row.kind}</span>
                    {row.attributes.length > 0 && (
                      <span className="text-muted-foreground">
                        {t('changes %attributes%', { replacements: { attributes: row.attributes.join(', ') } })}
                      </span>
                    )}
                    {row.note && <span className="text-warning">{row.note}</span>}
                  </li>
                ))}
              </ul>
            )}
            {diff.collationChange && (
              <p className="text-sm text-muted-foreground">
                {t('Collation %from% → %to%', {
                  replacements: { from: diff.collationChange.from ?? '?', to: diff.collationChange.to ?? '?' },
                })}
              </p>
            )}
            {statements.length > 0 ? (
              <div data-slot="schema-diff-sql">
                <CodeBlock code={sqlScriptOf(diff)} filename={`${tableName || 'diff'}.sql`} label={t('SQL of %table%', { replacements: { table: tableName } })} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('No statements (a collation-only or empty diff).')}</p>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};
