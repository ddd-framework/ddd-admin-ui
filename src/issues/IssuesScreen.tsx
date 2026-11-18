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
  issueEnvironmentLabel,
  issueGroupKey,
  ISSUES_CUSTOM_WINDOW,
  type IssuesWindowPreset,
  type IssuesWindowValue,
  resolveIssuesTrendRange,
  toIssuesWindowValue,
} from './format.ts';
import { IssueGroupDrawer, IssueGroupFlags } from './IssueGroupDrawer.tsx';
import { IssuesTrendCard, IssuesTrendRangeControl, IssuesWindowSwitch } from './IssuesTrendChart.tsx';
import { ISSUE_GROUP_STATUS, toIssueGroupStatus } from './status.ts';
import type { IssueGroupsListArg, IssueGroupStatus, IssueGroupSummary, IssueStatusFilter } from './types.ts';

const LIST_KEYS = ['environment', 'status', 'q', 'section', 'release', 'window', 'page', 'from', 'to'] as const;
/** Scope, tab, search, window (and its custom range) and page are not panel filters. */
const UNCOUNTED = ['environment', 'status', 'q', 'window', 'page', 'from', 'to'] as const;
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
  /** A "Custom" choice in the window switch: from and to, at most 31 days apart (URL keys `from`, `to`). Default `false`. */
  customTrendRange?: boolean;
  /** Labels of environment codes (`{ prod: 'Production' }`): the switch, the column and the drawer show them instead of the code. */
  environmentLabels?: Readonly<Record<string, string>>;
  /** Page actions at the right edge of the header (a link to the alert settings). */
  headerActions?: ReactNode;
  /**
   * `pages` (default): 50 groups per page with Previous / Next. `load-more`: the list grows by 50 when it is scrolled to
   * its end (the infinite-scroll tail of the list; a filter change starts again at 50).
   */
  pagination?: 'pages' | 'load-more';
  /** Each occurrence in the drawer starts with its summary card (type, message, `file:line`, time, release). */
  eventSummary?: boolean;
}

/**
 * The error groups of the issues registry (`IssuesControllerTrait`): the environment switch (with "All"), the status
 * tabs with their counts, search, section and release filters, the job health, the trend of the same selection over a
 * window, the groups (last seen first, as the server sorts them; 50 per page) and a group's details in the drawer with
 * Resolve / Ignore / Reopen. An empty list while the registry is unhealthy says "unknown", never "no errors". Writes
 * follow `WriteAccessProvider`.
 */
export const IssuesScreen = ({
  api,
  urlStateAdapter,
  drawerUrlAdapter,
  title,
  description,
  asSpecimen,
  trendAnchorMs,
  customTrendRange = false,
  environmentLabels,
  headerActions,
  pagination = 'pages',
  eventSummary = false,
}: IssuesScreenProps) => {
  const { t } = useTranslate();
  const memory = useMemoryUrlState();
  const drawer = useEntityDrawer({ adapter: drawerUrlAdapter ?? memory.drawerUrlAdapter, editKey: 'issue' });
  const listState = useUrlListState(LIST_KEYS, { adapter: urlStateAdapter ?? memory.urlStateAdapter, uncounted: UNCOUNTED });
  const { values, debounced, setValues } = listState;

  const status = toStatusFilter(values.status);
  const windowValue: IssuesWindowValue = customTrendRange ? toIssuesWindowValue(values.window) : toIssuesWindowValue(values.window === ISSUES_CUSTOM_WINDOW ? '' : values.window);
  const windowPreset: IssuesWindowPreset = windowValue === ISSUES_CUSTOM_WINDOW ? '24h' : windowValue;
  const loadMoreMode = pagination === 'load-more';
  const page = loadMoreMode ? 1 : Math.max(1, Number.parseInt(values.page, 10) || 1);
  const search = debounced.q.trim();
  const release = debounced.release.trim();
  const section = values.section;

  // a filter change starts at page 1 again
  const setFilter = (updates: Partial<Record<(typeof LIST_KEYS)[number], string>>) => setValues({ page: '', ...updates });

  // load-more: the groups of the earlier pages stay; the query reads the next page (a filter change starts again)
  const filterKey = [values.environment, status, search, section, release].join('\u0001');
  const [loadMoreState, setLoadMoreState] = useState<{ key: string; offset: number; earlier: IssueGroupSummary[] }>({ key: filterKey, offset: 0, earlier: [] });
  const stitched = loadMoreMode && loadMoreState.key === filterKey ? loadMoreState : { key: filterKey, offset: 0, earlier: [] as IssueGroupSummary[] };
  const listArg = useMemo<IssueGroupsListArg>(
    () => ({
      ...(values.environment ? { environment: values.environment } : {}),
      status,
      ...(search ? { search } : {}),
      ...(section ? { section } : {}),
      ...(release ? { release } : {}),
      limit: ISSUE_GROUPS_PAGE_SIZE,
      offset: loadMoreMode ? stitched.offset : (page - 1) * ISSUE_GROUPS_PAGE_SIZE,
    }),
    [values.environment, status, search, section, release, page, loadMoreMode, stitched.offset]
  );
  const listQuery = api.useIssueGroupsQuery(listArg);
  const response = listQuery.currentData ?? listQuery.data;
  const environment = values.environment || response?.environment || '';
  const environments = response?.environments ?? [];
  const isAll = environment === ALL_ISSUE_ENVIRONMENTS;
  const counts = response?.statusCounts;
  const health = response?.health;
  const pageGroups = useMemo(() => listQuery.currentData?.groups.elements ?? [], [listQuery.currentData]);
  const earlierGroups = stitched.earlier;
  const loadedGroups = useMemo(() => {
    if (earlierGroups.length === 0) return pageGroups;
    const seen = new Set(earlierGroups.map(issueGroupKey));
    return [...earlierGroups, ...pageGroups.filter(group => !seen.has(issueGroupKey(group)))];
  }, [earlierGroups, pageGroups]);
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
  const trendWindow = useMemo(
    () => resolveIssuesTrendRange(windowValue, trendAnchorMs ?? anchorMs, { from: values.from, to: values.to }),
    [windowValue, trendAnchorMs, anchorMs, values.from, values.to]
  );
  const changeWindow = (next: IssuesWindowValue) => {
    if (trendAnchorMs === undefined) setAnchorMs(Date.now());
    setValues({ window: next });
  };

  const jobStalled = health?.jobStalled === true;
  const collectorSilent = !jobStalled && health?.collectorSilent === true;
  const noEnvironments = listQuery.isSuccess && environments.length === 0;
  const hasNextPage = loadMoreMode ? pageGroups.length >= ISSUE_GROUPS_PAGE_SIZE : groups.length >= ISSUE_GROUPS_PAGE_SIZE;
  const loadMore = () => {
    if (!listQuery.currentData || !hasNextPage) return;
    setLoadMoreState({ key: filterKey, offset: stitched.offset + ISSUE_GROUPS_PAGE_SIZE, earlier: loadedGroups });
  };
  const envLabel = (code: string) => issueEnvironmentLabel(code, environmentLabels);
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
    ...(isAll ? [{ id: 'environment', header: m('Environment'), width: '120px' as const, cell: (group: IssueGroupSummary) => <span className={environmentLabels?.[group.environment] ? 'text-xs' : 'font-mono text-xs'}>{envLabel(group.environment)}</span> }] : []),
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
      headerActions={headerActions}
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
                  ...environments.map(code => ({ value: code, label: envLabel(code) })),
                  { value: ALL_ISSUE_ENVIRONMENTS, label: t('All environments') },
                ]}
              />
            ) : environment ? (
              <p className="text-sm text-muted-foreground">{t('Environment: %name%', { replacements: { name: envLabel(environment) } })}</p>
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
            actions={
              customTrendRange ? (
                <IssuesTrendRangeControl
                  value={windowValue}
                  onValueChange={changeWindow}
                  customFrom={values.from}
                  customTo={values.to}
                  onCustomRangeChange={range => setValues({ from: range.from, to: range.to })}
                  currentWindow={trendWindow}
                />
              ) : (
                <IssuesWindowSwitch value={windowPreset} onValueChange={changeWindow} />
              )
            }
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
        isLoading={!listQuery.currentData && !listQuery.isError && earlierGroups.length === 0}
        {...(loadMoreMode ? { hasMore: hasNextPage, isFetchingMore: listQuery.isFetching && earlierGroups.length > 0, onLoadMore: loadMore } : {})}
        emptyMessage={emptyMessage}
        noResultsMessage={t('No errors match the filters.')}
        isSearchActive={isFiltered}
        onClearSearch={() => setFilter({ q: '', section: '', release: '' })}
        loadingMessage={t('Loading error groups')}
        error={listError}
      />
      {!loadMoreMode && (page > 1 || hasNextPage) && (
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
      <IssueGroupDrawer
        api={api}
        drawer={drawer}
        trendWindow={trendWindow}
        onGroupChanged={replaceGroup}
        eventSummary={eventSummary}
        environmentLabels={environmentLabels}
      />
    </EntityListPage>
  );
};
