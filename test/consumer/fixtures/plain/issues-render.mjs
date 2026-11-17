// The ./issues screen (server render) on the sample payloads of ./showcase through the static api: the environment
// switch, the status tabs with their counts, the trend as SVG with its notes, the groups with their flags, a stalled
// registry in staging says the list is unknown, WriteAccessProvider disables Resolve / Ignore / Reopen with its reason,
// an occurrence draws its frames, code context, causes and job, and a failed list shows its error.
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  createStaticIssuesApi,
  IssueEventDetails,
  IssueGroupStatusActions,
  IssuesScreen,
} from '@mgamadeus/ddd-admin-ui/issues';
import { staticQueryFailure, WriteAccessProvider } from '@mgamadeus/ddd-admin-ui/logic';
import { AdminUiProvider } from '@mgamadeus/ddd-admin-ui/provider';
import { SHOWCASE_NOW_MS, showcaseIssuesData } from '@mgamadeus/ddd-admin-ui/showcase';

const api = createStaticIssuesApi(showcaseIssuesData);
const Link = ({ href, children, ...props }) => h('a', { href, 'data-host-link': '', ...props }, children);
const render = (element, writeAccess) =>
  renderToStaticMarkup(h(AdminUiProvider, { linkComponent: Link }, writeAccess ? h(WriteAccessProvider, { value: writeAccess }, element) : element));
const READ_ONLY = { allowed: false, reason: 'Read-only workspace' };
const count = (html, pattern) => (html.match(pattern) ?? []).length;
const buttonsNamed = (html, name) =>
  [...html.matchAll(/<button\b[^>]*>(?:(?!<\/button>)[\s\S])*<\/button>/g)].filter(match => match[0].includes(name)).map(match => /^<button\b[^>]*>/.exec(match[0])[0]);
const allDisabled = buttons => buttons.length > 0 && buttons.every(button => / disabled=""/.test(button));
const noneDisabled = buttons => buttons.length > 0 && buttons.every(button => !/ disabled=""/.test(button));

const screenProps = { api, asSpecimen: true, trendAnchorMs: SHOWCASE_NOW_MS };
const screen = render(h(IssuesScreen, screenProps));

// staging: the registry job is stalled, the list is "unknown"
const urlAdapter = values => ({ get: key => values[key] ?? null, replace: () => {} });
const stalledApi = createStaticIssuesApi({
  ...showcaseIssuesData,
  groups: arg => {
    const answer = showcaseIssuesData.groups({ ...arg, environment: 'staging' });
    return { ...answer, groups: { elements: [] } };
  },
});
const stalled = render(h(IssuesScreen, { ...screenProps, api: stalledApi }));
const allEnvironments = render(h(IssuesScreen, { ...screenProps, urlStateAdapter: urlAdapter({ environment: 'all', status: 'ALL' }) }));
const failed = render(
  h(IssuesScreen, { ...screenProps, api: createStaticIssuesApi({ ...showcaseIssuesData, groups: () => staticQueryFailure({ status: 403, data: { error: 'Access to the issues is not allowed' } }) }) }),
);

const detail = showcaseIssuesData.detail({ environment: 'production', groupHash: 'a1f04c9e2b7d4c55' });
const job = showcaseIssuesData.detail({ environment: 'production', groupHash: 'b27e9d0a6c3f1e88' });
const client = showcaseIssuesData.detail({ environment: 'production', groupHash: 'c93a71f5d2e04b16' });
const requestEvent = render(h(IssueEventDetails, { event: detail.events.elements[0] }));
const jobEvent = render(h(IssueEventDetails, { event: job.events.elements[0] }));
const clientEvent = render(h(IssueEventDetails, { event: client.events.elements[0] }));
const actions = render(h(IssueGroupStatusActions, { api, group: detail.group }));
const actionsReadOnly = render(h(IssueGroupStatusActions, { api, group: detail.group }), READ_ONLY);
const reopenReadOnly = render(h(IssueGroupStatusActions, { api, group: { ...detail.group, status: 'RESOLVED' } }), READ_ONLY);

const checks = [
  ['screen: environment switch with every environment and All', screen.includes('>production<') && screen.includes('>staging<') && screen.includes('All environments')],
  ['screen: status tabs with the counts', screen.includes('role="radiogroup"') && screen.includes('Resolved') && screen.includes('Ignored')],
  ['screen: open groups listed, last seen first, resolved one not', screen.includes('RuntimeException') && screen.indexOf('RuntimeException') < screen.indexOf('LogicException') && !screen.includes('PDOException')],
  ['screen: regression and new flags', screen.includes('Regression') && screen.includes('>New<')],
  ['screen: the route pattern of a group', screen.includes('POST /api/admin/catalog/imports')],
  ['screen: trend drawn as SVG bars with its notes', screen.includes('data-slot="issues-trend-chart"') && count(screen, /<rect /g) > 5 && screen.includes('sum of 3 of 3 matching groups') && screen.includes('(approximate)')],
  ['screen: stalled registry: warning with the last error, the empty list is unknown', stalled.includes('Error collection is not running') && stalled.includes('502 Bad Gateway') && stalled.includes('Unknown: error collection is not running')],
  ['screen: a partial trend says so', stalled.includes('data-slot="issues-trend-error"')],
  ['screen: "all" adds the environment and status columns', allEnvironments.includes('>Environment<') && allEnvironments.includes('>Status<') && allEnvironments.includes('TimeoutException')],
  ['screen: a failed list shows the server message', failed.includes('Access to the issues is not allowed')],
  ['event: backend frames, code context with the current line, framework frames folded', requestEvent.includes('data-slot="issue-frames"') && requestEvent.includes('data-current=""') && requestEvent.includes('+3 framework frames')],
  ['event: the cause and the request', requestEvent.includes('JsonException') && requestEvent.includes('data-slot="issue-request"') && requestEvent.includes('>500<')],
  ['event: the job block without a maximum of attempts', jobEvent.includes('data-slot="issue-worker"') && jobEvent.includes('SendPushMessage') && jobEvent.includes('Dropped')],
  ['event: a resolved client frame, the client and its breadcrumbs', clientEvent.includes('src/orders/OrderSummary.tsx:42:31') && clientEvent.includes('minified:') && clientEvent.includes('data-slot="issue-breadcrumbs"') && clientEvent.includes('Safari')],
  ['actions: resolve and ignore enabled with write access', noneDisabled(buttonsNamed(actions, 'Resolve')) && noneDisabled(buttonsNamed(actions, 'Ignore'))],
  ['actions: disabled without write access, with the reason', allDisabled(buttonsNamed(actionsReadOnly, 'Resolve')) && allDisabled(buttonsNamed(actionsReadOnly, 'Ignore')) && allDisabled(buttonsNamed(reopenReadOnly, 'Reopen')) && actionsReadOnly.includes('<span class="sr-only">Read-only workspace</span>') && actionsReadOnly.includes('data-slot="control-hint"') && !actionsReadOnly.includes('title="Read-only workspace"')],
  ['screen: rows open by keyboard, the approximate count as a header tooltip', /<tr[^>]*tabindex="0"/.test(screen) && screen.includes('data-slot="hint"') && !screen.includes('title="Approximate"')],
  ['actions: what resolve and ignore mean', actions.includes('a later event reopens it as a regression')],
];

let failedChecks = false;
for (const [label, passed] of checks) {
  console.log(`${passed ? 'ok     ' : 'FAILED '} ./issues ${label}`);
  if (!passed) failedChecks = true;
}
if (failedChecks) process.exit(1);
