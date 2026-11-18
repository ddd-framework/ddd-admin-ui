'use client';

import { normalizeDddError } from '@mgamadeus/ddd-web/contract';
import { ListChecks, Play, RefreshCw, ShieldCheck, Sigma } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useTranslate } from '../i18n/useTranslate.ts';
import { notify } from '../logic/pure/notify.ts';
import { useConfirm } from '../logic/react/useConfirm.ts';
import { useRowSelection } from '../logic/react/useRowSelection.ts';
import { useWriteAccess, WriteAccessProvider } from '../logic/react/writeAccess.ts';
import { StatusBadge } from '../list/StatusBadge.tsx';
import { PageSections } from '../page/PageLayout.tsx';
import { PageHeader } from '../page/PageHeader.tsx';
import { SectionHeader } from '../page/SectionHeader.tsx';
import { StatusCallout, StatusCalloutAction } from '../page/StatusCallout.tsx';
import { Button } from '../primitives/button.tsx';
import { Card, CardContent } from '../primitives/card.tsx';
import { cn } from '../primitives/cn.ts';
import { ControlHint } from '../primitives/hint.tsx';
import { Label } from '../primitives/label.tsx';
import { Skeleton } from '../primitives/skeleton.tsx';
import { Switch } from '../primitives/switch.tsx';
import type { DatabaseApi } from './api.ts';
import {
  classifyApplyFailure,
  countDiffSeverities,
  type DBApplyFailure,
  driftedTableNames,
  expectedSignaturesOf,
  isApplicableDiff,
  isBulkApplicableDiff,
  isRiskyDiff,
  isSchemaWritesDisabledMessage,
  sqlStatementsOf,
  withoutErrorCode,
} from './diff.ts';
import { GeneratedCodePanel } from './GeneratedCode.tsx';
import { SchemaDiffCard } from './SchemaDiffCard.tsx';
import { DB_DIFF_SEVERITY } from './status.ts';
import type { DBTableDiff, DBTableDiffsResponse } from './types.ts';

/** The phrase "Apply all" asks for. */
export const APPLY_ALL_PHRASE = 'APPLY ALL';
/** The phrase "Apply selected" asks for. */
export const APPLY_SELECTED_PHRASE = 'APPLY SELECTED';

const EMPTY: DBTableDiff[] = [];

export interface SchemaDiffScreenProps {
  api: DatabaseApi;
  title?: ReactNode;
  description?: ReactNode;
  /** The previews of the generated SQL and model code below the diff (default true). */
  showGeneratedCode?: boolean;
  /**
   * Whether a 403's message is the schema-write refusal, which switches every write of the screen off until it remounts
   * (default: Core's message, `isSchemaWritesDisabledMessage`). Any other 403 shows its message and refuses only that
   * request. An application that rewords `getSchemaWritesDisabledMessage()` passes its own test.
   */
  isSchemaWritesRefusal?: (message: string) => boolean;
  /**
   * "Apply all" while the production guard blocks a diff: `leave-out` (default) applies the others and says so;
   * `disable` keeps "Apply all" off until no diff is blocked (apply them one by one or by selection).
   */
  applyAllWithBlockedDiffs?: 'leave-out' | 'disable';
}

/** A notice after an apply: what happened and what to do. */
interface ApplyNotice {
  tone: 'warning' | 'destructive';
  title: string;
  description?: string;
  reload?: boolean;
}

/**
 * The schema diff of Core's `DatabaseModelsControllerTrait`: every table whose live schema differs from the entities,
 * applied per table or in bulk (all, or the selected cards). Every apply sends the signature of every diff it shows
 * (the server refuses a diff that changed since) and asks first: a destructive or mixed table needs its name typed,
 * a bulk apply its phrase. The answer is the diff computed afterwards and replaces the list (no second request). A
 * 403 (schema writes disabled on this process) is shown and switches every write of the screen off; a blocked table
 * (large-table guard) has no Apply action. Writes follow `WriteAccessProvider`.
 */
export const SchemaDiffScreen = ({
  api,
  title,
  description,
  showGeneratedCode = true,
  isSchemaWritesRefusal = isSchemaWritesDisabledMessage,
  applyAllWithBlockedDiffs = 'leave-out',
}: SchemaDiffScreenProps) => {
  const { t } = useTranslate();
  const outerWriteAccess = useWriteAccess();
  const confirm = useConfirm();
  const diffQuery = api.useSchemaDiffQuery(undefined, { refetchOnMountOrArgChange: true });
  const [applyDiff, applyDiffState] = api.useApplyDiffMutation();
  const [applyDiffs, applyDiffsState] = api.useApplyDiffsMutation();

  /** The answer of the last apply, over the query data it was based on (a new query answer wins). */
  const [applied, setApplied] = useState<{ basis: DBTableDiffsResponse | undefined; diffs: DBTableDiff[] } | null>(null);
  const [notice, setNotice] = useState<ApplyNotice | null>(null);
  const [forbiddenReason, setForbiddenReason] = useState<string | null>(null);
  const [applyingTable, setApplyingTable] = useState<string | null>(null);
  const [disableForeignKeyChecks, setDisableForeignKeyChecks] = useState(true);

  const queryDiffs = diffQuery.data?.diffs.elements ?? EMPTY;
  const diffs = applied && applied.basis === diffQuery.data ? applied.diffs : queryDiffs;
  const counts = useMemo(() => countDiffSeverities(diffs), [diffs]);
  const applicable = useMemo(() => diffs.filter(isApplicableDiff), [diffs]);
  const unsignedCount = useMemo(() => applicable.filter(diff => !diff.diffSignature).length, [applicable]);
  const applyAllReason =
    unsignedCount > 0
      ? t('{count, plural, one {# diff has no signature: reload first.} other {# diffs have no signature: reload first.}}', { count: unsignedCount })
      : applyAllWithBlockedDiffs === 'disable' && counts.blocked > 0
        ? t('{count, plural, one {# diff is blocked: apply the others one by one or by selection.} other {# diffs are blocked: apply the others one by one or by selection.}}', {
            count: counts.blocked,
          })
        : undefined;

  // the drift marker: tables whose diff changed between two loads (a refetch or an apply's answer)
  const shownBefore = useRef<readonly DBTableDiff[] | null>(null);
  const [drifted, setDrifted] = useState<ReadonlySet<string>>(() => new Set());
  useEffect(() => {
    const previous = shownBefore.current;
    shownBefore.current = diffs;
    if (previous === null || previous === diffs) return;
    setDrifted(new Set(driftedTableNames(previous, diffs)));
  }, [diffs]);
  const busy = applyDiffState.isLoading || applyDiffsState.isLoading || applyingTable !== null;
  const writeAccess = forbiddenReason ? { allowed: false, reason: forbiddenReason } : outerWriteAccess;
  const writesAllowed = writeAccess.allowed && outerWriteAccess.allowed;

  const selection = useRowSelection<DBTableDiff, string>({
    items: diffs,
    getKey: diff => diff.sqlTableName || null,
    // a new diff (other signatures) starts with an empty selection
    resetKey: diffs.map(diff => `${diff.sqlTableName}:${diff.diffSignature ?? ''}`).join('|'),
    isSelectable: isBulkApplicableDiff,
    disabled: busy || !writesAllowed,
  });

  const reload = useCallback(() => {
    setApplied(null);
    setNotice(null);
    void diffQuery.refetch();
  }, [diffQuery]);
  /** After a failed apply: the current diff again, the notice stays. */
  const refetchKeepingNotice = () => {
    setApplied(null);
    void diffQuery.refetch();
  };

  const handleFailure = (failure: DBApplyFailure) => {
    if (failure.kind === 'forbidden' && failure.schemaWritesDisabled) {
      setForbiddenReason(failure.message);
      setNotice(null);
      return;
    }
    // every other failure shows the server's answer over the diff as it is now
    refetchKeepingNotice();
    if (failure.kind === 'signature-mismatch') {
      setNotice({
        tone: 'warning',
        title: t('The schema changed since you loaded it'),
        description: withoutErrorCode(failure.message),
        reload: true,
      });
      return;
    }
    if (failure.kind === 'lock-busy') {
      setNotice({ tone: 'warning', title: t('Another apply is running — retry in a few seconds'), description: withoutErrorCode(failure.message) });
      return;
    }
    if (failure.kind === 'forbidden') {
      setNotice({ tone: 'destructive', title: t('This apply is not allowed'), description: failure.message });
      return;
    }
    if (failure.kind === 'not-found') {
      setNotice({ tone: 'warning', title: t('This diff is no longer pending'), description: failure.message, reload: true });
      return;
    }
    setNotice({ tone: 'destructive', title: t('The apply was refused'), description: failure.message });
  };

  const showAnswer = (response: DBTableDiffsResponse) => {
    setApplied({ basis: diffQuery.data, diffs: response.diffs.elements ?? [] });
    selection.clear();
  };

  const handleApply = async (diff: DBTableDiff) => {
    const tableName = diff.sqlTableName;
    if (!writesAllowed || busy || !tableName || !isApplicableDiff(diff)) return;
    const risky = isRiskyDiff(diff);
    const statementCount = sqlStatementsOf(diff).length;
    const confirmed = await confirm({
      title: t('Apply the diff of %table%?', { replacements: { table: tableName } }),
      description: risky
        ? t(
            '{count, plural, one {# statement runs} other {# statements run}} against the live database. This diff drops or rewrites data and cannot be undone: decide first whether the entity or the database is wrong.',
            { count: statementCount }
          )
        : t('{count, plural, one {# statement runs} other {# statements run}} against the live database.', { count: statementCount }),
      confirmLabel: t('Apply', { context: 'schema-diff' }),
      confirmVariant: risky ? 'destructive' : 'default',
      requirePhrase: risky ? tableName : undefined,
    });
    if (!confirmed || !writesAllowed) return;
    setNotice(null);
    setApplyingTable(tableName);
    try {
      const response = await applyDiff({ sqlTableName: tableName, expectedDiffSignature: diff.diffSignature ?? null, disableForeignKeyChecks }).unwrap();
      showAnswer(response);
      notify.success(t('Applied the diff of %table%', { replacements: { table: tableName } }));
    } catch (error) {
      handleFailure(classifyApplyFailure(error, t('The diff could not be applied.'), isSchemaWritesRefusal));
    } finally {
      setApplyingTable(null);
    }
  };

  const handleApplyMany = async (scope: 'all' | 'selected') => {
    if (!writesAllowed || busy) return;
    if (scope === 'all' && applyAllReason) return;
    const targets = (scope === 'all' ? applicable : applicable.filter(diff => selection.isSelected(diff.sqlTableName ?? ''))).filter(isBulkApplicableDiff);
    if (targets.length === 0) return;
    const targetCounts = countDiffSeverities(targets);
    const leftOut = scope === 'all' ? counts.blocked : 0;
    const confirmed = await confirm({
      title: t('{count, plural, one {Apply # diff?} other {Apply # diffs?}}', { count: targets.length }),
      description: [
        t('%additive% additive, %mixed% mixed and %destructive% destructive diffs run against the live database in one request.', {
          replacements: { additive: targetCounts.additive, mixed: targetCounts.mixed, destructive: targetCounts.destructive },
        }),
        targetCounts.mixed + targetCounts.destructive > 0
          ? t('Mixed and destructive diffs drop or rewrite data and cannot be undone.')
          : '',
        leftOut > 0 ? t('{count, plural, one {# blocked diff is left out.} other {# blocked diffs are left out.}}', { count: leftOut }) : '',
      ]
        .filter(Boolean)
        .join(' '),
      confirmLabel: scope === 'all' ? t('Apply all') : t('Apply selected'),
      confirmVariant: targetCounts.mixed + targetCounts.destructive > 0 ? 'destructive' : 'default',
      requirePhrase: scope === 'all' ? APPLY_ALL_PHRASE : APPLY_SELECTED_PHRASE,
    });
    if (!confirmed || !writesAllowed) return;
    setNotice(null);
    // every pending, unblocked diff: null; a blocked one stays out by naming the others
    const sqlTableNames = scope === 'all' && counts.blocked === 0 ? null : targets.map(diff => diff.sqlTableName ?? '');
    try {
      const response = await applyDiffs({ sqlTableNames, expectedDiffSignatures: expectedSignaturesOf(diffs), disableForeignKeyChecks }).unwrap();
      showAnswer(response);
      const remaining = response.diffs.elements?.length ?? 0;
      notify.success(
        remaining === 0
          ? t('Every diff applied')
          : t('{count, plural, one {Applied; # diff still pending} other {Applied; # diffs still pending}}', { count: remaining })
      );
    } catch (error) {
      handleFailure(classifyApplyFailure(error, t('The diffs could not be applied.'), isSchemaWritesRefusal));
    }
  };

  const loadError = diffQuery.isError ? normalizeDddError(diffQuery.error, t('The schema diff could not be loaded.')).message : undefined;
  const isEmpty = diffQuery.isSuccess && diffs.length === 0 && !diffQuery.isFetching;
  const writeReason = writesAllowed ? undefined : (writeAccess.reason ?? outerWriteAccess.reason ?? t('Writes are switched off'));

  return (
    <WriteAccessProvider value={writeAccess}>
      <div data-slot="schema-diff-screen" className="min-w-0">
        <PageHeader
          title={title ?? t('Schema diff')}
          description={
            description ??
            t('The tables whose live schema differs from the entities, with the statements that align them, applied per table or in bulk.')
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" disabled={busy || diffQuery.isFetching} onClick={reload}>
                <RefreshCw aria-hidden className={cn(diffQuery.isFetching && 'animate-spin motion-reduce:animate-none')} />
                {t('Reload')}
              </Button>
              <ControlHint disabledReason={writeReason}>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!writesAllowed || busy || selection.count === 0}
                  onClick={() => void handleApplyMany('selected')}
                >
                  <ListChecks aria-hidden />
                  {t('Apply selected (%count%)', { replacements: { count: selection.count } })}
                </Button>
              </ControlHint>
              <ControlHint disabledReason={writeReason ?? applyAllReason}>
                <Button type="button" disabled={!writesAllowed || busy || applicable.length === 0 || Boolean(applyAllReason)} onClick={() => void handleApplyMany('all')}>
                  <Play aria-hidden />
                  {applyDiffsState.isLoading ? t('Applying…') : t('Apply all')}
                </Button>
              </ControlHint>
            </div>
          }
        />

        <PageSections>
          <div className="space-y-4">
            {forbiddenReason && (
              <StatusCallout
                tone="warning"
                title={t('Schema writes are disabled on this process')}
                description={<span className="break-words">{forbiddenReason}</span>}
              />
            )}
            {notice && (
              <StatusCallout
                tone={notice.tone}
                title={notice.title}
                description={notice.description ? <span className="break-words">{notice.description}</span> : undefined}
                actions={
                  notice.reload ? (
                    <StatusCalloutAction type="button" onClick={reload} disabled={diffQuery.isFetching}>
                      <RefreshCw aria-hidden />
                      {t('Reload')}
                    </StatusCalloutAction>
                  ) : undefined
                }
              />
            )}
            {loadError && (
              <StatusCallout
                tone="destructive"
                title={t('The schema diff could not be loaded.')}
                description={<span className="break-words">{loadError}</span>}
                actions={
                  <StatusCalloutAction type="button" onClick={reload}>
                    {t('Retry')}
                  </StatusCalloutAction>
                }
              />
            )}

            {diffs.length > 0 && (
              <div data-slot="schema-diff-counts" className="flex flex-wrap items-center gap-2">
                <StatusBadge tone="neutral" icon={Sigma} label={t('{count, plural, one {# table} other {# tables}}', { count: counts.total })} />
                {(['ADDITIVE', 'MIXED', 'DESTRUCTIVE'] as const).map(severity => {
                  const definition = DB_DIFF_SEVERITY[severity];
                  const count = severity === 'ADDITIVE' ? counts.additive : severity === 'MIXED' ? counts.mixed : counts.destructive;
                  return (
                    <StatusBadge
                      key={severity}
                      tone={definition.tone}
                      icon={definition.icon}
                      label={t('%label%: %count%', {
                        context: 'schema-diff-severity-count',
                        replacements: { label: t(definition.label, { context: 'schema-diff-severity' }), count },
                      })}
                    />
                  );
                })}
                <div className="ms-auto flex items-center gap-2">
                  <Switch
                    id="schema-diff-foreign-key-checks"
                    checked={disableForeignKeyChecks}
                    onCheckedChange={setDisableForeignKeyChecks}
                    disabled={busy}
                  />
                  <Label htmlFor="schema-diff-foreign-key-checks" className="text-sm font-normal">
                    {t('Foreign key checks off while applying')}
                  </Label>
                </div>
              </div>
            )}

            {diffQuery.isLoading ? (
              <div className="space-y-3" role="status" aria-label={t('Computing the schema diff')}>
                {[0, 1, 2].map(index => (
                  <Card key={index} className="gap-0 py-0">
                    <CardContent className="space-y-2 p-4">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-4 w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : isEmpty ? (
              <StatusCallout
                tone="success"
                icon={ShieldCheck}
                title={t('Schema matches')}
                description={t('The live database matches the entities: nothing to apply.')}
              />
            ) : (
              <div className="space-y-3">
                {diffs.map(diff => {
                  const tableName = diff.sqlTableName ?? '';
                  const blocked = diff.directApplyBlocked === true;
                  return (
                    <SchemaDiffCard
                      key={tableName}
                      diff={diff}
                      busy={busy}
                      isApplying={applyingTable === tableName}
                      onApply={blocked ? undefined : target => void handleApply(target)}
                      selected={selection.isSelected(tableName)}
                      drifted={drifted.has(tableName)}
                      onSelectedChange={blocked || !tableName || !diff.diffSignature ? undefined : value => selection.setSelected(tableName, value)}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {showGeneratedCode && (
            <section>
              <SectionHeader
                title={t('Generated code')}
                description={t('What the entities generate, to read, copy or download. Nothing here runs against the database.')}
              />
              <div className="grid min-w-0 grid-cols-1 gap-4">
                <GeneratedCodePanel api={api} kind="tables" onForbidden={message => isSchemaWritesRefusal(message) && setForbiddenReason(message)} />
                <GeneratedCodePanel api={api} kind="models" />
                <GeneratedCodePanel api={api} kind="entity" />
              </div>
            </section>
          )}
        </PageSections>
      </div>
    </WriteAccessProvider>
  );
};
