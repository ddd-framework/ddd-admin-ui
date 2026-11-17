'use client';

import { normalizeDddError } from '@mgamadeus/ddd-web/contract';
import { BellOff, ChevronRight, CircleCheck, Copy, ExternalLink, RotateCcw, RotateCw, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';

import { FormDrawer } from '../form/FormDrawer.tsx';
import { formatUiNumber } from '../i18n/format.ts';
import { m } from '../i18n/store.ts';
import { useTranslate } from '../i18n/useTranslate.ts';
import { DateCell } from '../list/cells.tsx';
import { EntityListEmpty } from '../list/EntityListEmpty.tsx';
import { StatusBadge } from '../list/StatusBadge.tsx';
import { notify } from '../logic/pure/notify.ts';
import { useCopyToClipboard } from '../logic/react/useCopyToClipboard.ts';
import type { EntityDrawer } from '../logic/react/useEntityDrawer.ts';
import { useWriteAccess } from '../logic/react/writeAccess.ts';
import { DefinitionList } from '../page/DefinitionList.tsx';
import { StatusCallout } from '../page/StatusCallout.tsx';
import { Button } from '../primitives/button.tsx';
import { ControlHint, Hint } from '../primitives/hint.tsx';
import { Skeleton } from '../primitives/skeleton.tsx';
import type { IssuesApi } from './api.ts';
import { issueShowCommand, parseIssueGroupKey, sortIssueEventsNewestFirst, trendBarsOf } from './format.ts';
import { IssueDetailBlock, IssueEventDetails } from './IssueEventDetails.tsx';
import { IssuesTrendBars } from './IssuesTrendChart.tsx';
import { ISSUE_GROUP_STATUS, toIssueGroupStatus } from './status.ts';
import type { IssueGroupArg, IssueGroupDetailResponse, IssueGroupStatus, IssueGroupSummary } from './types.ts';

/** The flags of a group: new in its first release window, or back after a resolve (a regression). */
export const IssueGroupFlags = ({ group }: { group: Pick<IssueGroupSummary, 'isNew' | 'isRegression'> }) => {
  const { t } = useTranslate();
  if (group.isRegression) {
    return (
      <Hint content={t('It came back after it was resolved')} className="inline-flex">
        <StatusBadge tone="warning" icon={RotateCcw} label={t('Regression', { context: 'issue-flag' })} />
      </Hint>
    );
  }
  if (group.isNew) {
    return (
      <Hint content={t('First seen recently')} className="inline-flex">
        <StatusBadge tone="highlight" icon={Sparkles} label={t('New', { context: 'issue-flag' })} />
      </Hint>
    );
  }
  return null;
};

export interface IssueGroupStatusActionsProps {
  api: IssuesApi;
  group: IssueGroupSummary;
  /** The group with its new status, after a change (replace the row with it). */
  onChanged?: (group: IssueGroupSummary) => void;
}

/**
 * Resolve / Ignore (an open group) or Reopen (a resolved or ignored one), with what each means: resolve = fixed in a
 * deploy (a later event reopens it as a regression), ignore = silenced for good. Writes follow `WriteAccessProvider`;
 * the change is idempotent and answers the group with its new status.
 */
export const IssueGroupStatusActions = ({ api, group, onChanged }: IssueGroupStatusActionsProps) => {
  const { t } = useTranslate();
  const writeAccess = useWriteAccess();
  const [resolve, resolveState] = api.useResolveIssueGroupMutation();
  const [ignore, ignoreState] = api.useIgnoreIssueGroupMutation();
  const [reopen, reopenState] = api.useReopenIssueGroupMutation();
  const [pending, setPending] = useState(false);
  const busy = pending || resolveState.isLoading || ignoreState.isLoading || reopenState.isLoading;
  const arg: IssueGroupArg = { environment: group.environment, groupHash: group.groupHash };
  const title = writeAccess.allowed ? undefined : writeAccess.reason;

  const run = async (change: (arg: IssueGroupArg) => { unwrap: () => Promise<{ group: IssueGroupSummary }> }, done: string) => {
    if (!writeAccess.allowed || busy) return;
    setPending(true);
    try {
      const response = await change(arg).unwrap();
      onChanged?.(response.group);
      notify.success(done);
    } catch (error) {
      notify.error(normalizeDddError(error, t('The status could not be changed.')).message);
    } finally {
      setPending(false);
    }
  };

  const isOpen = group.status === 'OPEN';
  return (
    <div data-slot="issue-status-actions" className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {isOpen ? (
          <>
            <ControlHint disabledReason={title}>
              <Button type="button" size="sm" disabled={!writeAccess.allowed || busy} onClick={() => void run(resolve, t('Marked resolved'))}>
                <CircleCheck aria-hidden />
                {t('Resolve', { context: 'issue-action' })}
              </Button>
            </ControlHint>
            <ControlHint disabledReason={title}>
              <Button type="button" size="sm" variant="outline" disabled={!writeAccess.allowed || busy} onClick={() => void run(ignore, t('Ignored for good'))}>
                <BellOff aria-hidden />
                {t('Ignore', { context: 'issue-action' })}
              </Button>
            </ControlHint>
          </>
        ) : (
          <ControlHint disabledReason={title}>
            <Button type="button" size="sm" variant="outline" disabled={!writeAccess.allowed || busy} onClick={() => void run(reopen, t('Reopened'))}>
              <RotateCw aria-hidden />
              {t('Reopen', { context: 'issue-action' })}
            </Button>
          </ControlHint>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {isOpen
          ? t('Resolve means fixed in a deploy: a later event reopens it as a regression. Ignore silences it for good.')
          : t('Reopening makes it open again; its events count as before.')}
      </p>
    </div>
  );
};

export interface IssueGroupDrawerProps {
  api: IssuesApi;
  /** The screen's drawer (`useEntityDrawer`): `?issue=<environment>:<groupHash>`. */
  drawer: EntityDrawer;
  /** The screen's trend window: the group's sparkline shows the same one. */
  trendWindow: { from: string; to: string };
  onGroupChanged?: (group: IssueGroupSummary) => void;
}

/**
 * One error group in a drawer: status, flags and facts, the actions, "Open in log backend" (when the registry has a
 * link) and "Copy for agent", the group's trend, where it happens (its issues) and the last occurrences. When the log
 * backend cannot be read, `eventsError` stands in for the occurrences; the group and its issues stay usable.
 */
export const IssueGroupDrawer = ({ api, drawer, trendWindow, onGroupChanged }: IssueGroupDrawerProps) => {
  const { t } = useTranslate();
  const arg = parseIssueGroupKey(drawer.shown?.mode === 'edit' ? drawer.shown.id : null);
  const query = api.useIssueGroupDetailQuery(arg ?? { environment: '', groupHash: '' }, { skip: arg === null });
  const detail = arg ? query.currentData : undefined;
  const group = detail?.group;

  return (
    <FormDrawer
      open={drawer.isOpen && arg !== null}
      onClose={drawer.close}
      title={group?.exceptionType ?? t('Error group')}
      description={group?.routePattern ?? undefined}
    >
      {!arg ? null : query.isError && !detail ? (
        <EntityListEmpty tone="error" message={normalizeDddError(query.error, t('The error group could not be loaded.')).message} />
      ) : !detail || !group ? (
        <div className="space-y-4" aria-busy>
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      ) : (
        <IssueGroupDetailBody api={api} arg={arg} detail={detail} trendWindow={trendWindow} onGroupChanged={onGroupChanged} />
      )}
    </FormDrawer>
  );
};

const IssueGroupDetailBody = ({
  api,
  arg,
  detail,
  trendWindow,
  onGroupChanged,
}: {
  api: IssuesApi;
  arg: IssueGroupArg;
  detail: IssueGroupDetailResponse;
  trendWindow: { from: string; to: string };
  onGroupChanged?: (group: IssueGroupSummary) => void;
}) => {
  const { t } = useTranslate();
  const trendQuery = api.useIssuesTrendQuery({ environment: arg.environment, groupHash: arg.groupHash, from: trendWindow.from, to: trendWindow.to });
  const trend = trendQuery.currentData ?? trendQuery.data;
  const bars = useMemo(() => trendBarsOf(trend?.series), [trend?.series]);
  const clipboard = useCopyToClipboard();
  const events = useMemo(() => sortIssueEventsNewestFirst(detail.events.elements ?? []), [detail.events.elements]);
  const { group } = detail;
  const issues = detail.issues.elements ?? [];

  const copyForAgent = async () => {
    const copied = await clipboard.copy(`${issueShowCommand(arg)}\n\n${detail.agentJson}`);
    if (copied) notify.success(t('Copied for an agent'));
    else notify.error(t('Could not copy'));
  };

  return (
    <div data-slot="issue-group-detail" className="min-w-0 space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge value={(toIssueGroupStatus(group.status) ?? group.status) as IssueGroupStatus} map={ISSUE_GROUP_STATUS} />
        <IssueGroupFlags group={group} />
        <div className="ms-auto flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void copyForAgent()}>
            <Copy aria-hidden />
            {clipboard.copied ? t('Copied') : t('Copy for agent')}
          </Button>
          {detail.logBackendUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={detail.logBackendUrl} target="_blank" rel="noopener noreferrer" data-slot="issue-log-backend-link">
                <ExternalLink aria-hidden />
                {t('Open in log backend')}
              </a>
            </Button>
          )}
        </div>
      </div>

      {group.sampleMessage && <p className="text-sm break-words">{group.sampleMessage}</p>}

      <IssueGroupStatusActions api={api} group={group} onChanged={onGroupChanged} />

      <DefinitionList
        layout="rows"
        items={[
          { id: 'environment', label: m('Environment'), value: group.environment },
          { id: 'section', label: m('Section'), value: group.section },
          { id: 'route', label: m('Entry point'), value: group.routePattern && <span className="font-mono text-xs break-all">{group.routePattern}</span> },
          { id: 'events', label: m('Events'), value: t('about %count%', { replacements: { count: formatUiNumber(group.eventCount) } }), hint: t('Counts are approximate (the collector may replay events).') },
          { id: 'firstSeen', label: m('First seen'), value: <DateCell value={group.firstSeenAt} /> },
          { id: 'lastSeen', label: m('Last seen'), value: <DateCell value={group.lastSeenAt} /> },
          {
            id: 'releases',
            label: m('Releases'),
            value:
              group.releaseFirstSeen || group.releaseLastSeen ? (
                <span className="font-mono text-xs break-all">
                  {group.releaseFirstSeen ?? '—'}
                  {group.releaseLastSeen && group.releaseLastSeen !== group.releaseFirstSeen ? ` → ${group.releaseLastSeen}` : ''}
                </span>
              ) : null,
          },
          ...(group.resolvedAt ? [{ id: 'resolvedAt', label: m('Resolved'), value: <DateCell value={group.resolvedAt} /> }] : []),
        ]}
      />

      <IssueDetailBlock title={t('Trend')}>
        {trend ? (
          <IssuesTrendBars bars={bars} stepSeconds={trend.stepSeconds} height={56} label={t('Error events of this group over time')} />
        ) : trendQuery.isError ? (
          <p className="text-sm text-muted-foreground">{t('The trend could not be loaded.')}</p>
        ) : (
          <Skeleton className="h-20 w-full rounded-lg" />
        )}
      </IssueDetailBlock>

      <IssueDetailBlock title={t('Where it happens')}>
        {issues.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('No entry points recorded.')}</p>
        ) : (
          <ul data-slot="issue-entry-points" className="divide-y rounded-lg border">
            {issues.map(issue => (
              <li key={issue.issueHash} className="flex min-w-0 items-center justify-between gap-3 px-3 py-2 text-sm">
                {issue.entryPoint ? (
                  <Hint content={issue.entryPoint} className="min-w-0 truncate font-mono text-xs">
                    {issue.entryPoint}
                  </Hint>
                ) : (
                  <span className="min-w-0 truncate font-mono text-xs">—</span>
                )}
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {t('{count, plural, one {# event} other {# events}}', { count: issue.eventCount })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </IssueDetailBlock>

      <IssueDetailBlock title={t('Last occurrences')}>
        {detail.eventsError ? (
          <StatusCallout tone="warning" size="compact" title={t('The occurrences could not be read from the log backend.')} description={detail.eventsError} />
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('No occurrences recorded.')}</p>
        ) : (
          <div data-slot="issue-occurrences" className="space-y-2">
            {events.map((event, index) => (
              <details key={event.eventId ?? index} open={index === 0} className="group/event rounded-lg border">
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2 text-sm [&::-webkit-details-marker]:hidden">
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-open/event:rotate-90" aria-hidden />
                  <DateCell value={event.timestamp} />
                  {event.level && <span className="text-xs text-muted-foreground">{event.level}</span>}
                  <span className="min-w-0 flex-1 truncate font-medium">{event.errorType ?? group.exceptionType}</span>
                </summary>
                <div className="border-t px-3 py-3">
                  <IssueEventDetails event={event} />
                </div>
              </details>
            ))}
          </div>
        )}
      </IssueDetailBlock>
    </div>
  );
};
