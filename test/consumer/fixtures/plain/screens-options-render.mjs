// The options of 0.3.3 on the ./issues, ./database and ./crons screens (server render, static apis): environment
// labels, header actions, the custom trend range, load-more paging, the occurrence summary with its copy actions and
// the attempt of its maximum; the server's block reason, "Apply all" off for unsigned or blocked diffs, the drift mark;
// the cron status filter, the worst-first order, the runs' Cron filter and viewer-local times; the badge tone.
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CronRunsView, CronsScreen, createStaticCronsApi } from '@mgamadeus/ddd-admin-ui/crons';
import { createStaticDatabaseApi, SchemaDiffCard, SchemaDiffScreen } from '@mgamadeus/ddd-admin-ui/database';
import { createStaticIssuesApi, IssueEventDetails, IssuesScreen } from '@mgamadeus/ddd-admin-ui/issues';
import { StatusBadge } from '@mgamadeus/ddd-admin-ui/list';
import { AdminUiProvider } from '@mgamadeus/ddd-admin-ui/provider';
import { SHOWCASE_NOW_MS, showcaseCronsData, showcaseDatabaseData, showcaseIssuesData } from '@mgamadeus/ddd-admin-ui/showcase';

const render = element => renderToStaticMarkup(h(AdminUiProvider, null, element));
const urlAdapter = values => ({ get: key => values[key] ?? null, replace: () => {} });
const buttonsNamed = (html, name) =>
  [...html.matchAll(/<button\b[^>]*>(?:(?!<\/button>)[\s\S])*<\/button>/g)].filter(match => match[0].includes(name)).map(match => /^<button\b[^>]*>/.exec(match[0])[0]);
const rows = html => [...html.matchAll(/<tr\b[\s\S]*?<\/tr>/g)].map(match => match[0]).filter(row => row.includes('<td'));

// ── issues ───────────────────────────────────────────────────────────────────
const issuesApi = createStaticIssuesApi(showcaseIssuesData);
const issuesProps = { api: issuesApi, asSpecimen: true, trendAnchorMs: SHOWCASE_NOW_MS };
const labelled = render(
  h(IssuesScreen, {
    ...issuesProps,
    environmentLabels: { production: 'Production (live)' },
    headerActions: h('a', { href: '/alerts', 'data-host-action': '' }, 'Alert settings'),
    customTrendRange: true,
  })
);
const customRange = render(
  h(IssuesScreen, {
    ...issuesProps,
    customTrendRange: true,
    urlStateAdapter: urlAdapter({ window: 'custom', from: '2026-01-01T00:00:00Z', to: '2026-03-01T00:00:00Z' }),
  })
);
const fullPage = Array.from({ length: 50 }, (_, index) => ({ ...showcaseIssuesData.groups({ status: 'OPEN' }).groups.elements[0], groupHash: `hash-${index}` }));
const pagedApi = createStaticIssuesApi({
  ...showcaseIssuesData,
  groups: arg => ({ ...showcaseIssuesData.groups(arg), groups: { elements: fullPage } }),
});
const loadMore = render(h(IssuesScreen, { ...issuesProps, api: pagedApi, pagination: 'load-more' }));
const paged = render(h(IssuesScreen, { ...issuesProps, api: pagedApi }));
const detail = showcaseIssuesData.detail({ environment: 'production', groupHash: 'a1f04c9e2b7d4c55' });
const event = detail.events.elements[0];
const summary = render(h(IssueEventDetails, { event, summary: true }));
const noCopy = render(h(IssueEventDetails, { event, copyActions: false }));
const worker = render(h(IssueEventDetails, { event: { ...event, worker: { attempt: 2, maxAttempts: 3, final: false } } }));
const workerWithoutMax = render(h(IssueEventDetails, { event: { ...event, worker: { attempt: 2, final: false } } }));

// ── database ─────────────────────────────────────────────────────────────────
const diffs = showcaseDatabaseData.diff.diffs.elements;
const blockedDiff = diffs.find(diff => diff.directApplyBlocked);
const reasoned = render(h(SchemaDiffCard, { diff: { ...blockedDiff, directApplyBlockReason: 'The table copy would lock it for minutes.' } }));
const drifted = render(h(SchemaDiffCard, { diff: diffs.find(diff => !diff.directApplyBlocked), drifted: true }));
const unsigned = render(
  h(SchemaDiffScreen, {
    api: createStaticDatabaseApi({ ...showcaseDatabaseData, diff: { diffs: { elements: diffs.map((diff, index) => (index === 0 ? { ...diff, diffSignature: null } : diff)) } } }),
    showGeneratedCode: false,
  })
);
const blockedDisabled = render(h(SchemaDiffScreen, { api: createStaticDatabaseApi(showcaseDatabaseData), showGeneratedCode: false, applyAllWithBlockedDiffs: 'disable' }));
const leaveOut = render(h(SchemaDiffScreen, { api: createStaticDatabaseApi(showcaseDatabaseData), showGeneratedCode: false }));
const applyAll = html => buttonsNamed(html, 'Apply all').filter(button => !button.includes('aria-label'));

// ── crons ────────────────────────────────────────────────────────────────────
const cronsApi = createStaticCronsApi(showcaseCronsData);
const cronsProps = { api: cronsApi, pollingIntervalMs: 0, tick: false };
const failing = render(h(CronsScreen, { ...cronsProps, urlStateAdapter: urlAdapter({ status: 'FAILING' }) }));
const attention = render(h(CronsScreen, { ...cronsProps, urlStateAdapter: urlAdapter({ status: 'ATTENTION' }) }));
const severity = render(h(CronsScreen, { ...cronsProps, sort: 'severity' }));
const serverTimes = render(h(CronsScreen, cronsProps));
const viewerTimes = render(h(CronsScreen, { ...cronsProps, timeZone: 'viewer', serverUtcOffsetMinutes: 13 * 60 }));
const runsFiltered = render(
  h(CronRunsView, {
    api: cronsApi,
    result: 'ALL',
    onResultChange: () => {},
    pollingIntervalMs: 0,
    cronOptions: [{ id: 2, name: 'rebuild-search-index' }],
    cronFilterId: 2,
    onCronFilterChange: () => {},
  })
);
const nameCell = rows(serverTimes)[0] ?? '';
const firstName = html => /data-slot="cron-name"[^>]*>([^<]+)</.exec(html)?.[1];
const nextRunClocks = html => [...html.matchAll(/data-cron-next="due"[\s\S]*?tabular-nums">([^<]+)<\/span><\/span>/g)].map(match => match[1]);

const checks = [
  ['issues: environment labels in the switch', labelled.includes('>Production (live)<') && !labelled.includes('>production<')],
  ['issues: header actions', labelled.includes('data-host-action=""')],
  ['issues: a Custom window choice', labelled.includes('>Custom<') && !render(h(IssuesScreen, issuesProps)).includes('>Custom<')],
  ['issues: an unusable custom range says so', customRange.includes('data-slot="issues-trend-range-invalid"') && customRange.includes('type="datetime-local"')],
  ['issues: load-more instead of pages', loadMore.includes('class="sticky left-0 h-0"') && !loadMore.includes('data-slot="issues-pager"') && paged.includes('data-slot="issues-pager"')],
  ['issues: the occurrence summary with file and line', summary.includes('data-slot="issue-event-summary"') && summary.includes('data-slot="issue-event-file-line"')],
  ['issues: copy stack and file:line by default, off with copyActions false', summary.includes('data-slot="issue-copy-stack"') && !noCopy.includes('data-slot="issue-copy-stack"')],
  ['issues: the attempt of its maximum, tolerant of a payload without it', worker.includes('2 of 3') && workerWithoutMax.includes('>2<') && !workerWithoutMax.includes(' of ')],
  ['database: the server block reason', reasoned.includes('data-slot="schema-diff-block-reason"') && reasoned.includes('lock it for minutes')],
  ['database: the drift mark', drifted.includes('data-drifted=""') && drifted.includes('>Changed<')],
  ['database: Apply all off while a diff has no signature', applyAll(unsigned).every(button => / disabled=""/.test(button)) && unsigned.includes('no signature')],
  ['database: Apply all off with blocked diffs on request, on by default', applyAll(blockedDisabled).every(button => / disabled=""/.test(button)) && applyAll(leaveOut).every(button => !/ disabled=""/.test(button))],
  ['crons: the status filter', rows(failing).length === 1 && failing.includes('rebuild-search-index') && rows(attention).length === 3],
  ['crons: worst status first on request', firstName(severity) === 'export-legacy-report' && firstName(serverTimes) === 'send-reminders'],
  ['crons: the name clips in its cell', nameCell.includes('data-slot="cron-name"') && /class="[^"]*truncate[^"]*"[^>]*data-slot="cron-name"|data-slot="cron-name"[^>]*class="[^"]*truncate/.test(nameCell)],
  ['crons: viewer-local times differ from the server clock', nextRunClocks(viewerTimes).length > 0 && nextRunClocks(viewerTimes).join() !== nextRunClocks(serverTimes).join()],
  ['crons: the runs Cron filter', runsFiltered.includes('Toggle filters (1 active)')],
  ['list: the badge tone', render(h(StatusBadge, { tone: 'warning', label: 'Late' })).includes('data-tone="warning"')],
];

let failed = false;
for (const [label, passed] of checks) {
  console.log(`${passed ? 'ok     ' : 'FAILED '} ${label}`);
  if (!passed) failed = true;
}
if (failed) process.exit(1);
