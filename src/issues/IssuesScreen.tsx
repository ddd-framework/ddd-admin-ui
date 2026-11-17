'use client';

import { normalizeDddError } from '@mgamadeus/ddd-web/contract';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import { formatUiNumber } from '../i18n/format.ts';
import { m } from '../i18n/store.ts';
import { useTranslate } from '../i18n/useTranslate.ts';
import { DateCell } from '../list/cells.tsx';
import { EmptyValue } from '../list/EmptyValue.tsx';
import { EntityListBody } from '../list/EntityListBody.tsx';
import type { EntityListColumn } from '../list/EntityListTable.tsx';
import { EntityListToolbar } from '../list/EntityListToolbar.tsx';
import { FilterPanel, FilterSelect, FilterText } from '../list/filters.tsx';
import { StatusBadge } from '../list/StatusBadge.tsx';
import type { EntityDrawerUrlAdapter } from '../logic/pure/entityDrawer.ts';
import type { UrlStateAdapter } from '../logic/pure/urlListState.ts';
import { useEntityDrawer } from '../logic/react/useEntityDrawer.ts';
import { useMemoryUrlState } from '../logic/react/useMemoryUrlState.ts';
import { useOptimisticRowPatches } from '../logic/react/useOptimisticRowPatches.ts';
import { useUrlListState } from '../logic/react/useUrlListState.ts';
import { EntityListPage } from '../page/EntityListPage.tsx';
import { StatusCallout } from '../page/StatusCallout.tsx';
import { Button } from '../primitives/button.tsx';
import { Hint } from '../primitives/hint.tsx';
import { SegmentedControl } from '../primitives/segmented-control.tsx';
import type { IssuesApi } from './api.ts';
import {
  ALL_ISSUE_ENVIRONMENTS,
  ISSUE_GROUPS_PAGE_SIZE,
  issueGroupKey,
  type IssuesWindowPreset,
  resolveIssuesWindow,
  toIssuesWindowPreset,
} from './format.ts';
import { IssueGroupDrawer, IssueGroupFlags } from './IssueGroupDrawer.tsx';
import { IssuesTrendCard, IssuesWindowSwitch } from './IssuesTrendChart.tsx';
import { ISSUE_GROUP_STATUS, toIssueGroupStatus } from './status.ts';
import type { IssueGroupsListArg, IssueGroupStatus, IssueGroupSummary, IssueStatusFilter } from './types.ts';

const LIST_KEYS = ['environment', 'status', 'q', 'section', 'release', 'window', 'page'] as const;
/** Scope, tab, search, window and page are not panel filters. */
const UNCOUNTED = ['environment', 'status', 'q', 'window', 'page'] as const;
const STATUS_FILTERS: readonly IssueStatusFilter[] = ['OPEN', 'RESOLVED', 'IGNORED', 'ALL'];
const toStatusFilter = (value: string): IssueStatusFilter => (STATUS_FILTERS as readonly string[]).includes(value) ? (value as IssueStatusFilter) : 'OPEN';

/** The section filter's options: the code and what it means. */
export const ISSUE_SECTION_OPTIONS = [
  { value: 'HTTP', label: m('Requests (HTTP)') },
  { value: 'CLI', label: m('Console commands (CLI)') },
  { value: 'MESSENGER', label: m('Worker messages (MESSENGER)') },
  { value: 'WEB', label: m('Browser (WEB)') },
  { value: 'WEB_SERVER', label: m('Server rendering (WEB_SERVER)') },
  { value: 'MOBILE', label: m('Mobile app (MOBILE)') },
] as const;

export interface IssuesScreenProps {
  /** The hooks of `createIssuesApi`. */
  api: IssuesApi;
  /**
   * Where the environment, the status tab, the search, the section and release filters, the trend window and the page
   * live (`environment`, `status`, `q`, `section`, `release`, `window`, `page`): the host's URL adapter, e.g.
   * `useNextUrlStateAdapter({ listId: 'issues' })`. Without one they live in component state.
   */
  urlStateAdapter?: UrlStateAdapter;
  /** Where the open group lives (`?issue=<environment>:<groupHash>`): the host's drawer adapter, else component state. */
  drawerUrlAdapter?: EntityDrawerUrlAdapter;
  title?: ReactNode;
  description?: ReactNode;
  /** Drawn inside another page (a showcase): no full-height page frame (`EntityListPage.asSpecimen`). */
  asSpecimen?: boolean;
  /** Pins the end of the trend window (a showcase, a test); default: now, taken again on a window change or a return to the tab. */
  trendAnchorMs?: number;
}

/**
 * The error groups of the issues registry (`IssuesControllerTrait`): the environment switch (with "All"), the status
 * tabs with their counts, search, section and release filters, the job health, the trend of the same selection over a
 * window, the groups (last seen first, as the server sorts them; 50 per page) and a group's details in the drawer with
 * Resolve / Ignore / Reopen. An empty list while the registry is unhealthy says "unknown", never "no errors". Writes
 * follow `WriteAccessProvider`.
 */
export const IssuesScreen = ({ api, urlStateAdapter, drawerUrlAdapter, title, description, asSpecimen, trendAnchorMs }: IssuesScreenProps) => {
  const { t } = useTranslate();
  const memory = useMemoryUrlState();
  const drawer = useEntityDrawer({ adapter: drawerUrlAdapter ?? memory.drawerUrlAdapter, editKey: 'issue' });
  const listState = useUrlListState(LIST_KEYS, { adapter: urlStateAdapter ?? memory.urlStateAdapter, uncounted: UNCOUNTED });
  const { values, debounced, setValues } = listState;

  const status = toStatusFilter(values.status);
  const windowPreset = toIssuesWindowPreset(values.window);
  const page = Math.max(1, Number.parseInt(values.page, 10) || 1);
  const search = debounced.q.trim();
  const release = debounced.release.trim();
  const section = values.section;

  // a filter change starts at page 1 again
  const setFilter = (updates: Partial<Record<(typeof LIST_KEYS)[number], string>>) => setValues({ page: '', ...updates });

  const listArg = useMemo<IssueGroupsListArg>(
    () => ({
      ...(values.environment ? { environment: values.environment } : {}),
      status,
      ...(search ? { search } : {}),
      ...(section ? { section } : {}),
      ...(release ? { release } : {}),
      limit: ISSUE_GROUPS_PAGE_SIZE,
      offset: (page - 1) * ISSUE_GROUPS_PAGE_SIZE,
    }),
    [values.environment, status, search, section, release, page]
  );
  const listQuery = api.useIssueGroupsQuery(listArg);
  const response = listQuery.currentData ?? listQuery.data;
  const environment = values.environment || response?.environment || '';
  const environments = response?.environments ?? [];
  const isAll = environment === ALL_ISSUE_ENVIRONMENTS;
  const counts = response?.statusCounts;
  const health = response?.health;
  const loadedGroups = useMemo(() => listQuery.currentData?.groups.elements ?? [], [listQuery.currentData]);
  const patches = useOptimisticRowPatches(loadedGroups, issueGroupKey);
  const groups = patches.displayed;
  const { begin, succeed } = patches;
  const replaceGroup = useCallback(
    (group: IssueGroupSummary) => {
      const key = issueGroupKey(group);
      begin(key, group);
      succeed(key);
    },
    [begin, succeed]
  );

  // the trend window ends now (or at the pinned anchor); taken again on a window change and when the tab returns
  const [anchorMs, setAnchorMs] = useState(() => trendAnchorMs ?? Date.now());
  useEffect(() => {
    if (trendAnchorMs !== undefined) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') setAnchorMs(Date.now());
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [trendAnchorMs]);
  const trendWindow = useMemo(() => resolveIssuesWindow(windowPreset, trendAnchorMs ?? anchorMs), [windowPreset, trendAnchorMs, anchorMs]);
  const changeWindow = (next: IssuesWindowPreset) => {
    if (trendAnchorMs === undefined) setAnchorMs(Date.now());
    setValues({ window: next });
  };

  const jobStalled = health?.jobStalled === true;
  const collectorSilent = !jobStalled && health?.collectorSilent === true;
  const noEnvironments = listQuery.isSuccess && environments.length === 0;
  const hasNextPage = groups.length >= ISSUE_GROUPS_PAGE_SIZE;
  const isFiltered = Boolean(search || section || release);

  const emptyMessage = noEnvironments
    ? t('No environments are registered yet.')
    : jobStalled
      ? t('Unknown: error collection is not running, so an empty list does not mean there are no errors.')
      : status === 'OPEN'
        ? t('No open errors.')
        : status === 'RESOLVED'
          ? t('No resolved errors.')
          : status === 'IGNORED'
            ? t('No ignored errors.')
            : t('No errors recorded.');

  const { openEdit } = drawer;
  const rowAction = useCallback((group: IssueGroupSummary) => () => openEdit(issueGroupKey(group)), [openEdit]);

  const columns: EntityListColumn<IssueGroupSummary>[] = [
    {
      id: 'error',
      header: m('Error'),
      width: '3fr',
      minWidth: 260,
      cell: group => (
        <div className="flex min-w-0 flex-col gap-0.5 py-0.5">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <IssueGroupFlags group={group} />
            <span className="min-w-0 truncate text-sm font-semibold">{group.exceptionType ?? t('Unknown error')}</span>
          </div>
          <p className="truncate text-sm text-muted-foreground">{group.sampleMessage || <EmptyValue />}</p>
          {group.routePattern && <p className="truncate font-mono text-xs text-muted-foreground">{group.routePattern}</p>}
        </div>
      ),
    },
    ...(isAll ? [{ id: 'environment', header: m('Environment'), width: '120px' as const, cell: (group: IssueGroupSummary) => <span className="font-mono text-xs">{group.environment}</span> }] : []),
    ...(status === 'ALL'
      ? [{ id: 'status', header: m('Status'), width: '130px' as const, cell: (group: IssueGroupSummary) => <StatusBadge value={(toIssueGroupStatus(group.status) ?? group.status) as IssueGroupStatus} map={ISSUE_GROUP_STATUS} /> }]
      : []),
    {
      id: 'events',
      header: <Hint content={t('Approximate')}>{t('Events')}</Hint>,
      width: '96px',
      align: 'end',
      cell: group => <span className="tabular-nums">{formatUiNumber(group.eventCount)}</span>,
    },
    { id: 'lastSeen', header: m('Last seen'), width: '170px', cell: group => <DateCell value={group.lastSeenAt} /> },
    {
      id: 'release',
      header: m('Release'),
      width: '150px',
      cell: group =>
        group.releaseLastSeen || group.releaseFirstSeen ? (
          <span className="truncate font-mono text-xs text-muted-foreground">{group.releaseLastSeen ?? group.releaseFirstSeen}</span>
        ) : (
          <EmptyValue />
        ),
    },
  ];

  const statusOptions = [
    { value: 'OPEN' as const, label: m('Open', { context: 'issue-status' }), context: 'issue-status', badge: counts ? formatUiNumber(counts.open) : undefined },
    { value: 'RESOLVED' as const, label: m('Resolved', { context: 'issue-status' }), context: 'issue-status', badge: counts ? formatUiNumber(counts.resolved) : undefined },
    { value: 'IGNORED' as const, label: m('Ignored', { context: 'issue-status' }), context: 'issue-status', badge: counts ? formatUiNumber(counts.ignored) : undefined },
    {
      value: 'ALL' as const,
      label: m('All', { context: 'issue-status' }),
      context: 'issue-status',
      badge: counts ? formatUiNumber(counts.open + counts.resolved + counts.ignored) : undefined,
    },
  ];

  const listError = listQuery.isError ? normalizeDddError(listQuery.error, t('The error groups could not be loaded.')).message : undefined;

  return (
    <EntityListPage
      asSpecimen={asSpecimen}
      title={title ?? t('Issues')}
      description={description ?? t('Errors of every environment, grouped by root cause.')}
      belowHeader={
        <div data-slot="issues-screen" className="min-w-0 space-y-4">
          {jobStalled && (
            <StatusCallout
              tone="warning"
              title={t('Error collection is not running')}
              description={
                <>
                  {health?.lastSuccessfulRunAt ? (
                    <span>
                      {t('Last successful run:')} <DateCell value={health.lastSuccessfulRunAt} />
                    </span>
                  ) : (
                    t('No successful run has been recorded yet.')
                  )}
                  {health?.lastError && <span className="mt-1 block font-mono text-xs break-all">{health.lastError}</span>}
                </>
              }
            />
          )}
          {collectorSilent && (
            <p data-slot="issues-collector-silent" className="text-sm text-muted-foreground">
              {health?.newestEventAt ? (
                <>
                  {t('No new error received since')} <DateCell value={health.newestEventAt} />
                </>
              ) : (
                t('No error received yet.')
              )}
            </p>
          )}
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            {environments.length > 1 ? (
              <SegmentedControl<string>
                aria-label={t('Environment')}
                value={environment}
                onValueChange={next => setFilter({ environment: next })}
                height={32}
                translate={false}
                options={[
                  ...environments.map(code => ({ value: code, label: code })),
                  { value: ALL_ISSUE_ENVIRONMENTS, label: t('All environments') },
                ]}
              />
            ) : environment ? (
              <p className="text-sm text-muted-foreground">{t('Environment: %name%', { replacements: { name: environment } })}</p>
            ) : null}
            <SegmentedControl<IssueStatusFilter>
              aria-label={t('Status')}
              value={status}
              onValueChange={next => setFilter({ status: next === 'OPEN' ? '' : next })}
              height={32}
              options={statusOptions}
            />
          </div>
          <IssuesTrendCard
            api={api}
            enabled={Boolean(environment) && !noEnvironments}
            arg={{
              environment: environment || undefined,
              status,
              ...(search ? { search } : {}),
              ...(section ? { section } : {}),
              ...(release ? { release } : {}),
              from: trendWindow.from,
              to: trendWindow.to,
            }}
            actions={<IssuesWindowSwitch value={windowPreset} onValueChange={changeWindow} />}
          />
        </div>
      }
      toolbar={
        <EntityListToolbar
          search={{
            value: values.q,
            onChange: value => setFilter({ q: value }),
            placeholder: t('Search message, type or origin…'),
            'aria-label': t('Search errors'),
          }}
          filters={
            <FilterPanel>
              <FilterSelect
                label={t('Section')}
                value={section}
                onChange={value => setFilter({ section: value })}
                options={ISSUE_SECTION_OPTIONS}
                allLabel={t('All sections')}
              />
              <FilterText label={t('Release')} value={values.release} onChange={value => setFilter({ release: value })} placeholder={t('First or last seen in')} />
            </FilterPanel>
          }
          activeFilterCount={listState.activeFilterCount}
          onClearFilters={() => setFilter({ section: '', release: '' })}
        />
      }
    >
      <EntityListBody
        displayMode="table"
        tableBreakpoint="always"
        columns={columns}
        items={groups}
        getRowKey={issueGroupKey}
        rowAction={rowAction}
        rowKeyboardActivation
        isLoading={!listQuery.currentData && !listQuery.isError}
        emptyMessage={emptyMessage}
        noResultsMessage={t('No errors match the filters.')}
        isSearchActive={isFiltered}
        onClearSearch={() => setFilter({ q: '', section: '', release: '' })}
        loadingMessage={t('Loading error groups')}
        error={listError}
      />
      {(page > 1 || hasNextPage) && (
        <div data-slot="issues-pager" className="flex items-center justify-between gap-2 border-t px-4 py-3">
          <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setValues({ page: page <= 2 ? '' : String(page - 1) })}>
            <ChevronLeft aria-hidden />
            {t('Previous', { context: 'page' })}
          </Button>
          <span className="text-sm text-muted-foreground tabular-nums">{t('Page %page%', { replacements: { page } })}</span>
          <Button type="button" variant="outline" size="sm" disabled={!hasNextPage} onClick={() => setValues({ page: String(page + 1) })}>
            {t('Next', { context: 'page' })}
            <ChevronRight aria-hidden />
          </Button>
        </div>
      )}
      <IssueGroupDrawer api={api} drawer={drawer} trendWindow={trendWindow} onGroupChanged={replaceGroup} />
    </EntityListPage>
  );
};
