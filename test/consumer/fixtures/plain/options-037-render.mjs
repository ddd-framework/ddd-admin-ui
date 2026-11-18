// Server render of the optional props added in 0.3.7 on the sample payloads of ./showcase through the static apis:
// the app translations screen's multi-language "has a value in" filter, its card view sort select and the generation
// estimate in the confirmation; host cache tags per operation on the api factories; the crons host comparator for the
// severity order; environment labels from a function on the issues screen.
//
// Runs against the installed package (consumer check) or, from the repository, against its own build:
// node test/consumer/fixtures/plain/options-037-render.mjs
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CronsScreen, createStaticCronsApi, sortCrons } from '@mgamadeus/ddd-admin-ui/crons';
import { setTranslations } from '@mgamadeus/ddd-admin-ui/i18n';
import { createStaticIssuesApi, IssuesScreen } from '@mgamadeus/ddd-admin-ui/issues';
import { withHostTags } from '@mgamadeus/ddd-admin-ui/logic';
import { AdminUiProvider } from '@mgamadeus/ddd-admin-ui/provider';
import { SHOWCASE_NOW_MS, showcaseCronsData, showcaseIssuesData, showcaseTranslationsData } from '@mgamadeus/ddd-admin-ui/showcase';
import {
  AppTranslationsScreen,
  createStaticTranslationsApi,
  GenerationEstimate,
  TRANSLATIONS_API_OPERATIONS,
  translationsEndpointDefinitions,
} from '@mgamadeus/ddd-admin-ui/translations';
import { WORKERS_API_OPERATIONS, workersEndpointDefinitions } from '@mgamadeus/ddd-admin-ui/workers';

setTranslations('en', 'FORMAL', {});
const render = element => renderToStaticMarkup(h(AdminUiProvider, {}, element));
const urlAdapter = values => ({ get: key => values[key] ?? null, replace: () => {} });
const checks = [];

// ── app translations ───────────────────────────────────────────────────────────────────────────────────────────────
const translationsApi = createStaticTranslationsApi(showcaseTranslationsData);
const listArgs = [];
const useListQuery = (args, options) => {
  listArgs.push(args);
  return translationsApi.useAppTranslationKeysQuery(args, options);
};
const defaultScreen = render(h(AppTranslationsScreen, { api: translationsApi, asSpecimen: true, displayMode: 'grid' }));
render(
  h(AppTranslationsScreen, {
    api: translationsApi,
    asSpecimen: true,
    useListQuery,
    languageFilter: 'multiple',
    urlStateAdapter: urlAdapter({ language: '1,2' }),
  }),
);
const singleArgs = [];
render(
  h(AppTranslationsScreen, {
    api: translationsApi,
    asSpecimen: true,
    useListQuery: (args, options) => {
      singleArgs.push(args);
      return translationsApi.useAppTranslationKeysQuery(args, options);
    },
    languageFilter: 'multiple',
    urlStateAdapter: urlAdapter({ language: '2' }),
  }),
);
const sorted = render(
  h(AppTranslationsScreen, {
    api: translationsApi,
    asSpecimen: true,
    displayMode: 'grid',
    cardSort: { labels: { created: 'Created on' } },
    columns: defaults => [...defaults, { id: 'created', header: 'Created', cell: () => '', sortKey: 'created' }],
  }),
);
const sortedTable = render(h(AppTranslationsScreen, { api: translationsApi, asSpecimen: true, displayMode: 'table', cardSort: true }));
const estimate = render(
  h(GenerationEstimate, { preview: new Promise(() => undefined), scope: { kind: 'all' }, render: () => h('p', { 'data-host-estimate': '' }, 'estimate') }),
);
checks.push(
  ['translations: no sort select without cardSort', !defaultScreen.includes('data-slot="app-translation-keys-card-sort"')],
  ['translations: "multiple" sends `in` on the root filter and the expand', listArgs.length > 0 && listArgs.every(args => args.filters === 'appTranslationValues.languageId in ["1","2"]' && args.expand === 'appTranslationValues(filters=languageId in ["1","2"])')],
  ['translations: "multiple" with one id filters as the single variant', singleArgs.length > 0 && singleArgs.every(args => args.filters === "appTranslationValues.languageId eq '2'")],
  ['translations: cardSort draws the sort select in the card view', sorted.includes('data-slot="app-translation-keys-card-sort"') && sorted.includes('aria-label="Sort by"')],
  ['translations: the sort select is held to the cards below md in the table view', /data-slot="app-translation-keys-card-sort"/.test(sortedTable) && /class="[^"]*md:hidden[^"]*" data-slot="app-translation-keys-card-sort"/.test(sortedTable)],
  ['translations: the generation estimate shows its loading state first', estimate.includes('data-state="loading"') && estimate.includes('role="status"') && !estimate.includes('data-host-estimate')],
);

// ── host tags per operation ────────────────────────────────────────────────────────────────────────────────────────
const workersTagged = withHostTags(workersEndpointDefinitions('/api/workers'), { provides: { byOperation: { overview: ['HostOverview'] } } }, WORKERS_API_OPERATIONS);
const translationsTagged = withHostTags(
  translationsEndpointDefinitions('/api/admin/common'),
  (operation, kind) => (operation === 'languages' && kind === 'query' ? ['HostLanguages'] : undefined),
  TRANSLATIONS_API_OPERATIONS,
);
checks.push(
  ['tags: keyed by operation reach only that operation', workersTagged.adminUiWorkersOverview.providesTags.includes('HostOverview') && !workersTagged.adminUiWorkersHistory.providesTags.includes('HostOverview')],
  ['tags: a function per operation', translationsTagged.adminUiLanguages.providesTags.includes('HostLanguages') && !translationsTagged.adminUiLocales.providesTags.includes('HostLanguages')],
);

// ── crons ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const cronsApi = createStaticCronsApi(showcaseCronsData);
const pinPaused = (left, right, compare) => Number(right.status === 'PAUSED') - Number(left.status === 'PAUSED') || compare(left, right);
const severity = render(h(CronsScreen, { api: cronsApi, pollingIntervalMs: 0, tick: false, sort: 'severity' }));
const pinned = render(h(CronsScreen, { api: cronsApi, pollingIntervalMs: 0, tick: false, sort: 'severity', severityCompare: pinPaused }));
const crons = showcaseCronsData.list.crons.elements;
checks.push(
  ['crons: severity keeps the worst status first', severity.indexOf('>export-legacy-report<') < severity.indexOf('>rebuild-search-index<') && severity.indexOf('>rebuild-search-index<') < severity.indexOf('>sample-workers<')],
  ['crons: severityCompare orders the list', pinned.indexOf('>sample-workers<') < pinned.indexOf('>export-legacy-report<')],
  ['crons: sortCrons takes the host comparator', sortCrons(crons, 'severity', pinPaused)[0]?.status === 'PAUSED'],
);

// ── issues ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const issuesApi = createStaticIssuesApi(showcaseIssuesData);
const labelled = render(
  h(IssuesScreen, {
    api: issuesApi,
    asSpecimen: true,
    trendAnchorMs: SHOWCASE_NOW_MS,
    environmentLabels: code => (code === 'production' ? 'Live system' : undefined),
  }),
);
checks.push(['issues: environmentLabels as a function labels the switch', labelled.includes('Live system') && labelled.includes('staging')]);

let failed = false;
for (const [label, passed] of checks) {
  console.log(`${passed ? 'ok     ' : 'FAILED '} ${label}`);
  if (!passed) failed = true;
}
if (failed) process.exit(1);
